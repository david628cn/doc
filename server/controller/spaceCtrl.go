package controller

import (
	"app/errs"
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SpaceCtrl struct {
	SpaceSrv         *services.SpaceService
	SpaceAccessSrv   *services.SpaceAccessService
	InviteSrv        *services.InviteService
	WorkspaceUserSrv *services.WorkspaceUserService
}

func NewSpaceCtrl(spaceSrv *services.SpaceService, spaceAccessSrv *services.SpaceAccessService, inviteSrv *services.InviteService, workspaceUserSrv *services.WorkspaceUserService) *SpaceCtrl {
	return &SpaceCtrl{
		SpaceSrv:         spaceSrv,
		SpaceAccessSrv:   spaceAccessSrv,
		InviteSrv:        inviteSrv,
		WorkspaceUserSrv: workspaceUserSrv,
	}
}

// List 查找空間列表
func (c *SpaceCtrl) List(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	var p playload.SpaceQueryParam
	if err := ctx.ShouldBindQuery(&p); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}

	p.WorkspaceID = wsID
	p.UserID = user.ID
	p.WithMembers = true

	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}

	list, total, err := c.SpaceSrv.SearchUserSpaces(ctx, p)
	if err != nil {
		playload.SendError(ctx, "获取库列表失败")
		return
	}

	playload.SendSuccess(ctx, playload.PaginationData{
		List:  list,
		Total: total,
	}, "获取成功")
}

// Create 創建新空間
func (c *SpaceCtrl) Create(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	var req playload.CreateSpaceReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	wu, err := c.WorkspaceUserSrv.FindByUser(ctx.Request.Context(), wsID, user.ID)
	if err != nil {
		playload.SendError(ctx, "权限校验失败")
		return
	}
	if wu == nil {
		playload.SendErr(ctx, errs.ErrNotWorkspaceMember)
		return
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceAdmin) {
		playload.SendErr(ctx, errs.ErrInsufficientWorkspaceRoleAdmin)
		return
	}

	space := &model.Space{
		ID:          uuid.New(),
		WorkspaceID: wsID,
		Name:        req.Name,
		Description: req.Description,
		Icon:        req.Icon,
		Visibility:  req.Visibility,
		CreateBy:    user.ID,
	}

	if err := c.SpaceSrv.CreateWithAccess(ctx, space); err != nil {
		playload.SendError(ctx, "创建失败")
		return
	}

	playload.SendSuccess(ctx, space, "创建成功")
}

// GetDetail 获取空间详情及其权限角色
func (c *SpaceCtrl) GetDetail(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	idStr := ctx.Param("id")
	spaceID, err := uuid.Parse(idStr)
	if err != nil {
		playload.SendError(ctx, "无效的库")
		return
	}

	detail, err := c.SpaceSrv.GetSpaceInfoWithAccess(ctx, spaceID, user.ID, wsID)
	if err != nil {
		playload.SendError(ctx, "未找到空间或无访问权限")
		return
	}
	playload.SendSuccess(ctx, detail, "获取成功")
}

// Update 更新知識庫
func (c *SpaceCtrl) Update(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	var req playload.UpdateSpaceBaseReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	detail, err := c.SpaceSrv.GetSpaceInfoWithAccess(ctx, req.ID, user.ID, wsID)
	if err != nil {
		playload.SendError(ctx, "库不存在")
		return
	}

	currentWeight := model.GetSpaceRoleWeight(detail.Role)
	adminWeight := model.GetSpaceRoleWeight(model.SpaceRoleAdmin)

	if currentWeight < adminWeight {
		playload.SendForbidden(ctx, "权限不足：仅管理员或空间所有者可修改空间设置")
		return
	}

	updateData := map[string]interface{}{
		"update_by": user.ID,
	}
	if req.Name != nil {
		updateData["name"] = *req.Name
	}
	if req.Description != nil {
		updateData["description"] = *req.Description
	}
	if req.Icon != nil {
		updateData["icon"] = *req.Icon
	}

	if err = c.SpaceSrv.Update(ctx, req.ID, wsID, updateData); err != nil {
		playload.SendError(ctx, "更新失败")
		return
	}

	playload.SendSuccess(ctx, nil, "更新成功")
}

// Delete 刪除知識庫（仅空间 owner）
func (c *SpaceCtrl) Delete(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	//var req struct {
	//	ID uuid.UUID `json:"id" binding:"required"`
	//}
	//if err := ctx.ShouldBindJSON(&req); err != nil {
	//	playload.SendError(ctx, "参数错误")
	//	return
	//}

	spaceIDStr := ctx.Param("id")
	spaceID, err := uuid.Parse(spaceIDStr)
	if err != nil {
		playload.SendError(ctx, "无效的工作区ID格式")
		return
	}

	if err := c.SpaceSrv.SoftDelete(ctx, spaceID, wsID, user.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, nil, "刪除成功")
}

// GetMembers 获取空间成员列表
func (c *SpaceCtrl) GetMembers(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	spaceID, err := uuid.Parse(ctx.Query("space_id"))
	if err != nil || spaceID == uuid.Nil {
		playload.SendError(ctx, "无效的空间 ID")
		return
	}
	search := ctx.Query("search")

	detail, err := c.SpaceSrv.GetSpaceInfoWithAccess(ctx, spaceID, user.ID, wsID)
	if err != nil {
		playload.SendForbidden(ctx, "无权查看成员列表")
		return
	}
	if model.GetSpaceRoleWeight(detail.Role) < model.GetSpaceRoleWeight(model.SpaceRoleAdmin) {
		playload.SendForbidden(ctx, "无权查看成员列表")
		return
	}

	list, err := c.SpaceSrv.GetMemberList(ctx, wsID, spaceID, search)
	if err != nil {
		playload.SendError(ctx, "获取成员失败")
		return
	}

	playload.SendSuccess(ctx, list, "获取成功")
}

// Invite 邀请加入库
func (c *SpaceCtrl) Invite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	wsID := utils.GetWorkspaceID(ctx)

	var req playload.SpaceInviteReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if c.InviteSrv == nil {
		playload.SendError(ctx, "服务未就绪")
		return
	}

	title, content, err := services.FormatSpaceInviteNotification(ctx.Request.Context(), c.SpaceSrv.GetDB(ctx.Request.Context()), wsID, req.SpaceID, user.ID)
	if err != nil {
		playload.SendError(ctx, "生成邀请文案失败")
		return
	}

	err = c.InviteSrv.Send(ctx, &services.InviteSendOpts{
		WorkspaceID: wsID,
		ScopeType:   model.InviteScopeSpace,
		ScopeID:     req.SpaceID,
		InviterID:   user.ID,
		InviteeID:   req.InviteeID,
		Role:        req.Role,
		Title:       title,
		Content:     content,
		MsgType:     model.MsgTypeSpaceInvite,
		BuildLink: func(id uuid.UUID) string {
			return fmt.Sprintf("/space_invite/accept/%s", id)
		},
	})
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "邀请已发送")
}

// AcceptInvite 接受库邀请
func (c *SpaceCtrl) AcceptInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	var req playload.InviteIDReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if c.InviteSrv == nil {
		playload.SendError(ctx, "服务未就绪")
		return
	}
	if err := c.InviteSrv.Accept(ctx, req.InviteID, user.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "已接收邀请")
}

// RejectInvite 拒绝库邀请
func (c *SpaceCtrl) RejectInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	var req playload.InviteIDReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if c.InviteSrv == nil {
		playload.SendError(ctx, "服务未就绪")
		return
	}
	if err := c.InviteSrv.Reject(ctx, req.InviteID, user.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "已拒绝该邀请")
}

// Leave 当前用户退出库
func (c *SpaceCtrl) Leave(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	var req playload.SpaceLeaveReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if err := c.SpaceAccessSrv.LeaveSpace(ctx.Request.Context(), wsID, req.SpaceID, user.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "已退出该库")
}

// RemoveMember 移除库成员
func (c *SpaceCtrl) RemoveMember(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	var req playload.SpaceRemoveMemberReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if user.ID == req.TargetUserID {
		playload.SendError(ctx, "不能移除自己")
		return
	}
	if err := c.SpaceAccessSrv.RemoveMember(ctx, wsID, req.SpaceID, user.ID, req.TargetUserID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "移除成功")
}

// UpdateRole 修改库成员角色
func (c *SpaceCtrl) UpdateRole(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	var req playload.SpaceMemberRoleReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if err := c.SpaceAccessSrv.UpdateMemberRole(ctx, wsID, req.SpaceID, user.ID, req.TargetUserID, req.NewRole); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "权限更新成功")
}

// ResetOwner 当库无 sys_space_access Owner 时，由工作区管理员指定新 Owner（审计 sys_audit_log）
func (c *SpaceCtrl) ResetOwner(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	var req playload.SpaceResetOwnerReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	wu, err := c.WorkspaceUserSrv.FindByUser(ctx.Request.Context(), wsID, user.ID)
	if err != nil || wu == nil {
		playload.SendErr(ctx, errs.ErrNotWorkspaceMember)
		return
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceAdmin) {
		playload.SendForbidden(ctx, "仅工作区管理员或所有者可执行重置")
		return
	}
	newOwnerID := user.ID
	if req.NewOwnerID != nil && *req.NewOwnerID != uuid.Nil {
		newOwnerID = *req.NewOwnerID
	}
	if err := c.SpaceAccessSrv.ResetOwner(ctx.Request.Context(), wsID, req.SpaceID, user.ID, newOwnerID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "已重置库 Owner")
}

// TransferOwner 转让库所有权
func (c *SpaceCtrl) TransferOwner(ctx *gin.Context) {
	wsID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	var req playload.SpaceTransferOwnerReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	if err := c.SpaceAccessSrv.TransferOwner(ctx, wsID, req.SpaceID, user.ID, req.NewOwnerID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	playload.SendSuccess(ctx, nil, "所有权已成功转让")
}
