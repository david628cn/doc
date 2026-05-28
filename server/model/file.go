package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	VisInherit = "inherit" // 继承业务对象权限
	VisPublic  = "public"  // 公开
	VisPrivate = "private" // 私有

	TypeAvatar = "avatar"
	TypeIcon   = "icon"
	TypeEmoji  = "emoji"
	TypePage   = "page"
	TypeChat   = "chat" // 私聊/群聊附件（公开目录，不按工作区隔离）
)

type FileTypeConfig struct {
	Visibility string
	SubPath    string // 相对于 uploads 的子目录
}

// 变量化权限配置映射
var TypeConfigMap = map[string]FileTypeConfig{
	TypeAvatar: {Visibility: VisPublic, SubPath: "avatar"},
	TypeIcon:   {Visibility: VisPublic, SubPath: "icon"},
	TypeEmoji:  {Visibility: VisPublic, SubPath: "emoji"},
	TypeChat:   {Visibility: VisPublic, SubPath: "chat"},
	TypePage:   {Visibility: VisInherit, SubPath: "attachment/page"},
}

type File struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID *uuid.UUID `gorm:"column:workspace_id;" json:"workspace_id"`
	// 业务关联
	RelatedType string     `gorm:"column:related_type;type:varchar(20);index:idx_related" json:"related_type"`
	RelatedID   *uuid.UUID `gorm:"column:related_id;type:uuid;index:idx_related" json:"related_id"`
	Visibility  string     `gorm:"column:visibility;type:varchar(20);default:'inherit'" json:"visibility"`
	// 文件属性
	Name        string `gorm:"column:name;not null" json:"name"`
	OriginName  string `json:"origin_name"` // 原始名：上传时的文件名（只读）
	Size        int64  `gorm:"column:size;default:0" json:"size"`
	Type        string `gorm:"column:type;type:varchar(100)" json:"type"`
	MimeType    string `gorm:"column:mime_type;type:varchar(100)" json:"mime_type"`
	Path        string `gorm:"column:path;type:varchar(512);not null" json:"path"`
	Hash        string `gorm:"column:hash;type:varchar(64);index" json:"hash"`
	Description string `gorm:"column:description" json:"description"`
	// 状态
	Status     int        `gorm:"column:status;default:0" json:"-"`
	RefCount   int64      `gorm:"column:ref_count;default:0" json:"ref_count"`
	CreateBy   uuid.UUID  `gorm:"column:create_by;index" json:"create_by"`
	UserName   string     `gorm:"column:username;type:varchar(50)" json:"username"`
	CreateTime time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
	DeleteTime *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (File) TableName() string {
	return "sys_file"
}
