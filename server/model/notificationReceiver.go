package model

import (
	"time"

	"github.com/google/uuid"
)

// NotificationReceiver 消息接收状态表
type NotificationReceiver struct {
	ID             uuid.UUID `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	NotificationID uuid.UUID `gorm:"column:notification_id;type:uuid;not null;index" json:"notification_id"`
	ReceiverID     uuid.UUID `gorm:"column:receiver_id;type:uuid;not null;index" json:"receiver_id"`

	// 状态控制
	IsRead      bool `gorm:"column:is_read;default:false;index" json:"is_read"`     // 是否已读
	IsDelivered bool `gorm:"column:is_delivered;default:false" json:"is_delivered"` // 是否送达（WS 成功推送到前端）

	// 时间审计
	ReadTime      *time.Time `gorm:"column:read_time" json:"read_time"`           // 读取时间，使用指针支持 NULL
	DeliveredTime *time.Time `gorm:"column:delivered_time" json:"delivered_time"` // 送达时间
	CreateTime    time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime    time.Time  `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
	DeleteTime    *time.Time `gorm:"column:delete_time;index" json:"-"`
}

// TableName 指定表名
func (NotificationReceiver) TableName() string {
	return "sys_notification_receiver"
}
