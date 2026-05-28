package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	FriendStatusPending   = 0 // 申请中
	FriendStatusAccepted  = 1 // 已是好友
	FriendStatusRejected  = 2 // 接收方拒绝
	FriendStatusWithdrawn = 3 // 发起方撤回
)

type Friend struct {
	ID         uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	UserID     uuid.UUID  `gorm:"column:user_id;type:uuid;not null" json:"user_id"`     // 发起方
	FriendID   uuid.UUID  `gorm:"column:friend_id;type:uuid;not null" json:"friend_id"` // 接收方
	Status        int    `gorm:"column:status;default:0" json:"status"`                      // 0 申请中 1 已通过 2 已拒绝 3 已撤回
	ApplyMessage  string `gorm:"column:apply_message;size:512" json:"apply_message,omitempty"` // 申请附言
	RemarkUser    string `gorm:"column:remark_user;size:200" json:"-"`                         // user_id 对 friend_id 的备注
	RemarkFriend  string `gorm:"column:remark_friend;size:200" json:"-"`                       // friend_id 对 user_id 的备注
	CreateTime time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (Friend) TableName() string {
	return "sys_friend"
}
