package controller

import (
	"app/playload"
	"app/services"
	"app/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type JoinRequestCtrl struct {
	Srv *services.JoinRequestService
}

func NewJoinRequestCtrl(srv *services.JoinRequestService) *JoinRequestCtrl {
	return &JoinRequestCtrl{Srv: srv}
}

// RequestWorkspace POST /api/workspaces/:id/join-request
func (c *JoinRequestCtrl) RequestWorkspace(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	wid, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		playload.SendError(ctx, "无效的工作区 ID")
		return
	}
	var body playload.JoinRequestBody
	_ = ctx.ShouldBindJSON(&body)
	if err := c.Srv.RequestJoinWorkspace(ctx, user.ID, wid, body.Message); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "申请已提交，管理员将收到通知")
}

// RequestSpace POST /api/workspace/space/:id/join-request
func (c *JoinRequestCtrl) RequestSpace(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	sid, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		playload.SendError(ctx, "无效的库 ID")
		return
	}
	wsID := utils.GetWorkspaceID(ctx)
	if wsID == uuid.Nil {
		playload.SendError(ctx, "请选择工作区")
		return
	}
	var body playload.JoinRequestBody
	_ = ctx.ShouldBindJSON(&body)
	if err := c.Srv.RequestJoinSpace(ctx, user.ID, wsID, sid, body.Message); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "申请已提交，管理员将收到通知")
}

// RequestSpaceJSON POST /api/workspace/space/join-request（Body 携带 space_id，推荐；与 RequestSpace 逻辑相同）
func (c *JoinRequestCtrl) RequestSpaceJSON(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var body playload.JoinRequestSpaceJSONBody
	if err := ctx.ShouldBindJSON(&body); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}
	sid, err := uuid.Parse(strings.TrimSpace(body.SpaceID))
	if err != nil {
		playload.SendError(ctx, "无效的库 ID")
		return
	}
	wsID := utils.GetWorkspaceID(ctx)
	if wsID == uuid.Nil {
		playload.SendError(ctx, "请选择工作区")
		return
	}
	if err := c.Srv.RequestJoinSpace(ctx, user.ID, wsID, sid, body.Message); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "申请已提交，管理员将收到通知")
}

// ListSent GET /api/join-requests/sent
func (c *JoinRequestCtrl) ListSent(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	var params playload.PaginationReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}
	off := playload.OffsetLimitData(params.PageNum, params.PageSize)
	list, total, err := c.Srv.ListSentByApplicant(ctx, user.ID, off.Offset, off.Limit)
	if err != nil {
		playload.SendInternalError(ctx, "查询失败")
		return
	}
	playload.SendSuccess(ctx, playload.PaginationData{Total: total, List: list})
}

// Approve POST /api/join-requests/:id/approve
func (c *JoinRequestCtrl) Approve(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		playload.SendError(ctx, "无效的申请 ID")
		return
	}
	noop, err := c.Srv.ApproveJoinRequest(ctx, id, user.ID)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}
	if noop {
		ctx.JSON(http.StatusOK, playload.Response{Code: 200, Data: nil, Message: ""})
		return
	}
	playload.SendSuccess(ctx, nil, "已通过申请")
}

// Reject POST /api/join-requests/:id/reject
func (c *JoinRequestCtrl) Reject(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		playload.SendError(ctx, "无效的申请 ID")
		return
	}
	noop, err := c.Srv.RejectJoinRequest(ctx, id, user.ID)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}
	if noop {
		ctx.JSON(http.StatusOK, playload.Response{Code: 200, Data: nil, Message: ""})
		return
	}
	playload.SendSuccess(ctx, nil, "已拒绝申请")
}
