package model

import (
	"time"

	"github.com/google/uuid"
)

// UserPushDevice 用户移动端推送令牌（FCM / APNs 等设备 token）。
type UserPushDevice struct {
	ID         uuid.UUID `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID `gorm:"column:user_id;not null" json:"user_id"`
	Platform   string    `gorm:"column:platform;size:16;not null" json:"platform"` // ios | android
	Token      string    `gorm:"column:token;not null" json:"-"`
	UpdateTime time.Time `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
}

func (UserPushDevice) TableName() string {
	return "sys_user_push_device"
}
