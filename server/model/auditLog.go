package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// AuditLog 对应 sys_audit_log（操作审计）
type AuditLog struct {
	ID            uuid.UUID       `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID   *uuid.UUID      `gorm:"column:workspace_id;index" json:"workspace_id"`
	UserID        *uuid.UUID      `gorm:"column:user_id" json:"user_id"`
	Action        string          `gorm:"column:action" json:"action"`
	ResourceType  string          `gorm:"column:resource_type" json:"resource_type"`
	ResourceID    *uuid.UUID      `gorm:"column:resource_id" json:"resource_id"`
	Payload       datatypes.JSON  `gorm:"column:payload;type:jsonb" json:"payload"`
	IPAddress     *string         `gorm:"column:ip_address" json:"ip_address"`
	CreateTime    time.Time       `gorm:"column:create_time;autoCreateTime" json:"create_time"`
}

func (AuditLog) TableName() string {
	return "sys_audit_log"
}
