package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	SubjectTypeUser  = "user"
	SubjectTypeGroup = "group"
)

type SpaceAccess struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	SpaceID     uuid.UUID  `gorm:"column:space_id" json:"space_id"`
	SubjectType string     `gorm:"column:subject_type" json:"subject_type"` // user, group
	SubjectID   uuid.UUID  `gorm:"column:subject_id" json:"subject_id"`     // UserID 或 GroupID(含外部組)
	Role        string     `gorm:"column:role" json:"role"`                 // admin, editor, viewer
	JoinTime    time.Time  `gorm:"column:join_time;autoCreateTime" json:"join_time"`
	ExpiredTime *time.Time `gorm:"column:expired_time" json:"expired_time"`
	CreateTime  time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime  time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime  *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (SpaceAccess) TableName() string {
	return "sys_space_access"
}
