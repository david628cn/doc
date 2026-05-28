package model

import (
	"time"

	"github.com/google/uuid"
)

type GroupUser struct {
	ID         uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	GroupID    uuid.UUID  `gorm:"column:group_id" json:"group_id"`
	UserID     uuid.UUID  `gorm:"column:user_id" json:"user_id"`
	Role       string     `gorm:"column:role" json:"role"` // leader:組長, member:組員
	JoinTime   time.Time  `gorm:"column:join_time;autoCreateTime" json:"join_time"`
	CreateTime time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (GroupUser) TableName() string {
	return "sys_group_user"
}
