package services

import (
	"app/model"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PageAccessService struct {
	BaseService[model.PageAccess]
	SpaceSrv *SpaceService
}

func NewPageAccessService(db *gorm.DB, spaceSrv *SpaceService) *PageAccessService {
	return &PageAccessService{
		BaseService: *NewBaseService[model.PageAccess](db),
		SpaceSrv:    spaceSrv,
	}
}

// GrantAccess 頁面級授權 (支持重複授權自動更新)
func (s *PageAccessService) GrantAccess(ctx context.Context, pageID uuid.UUID, accesses []model.PageAccess) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, acc := range accesses {
			acc.PageID = pageID
			// 利用唯一索引處理衝突：更新角色、過期時間和刪除標記
			err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "page_id"}, {Name: "subject_id"}, {Name: "subject_type"}},
				DoUpdates: clause.AssignmentColumns([]string{"role", "expired_time", "update_time", "delete_time"}),
			}).Create(&acc).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}

// RevokeAccess 撤銷頁面授權 (軟刪除)
func (s *PageAccessService) RevokeAccess(ctx context.Context, pageID uuid.UUID, subjectID uuid.UUID, subjectType string) error {
	return s.Dao.DB.WithContext(ctx).Model(&model.PageAccess{}).
		Where("page_id = ? AND subject_id = ? AND subject_type = ?", pageID, subjectID, subjectType).
		Update("delete_time", time.Now()).Error
}

const maxPageAncestorDepth = 512

func (s *PageAccessService) loadPageAncestorChain(ctx context.Context, workspaceID, spaceID, pageID uuid.UUID) ([]model.Page, error) {
	chain := make([]model.Page, 0, 8)
	curID := pageID
	seen := make(map[uuid.UUID]struct{}, 16)
	for i := 0; i < maxPageAncestorDepth; i++ {
		if _, dup := seen[curID]; dup {
			return nil, errors.New("页面父链存在环")
		}
		seen[curID] = struct{}{}
		var p model.Page
		err := s.Dao.DB.WithContext(ctx).
			Where("id = ? AND workspace_id = ? AND space_id = ? AND delete_time IS NULL", curID, workspaceID, spaceID).
			First(&p).Error
		if err != nil {
			return nil, err
		}
		chain = append(chain, p)
		if p.ParentID == nil {
			break
		}
		curID = *p.ParentID
	}
	return chain, nil
}

func maxSpaceRoleWeight(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// pageACLMaxWeight 单页 sys_page_access 上用户+组 的最高角色权重
func (s *PageAccessService) pageACLMaxWeight(ctx context.Context, pageID, userID uuid.UUID, groupIDs []uuid.UUID) (int, error) {
	hasGroups := len(groupIDs) > 0
	if !hasGroups {
		groupIDs = []uuid.UUID{uuid.Nil}
	}
	var role string
	err := s.Dao.DB.WithContext(ctx).Raw(`
		SELECT role FROM sys_page_access
		WHERE page_id = ? AND delete_time IS NULL
		AND (expired_time IS NULL OR expired_time > NOW())
		AND (
			(LOWER(TRIM(subject_type)) = LOWER(?) AND subject_id = ?)
			OR (LOWER(TRIM(subject_type)) = LOWER(?) AND subject_id IN ?)
		)
		ORDER BY CASE LOWER(TRIM(role))
			WHEN ? THEN 4 WHEN ? THEN 3 WHEN ? THEN 2 WHEN ? THEN 1 ELSE 0
		END DESC LIMIT 1
	`,
		pageID,
		model.SubjectTypeUser, userID,
		model.SubjectTypeGroup, groupIDs,
		model.SpaceRoleOwner, model.SpaceRoleAdmin, model.SpaceRoleEditor, model.SpaceRoleViewer,
	).Scan(&role).Error
	if err != nil {
		return 0, err
	}
	return model.GetSpaceRoleWeight(role), nil
}

// GetUserPageRole 页面有效角色：Page_ACL → 父链（受 inherit_config 阻断）→ 空间 EffectiveSpaceRole；私密页创建者至少 Editor
func (s *PageAccessService) GetUserPageRole(ctx context.Context, workspaceID, pageID, spaceID, userID uuid.UUID, groupIDs []uuid.UUID) (string, error) {
	chain, err := s.loadPageAncestorChain(ctx, workspaceID, spaceID, pageID)
	if err != nil {
		return model.SpaceRoleNone, err
	}

	var spaceW int
	if s.SpaceSrv != nil {
		detail, err := s.SpaceSrv.GetSpaceInfoWithAccess(ctx, spaceID, userID, workspaceID)
		if err != nil {
			return model.SpaceRoleNone, err
		}
		spaceW = model.GetSpaceRoleWeight(detail.Role)
	}

	aclWs := make([]int, len(chain))
	for i := range chain {
		w, err := s.pageACLMaxWeight(ctx, chain[i].ID, userID, groupIDs)
		if err != nil {
			return model.SpaceRoleNone, err
		}
		aclWs[i] = w
	}

	// chain[0]=当前页, chain[len-1]=根页；递归从索引 0 开始，根页之上接 spaceW
	var rec func(i int) int
	rec = func(i int) int {
		p := chain[i]
		aclW := aclWs[i]
		if p.Visibility == model.PageVisibilityPrivate && p.CreateBy == userID {
			aclW = maxSpaceRoleWeight(aclW, model.GetSpaceRoleWeight(model.SpaceRoleEditor))
		}
		if !p.InheritConfig {
			return aclW
		}
		below := spaceW
		if i+1 < len(chain) {
			below = rec(i + 1)
		}
		return maxSpaceRoleWeight(aclW, below)
	}

	return model.GetRoleByWeight(rec(0)), nil
}
