package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	// --- 1. 空间可见性 (sys_space.visibility) ---
	// 对应 UI: 开放式 (工作区全员可见)
	SpaceVisibilityWorkspace = "workspace"
	// 对应 UI: 仅限邀请 (成员可见，非成员搜不到)
	SpaceVisibilityInvite = "invite"
	// 对应 UI: 私有 (仅自己或特权成员可见)
	SpaceVisibilityPrivate = "private"

	//SpaceVisibilityDefault = "default"

	// --- 2. 空间成员角色 (sys_space_access.role) ---
	SpaceRoleOwner  = "owner"
	SpaceRoleAdmin  = "admin"
	SpaceRoleEditor = "editor"
	SpaceRoleViewer = "viewer"
	SpaceRoleNone   = "none"
)

// GetSpaceRoleWeight 保持不变
func GetSpaceRoleWeight(role string) int {
	if w, ok := SpaceRoleWeight[role]; ok {
		return w
	}
	return 0
}

func GetRoleByWeight(weight int) string {
	switch weight {
	case 4:
		return SpaceRoleOwner
	case 3:
		return SpaceRoleAdmin
	case 2:
		return SpaceRoleEditor
	case 1:
		return SpaceRoleViewer
	default:
		return SpaceRoleNone
	}
}

// SpaceRoleWeight 数值越大权限越高；前端 SpaceRolePriority 与此对齐
var SpaceRoleWeight = map[string]int{
	SpaceRoleOwner:  4,
	SpaceRoleAdmin:  3,
	SpaceRoleEditor: 2,
	SpaceRoleViewer: 1,
	SpaceRoleNone:   0,
}

// EffectiveSpaceRole 计算用户在空间内的最终角色（含 workspace owner 级联为 space admin）
func EffectiveSpaceRole(space *Space, userID uuid.UUID, aclRoles []string, workspaceUserRole string) string {
	maxWeight := 0
	if space.Visibility == SpaceVisibilityWorkspace {
		maxWeight = GetSpaceRoleWeight(SpaceRoleViewer)
	}
	// 原始建库人至少 Viewer 兜底（与 ACL 中业务 owner 可分离；勿把本段等同「create_by 即 owner」）
	if space.CreateBy == userID && maxWeight < GetSpaceRoleWeight(SpaceRoleViewer) {
		maxWeight = GetSpaceRoleWeight(SpaceRoleViewer)
	}
	for _, r := range aclRoles {
		if w := GetSpaceRoleWeight(r); w > maxWeight {
			maxWeight = w
		}
	}
	if workspaceUserRole == RoleWorkspaceOwner && maxWeight < GetSpaceRoleWeight(SpaceRoleAdmin) {
		maxWeight = GetSpaceRoleWeight(SpaceRoleAdmin)
	}
	return GetRoleByWeight(maxWeight)
}

type Space struct {
	ID             uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	WorkspaceID    uuid.UUID  `gorm:"column:workspace_id" json:"workspace_id"`
	Name           string     `gorm:"column:name" json:"name"`
	Description    string     `gorm:"column:description" json:"description"`
	Icon           string     `gorm:"column:icon" json:"icon"`
	Visibility     string     `gorm:"column:visibility" json:"visibility"` // workspace:空間內全員可見(Guest除外), private:僅授權成員可見
	CreateBy       uuid.UUID  `gorm:"column:create_by" json:"create_by"`
	UpdateBy       *uuid.UUID `gorm:"column:update_by" json:"update_by"`
	LastAccessTime time.Time  `gorm:"column:last_access_time" json:"last_access_time"`
	CreateTime     time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime     time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime     *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (Space) TableName() string {
	return "sys_space"
}
