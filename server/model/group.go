package model

import (
	"time"

	"github.com/google/uuid"
)

type Group struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	Name        string     `gorm:"column:name" json:"name"`
	Description string     `gorm:"column:description" json:"description"`
	WorkspaceId uuid.UUID  `gorm:"column:workspace_id" json:"workspace_id"`
	ParentID    *uuid.UUID `gorm:"column:parent_id" json:"parent_id"`
	CreateBy    uuid.UUID  `gorm:"column:create_by" json:"create_by"`
	UpdateBy    uuid.UUID  `gorm:"column:update_by" json:"update_by"`
	CreateTime  time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime  time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime  *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (Group) TableName() string {
	return "sys_group"
}
