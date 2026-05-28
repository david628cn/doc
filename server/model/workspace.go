package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Workspace struct {
	ID             uuid.UUID      `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	Name           string         `gorm:"column:name" json:"name"`
	Description    string         `gorm:"column:description" json:"description"`
	Icon           string         `gorm:"column:icon" json:"icon"`
	Slug           string         `gorm:"column:slug" json:"slug"`
	CustomDomain   string         `gorm:"column:custom_domain" json:"custom_domain"`
	Settings       datatypes.JSON `gorm:"type:jsonb;column:settings" json:"settings"`
	EmailDomains   datatypes.JSON `gorm:"type:jsonb;column:email_domains" json:"email_domains"`
	DefaultSpaceID uuid.UUID      `gorm:"column:default_space_id" json:"default_space_id"`
	CreateTime     time.Time      `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime     time.Time      `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime     *time.Time     `gorm:"column:delete_time;index" json:"-"`
}

func (Workspace) TableName() string {
	return "sys_workspace"
}
