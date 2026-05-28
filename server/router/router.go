package router

import (
	"app/config"
	"app/controller"
	"app/middleware"
	"app/model"
	"app/services"
	"app/ws"
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func SetupRouter(r *gin.Engine, db *gorm.DB, wsm *ws.Manager, rdb *redis.Client, verifyCacheTTL time.Duration, redisKeyPrefix string) *services.CollabWebhookDispatcher {

	// --- 1. 初始化 Services ---
	fileSrv := services.NewFileService(db)
	workspaceUserSrv := services.NewWorkspaceUserService(db)
	workspaceQuotaSrv := services.NewWorkspaceQuotaService(db)
	spaceSrv := services.NewSpaceService(db)
	inviteSrv := services.NewInviteService(db, wsm)
	inviteSrv.Register(model.InviteScopeWorkspace, &services.WorkspaceInviteAcceptor{DB: db})
	inviteSrv.Register(model.InviteScopeSpace, &services.SpaceInviteAcceptor{DB: db})
	inviteSrv.SetSpaceSendGuard(func(ctx context.Context, o *services.InviteSendOpts) error {
		if err := spaceSrv.AssertCanInviteToSpace(ctx, o.WorkspaceID, o.ScopeID, o.InviterID); err != nil {
			return err
		}
		return spaceSrv.ValidateSpaceInviteTarget(ctx, o.WorkspaceID, o.ScopeID, o.InviteeID)
	})
	spaceAccessSrv := services.NewSpaceAccessService(db, wsm, spaceSrv)
	workspaceSrv := services.NewWorkspaceService(db, wsm, inviteSrv)
	pageSrv := services.NewPageService(db)
	userPageLibSrv := services.NewUserPageLibraryService(db)
	cfg := config.Get()
	expandURL := strings.TrimSpace(os.Getenv("COLLAB_EXPAND_YDOC_URL"))
	if expandURL == "" {
		expandURL = strings.TrimSpace(cfg.Collab.ExpandYdocURL)
	}
	collabSecret := strings.TrimSpace(os.Getenv("COLLAB_INTERNAL_SECRET"))
	if collabSecret == "" {
		collabSecret = strings.TrimSpace(cfg.Collab.InternalSecret)
	}
	webhookDisp := services.NewCollabWebhookDispatcher(pageSrv, 512, 4, expandURL, collabSecret)
	webhookDisp.Start()
	pageAccessSrv := services.NewPageAccessService(db, spaceSrv)
	userSrv := services.NewUserService(db, pageSrv, spaceSrv, workspaceSrv, workspaceUserSrv, workspaceQuotaSrv)

	notifySrv := services.NewNotificationService(db)
	joinReqSrv := services.NewJoinRequestService(db, spaceSrv, workspaceUserSrv, wsm)
	wsm.NotifySrv = notifySrv
	// 這裡不要 New，直接用 wsm 裡的，保證 Worker Pool 引用的是同一個 service
	chatSrv, ok := wsm.ChatSrv.(*services.ChatService)
	if !ok {
		// 如果断言失败，说明初始化逻辑有问题
		panic("ChatSrv 类型断言失败：wsm.ChatSrv 并不是 *services.ChatService")
	}

	// --- 2. 初始化 Controllers ---
	userCtrl := controller.NewUserCtrl(userSrv)
	adminCtrl := controller.NewAdminCtrl(userSrv)
	pageCtrl := controller.NewPageCtrl(pageSrv, spaceSrv, workspaceUserSrv, pageAccessSrv, userPageLibSrv)
	fileCtrl := controller.NewFileCtrl(fileSrv)
	spaceCtrl := controller.NewSpaceCtrl(spaceSrv, spaceAccessSrv, inviteSrv, workspaceUserSrv)
	workspaceCtrl := controller.NewWorkspaceCtrl(workspaceSrv, workspaceUserSrv, workspaceQuotaSrv)
	notifyCtrl := controller.NewNotificationCtrl(notifySrv)
	joinReqCtrl := controller.NewJoinRequestCtrl(joinReqSrv)
	// 重点：wsm.ChatSrv 现在是接口类型，我们要把它“还原”成具体的指针给 Controller 用
	// 使用 .(类型) 进行断言

	chatCtrl := controller.NewChatCtrl(chatSrv)
	messageCtrl := controller.NewMessageCtrl(wsm)

	relationSrv := services.NewRelationService(db, wsm)
	relationCtrl := controller.NewRelationCtrl(relationSrv, chatSrv)

	// 協作 Node 服務內部鉴权：verify / 拉取初始 ydoc / 异步入队持久化（見 editor/collab-server）。
	if collabSecret != "" {
		collabIC := controller.NewCollabInternalCtrl(userSrv, pageCtrl, webhookDisp, rdb, verifyCacheTTL, redisKeyPrefix)
		ic := r.Group("/internal/collab")
		ic.Use(middleware.CollabInternalAuth(collabSecret))
		{
			ic.POST("/verify", collabIC.Verify)
			ic.GET("/ydoc/:pageId", collabIC.LoadYdoc)
			ic.POST("/persist-ydoc", collabIC.PersistYdoc)
		}
	}

	// Hocuspocus extension-webhook → 异步入队写 ydoc_state，接口立即返回（见 services.CollabWebhookDispatcher）。
	webhookCtrl := controller.NewHocuspocusWebhookCtrl(webhookDisp, os.Getenv("HOCUSPOCUS_WEBHOOK_SECRET"))
	r.POST("/hocuspocus-webhook", webhookCtrl.Webhook)

	// --- 3. 公开路由 (无需鉴权) ---
	authRg := r.Group("/oauth")
	{
		authRg.POST("/login", adminCtrl.Login)
		authRg.POST("/register", adminCtrl.Register)
		authRg.GET("/checkUsername", adminCtrl.CheckUsername)
		authRg.GET("/checkMobile", adminCtrl.CheckMobile)
		authRg.GET("/checkEmail", adminCtrl.CheckEmail)
		authRg.POST("/logout", adminCtrl.LoginOut)
		authRg.GET("/token", adminCtrl.Token)
	}

	// --- 4. 需要 JWT 登录的私有路由 ---
	apiRg := r.Group("/api")
	apiRg.Use(middleware.JwtAuth(userSrv))
	{
		// 个人信息
		apiRg.GET("/me", userCtrl.Me)
		apiRg.POST("/me/push-device", userCtrl.RegisterPushDevice)
		apiRg.GET("/ws", messageCtrl.HandleConnect)

		userRg := apiRg.Group("/user")
		{
			userRg.GET("/search", userCtrl.Search)
			userRg.POST("/profile", userCtrl.UpdateProfile)
			userRg.POST("/password", userCtrl.ChangePassword)
			//userRg.GET("/searchForInvite", userCtrl.SearchForInvite)
		}

		notifyRg := apiRg.Group("/notification")
		{
			notifyRg.GET("/list", notifyCtrl.List)
			notifyRg.GET("/sent", notifyCtrl.ListSent)
			notifyRg.GET("/unread-count", notifyCtrl.UnreadCount)
			notifyRg.POST("/read", notifyCtrl.MarkRead)
			notifyRg.POST("/read-all", notifyCtrl.ReadAll)
		}

		apiRg.GET("/join-requests/sent", joinReqCtrl.ListSent)
		apiRg.POST("/join-requests/:id/approve", joinReqCtrl.Approve)
		apiRg.POST("/join-requests/:id/reject", joinReqCtrl.Reject)

		// 通讯录 / 社交：仅 JwtAuth，不使用 WorkspacesAuth；可不携带 X-Workspace-Id（聊天摘要等传 workspace_id 查询参数或由服务端解析默认工作区）
		socialRg := apiRg.Group("/social")
		{
			socialRg.GET("/users/search", userCtrl.Search)

			socialRg.POST("/follows", relationCtrl.Follow)
			socialRg.DELETE("/follows/:userId", relationCtrl.Unfollow)
			socialRg.GET("/follows/following", relationCtrl.FollowingList)
			socialRg.GET("/follows/followers", relationCtrl.FollowersList)

			socialRg.POST("/friends/apply", relationCtrl.FriendApply)
			socialRg.GET("/friends", relationCtrl.FriendList)
			socialRg.PATCH("/friends/remark", relationCtrl.FriendUpdateRemark)
			socialRg.GET("/friends/requests/incoming", relationCtrl.FriendIncoming)
			socialRg.GET("/friends/requests/outgoing", relationCtrl.FriendOutgoing)
			socialRg.POST("/friends/:id/accept", relationCtrl.FriendAccept)
			socialRg.POST("/friends/:id/reject", relationCtrl.FriendReject)
			socialRg.DELETE("/friends/:id", relationCtrl.FriendRemove)

			socialRg.GET("/chat/groups", chatCtrl.ListSocialGroups)
			socialRg.POST("/chat/groups", chatCtrl.CreateSocialGroup)
			socialRg.GET("/chat/groups/:groupId", chatCtrl.GetSocialGroup)
			socialRg.DELETE("/chat/groups/:groupId/members/:userId", chatCtrl.RemoveSocialGroupMember)
			socialRg.PATCH("/chat/groups/:groupId", chatCtrl.PatchSocialGroup)
			socialRg.PATCH("/chat/groups/:groupId/my-alias", chatCtrl.PatchSocialGroupMyAlias)
			socialRg.POST("/chat/groups/:groupId/transfer-owner", chatCtrl.TransferSocialGroupOwner)
			socialRg.POST("/chat/groups/:groupId/invites", chatCtrl.InviteSocialGroupMembers)
			socialRg.POST("/chat/groups/:groupId/apply", chatCtrl.ApplySocialGroupJoin)
			socialRg.POST("/chat/group-invites/:inviteId/respond", chatCtrl.RespondSocialGroupInvite)
			socialRg.GET("/chat/group-invites/pending", chatCtrl.ListSocialGroupInvitesPending)
			socialRg.POST("/chat/groups/:groupId/leave", chatCtrl.LeaveSocialGroup)
			socialRg.POST("/chat/read", chatCtrl.MarkSocialRead)
			socialRg.GET("/chat/history", chatCtrl.History)
			socialRg.POST("/chat/upload", fileCtrl.SocialChatUpload)
		}

		// A. 全局工作区管理 (不需要 WorkspacesAuth 中间件)
		// 用户在这里创建空间、查看自己加入了哪些空间
		workspacesRg := apiRg.Group("/workspaces")
		{
			workspacesRg.POST("/create", workspaceCtrl.Create) // 创建工作区
			// 注意：雖然在 /workspace 組下，但具體刪除哪個 ID 建議還是由 Body 或 Param 傳入以確保安全
			workspacesRg.DELETE("/:id", workspaceCtrl.Delete)
			workspacesRg.POST("/leave", workspaceCtrl.Leave)
			workspacesRg.GET("/mine", workspaceCtrl.MyList)   // 获取我的工作区列表
			workspacesRg.GET("/init", workspaceCtrl.InitData) // 初始化侧边栏数据
			workspacesRg.POST("/switchDefault", workspaceCtrl.SwitchDefault)
			workspacesRg.POST("/access", workspaceCtrl.Access) // 更新最後訪問時間並切換
			workspacesRg.POST("/acceptInvite", workspaceCtrl.AcceptInvite)
			workspacesRg.POST("/rejectInvite", workspaceCtrl.RejectInvite)
			workspacesRg.POST("/:id/join-request", joinReqCtrl.RequestWorkspace)
		}

		// 文件管理 (通常作为基础服务，直接挂在 api 下)
		fileRg := apiRg.Group("/file")
		{
			//fileRg.POST("/list", fileCtrl.List)
			//fileRg.POST("/delete", fileCtrl.Delete)
			//fileRg.POST("/upload", fileCtrl.Upload)
			fileRg.POST("/check", fileCtrl.CheckChunks)
			fileRg.POST("/upload", fileCtrl.UploadChunks)
			fileRg.POST("/merge", fileCtrl.MergeChunks)
		}

		// B. 特定工作区内的业务操作 (需要 WorkspacesAuth 校验成员身份)
		// 此时请求头必须携带 X-Workspace-ID
		workspaceRg := apiRg.Group("/workspace")
		workspaceRg.Use(middleware.WorkspacesAuth(workspaceUserSrv))
		{
			workspaceRg.POST("/update", workspaceCtrl.Update)
			// 固定路径必须注册在 /:id 之前，否则例如 GET /members 会命中 GetDetail(id="members")
			workspaceRg.GET("/members", workspaceCtrl.GetMembers)
			workspaceRg.GET("/searchForWorkspaceInvite", userCtrl.SearchForWorkpaceInvite)
			workspaceRg.GET("/searchForSpaceInvite", userCtrl.SearchForSpaceInvite)
			workspaceRg.GET("/searchForSpaceMembers", userCtrl.SearchForSpaceMembers)
			workspaceRg.GET("/:id", workspaceCtrl.GetDetail)
			workspaceRg.POST("/invite", workspaceCtrl.Invite)
			workspaceRg.POST("/updateRole", workspaceCtrl.UpdateRole)
			workspaceRg.POST("/transferOwner", workspaceCtrl.TransferOwner)
			workspaceRg.POST("/removeMember", workspaceCtrl.RemoveMember)
			// 查看当前工作区的网盘容量使用进度
			workspaceRg.GET("/quota", workspaceCtrl.GetQuotaBoard)

			spaceRg := workspaceRg.Group("/space")
			{
				spaceRg.GET("/list", spaceCtrl.List)
				spaceRg.POST("/create", spaceCtrl.Create)
				// 固定路径须先于 /:id 注册；库加入申请（Body: space_id + message）
				spaceRg.POST("/join-request", joinReqCtrl.RequestSpaceJSON)
				spaceRg.GET("/members", spaceCtrl.GetMembers)
				spaceRg.GET("/:id", spaceCtrl.GetDetail)
				spaceRg.POST("/update", spaceCtrl.Update)
				spaceRg.DELETE("/:id", spaceCtrl.Delete)
				spaceRg.POST("/invite", spaceCtrl.Invite)
				spaceRg.POST("/acceptInvite", spaceCtrl.AcceptInvite)
				spaceRg.POST("/rejectInvite", spaceCtrl.RejectInvite)
				spaceRg.POST("/leave", spaceCtrl.Leave)
				spaceRg.POST("/removeMember", spaceCtrl.RemoveMember)
				spaceRg.POST("/updateRole", spaceCtrl.UpdateRole)
				spaceRg.POST("/transferOwner", spaceCtrl.TransferOwner)
				spaceRg.POST("/resetOwner", spaceCtrl.ResetOwner)
				spaceRg.POST("/:id/join-request", joinReqCtrl.RequestSpace)
			}

			// 页面树/文档管理
			pageRg := workspaceRg.Group("/page")
			{
				pageRg.GET("/tree", pageCtrl.Tree)                        // 获取页面树
				pageRg.POST("/touchRecent", pageCtrl.TouchRecent)         // 最近打开打点
				pageRg.POST("/star", pageCtrl.SetStar)                    // 收藏/取消
				pageRg.GET("/myRecent", pageCtrl.MyRecent)                // 最近列表
				pageRg.GET("/myStarred", pageCtrl.MyStarred)              // 收藏列表
				pageRg.GET("/detail", pageCtrl.Detail)                    // 获取详情
				pageRg.POST("/create", pageCtrl.Create)                   // 创建页面
				pageRg.POST("/updateMeta", pageCtrl.UpdateMeta)           // 标题/可见性/继承
				pageRg.POST("/move", pageCtrl.Move)                       // 拖拽移动
				pageRg.POST("/save", pageCtrl.Save)                       // 全文保存（归档上一版）
				pageRg.POST("/savePatch", pageCtrl.SavePatch)             // JSON Patch 增量保存
				pageRg.GET("/revisions", pageCtrl.ListRevisions)          // 快照列表
				pageRg.GET("/revision", pageCtrl.GetRevision)             // 单版本快照正文
				pageRg.POST("/restoreRevision", pageCtrl.RestoreRevision) // 恢复到某快照为新版本
				pageRg.DELETE("/delete", pageCtrl.Delete)                 // 删除页面
			}
		}
	}

	// 初始化文档wx
	//docCtrl := controller.DocCtrl{}
	//r.GET("/docWs", docCtrl.HandleWebSocket)

	// 初始化聊天室
	//m := ws.NewManager()
	//go m.Run()
	//r.GET("/ws", m.WebSocketHandler)
	// --- 3. 前端路由兜底（SPA Fallback） ---
	// 关键点：如果 URL 不匹配以上任何 API，且不是静态文件，
	// 则统一返回 index.html，让前端 React/Vue Router 接管解析。
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// API 路径 404 返回 JSON
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/oauth") {
			c.JSON(404, gin.H{"code": 404, "msg": "接口路径不存在"})
			return
		}
		// 页面路径返回前端 index.html（与 main 中 dist 根目录一致）
		idx := config.Get().Web.IndexHtml
		if idx == "" {
			idx = "./web/dist/index.html"
		}
		// 不用 c.File：避免 ServeContent 按修改时间返回 304，本地开发反复 304、壳与 assets hash 不一致
		html, err := os.ReadFile(idx)
		if err != nil {
			c.String(http.StatusNotFound, "index.html not found")
			return
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", html)
	})

	return webhookDisp
}
