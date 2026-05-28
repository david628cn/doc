package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	// 工作區角色
	RoleWorkspaceOwner  = "owner"
	RoleWorkspaceAdmin  = "admin"
	RoleWorkspaceMember = "member"
	RoleWorkspaceGuest  = "guest"
	RoleWorkspaceNone   = "none"
)

// WorkspaceRoleWeight 角色权重映射表（数值越大权限越高；前端 WorkspaceRolePriority 与此对齐）
var WorkspaceRoleWeight = map[string]int{
	RoleWorkspaceOwner:  4,
	RoleWorkspaceAdmin:  3,
	RoleWorkspaceMember: 2,
	RoleWorkspaceGuest:  1,
	RoleWorkspaceNone:   0,
}

// GetWorkspaceRoleWeight 获取工作区角色权重
func GetWorkspaceRoleWeight(role string) int {
	if w, ok := WorkspaceRoleWeight[role]; ok {
		return w
	}
	return 0
}

// GetWorkspaceRoleByWeight 根据权重反推工作区角色名
func GetWorkspaceRoleByWeight(weight int) string {
	switch weight {
	case 4:
		return RoleWorkspaceOwner
	case 3:
		return RoleWorkspaceAdmin
	case 2:
		return RoleWorkspaceMember
	case 1:
		return RoleWorkspaceGuest
	default:
		return RoleWorkspaceNone
	}
}

// 可選：定義一個角色列表，用於參數校驗
var AllWorkspaceRoles = []string{
	RoleWorkspaceOwner,
	RoleWorkspaceAdmin,
	RoleWorkspaceMember,
	RoleWorkspaceGuest,
}

// InvitableWorkspaceRoles 邀请加入工作区时可指定的角色（不含 owner）
var InvitableWorkspaceRoles = map[string]struct{}{
	RoleWorkspaceAdmin:  {},
	RoleWorkspaceMember: {},
	RoleWorkspaceGuest:  {},
}

// IsInvitableWorkspaceRole 是否为「邀请入区」合法目标角色
func IsInvitableWorkspaceRole(role string) bool {
	_, ok := InvitableWorkspaceRoles[role]
	return ok
}

// IsWorkspaceMemberOrAbove 成员及以上（含 owner/admin/member），用于与访客区分
func IsWorkspaceMemberOrAbove(role string) bool {
	return GetWorkspaceRoleWeight(role) >= GetWorkspaceRoleWeight(RoleWorkspaceMember)
}

// CanSeeInviteSpaceInList 「仅邀请」库在侧栏/列表中对工作区 **member/admin/owner** 可见（壳）；**guest** 不可见
func CanSeeInviteSpaceInList(workspaceUserRole string) bool {
	return IsWorkspaceMemberOrAbove(workspaceUserRole)
}

type WorkspaceUser struct {
	ID             uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	WorkspaceID    uuid.UUID  `gorm:"column:workspace_id" json:"workspace_id"`
	UserID         uuid.UUID  `gorm:"column:user_id" json:"user_id"`
	Role           string     `gorm:"column:role" json:"role"` // owner, admin, member, guest
	Status         int        `gorm:"column:status" json:"status"`
	IsDefault      bool       `gorm:"column:is_default" json:"is_default"`
	LastAccessTime time.Time  `gorm:"column:last_access_time" json:"last_access_time"`
	JoinTime       time.Time  `gorm:"column:join_time;autoCreateTime" json:"join_time"`
	CreateTime     time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime     time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime     *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (WorkspaceUser) TableName() string {
	return "sys_workspace_user"
}
