package model

import (
	"time"

	"github.com/google/uuid"
)

type ChatGroup struct {
	ID            uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID   *uuid.UUID `gorm:"column:workspace_id" json:"workspace_id,omitempty"`
	Name          string     `gorm:"column:name;size:200;not null" json:"name"`
	HeadSculpture string     `gorm:"column:head_sculpture;size:512" json:"head_sculpture,omitempty"` // 自定义群头像；空则客户端用成员拼图
	Announcement  string     `gorm:"column:announcement" json:"announcement,omitempty"`
	OwnerID       uuid.UUID  `gorm:"column:owner_id;not null" json:"owner_id"`
	CreateTime    time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime    time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime    *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (ChatGroup) TableName() string {
	return "sys_chat_group"
}

type ChatGroupMember struct {
	GroupID    uuid.UUID `gorm:"column:group_id;type:uuid;primaryKey" json:"group_id"`
	UserID     uuid.UUID `gorm:"column:user_id;type:uuid;primaryKey" json:"user_id"`
	GroupAlias string    `gorm:"column:group_alias;size:64" json:"group_alias,omitempty"` // 本人在本群的显示别名
	CreateTime time.Time `gorm:"column:create_time;autoCreateTime" json:"create_time"`
}

func (ChatGroupMember) TableName() string {
	return "sys_chat_group_member"
}

type ChatMemberRead struct {
	UserID       uuid.UUID  `gorm:"column:user_id;type:uuid;primaryKey;autoIncrement:false" json:"user_id"`
	RoomID       string     `gorm:"column:room_id;size:160;primaryKey" json:"room_id"`
	WorkspaceID  *uuid.UUID `gorm:"column:workspace_id" json:"workspace_id,omitempty"`
	LastReadTime *time.Time `gorm:"column:last_read_time" json:"last_read_time,omitempty"`
	UpdateTime   time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
}

func (ChatMemberRead) TableName() string {
	return "sys_chat_member_read"
}
