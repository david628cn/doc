package model

import (
	"time"

	"github.com/google/uuid"
)

// Follow 单向关注：follower_id 关注 followee_id（无软删，取关即删行）
type Follow struct {
	ID         uuid.UUID `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	FollowerID uuid.UUID `gorm:"column:follower_id;type:uuid;not null;index:idx_follow_follower" json:"follower_id"`
	FolloweeID uuid.UUID `gorm:"column:followee_id;type:uuid;not null;index:idx_follow_followee" json:"followee_id"`
	CreateTime time.Time `gorm:"column:create_time;autoCreateTime" json:"create_time"`
}

func (Follow) TableName() string {
	return "sys_follow"
}
