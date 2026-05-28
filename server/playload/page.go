package playload

import (
	"app/model"
	"encoding/json"

	"github.com/google/uuid"
)

type PageNodeDTO struct {
	model.Page
	HasChildren bool           `json:"has_children"` // 用於前端判斷是否顯示展開箭頭
	Role        string         `json:"role"`         // 當前用戶權限：admin/editor/viewer
	RoleName    string         `json:"role_name"`    // 權限標識符（如 public/default），與 Space 保持一致
	Children    []*PageNodeDTO `json:"children"`     // 嵌套子頁面
}

// MovePageRequest 拖拽请求载荷
// 用于描述页面在树结构中的新位置
type MovePageReq struct {
	PageID      uuid.UUID  `json:"page_id" binding:"required"`  // 被拖动的页面 ID
	NewParentID *uuid.UUID `json:"new_parent_id"`               // 目标父页面 ID（移到根目录则为 nil）
	PrevPageID  *uuid.UUID `json:"prev_page_id"`                // 移动后，排在它上方的页面 ID
	NextPageID  *uuid.UUID `json:"next_page_id"`                // 移动后，排在它下方的页面 ID
	SpaceID     uuid.UUID  `json:"space_id" binding:"required"` // 所属空间 ID（安全校验）
}

// PageSavePatchReq RFC 6902 JSON Patch，作用于当前页面的 content 根文档
type PageSavePatchReq struct {
	ID      uuid.UUID       `json:"id" binding:"required"`
	Version int             `json:"version" binding:"required"`
	Patch   json.RawMessage `json:"patch" binding:"required"`
}

// PageRestoreRevisionReq 将历史快照写回为「新版本」（先归档当前头再应用）
type PageRestoreRevisionReq struct {
	PageID            uuid.UUID `json:"page_id" binding:"required"`
	SourcePageVersion int       `json:"source_page_version" binding:"required"` // sys_page_revision.page_version
	BaseVersion       int       `json:"base_version" binding:"required"`        // 当前页乐观锁
}

// PageRevisionMetaDTO 快照列表项（不含大字段 content）
type PageRevisionMetaDTO struct {
	PageVersion int       `json:"page_version"`
	CreateBy    uuid.UUID `json:"create_by"`
	CreateTime  string    `json:"create_time"`
}

// PageUpdateMetaReq 更新页面元数据（标题、可见性、继承开关）
type PageUpdateMetaReq struct {
	ID            uuid.UUID `json:"id" binding:"required"`
	Title         *string   `json:"title"`
	Visibility    *string   `json:"visibility"`
	InheritConfig *bool     `json:"inherit_config"`
}

// UserPageLibraryItemDTO 最近打开 / 我的收藏列表项
type UserPageLibraryItemDTO struct {
	PageID   uuid.UUID `json:"page_id"`
	Title    string    `json:"title"`
	SpaceID  uuid.UUID `json:"space_id"`
	PageType string    `json:"page_type"` // document / ppt 等
	SortTime string    `json:"sort_time"` // RFC3339，最近为 last_open_at，收藏为 create_time
}
