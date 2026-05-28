package controller

import (
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserCtrl struct {
	UserSrv *services.UserService
}

func NewUserCtrl(userSrv *services.UserService) *UserCtrl {
	return &UserCtrl{
		UserSrv: userSrv,
	}
}

func (c *UserCtrl) UpdateProfile(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "用户未登录")
		return
	}
	var req playload.UpdateUserProfileReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	u, err := c.UserSrv.UpdateProfile(ctx, user.ID, &req)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, u, "更新成功")
}

func (c *UserCtrl) ChangePassword(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "用户未登录")
		return
	}
	var req playload.ChangePasswordReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if err := c.UserSrv.ChangePassword(ctx, user.ID, req.OldPassword, req.NewPassword); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, true, "密码已修改，请重新登录")
}

func (c *UserCtrl) Me(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "用户未登录")
		return
	}

	// 2. 查詢工作區列表 (按 last_access_time 排序)
	workspaces, _ := c.UserSrv.WorkspaceUserSrv.GetUserWorkspaceList(ctx, user.ID)

	var currentWorkspace *playload.UserWorkspaceData
	var spaces []model.Space

	// 3. 獲取當前上下文（最後訪問的空間及其下的知識庫）
	if len(workspaces) > 0 {
		currentWorkspace = &workspaces[0] // 排序後的第一個即為 current

		// 查詢該空間下的 Space 列表
		spaces, _ = c.UserSrv.SpaceSrv.FindUserSpaces(ctx, currentWorkspace.WorkspaceID, user.ID)
	}

	// 4. 返回數據
	playload.SendSuccess(ctx, gin.H{
		"user":              user,
		"current_workspace": currentWorkspace,
		"workspaces":        workspaces,
		"spaces":            spaces,
	}, "请求成功")
}

func (c *UserCtrl) Search(ctx *gin.Context) {
	keyword := strings.TrimSpace(ctx.Query("keyword"))
	if keyword == "" {
		playload.SendError(ctx, "请输入搜索关键字")
		return
	}

	var viewerID *uuid.UUID
	if me := utils.GetCurrentUser(ctx); me != nil {
		viewerID = &me.ID
	}

	users, err := c.UserSrv.Search(ctx, keyword, 100, viewerID)
	if err != nil {
		playload.SendError(ctx, "搜索失败")
		return
	}

	playload.SendSuccess(ctx, users)
}

func (c *UserCtrl) SearchForWorkpaceInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	keyword := ctx.Query("keyword")
	if keyword == "" {
		playload.SendError(ctx, "请输入搜索关键字")
		return
	}

	users, err := c.UserSrv.SearchForWorkspaceInvite(ctx, keyword, utils.GetWorkspaceID(ctx), user.ID, 100)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, users)
}

func (c *UserCtrl) SearchForSpaceInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	keyword := ctx.Query("keyword")
	spaceIDStr := ctx.Query("space_id")

	if spaceIDStr == "" {
		playload.SendError(ctx, "请提供 space_id")
		return
	}

	spaceID, err := uuid.Parse(spaceIDStr)
	if err != nil {
		playload.SendError(ctx, "无效的 Space ID")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	limit := 50
	if ls := ctx.Query("limit"); ls != "" {
		if n, e := strconv.Atoi(ls); e == nil && n > 0 {
			limit = n
		}
	}

	users, err := c.UserSrv.SearchForSpaceInvite(ctx, keyword, workspaceID, spaceID, user.ID, limit)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, users)
}

// SearchForSpaceMembers 搜索当前库成员（含创建者、个人/组授权展开），仅库 admin/owner
func (c *UserCtrl) SearchForSpaceMembers(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	keyword := ctx.Query("keyword")
	spaceIDStr := ctx.Query("space_id")
	if spaceIDStr == "" {
		playload.SendError(ctx, "请提供 space_id")
		return
	}
	spaceID, err := uuid.Parse(spaceIDStr)
	if err != nil {
		playload.SendError(ctx, "无效的 Space ID")
		return
	}
	workspaceID := utils.GetWorkspaceID(ctx)

	users, err := c.UserSrv.SearchSpaceMembers(ctx, keyword, workspaceID, spaceID, user.ID, 100)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, users)
}

// RegisterPushDevice POST /api/me/push-device — 上报 FCM/APNs device token，供后续离线推送。
func (c *UserCtrl) RegisterPushDevice(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "用户未登录")
		return
	}
	var req struct {
		Platform string `json:"platform"`
		Token    string `json:"token"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	if err := c.UserSrv.UpsertPushDevice(ctx.Request.Context(), user.ID, req.Platform, req.Token); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已注册")
}
