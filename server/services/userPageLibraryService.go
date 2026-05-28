package services

import (
	"app/model"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserPageLibraryService struct {
	DB *gorm.DB
}

func NewUserPageLibraryService(db *gorm.DB) *UserPageLibraryService {
	return &UserPageLibraryService{DB: db}
}

// RecentListRow JOIN 查询结果
type RecentListRow struct {
	PageID     uuid.UUID `gorm:"column:page_id"`
	SpaceID    uuid.UUID `gorm:"column:space_id"`
	Title      string    `gorm:"column:title"`
	LastOpenAt time.Time `gorm:"column:last_open_at"`
}

// StarListRow JOIN 查询结果
type StarListRow struct {
	PageID     uuid.UUID `gorm:"column:page_id"`
	SpaceID    uuid.UUID `gorm:"column:space_id"`
	Title      string    `gorm:"column:title"`
	CreateTime time.Time `gorm:"column:create_time"`
}

// TouchRecent 记录或更新最近打开时间
func (s *UserPageLibraryService) TouchRecent(ctx context.Context, userID, workspaceID, pageID uuid.UUID) error {
	now := time.Now()
	rec := model.UserPageRecent{
		UserID:      userID,
		WorkspaceID: workspaceID,
		PageID:      pageID,
		LastOpenAt:  now,
	}
	return s.DB.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "page_id"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"workspace_id": workspaceID,
			"last_open_at": now,
		}),
	}).Create(&rec).Error
}

// SetStarred true 收藏；false 取消
func (s *UserPageLibraryService) SetStarred(ctx context.Context, userID, workspaceID, pageID uuid.UUID, starred bool) error {
	if starred {
		row := model.UserPageStar{
			UserID:      userID,
			WorkspaceID: workspaceID,
			PageID:      pageID,
		}
		return s.DB.WithContext(ctx).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}, {Name: "page_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"workspace_id": workspaceID,
				"create_time":  time.Now(),
			}),
		}).Create(&row).Error
	}
	return s.DB.WithContext(ctx).
		Where("user_id = ? AND page_id = ?", userID, pageID).
		Delete(&model.UserPageStar{}).Error
}

// IsStarred 当前用户是否已收藏该页
func (s *UserPageLibraryService) IsStarred(ctx context.Context, userID, pageID uuid.UUID) (bool, error) {
	var n int64
	err := s.DB.WithContext(ctx).Model(&model.UserPageStar{}).
		Where("user_id = ? AND page_id = ?", userID, pageID).
		Count(&n).Error
	return n > 0, err
}

// ListRecent 按最近打开时间倒序
func (s *UserPageLibraryService) ListRecent(ctx context.Context, userID, workspaceID uuid.UUID, limit int) ([]RecentListRow, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []RecentListRow
	err := s.DB.WithContext(ctx).Raw(`
		SELECT p.id AS page_id, p.space_id, p.title, r.last_open_at
		FROM sys_user_page_recent r
		INNER JOIN sys_page p ON p.id = r.page_id AND p.workspace_id = ?
		WHERE r.user_id = ? AND r.workspace_id = ? AND p.delete_time IS NULL
		ORDER BY r.last_open_at DESC
		LIMIT ?
	`, workspaceID, userID, workspaceID, limit).Scan(&rows).Error
	return rows, err
}

// ListStarred 按收藏时间倒序
func (s *UserPageLibraryService) ListStarred(ctx context.Context, userID, workspaceID uuid.UUID, limit int) ([]StarListRow, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []StarListRow
	err := s.DB.WithContext(ctx).Raw(`
		SELECT p.id AS page_id, p.space_id, p.title, s.create_time
		FROM sys_user_page_star s
		INNER JOIN sys_page p ON p.id = s.page_id AND p.workspace_id = ?
		WHERE s.user_id = ? AND s.workspace_id = ? AND p.delete_time IS NULL
		ORDER BY s.create_time DESC
		LIMIT ?
	`, workspaceID, userID, workspaceID, limit).Scan(&rows).Error
	return rows, err
}
