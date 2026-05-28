package model

import (
	"time"

	"github.com/google/uuid"
)

type WorkspaceQuota struct {
	WorkspaceID uuid.UUID `gorm:"column:workspace_id;type:uuid;primaryKey" json:"workspace_id"`
	TotalBytes  int64     `gorm:"column:total_bytes;not null;default:5368709120" json:"total_bytes"` // 默认总配额 5GB
	UsedBytes   int64     `gorm:"column:used_bytes;not null;default:0" json:"used_bytes"`            // 已使用字节数
	UpdateTime  time.Time `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
}

func (WorkspaceQuota) TableName() string {
	return "sys_workspace_quota"
}
