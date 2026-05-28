package playload

import (
	"time"

	"github.com/google/uuid"
)

type JoinRequestBody struct {
	Message string `json:"message" binding:"omitempty,max=500"`
}

// JoinRequestSpaceJSONBody POST /api/workspace/space/join-request（无路径参数，避免与 /space/:id 路由冲突）
type JoinRequestSpaceJSONBody struct {
	SpaceID string `json:"space_id" binding:"required"`
	Message string `json:"message" binding:"omitempty,max=500"`
}

// JoinRequestSentDTO 当前用户发出的申请记录（列表）
type JoinRequestSentDTO struct {
	ID            uuid.UUID  `json:"id" gorm:"column:id"`
	WorkspaceID   uuid.UUID  `json:"workspace_id" gorm:"column:workspace_id"`
	WorkspaceName string     `json:"workspace_name" gorm:"column:workspace_name"`
	SpaceID       *uuid.UUID `json:"space_id,omitempty" gorm:"column:space_id"`
	SpaceName     string     `json:"space_name,omitempty" gorm:"column:space_name"`
	Kind          string     `json:"kind" gorm:"-"` // workspace | space
	Message       string     `json:"message" gorm:"column:message"`
	Status        int        `json:"status" gorm:"column:status"`
	CreateTime    time.Time  `json:"create_time" gorm:"column:create_time"`
}
