package errs

import "errors"

var (
	ErrUnauthorized          = errors.New("未登录")
	ErrForbidden             = errors.New("权限不足")
	ErrNotWorkspaceMember    = errors.New("非工作区成员")
	ErrNotSpaceMember        = errors.New("非库成员")
	ErrInviteNotFound        = errors.New("邀请不存在或已过期")
	ErrAlreadyMember         = errors.New("已是成员")
	ErrCannotRemoveOwner     = errors.New("不能移除 Owner，请先转让所有权")
	ErrCannotModifyOwner     = errors.New("不能直接修改 Owner 角色")
	ErrCannotPromoteToOwner  = errors.New("禁止直接提升为 Owner，请走转让流程")
	ErrInvalidScope          = errors.New("无效的邀请类型")
	ErrTargetNotInWorkspace  = errors.New("目标用户不是工作区成员")
	ErrOnlySpaceOwnerDeletes = errors.New("仅库所有者可删除")
	ErrSpaceAlreadyHasOwner  = errors.New("库已有 Owner，无法执行重置")
	ErrResetOwnerTarget      = errors.New("新 Owner 须为当前工作区成员")

	// 页面 / 内容编辑（工作区访客、库只读）
	ErrWorkspaceGuestReadOnly         = errors.New("工作区访客仅可查看，无法编辑内容")
	ErrInsufficientSpaceRoleForEdit   = errors.New("需要库编辑权限及以上才能执行此操作")
	ErrInsufficientWorkspaceRoleAdmin = errors.New("需要工作区管理员或所有者权限")
	ErrWorkspaceGuestNoMemberList     = errors.New("工作区访客无权查看成员列表")
	ErrOnlyWorkspaceOwnerGrantsAdmin  = errors.New("仅工作区所有者可邀请或授予管理员角色")

	// 页面版本 / 增量
	ErrPageContentConflict  = errors.New("页面已被他人修改，请刷新后重试")
	ErrPagePatchInvalid     = errors.New("无效的文档增量补丁")
	ErrPageRevisionNotFound = errors.New("未找到该版本的页面快照")
	ErrPageNotFound         = errors.New("页面不存在")

	ErrJoinRequestPending       = errors.New("已有待处理的申请，请等待管理员处理")
	ErrJoinRequestNotApplicable = errors.New("当前无需申请加入或权限已足够")
	ErrJoinRequestNotFound      = errors.New("申请不存在或已处理")
	ErrJoinRequestForbidden     = errors.New("无权审批该申请")
)
