package controller

import (
	"app/errs"
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"math"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type WorkspaceCtrl struct {
	WorkspaceSrv      *services.WorkspaceService
	WorkspaceUserSrv  *services.WorkspaceUserService
	WorkspaceQuotaSrv *services.WorkspaceQuotaService
}

func NewWorkspaceCtrl(workspaceSrv *services.WorkspaceService, workspaceUserSrv *services.WorkspaceUserService, workspaceQuotaSrv *services.WorkspaceQuotaService) *WorkspaceCtrl {
	return &WorkspaceCtrl{
		WorkspaceUserSrv:  workspaceUserSrv,
		WorkspaceSrv:      workspaceSrv,
		WorkspaceQuotaSrv: workspaceQuotaSrv,
	}
}

func (c *WorkspaceCtrl) Create(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendError(ctx, "未登录")
		return
	}

	var req playload.CreateWorkspaceReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}

	workspaceID := uuid.New()
	now := time.Now()
	newWorkspace := &model.Workspace{
		ID:          workspaceID,
		Name:        req.Name,
		Description: req.Description,
		Icon:        req.Icon,
		Slug:        workspaceID.String(),
		CreateTime:  now,
		UpdateTime:  now,
	}

	// 传递 permission，让 Service 去处理 Settings 字段
	err := c.WorkspaceSrv.CreateWithAdmin(ctx, newWorkspace, user.ID)
	if err != nil {
		playload.SendError(ctx, "创建失败")
		return
	}

	playload.SendSuccess(ctx, newWorkspace, "创建成功")
}

// Update 更新工作区信息 (对齐 SpaceCtrl.Update 风格)
func (c *WorkspaceCtrl) Update(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	var req playload.UpdateWorkspaceBaseReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	// 1. 获取详情（Service 内部已调用 calculateRole 算出实权）
	detail, err := c.WorkspaceSrv.GetWorkspaceInfoWithAccess(ctx, req.ID, user.ID)
	if err != nil {
		playload.SendError(ctx, "工作区不存在或无权访问")
		return
	}

	// 2. 核心权限判定：使用权重比对
	// 只要当前用户的角色权重 >= Admin 的权重，就允许修改
	currentWeight := model.GetWorkspaceRoleWeight(detail.Role)
	adminWeight := model.GetWorkspaceRoleWeight(model.RoleWorkspaceAdmin)

	if currentWeight < adminWeight {
		playload.SendForbidden(ctx, "权限不足：仅所有者或管理员可修改工作区设置")
		return
	}

	// 3. 执行更新
	updateData := map[string]interface{}{
		"name":        req.Name,
		"icon":        req.Icon,
		"update_time": time.Now(),
	}

	if err = c.WorkspaceSrv.Update(ctx, req.ID, user.ID, updateData); err != nil {
		playload.SendError(ctx, "更新失败")
		return
	}

	playload.SendSuccess(ctx, nil, "更新成功")
}

func (c *WorkspaceCtrl) InitData(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendError(ctx, "未登录")
		return
	}

	// 一次性获取所有工作区和对应的 Space 列表
	data, err := c.WorkspaceSrv.GetWorkspaceFullData(ctx, user.ID)
	if err != nil {
		playload.SendError(ctx, "数据加载失败")
		return
	}

	playload.SendSuccess(ctx, data, "加载成功")
}

// 获取当前用户所属的所有工作区
func (c *WorkspaceCtrl) MyList(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendError(ctx, "未登录")
		return
	}

	list, err := c.WorkspaceSrv.GetWorkspacesByUserID(ctx, user.ID)
	if err != nil {
		playload.SendError(ctx, "获取列表失败")
		return
	}

	playload.SendSuccess(ctx, list, "获取成功")
}

func (c *WorkspaceCtrl) SwitchDefault(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendError(ctx, "未登录")
		return
	}

	var req playload.SwitchDefaultWorkspaceReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	err := c.WorkspaceSrv.SetDefaultWorkspace(ctx, user.ID, req.WorkspaceID)
	if err != nil {
		playload.SendError(ctx, "切换默认工作区失败: "+err.Error())
		return
	}

	playload.SendSuccess(ctx, nil, "设置成功")
}

// Access 處理工作區的主動切換
func (c *WorkspaceCtrl) Access(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	var req struct {
		WorkspaceID uuid.UUID `json:"workspace_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "无效参数")
		return
	}

	// 主動切換時，使用同步更新確保後續的 Me 接口能拿到正確排序
	err := c.WorkspaceUserSrv.UpdateLastAccess(ctx, user.ID, req.WorkspaceID)
	if err != nil {
		playload.SendError(ctx, "切换工作区失败")
		return
	}

	playload.SendSuccess(ctx, nil, "切换成功")
}

func (c *WorkspaceCtrl) Delete(ctx *gin.Context) {
	// 1. 获取当前用户
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	//var req struct {
	//	WorkspaceID uuid.UUID `json:"workspace_id" binding:"required"`
	//}
	//if err := ctx.ShouldBindJSON(&req); err != nil {
	//	playload.SendError(ctx, "参数错误")
	//	return
	//}

	// 2. 从路径获取 ID (关键修改)
	workspaceIDStr := ctx.Param("id")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		playload.SendError(ctx, "无效的工作区ID格式")
		return
	}

	// 2. 使用 user.ID 和 workspaceID 进行双重校验
	// 检查该用户是否真的是该工作区的 Owner
	isOwner, err := c.WorkspaceUserSrv.CheckIsOwner(ctx, workspaceID, user.ID)
	if err != nil || !isOwner {
		playload.SendError(ctx, "只有所有者可以执行删除操作")
		return
	}

	wu, err := c.WorkspaceUserSrv.FindByUser(ctx, workspaceID, user.ID)
	if err != nil || wu == nil {
		playload.SendError(ctx, "成员记录异常")
		return
	}
	if wu.IsDefault {
		playload.SendError(ctx, "不能删除默认工作区，请先在「我的工作区」中切换默认工作区后再删除")
		return
	}

	// 3. 执行软删除
	if err := c.WorkspaceSrv.SoftDelete(ctx, workspaceID, user.ID); err != nil {
		playload.SendError(ctx, "删除失败")
		return
	}

	playload.SendSuccess(ctx, nil, "工作区已成功移除")
}

func (c *WorkspaceCtrl) Leave(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	var req struct {
		WorkspaceID uuid.UUID `json:"workspace_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	// 執行退出邏輯
	err := c.WorkspaceUserSrv.Leave(ctx, user.ID, req.WorkspaceID)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	playload.SendSuccess(ctx, nil, "成功退出工作区")
}

func (c *WorkspaceCtrl) Invite(ctx *gin.Context) {
	var req struct {
		InviteeID uuid.UUID `json:"invitee_id" binding:"required"`
		Role      string    `json:"role" binding:"omitempty,oneof=admin member guest"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx) // 从中间件获取当前工作区ID
	currentUser := utils.GetCurrentUser(ctx)

	wu, err := c.WorkspaceUserSrv.FindByUser(ctx, workspaceID, currentUser.ID)
	if err != nil || wu == nil {
		playload.SendForbidden(ctx, "无权限")
		return
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceAdmin) {
		playload.SendForbidden(ctx, "仅管理员或所有者可邀请成员加入工作区")
		return
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = model.RoleWorkspaceMember
	}
	if !model.IsInvitableWorkspaceRole(role) {
		playload.SendError(ctx, "无效的加入角色")
		return
	}
	if role == model.RoleWorkspaceAdmin && wu.Role != model.RoleWorkspaceOwner {
		playload.SendErr(ctx, errs.ErrOnlyWorkspaceOwnerGrantsAdmin)
		return
	}

	err = c.WorkspaceSrv.SendInvite(ctx, workspaceID, currentUser.ID, req.InviteeID, role)
	if err != nil {
		playload.SendError(ctx, "发送邀请失败: "+err.Error())
		return
	}

	playload.SendSuccess(ctx, nil)
}

func (c *WorkspaceCtrl) RemoveMember(ctx *gin.Context) {
	operator := utils.GetCurrentUser(ctx)
	workspaceID := utils.GetWorkspaceID(ctx) // 从中间件获取当前工作区ID

	var req struct {
		// WorkspaceID  uuid.UUID `json:"workspace_id" binding:"required"`
		TargetUserID uuid.UUID `json:"target_user_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	// 禁止移除自己 (退出應使用 Leave 接口)
	if operator.ID == req.TargetUserID {
		playload.SendError(ctx, "不能移除自己")
		return
	}

	err := c.WorkspaceUserSrv.RemoveMember(ctx, workspaceID, req.TargetUserID, operator.ID)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	playload.SendSuccess(ctx, nil, "移除成功")
}

// AcceptInvite 接受邀請
func (c *WorkspaceCtrl) AcceptInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	var req struct {
		InviteID uuid.UUID `json:"invite_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "邀请不存在")
		return
	}

	// 調用 Service 處理業務邏輯
	// 注意：傳入 user.ID 確保只有受邀人本人能操作
	err := c.WorkspaceSrv.AcceptInvite(ctx, req.InviteID, user.ID)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, nil, "已接收邀请")
}

// RejectInvite 拒絕邀請
func (c *WorkspaceCtrl) RejectInvite(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	var req struct {
		InviteID uuid.UUID `json:"invite_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	// 现在参数完全对齐了：(ctx, 邀请ID, 当前用户ID)
	err := c.WorkspaceSrv.RejectInvite(ctx, req.InviteID, user.ID)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, nil, "已拒绝该邀请")
}

func (c *WorkspaceCtrl) GetMembers(ctx *gin.Context) {
	// 從中間件獲取當前工作區 ID
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	wu, err := c.WorkspaceUserSrv.FindByUser(ctx, workspaceID, user.ID)
	if err != nil {
		playload.SendError(ctx, "获取成员列表失败")
		return
	}
	if wu == nil {
		playload.SendErr(ctx, errs.ErrNotWorkspaceMember)
		return
	}

	search := strings.TrimSpace(ctx.Query("search"))
	members, err := c.WorkspaceUserSrv.GetWorkspaceMembers(ctx, workspaceID, search)
	if err != nil {
		playload.SendError(ctx, "获取成员列表失败")
		return
	}

	playload.SendSuccess(ctx, members)
}

func (c *WorkspaceCtrl) GetDetail(ctx *gin.Context) {
	// 1. 获取当前用户
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendUnauthorized(ctx, "未登录")
		return
	}

	// 2. 从路径参数获取 WorkspaceID
	idStr := ctx.Param("id")
	workspaceID, err := uuid.Parse(idStr)
	if err != nil {
		playload.SendError(ctx, "无效的工作区ID")
		return
	}

	// 3. 调用 Service 的极速版单次查询逻辑
	// 注意：Service 内部已经包含了 INNER JOIN 校验，确保只有成员能查到
	detail, err := c.WorkspaceSrv.GetWorkspaceInfoSingle(ctx, workspaceID, user.ID)
	if err != nil {
		playload.SendError(ctx, "获取详情失败: "+err.Error())
		return
	}

	playload.SendSuccess(ctx, detail, "获取成功")
}

// 角色變更與自我降級 (UpdateRole)
func (c *WorkspaceCtrl) UpdateRole(ctx *gin.Context) {
	operator := utils.GetCurrentUser(ctx)
	workspaceID := utils.GetWorkspaceID(ctx)

	var req struct {
		TargetUserID uuid.UUID `json:"target_user_id" binding:"required"`
		NewRole      string    `json:"new_role" binding:"required,oneof=admin member guest"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误"+err.Error())
		return
	}

	// 調用 Service
	// 內部邏輯應包含：
	// 1. 若 operator != target，校驗 Admin/Owner 權限
	// 2. 若 operator == target，允許降級但禁止提拔自己為 Owner
	err := c.WorkspaceUserSrv.UpdateMemberRole(ctx, workspaceID, operator.ID, req.TargetUserID, req.NewRole)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	playload.SendSuccess(ctx, nil, "权限更新成功")
}

// 所有權轉讓 (TransferOwner)
func (c *WorkspaceCtrl) TransferOwner(ctx *gin.Context) {
	operator := utils.GetCurrentUser(ctx)
	workspaceID := utils.GetWorkspaceID(ctx)

	var req struct {
		NewOwnerID uuid.UUID `json:"new_owner_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误"+err.Error())
		return
	}

	// 轉讓必須是 Owner 本人發起
	err := c.WorkspaceUserSrv.TransferOwner(ctx, workspaceID, operator.ID, req.NewOwnerID)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	playload.SendSuccess(ctx, nil, "所有权已成功转让")
}

// GetQuotaBoard 查看当前工作区的云盘容量看板
func (c *WorkspaceCtrl) GetQuotaBoard(ctx *gin.Context) {
	// 1. 从中间件 WorkspacesAuth 注入的上下文中直接获取当前工作区 ID
	wsID := utils.GetWorkspaceID(ctx)
	if wsID == uuid.Nil {
		playload.SendError(ctx, "请先选择一个工作区")
		return
	}

	// 2. 调用先前编写好的 Service 方法，该方法具备 Gorm 查空时的默认值兜底机制
	quotaInfo, err := c.WorkspaceQuotaSrv.GetWorkspaceQuotaInfo(ctx.Request.Context(), wsID)
	if err != nil {
		playload.SendError(ctx, "获取空间配额失败: "+err.Error())
		return
	}

	// 3. 计算已用空间百分比 (保留两位小数)
	var percent float64 = 0
	if quotaInfo.TotalBytes > 0 {
		percent = float64(quotaInfo.UsedBytes) / float64(quotaInfo.TotalBytes) * 100
	}

	// 4. 打包组装响应结构体
	resp := playload.WorkspaceQuotaQueryResp{
		WorkspaceID: quotaInfo.WorkspaceID.String(),
		TotalBytes:  quotaInfo.TotalBytes,
		UsedBytes:   quotaInfo.UsedBytes,
		UsedPercent: math.Round(percent*100) / 100, // 保留两位小数
		TotalText:   utils.FormatBytes(quotaInfo.TotalBytes),
		UsedText:    utils.FormatBytes(quotaInfo.UsedBytes),
	}

	playload.SendSuccess(ctx, resp, "获取空间容量成功")
}
