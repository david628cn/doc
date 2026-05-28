package model

import (
	"time"

	"github.com/google/uuid"
)

// ChatGroupInviteKind 邀请类型：invite 成员邀请他人；apply 用户申请入群
const (
	ChatGroupInviteKindInvite = "invite"
	ChatGroupInviteKindApply  = "apply"
)

const (
	ChatGroupInviteStatusPending   = 0
	ChatGroupInviteStatusAccepted  = 1
	ChatGroupInviteStatusRejected  = 2
)

type ChatGroupInvite struct {
	ID        uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	GroupID   uuid.UUID  `gorm:"column:group_id;not null;index" json:"group_id"`
	Kind      string     `gorm:"column:kind;size:16;not null" json:"kind"`
	ActorID   uuid.UUID  `gorm:"column:actor_id;not null" json:"actor_id"`
	InviteeID *uuid.UUID `gorm:"column:invitee_id" json:"invitee_id,omitempty"`
	Status    int        `gorm:"column:status;default:0" json:"status"`
	Message   string     `gorm:"column:message;size:512" json:"message,omitempty"`
	CreateTime time.Time `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
}

func (ChatGroupInvite) TableName() string {
	return "sys_chat_group_invite"
}
