package controller

import (
	"app/playload"
	"app/services"
	"app/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ChatCtrl struct {
	ChatSrv *services.ChatService
}

func NewChatCtrl(chatSrv *services.ChatService) *ChatCtrl {

	return &ChatCtrl{ChatSrv: chatSrv}
}

func (c *ChatCtrl) History(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	roomID := strings.TrimSpace(ctx.Query("room_id"))
	if roomID == "" {
		playload.SendError(ctx, "未指定房间ID")
		return
	}

	// 平台私聊与群聊仅按 room_id 查；旧版绑定工作区的私聊仍按工作区隔离
	var wsID uuid.UUID
	if services.IsPlatformChatRoom(roomID) {
		wsID = uuid.Nil
	} else {
		var err error
		wsID, err = c.ChatSrv.ResolveWorkspaceID(ctx, me.ID, ctx.Query("workspace_id"))
		if err != nil {
			playload.SendError(ctx, err.Error())
			return
		}
	}

	lastTimeStr := ctx.Query("last_time")
	var lastTime *time.Time
	if lastTimeStr != "" {
		t, err := time.Parse(time.RFC3339, lastTimeStr)
		if err == nil {
			lastTime = &t
		}
	}

	messages, err := c.ChatSrv.GetChatHistory(ctx.Request.Context(), roomID, wsID, 30, lastTime)
	if err != nil {
		playload.SendError(ctx, "获取历史消息失败: "+err.Error())
		return
	}
	playload.SendSuccess(ctx, messages)
}

// POST /api/social/chat/read
func (c *ChatCtrl) MarkSocialRead(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var req struct {
		WorkspaceID string `json:"workspace_id"`
		RoomID      string `json:"room_id"`
		ReadAt      string `json:"read_at"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	roomIDTrim := strings.TrimSpace(req.RoomID)
	if roomIDTrim == "" {
		playload.SendError(ctx, "未指定 room_id")
		return
	}
	var wsPtr *uuid.UUID
	if services.IsPlatformChatRoom(roomIDTrim) {
		wsPtr = nil
	} else {
		ws, err := c.ChatSrv.ResolveWorkspaceID(ctx, me.ID, req.WorkspaceID)
		if err != nil {
			playload.SendError(ctx, err.Error())
			return
		}
		wsPtr = &ws
	}
	readAt := time.Now()
	if req.ReadAt != "" {
		if t, e := time.Parse(time.RFC3339Nano, req.ReadAt); e == nil {
			readAt = t
		} else if t2, e2 := time.Parse(time.RFC3339, req.ReadAt); e2 == nil {
			readAt = t2
		}
	}
	if err := c.ChatSrv.MarkRoomRead(ctx, me.ID, wsPtr, roomIDTrim, readAt); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// GET /api/social/chat/groups — 平台级群列表，与工作区无关（workspace_id 查询参数已忽略）
func (c *ChatCtrl) ListSocialGroups(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	list, err := c.ChatSrv.ListGroupChats(ctx, me.ID)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"list": list, "total": len(list)})
}

// POST /api/social/chat/groups  { name, member_ids:[] } — 平台级群，不绑定 workspace
func (c *ChatCtrl) CreateSocialGroup(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var req struct {
		Name      string   `json:"name"`
		MemberIDs []string `json:"member_ids"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	var mids []uuid.UUID
	for _, s := range req.MemberIDs {
		u, err := uuid.Parse(strings.TrimSpace(s))
		if err != nil || u == me.ID {
			continue
		}
		mids = append(mids, u)
	}
	g, err := c.ChatSrv.CreateGroup(ctx, me.ID, req.Name, mids)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{
		"group_id": g.ID.String(),
		"room_id":  services.GroupRoomID(g.ID),
		"name":     g.Name,
	})
}

// GET /api/social/chat/groups/:groupId
func (c *ChatCtrl) GetSocialGroup(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	out, err := c.ChatSrv.GetGroupDetail(ctx.Request.Context(), me.ID, gid)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, out)
}

// PATCH /api/social/chat/groups/:groupId  { "name"|"announcement"|"head_sculpture": 可选 } — 至少一项；名称/公告/头像仅群主可改
func (c *ChatCtrl) PatchSocialGroup(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	var req struct {
		Name          *string `json:"name"`
		Announcement  *string `json:"announcement"`
		HeadSculpture *string `json:"head_sculpture"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	if req.Name == nil && req.Announcement == nil && req.HeadSculpture == nil {
		playload.SendError(ctx, "请提供 name、announcement 或 head_sculpture")
		return
	}
	if req.Name != nil {
		if err := c.ChatSrv.UpdateGroupName(ctx.Request.Context(), me.ID, gid, *req.Name); err != nil {
			playload.SendError(ctx, err.Error())
			return
		}
	}
	if req.Announcement != nil {
		if err := c.ChatSrv.UpdateGroupAnnouncement(ctx.Request.Context(), me.ID, gid, *req.Announcement); err != nil {
			playload.SendError(ctx, err.Error())
			return
		}
	}
	if req.HeadSculpture != nil {
		if err := c.ChatSrv.UpdateGroupAvatar(ctx.Request.Context(), me.ID, gid, *req.HeadSculpture); err != nil {
			playload.SendError(ctx, err.Error())
			return
		}
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// PATCH /api/social/chat/groups/:groupId/my-alias { "alias": "" } — 本人在群内的显示别名
func (c *ChatCtrl) PatchSocialGroupMyAlias(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	var req struct {
		Alias string `json:"alias"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	if err := c.ChatSrv.UpdateMyGroupAlias(ctx.Request.Context(), me.ID, gid, req.Alias); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// POST /api/social/chat/groups/:groupId/transfer-owner { "new_owner_id": "" } — 群主转让
func (c *ChatCtrl) TransferSocialGroupOwner(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	var req struct {
		NewOwnerID string `json:"new_owner_id"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	newOwner, err := uuid.Parse(strings.TrimSpace(req.NewOwnerID))
	if err != nil {
		playload.SendError(ctx, "无效的新群主用户 id")
		return
	}
	if err := c.ChatSrv.TransferGroupOwnership(ctx.Request.Context(), me.ID, gid, newOwner); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// DELETE /api/social/chat/groups/:groupId/members/:userId — 群主移除成员
func (c *ChatCtrl) RemoveSocialGroupMember(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	tuid, err := uuid.Parse(strings.TrimSpace(ctx.Param("userId")))
	if err != nil {
		playload.SendError(ctx, "无效的用户 id")
		return
	}
	if err := c.ChatSrv.RemoveGroupMember(ctx.Request.Context(), me.ID, gid, tuid); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// POST /api/social/chat/groups/:groupId/invites  { "member_ids": [] } — 邀请入群（待对方同意）
func (c *ChatCtrl) InviteSocialGroupMembers(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	var req struct {
		MemberIDs []string `json:"member_ids"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	var mids []uuid.UUID
	for _, s := range req.MemberIDs {
		u, err := uuid.Parse(strings.TrimSpace(s))
		if err != nil || u == me.ID {
			continue
		}
		mids = append(mids, u)
	}
	if err := c.ChatSrv.InviteGroupMembers(ctx.Request.Context(), me.ID, gid, mids); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// POST /api/social/chat/groups/:groupId/apply  { "message": "" } — 申请入群（群主审批）
func (c *ChatCtrl) ApplySocialGroupJoin(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	var req struct {
		Message string `json:"message"`
	}
	_ = ctx.ShouldBindJSON(&req)
	if err := c.ChatSrv.ApplyJoinGroup(ctx.Request.Context(), me.ID, gid, req.Message); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// POST /api/social/chat/group-invites/:inviteId/respond  { "accept": true }
func (c *ChatCtrl) RespondSocialGroupInvite(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	iid, err := uuid.Parse(strings.TrimSpace(ctx.Param("inviteId")))
	if err != nil {
		playload.SendError(ctx, "无效的邀请 id")
		return
	}
	var req struct {
		Accept bool `json:"accept"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	if err := c.ChatSrv.RespondGroupInvite(ctx.Request.Context(), me.ID, iid, req.Accept); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

// GET /api/social/chat/group-invites/pending — 待处理群邀请/入群申请
func (c *ChatCtrl) ListSocialGroupInvitesPending(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	out, err := c.ChatSrv.ListPendingGroupInvites(ctx.Request.Context(), me.ID)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, out)
}

// POST /api/social/chat/groups/:groupId/leave
func (c *ChatCtrl) LeaveSocialGroup(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	gid, err := uuid.Parse(strings.TrimSpace(ctx.Param("groupId")))
	if err != nil {
		playload.SendError(ctx, "无效的群 id")
		return
	}
	if err := c.ChatSrv.LeaveGroup(ctx.Request.Context(), me.ID, gid); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}
