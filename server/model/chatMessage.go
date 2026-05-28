package model

import (
	"time"

	"github.com/google/uuid"
)

// 聊天消息类型
const (
	ChatMsgTypeText   = "text"   // 文本
	ChatMsgTypeImage  = "image"  // 图片
	ChatMsgTypeVideo  = "video"  // 视频
	ChatMsgTypeFile   = "file"   // 文件
	ChatMsgTypeSystem = "system" // 系统通知（如：某某加入了群聊）
)

// 如果你有不同的聊天房间类型，也可以定义
const (
	RoomTypeGroup   = "group"   // 群聊/频道
	RoomTypePrivate = "private" // 私聊
)

// ChatMessage 聊天消息表
type ChatMessage struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID *uuid.UUID `gorm:"column:workspace_id;" json:"workspace_id"` // 用於數據隔離
	RoomID      string     `gorm:"column:room_id;" json:"room_id"`           // 對應 WS 的 RoomID
	SenderID    uuid.UUID  `gorm:"column:sender_id;type:uuid;" json:"sender_id"`
	Content     string     `gorm:"type:text;column:content;not null" json:"content"`
	MsgType     string     `gorm:"column:msg_type;default:'text'" json:"msg_type"` // text, image, file
	CreateTime  time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime  time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime  *time.Time `gorm:"column:delete_time;index" json:"-"`

	// 關聯冗餘（可選，方便前端顯示而不需要多次 Join）
	SenderName   string `gorm:"-" json:"sender_name,omitempty"`   // 僅用於 JSON 返回，不存入數據庫
	SenderAvatar string `gorm:"-" json:"sender_avatar,omitempty"` // 僅用於 JSON 返回，不存入數據庫
}

// TableName 指定表名
func (ChatMessage) TableName() string {
	return "sys_chat_message"
}
