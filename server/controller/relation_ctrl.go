package controller

import (
	"app/playload"
	"app/services"
	"app/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RelationCtrl struct {
	Srv  *services.RelationService
	Chat *services.ChatService
}

func NewRelationCtrl(srv *services.RelationService, chat *services.ChatService) *RelationCtrl {
	return &RelationCtrl{Srv: srv, Chat: chat}
}

func parsePage(ctx *gin.Context) (page, pageSize int) {
	page, _ = strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ = strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
	return page, pageSize
}

// POST /api/social/follows { "followee_id": "uuid" }
func (c *RelationCtrl) Follow(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var req struct {
		FolloweeID string `json:"followee_id"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	followeeID, err := uuid.Parse(strings.TrimSpace(req.FolloweeID))
	if err != nil {
		playload.SendError(ctx, "无效的用户 id")
		return
	}
	if err := c.Srv.Follow(ctx.Request.Context(), me.ID, followeeID); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已关注")
}

// DELETE /api/social/follows/:userId
func (c *RelationCtrl) Unfollow(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	uid, err := uuid.Parse(strings.TrimSpace(ctx.Param("userId")))
	if err != nil {
		playload.SendError(ctx, "无效的用户 id")
		return
	}
	if err := c.Srv.Unfollow(ctx.Request.Context(), me.ID, uid); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已取消关注")
}

func (c *RelationCtrl) FollowingList(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	page, pageSize := parsePage(ctx)
	res, err := c.Srv.FollowingList(ctx.Request.Context(), me.ID, page, pageSize)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	if c.Chat != nil {
		c.Chat.EnrichFollowRows(ctx.Request.Context(), me.ID, res.List)
	}
	playload.SendSuccess(ctx, res, "ok")
}

func (c *RelationCtrl) FollowersList(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	page, pageSize := parsePage(ctx)
	res, err := c.Srv.FollowersList(ctx.Request.Context(), me.ID, page, pageSize)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	if c.Chat != nil {
		c.Chat.EnrichFollowRows(ctx.Request.Context(), me.ID, res.List)
	}
	playload.SendSuccess(ctx, res, "ok")
}

// POST /api/social/friends/apply { "user_id": "", "message": "" }
func (c *RelationCtrl) FriendApply(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var req struct {
		UserID  string `json:"user_id"`
		Message string `json:"message"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	toID, err := uuid.Parse(strings.TrimSpace(req.UserID))
	if err != nil {
		playload.SendError(ctx, "无效的用户 id")
		return
	}
	if err := c.Srv.FriendApply(ctx.Request.Context(), me.ID, toID, req.Message); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "申请已发送")
}

func (c *RelationCtrl) FriendIncoming(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	page, pageSize := parsePage(ctx)
	res, err := c.Srv.FriendIncoming(ctx.Request.Context(), me.ID, page, pageSize)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, res, "ok")
}

func (c *RelationCtrl) FriendOutgoing(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	page, pageSize := parsePage(ctx)
	res, err := c.Srv.FriendOutgoing(ctx.Request.Context(), me.ID, page, pageSize)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, res, "ok")
}

func (c *RelationCtrl) FriendList(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	page, pageSize := parsePage(ctx)
	res, err := c.Srv.FriendList(ctx.Request.Context(), me.ID, page, pageSize)
	if err != nil {
		playload.SendInternalError(ctx, err.Error())
		return
	}
	if c.Chat != nil {
		c.Chat.EnrichFriendRows(ctx.Request.Context(), me.ID, res.List)
	}
	playload.SendSuccess(ctx, res, "ok")
}

// PATCH /api/social/friends/remark { "peer_id": "", "remark": "" }
func (c *RelationCtrl) FriendUpdateRemark(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var req struct {
		PeerID string `json:"peer_id"`
		Remark string `json:"remark"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数无效")
		return
	}
	peerID, err := uuid.Parse(strings.TrimSpace(req.PeerID))
	if err != nil {
		playload.SendError(ctx, "无效的用户 id")
		return
	}
	if err := c.Srv.UpdateFriendRemark(ctx.Request.Context(), me.ID, peerID, req.Remark); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true})
}

func (c *RelationCtrl) FriendAccept(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(ctx.Param("id")))
	if err != nil {
		playload.SendError(ctx, "无效的 id")
		return
	}
	if err := c.Srv.FriendAccept(ctx.Request.Context(), me.ID, id); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已同意")
}

func (c *RelationCtrl) FriendReject(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(ctx.Param("id")))
	if err != nil {
		playload.SendError(ctx, "无效的 id")
		return
	}
	if err := c.Srv.FriendReject(ctx.Request.Context(), me.ID, id); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已拒绝")
}

func (c *RelationCtrl) FriendRemove(ctx *gin.Context) {
	me := utils.GetCurrentUser(ctx)
	if me == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(ctx.Param("id")))
	if err != nil {
		playload.SendError(ctx, "无效的 id")
		return
	}
	if err := c.Srv.FriendRemove(ctx.Request.Context(), me.ID, id); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"ok": true}, "已删除")
}
