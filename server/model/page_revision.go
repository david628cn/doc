package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// PageRevision 页面内容快照：page_version 为「写入时 sys_page 上被归档的版本号」
type PageRevision struct {
	ID          uuid.UUID      `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	PageID      uuid.UUID      `gorm:"column:page_id;index" json:"page_id"`
	WorkspaceID uuid.UUID      `gorm:"column:workspace_id;index" json:"workspace_id"`
	SpaceID     uuid.UUID      `gorm:"column:space_id" json:"space_id"`
	PageVersion int            `gorm:"column:page_version" json:"page_version"`
	Content     datatypes.JSON `gorm:"type:jsonb;column:content" json:"content"`
	CreateBy    uuid.UUID      `gorm:"column:create_by" json:"create_by"`
	CreateTime  time.Time      `gorm:"column:create_time;autoCreateTime" json:"create_time"`
}

func (PageRevision) TableName() string {
	return "sys_page_revision"
}
