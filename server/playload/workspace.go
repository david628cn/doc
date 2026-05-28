package playload

import (
	"app/model"
	"time"

	"github.com/google/uuid"
)

type UserWorkspaceData struct {
	WorkspaceID uuid.UUID `json:"workspace_id"`
	Name        string    `json:"name"`
	Icon        string    `json:"icon"`
	Slug        string    `json:"slug"`
	Role        string    `json:"role"`       // 来自 sys_workspace_user
	IsDefault   bool      `json:"is_default"` // 来自 sys_workspace_user
}

type WorkspaceSpaces struct {
	UserWorkspaceData               // 工作区基本信息
	Spaces            []model.Space `json:"spaces"` // 该工作区下的 Space 列表
}

type CreateWorkspaceReq struct {
	Name        string `json:"name" binding:"required,min=1,max=50"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	// 对应前端 Select 的 permission，存入 settings jsonb
	// Permission string `json:"permission" binding:"required,oneof=open invite private"`
}

type SwitchDefaultWorkspaceReq struct {
	WorkspaceID uuid.UUID `json:"workspace_id" binding:"required"`
}

type InviteMemberReq struct {
	WorkspaceID uuid.UUID `json:"workspace_id" binding:"required"`
	Identifier  string    `json:"identifier" binding:"required"` // Email 或 Username
	Role        string    `json:"role" binding:"required,oneof=admin member guest"`
}

type WorkspaceMemberDTO struct {
	ID            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	RealName      string    `json:"real_name"`
	HeadSculpture string    `json:"head_sculpture"`
	Email         string    `json:"email"`
	Role          string    `json:"role"` // owner, admin, member
	JoinTime      time.Time `json:"join_time"`
}

type WorkspaceMemberBrief struct {
	ID       uuid.UUID `json:"id"`
	UserName string    `json:"username"`
	//Role          string    `json:"role"` // 成员的实权角色，前端显示“管理员”等标签
	HeadSculpture string `json:"head_sculpture"`
}

type UpdateWorkspaceBaseReq struct {
	ID          uuid.UUID `json:"id" binding:"required"`
	Name        string    `json:"name" binding:"max=100"`
	Description string    `json:"description" binding:"max=255"`
	Icon        string    `json:"icon"`
	// 这里也要同步更新
	// Visibility string `json:"visibility" binding:"omitempty,oneof=workspace invite private"`
}

type WorkspaceQueryParam struct {
	// 基础上下文，由后端从 Token/Session 注入
	WorkspaceID uuid.UUID `json:"-" form:"-"`
	UserID      uuid.UUID `json:"-" form:"-"`

	// 前端传入参数
	Search      string `json:"search" form:"search"`       // 搜索关键词
	Page        int    `json:"page" form:"page,default=1"` // 分页页码
	PageSize    int    `json:"page_size" form:"page_size,default=20"`
	WithMembers bool   `json:"with_members" form:"with_members,default=true"`
}

type WorkspaceListDTO struct {
	model.Workspace
	Role          string                 `json:"role" gorm:"-"`           // 逻辑权限标识: admin, editor, viewer
	AccessType    string                 `json:"access_type" gorm:"-"`    // UI 文案标识: public, default (前端匹配多语言)
	MemberCount   int                    `json:"member_count" gorm:"-"`   // 实时成员总数
	RecentMembers []WorkspaceMemberBrief `json:"recent_members" gorm:"-"` // 成员头像预览列表
	IsStarred     bool                   `json:"is_starred" gorm:"-"`     // 建議預留，用於標記是否收藏
}

type WorkspaceAggResult struct {
	WorkspaceID uuid.UUID
	Total       int
	RecentJson  []byte
	RoleListRaw string // 這裡改為接收 SQL 的 string_agg(role, ',') 結果
}
