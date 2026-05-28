package model

import (
	"time"

	"github.com/google/uuid"
)

// UserPageStar 用户收藏页面（与工作区上下文冗余 workspace_id 便于列表筛选）
type UserPageStar struct {
	UserID      uuid.UUID `gorm:"column:user_id;primaryKey" json:"user_id"`
	WorkspaceID uuid.UUID `gorm:"column:workspace_id;not null;index" json:"workspace_id"`
	PageID      uuid.UUID `gorm:"column:page_id;primaryKey" json:"page_id"`
	CreateTime  time.Time `gorm:"column:create_time;autoCreateTime" json:"create_time"`
}

func (UserPageStar) TableName() string {
	return "sys_user_page_star"
}

// UserPageRecent 用户最近打开的页面
type UserPageRecent struct {
	UserID      uuid.UUID `gorm:"column:user_id;primaryKey" json:"user_id"`
	WorkspaceID uuid.UUID `gorm:"column:workspace_id;not null;index" json:"workspace_id"`
	PageID      uuid.UUID `gorm:"column:page_id;primaryKey" json:"page_id"`
	LastOpenAt  time.Time `gorm:"column:last_open_at" json:"last_open_at"`
}

func (UserPageRecent) TableName() string {
	return "sys_user_page_recent"
}
