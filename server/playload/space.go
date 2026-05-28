package playload

import (
	"app/model"
	"time"

	"github.com/google/uuid"
)

// CreateSpaceReq 创建空间请求
type CreateSpaceReq struct {
	Name        string `json:"name" binding:"required,max=100"`
	Description string `json:"description" binding:"max=255"`
	Icon        string `json:"icon"`
	// 将 oneof 扩展为包含 workspace, invite, private
	Visibility string `json:"visibility" binding:"required,oneof=workspace invite private"`
}

type SpaceDetailDTO struct {
	SpaceListDTO
	//Role string `json:"role"` // 返回 admin, editor, viewer, none
	// 专门用于接收 SQL 聚合结果的中间字段，json:"-" 表示不返回给前端
	//RoleListRaw string `json:"-"`
}

// UpdateSpaceBaseReq 更新空间请求
type UpdateSpaceBaseReq struct {
	ID          uuid.UUID `json:"id" binding:"required"`
	Name        *string   `json:"name" binding:"omitempty,max=100"`
	Description *string   `json:"description" binding:"omitempty,max=255"`
	Icon        *string   `json:"icon"`
	// 这里也要同步更新
	// Visibility string `json:"visibility" binding:"omitempty,oneof=workspace invite private"`
}

// UpdateSpaceVisibilityReq 專門變更可見性
type UpdateSpaceVisibilityReq struct {
	ID         uuid.UUID `json:"id" binding:"required"`
	Visibility string    `json:"visibility" binding:"required,oneof=workspace invite private"`
}

// SpaceMemberBrief 成员简报
type SpaceMemberBrief struct {
	ID       uuid.UUID `json:"id"`
	UserName string    `json:"username"`
	//Role          string    `json:"role"` // 成员的实权角色，前端显示“管理员”等标签
	HeadSculpture string `json:"head_sculpture"`
}

// SpaceListDTO 空间列表单项数据
type SpaceListDTO struct {
	model.Space
	Role          string             `json:"role" gorm:"-"`           // 逻辑权限标识: admin, editor, viewer
	AccessType    string             `json:"access_type" gorm:"-"`    // UI 文案标识: public, default (前端匹配多语言)
	MemberCount   int                `json:"member_count" gorm:"-"`   // 实时成员总数
	RecentMembers []SpaceMemberBrief `json:"recent_members" gorm:"-"` // 成员头像预览列表
	IsStarred     bool               `json:"is_starred" gorm:"-"`     // 建議預留，用於標記是否收藏
	// BusinessOwnerID 当前业务所有者：sys_space_access 中 subject_type=user 且 role=owner 的主体（转让只改此处，不改 create_by）
	BusinessOwnerID *uuid.UUID `json:"business_owner_id,omitempty" gorm:"-"`
	// OriginalCreatorID 原始建库人，恒等于 sys_space.create_by（审计/兜底语义，可与 BusinessOwnerID 不同）
	OriginalCreatorID *uuid.UUID `json:"original_creator_id,omitempty" gorm:"-"`
	// CanManageSpaceMembers 是否可对「库成员」做管理类操作（加人、改他人角色等）：须本人对该库有 **sys_space_access 个人或组** 贡献且有效角色不低于 admin。
	// 与 Role 区分：Role 含工作区 owner 在开放式库上的级联 admin，但级联不产生成员表行，故此处为 false，避免与 GET /space/members 口径冲突。
	CanManageSpaceMembers bool `json:"can_manage_space_members" gorm:"-"`
	// InviteShellOnly visibility=invite 且当前用户尚无库内有效角色（仅「壳」：可看元数据申请加入，不可进内容）
	InviteShellOnly bool `json:"invite_shell_only,omitempty" gorm:"-"`
}

// 空间成员 member_source（与 GetMemberList SQL 一致）
const (
	SpaceMemberSourceOriginalCreator = "original_creator"
	SpaceMemberSourceDirectUser      = "direct_user"
	SpaceMemberSourceGroup           = "group"
)

// SpaceMemberDTO 空間成員管理列表項
type SpaceMemberDTO struct {
	ID            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	RealName      string    `json:"real_name"`
	HeadSculpture string    `json:"head_sculpture"`
	Email         string    `json:"email"`
	Role          string    `json:"role"` // 當前在該知識庫的實權角色（與 sys_space_access / 組展開一致；含 create_by 兜底行的 owner）
	SubjectType   string    `json:"subject_type"`
	JoinTime      time.Time `json:"join_time"`
	// IsOriginalCreator 是否為 sys_space.create_by（原始建庫人，與業務「所有者」可因轉讓而分離）
	IsOriginalCreator bool `json:"is_original_creator"`
	// MemberSource 名单构成：original_creator | direct_user | group（组授权展开）
	MemberSource string `json:"member_source"`
}

// SpaceQueryParam 列表查询参数
type SpaceQueryParam struct {
	// 基础上下文，由后端从 Token/Session 注入
	WorkspaceID uuid.UUID `json:"-" form:"-"`
	UserID      uuid.UUID `json:"-" form:"-"`

	// 前端传入参数
	Search      string `json:"search" form:"search"`       // 搜索关键词
	Page        int    `json:"page" form:"page,default=1"` // 分页页码
	PageSize    int    `json:"page_size" form:"page_size,default=20"`
	WithMembers bool   `json:"with_members" form:"with_members,default=true"`
}

// AggResult 屬於 Service 內部聚合中間態
type SpaceAggResult struct {
	SpaceID     uuid.UUID
	Total       int
	RecentJson  []byte
	RoleListRaw string // 這裡改為接收 SQL 的 string_agg(role, ',') 結果
}

// SpaceInviteReq 库邀请
type SpaceInviteReq struct {
	SpaceID   uuid.UUID `json:"space_id" binding:"required"`
	InviteeID uuid.UUID `json:"invitee_id" binding:"required"`
	Role      string    `json:"role" binding:"required,oneof=admin editor viewer"`
}

// SpaceMemberRoleReq 修改成员角色
type SpaceMemberRoleReq struct {
	SpaceID      uuid.UUID `json:"space_id" binding:"required"`
	TargetUserID uuid.UUID `json:"target_user_id" binding:"required"`
	NewRole      string    `json:"new_role" binding:"required,oneof=admin editor viewer"`
}

// SpaceTransferOwnerReq 转让库所有权
type SpaceTransferOwnerReq struct {
	SpaceID    uuid.UUID `json:"space_id" binding:"required"`
	NewOwnerID uuid.UUID `json:"new_owner_id" binding:"required"`
}

// SpaceResetOwnerReq 无 ACL Owner 时由工作区管理员指定新 Owner（写入 sys_space_access + 审计）
type SpaceResetOwnerReq struct {
	SpaceID    uuid.UUID  `json:"space_id" binding:"required"`
	NewOwnerID *uuid.UUID `json:"new_owner_id"` // 可选，缺省为操作者本人
}

// SpaceRemoveMemberReq 移除库成员
type SpaceRemoveMemberReq struct {
	SpaceID      uuid.UUID `json:"space_id" binding:"required"`
	TargetUserID uuid.UUID `json:"target_user_id" binding:"required"`
}

// SpaceLeaveReq 当前用户退出库（移除本人在 sys_space_access 的直接授权）。
// Owner 须先调用 POST .../space/transferOwner 转让所有权，再调用本接口。
type SpaceLeaveReq struct {
	SpaceID uuid.UUID `json:"space_id" binding:"required"`
}

// InviteIDReq 邀请 ID（接受/拒绝）
type InviteIDReq struct {
	InviteID uuid.UUID `json:"invite_id" binding:"required"`
}
