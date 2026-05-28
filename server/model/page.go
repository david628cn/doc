package model

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

const (
	// Page 可見性 (與 Space 保持一致或更細粒度)
	PageVisibilityWorkspace = "workspace" // 空間內全員可見
	PageVisibilityPrivate   = "private"   // 私密（僅限創建者或 PageAccess 授權者）
)

// 页面业务类型（可扩展：白板、表格等）
const (
	PageTypeDocument = "document" // 文档（ProseMirror / 协同正文）
	PageTypePpt      = "ppt"      // 演示 / PPT 等
)

// IsValidPageType 是否为受支持的类型字符串（小写）
func IsValidPageType(s string) bool {
	switch strings.TrimSpace(strings.ToLower(s)) {
	case PageTypeDocument, PageTypePpt:
		return true
	default:
		return false
	}
}

// NormalizePageType 归一化；空或未知时回退为文档
func NormalizePageType(s string) string {
	t := strings.TrimSpace(strings.ToLower(s))
	if IsValidPageType(t) {
		return t
	}
	return PageTypeDocument
}

type Page struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID uuid.UUID  `gorm:"column:workspace_id;index" json:"workspace_id"` // 隔离标识，增加索引
	SpaceID     uuid.UUID  `gorm:"column:space_id;index" json:"space_id"`         // 物理所属 Space，增加索引
	ParentID    *uuid.UUID `gorm:"column:parent_id;index" json:"parent_id"`       // 父页面 ID，用于树形结构

	Title      string         `gorm:"type:text;column:title;default:'未命名'" json:"title"`
	// PageType 业务类型：document / ppt 等
	PageType string `gorm:"column:page_type;type:varchar(32);not null;default:document" json:"page_type"`
	Content    datatypes.JSON `gorm:"type:jsonb;column:content" json:"content"`
	ContentText string        `gorm:"type:text;column:content_text" json:"content_text"`
	// YdocState 由 collaborate-server 定時任務（COLLAB_PG_URL）直接 UPDATE 寫入的 Yjs 快照（opaque）。
	YdocState []byte `gorm:"column:ydoc_state;type:bytea" json:"-"`
	Visibility string `gorm:"column:visibility;default:workspace" json:"visibility"`
	// InheritConfig 为 false 时仅使用本页 sys_page_access（及私密页创建者兜底），不向上继承父页/空间权限
	InheritConfig bool `gorm:"column:inherit_config;not null;default:true" json:"inherit_config"`
	Version       int  `gorm:"column:version;not null;default:1" json:"version"`

	// 分享相关
	ShareEnabled bool   `gorm:"column:share_enabled;default:false" json:"share_enabled"`
	ShareToken   string `gorm:"type:varchar(64);column:share_token;index" json:"share_token"` // Token 增加索引

	// 排序：使用 float64 实现“分数排序”，支持在任意两项间插入
	SortOrder float64 `gorm:"type:double precision;column:sort_order;default:0" json:"sort_order"`

	CreateBy uuid.UUID `gorm:"column:create_by" json:"create_by"`
	UpdateBy uuid.UUID `gorm:"column:update_by" json:"update_by"`

	LastAccessTime time.Time  `gorm:"column:last_access_time" json:"last_access_time"`
	CreateTime     time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime     time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime     *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (Page) TableName() string {
	return "sys_page"
}
