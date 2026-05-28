package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	JoinRequestStatusPending  = 0
	JoinRequestStatusApproved = 1
	JoinRequestStatusRejected = 2
	JoinRequestKindWorkspace  = "workspace"
	JoinRequestKindSpace      = "space"
)

// JoinRequest 用户主动申请加入工作区或库（与邀请方向相反）
type JoinRequest struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID uuid.UUID  `gorm:"column:workspace_id;type:uuid;not null;index" json:"workspace_id"`
	SpaceID     *uuid.UUID `gorm:"column:space_id;type:uuid;index" json:"space_id,omitempty"`
	ApplicantID uuid.UUID  `gorm:"column:applicant_id;type:uuid;not null;index" json:"applicant_id"`
	Message     string     `gorm:"column:message;type:text" json:"message"`
	Status      int        `gorm:"column:status;not null;default:0" json:"status"`
	CreateTime  time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime  time.Time  `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
	DeleteTime  *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (JoinRequest) TableName() string {
	return "sys_join_request"
}
