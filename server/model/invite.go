package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	InviteScopeWorkspace = "workspace"
	InviteScopeSpace     = "space"
)

// Invite 对应表 sys_invite（多态：工作区邀请 / 库邀请）
type Invite struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID uuid.UUID  `gorm:"column:workspace_id;type:uuid;not null;index" json:"workspace_id"`
	ScopeType   string     `gorm:"column:scope_type;default:'workspace'" json:"scope_type"`
	ScopeID     uuid.UUID  `gorm:"column:scope_id;type:uuid;not null" json:"scope_id"`
	InviterID   uuid.UUID  `gorm:"column:inviter_id;type:uuid;not null" json:"inviter_id"`
	InviteeID   *uuid.UUID `gorm:"column:invitee_id;type:uuid;index" json:"invitee_id"`
	Email       string     `gorm:"column:email" json:"email"`
	Token       string     `gorm:"column:token;uniqueIndex" json:"-"`
	Role        string     `gorm:"column:role;default:'member'" json:"role"`
	Status      int        `gorm:"column:status;default:0" json:"status"`
	ExpireTime  time.Time  `gorm:"column:expire_time" json:"expire_time"`
	CreateTime  time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime  time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime  *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (Invite) TableName() string {
	return "sys_invite"
}
