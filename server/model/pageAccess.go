package model

import (
	"time"

	"github.com/google/uuid"
)

type PageAccess struct {
	ID uuid.UUID `gorm:"column:id;type:uuid;primaryKey" json:"id"`

	// 關聯頁面，增加與 Subject 的聯合索引，提升權限判定速度
	PageID uuid.UUID `gorm:"column:page_id;uniqueIndex:idx_page_subject_unique;index" json:"page_id"`

	// 主體類型：使用 SubjectTypeUser 或 SubjectTypeGroup 常量
	SubjectType string `gorm:"column:subject_type;uniqueIndex:idx_page_subject_unique" json:"subject_type"`

	// 主體 ID：統一使用 UUID
	SubjectID uuid.UUID `gorm:"column:subject_id;type:uuid;uniqueIndex:idx_page_subject_unique" json:"subject_id"`

	// 角色：使用 SpaceRoleAdmin, SpaceRoleEditor, SpaceRoleViewer 常量
	Role string `gorm:"column:role" json:"role"`

	// 業務時間戳
	JoinTime    time.Time  `gorm:"column:join_time;autoCreateTime" json:"join_time"`
	ExpiredTime *time.Time `gorm:"column:expired_time" json:"expired_time"` // 用於臨時授權過期判定

	// 審計時間戳
	CreateTime time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (PageAccess) TableName() string {
	return "sys_page_access"
}
