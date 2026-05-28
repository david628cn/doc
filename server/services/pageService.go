package services

import (
	"app/errs"
	"app/model"
	"app/playload"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// 排序相關常量
const (
	DefaultSortStep  = 1024.0 // 默認排序步進
	MinSortPrecision = 1e-10  // 最小精度閾值
)

// PageTreeNode 樹形結構響應
type PageTreeNode struct {
	model.Page
	Children []*PageTreeNode `json:"children"`
}

// sortPageTreeBySortOrder 构建父子关系后按同级 sort_order、create_time 排序（全局遍历顺序不等于同级顺序）。
func sortPageTreeBySortOrder(nodes []*PageTreeNode) {
	sort.SliceStable(nodes, func(i, j int) bool {
		a, b := nodes[i].SortOrder, nodes[j].SortOrder
		if a != b {
			return a < b
		}
		return nodes[i].CreateTime.Before(nodes[j].CreateTime)
	})
	for _, n := range nodes {
		if len(n.Children) > 0 {
			sortPageTreeBySortOrder(n.Children)
		}
	}
}

type PageService struct {
	BaseService[model.Page]
}

func NewPageService(db *gorm.DB) *PageService {
	return &PageService{
		BaseService: *NewBaseService[model.Page](db),
	}
}

// TreeBySpaceID 獲取空間下的完整頁面樹 (高效構建)
func (s *PageService) TreeBySpaceID(ctx context.Context, workspaceID, spaceID uuid.UUID) ([]*PageTreeNode, error) {
	var pages []model.Page
	// 1. 查詢該空間下所有未刪除頁面，按 sort_order 排序
	err := s.Dao.DB.WithContext(ctx).
		Where("workspace_id = ? AND space_id = ? AND delete_time IS NULL", workspaceID, spaceID).
		Order("sort_order ASC, create_time ASC").
		Find(&pages).Error

	if err != nil {
		return nil, err
	}

	// 2. 使用 Map 一次性構建樹形結構，時間複雜度 O(n)
	nodes := make(map[uuid.UUID]*PageTreeNode)
	var rootNodes []*PageTreeNode

	for i := range pages {
		nodes[pages[i].ID] = &PageTreeNode{
			Page:     pages[i],
			Children: make([]*PageTreeNode, 0),
		}
	}

	for i := range pages {
		p := &pages[i]
		node := nodes[p.ID]
		if p.ParentID == nil || *p.ParentID == uuid.Nil {
			rootNodes = append(rootNodes, node)
		} else {
			if parent, ok := nodes[*p.ParentID]; ok {
				parent.Children = append(parent.Children, node)
			} else {
				// 容錯處理：找不到父節點的頁面視為根節點
				rootNodes = append(rootNodes, node)
			}
		}
	}
	sortPageTreeBySortOrder(rootNodes)
	return rootNodes, nil
}

func effectiveUserIDForPageUpdate(p model.Page, updatedBy *uuid.UUID) uuid.UUID {
	if updatedBy != nil && *updatedBy != uuid.Nil {
		return *updatedBy
	}
	if p.UpdateBy != uuid.Nil {
		return p.UpdateBy
	}
	return p.CreateBy
}

// MovePage 核心移動與排序邏輯 (基於分數排序)
func (s *PageService) MovePage(ctx context.Context, workspaceID, userID uuid.UUID, req playload.MovePageReq) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var prevOrder, nextOrder float64

		// 1. 獲取前後節點的排序值 (確保租戶隔離)
		if req.PrevPageID != nil && *req.PrevPageID != uuid.Nil {
			tx.Model(&model.Page{}).Where("id = ? AND workspace_id = ?", *req.PrevPageID, workspaceID).Pluck("sort_order", &prevOrder)
		}
		if req.NextPageID != nil && *req.NextPageID != uuid.Nil {
			tx.Model(&model.Page{}).Where("id = ? AND workspace_id = ?", *req.NextPageID, workspaceID).Pluck("sort_order", &nextOrder)
		}

		// 2. 計算新排序值
		var newOrder float64
		if req.PrevPageID == nil && req.NextPageID == nil {
			newOrder = DefaultSortStep
		} else if req.PrevPageID == nil {
			// 插到同級最前（僅有 next）：必須嚴格小於 next 的 sort_order。
			// 若 next 為 0（或未初始化），next/2 仍為 0，無法排到「首位」，排序會退回 create_time。
			if req.NextPageID == nil || *req.NextPageID == uuid.Nil {
				newOrder = DefaultSortStep
			} else if nextOrder <= 0 {
				newOrder = nextOrder - DefaultSortStep
			} else {
				newOrder = nextOrder / 2
			}
		} else if req.NextPageID == nil {
			newOrder = prevOrder + DefaultSortStep
		} else {
			newOrder = (prevOrder + nextOrder) / 2
		}

		// 3. 更新父級與排序
		var pID *uuid.UUID
		if req.NewParentID != nil && *req.NewParentID != uuid.Nil {
			pID = req.NewParentID
		}

		return tx.Model(&model.Page{}).
			Where("id = ? AND workspace_id = ?", req.PageID, workspaceID).
			Updates(map[string]interface{}{
				"parent_id":   pID,
				"sort_order":  newOrder,
				"update_by":   userID,
				"update_time": time.Now(),
			}).Error
	})
}

// Create 創建新頁面
func (s *PageService) Create(ctx context.Context, page *model.Page) error {
	// 自動計算末尾排序值
	if page.SortOrder == 0 {
		var maxOrder float64
		s.Dao.DB.WithContext(ctx).Model(&model.Page{}).
			Where("workspace_id = ? AND space_id = ? AND parent_id = ? AND delete_time IS NULL",
				page.WorkspaceID, page.SpaceID, page.ParentID).
			Select("COALESCE(MAX(sort_order), 0)").
			Scan(&maxOrder)
		page.SortOrder = maxOrder + DefaultSortStep
	}

	if page.ID == uuid.Nil {
		page.ID = uuid.New()
	}

	now := time.Now()
	page.CreateTime = now
	page.UpdateTime = now
	page.Version = 1

	return s.Dao.DB.WithContext(ctx).Create(page).Error
}

// SoftDelete 遞歸軟刪除 (使用 CTE 確保級聯刪除子頁面)
func (s *PageService) SoftDelete(ctx context.Context, workspaceID, pageID, userID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		// 使用 RECURSIVE 查找所有下級頁面 ID 並統一標記刪除
		return tx.Exec(`
			UPDATE sys_page 
			SET delete_time = ?, update_by = ?
			WHERE workspace_id = ? AND id IN (
				WITH RECURSIVE subordinates AS (
					SELECT id FROM sys_page WHERE id = ?
					UNION ALL
					SELECT p.id FROM sys_page p
					INNER JOIN subordinates s ON p.parent_id = s.id
				)
				SELECT id FROM subordinates
			) AND delete_time IS NULL`, now, userID, workspaceID, pageID).Error
	})
}

func (s *PageService) insertPageRevision(tx *gorm.DB, p *model.Page, userID uuid.UUID) error {
	if p.Version < 1 {
		return nil
	}
	raw := []byte(p.Content)
	if len(raw) == 0 {
		raw = []byte("[]")
	}
	rev := model.PageRevision{
		ID:          uuid.New(),
		PageID:      p.ID,
		WorkspaceID: p.WorkspaceID,
		SpaceID:     p.SpaceID,
		PageVersion: p.Version,
		Content:     datatypes.JSON(append([]byte(nil), raw...)),
		CreateBy:    userID,
	}
	return tx.Create(&rev).Error
}

// SaveContent 保存全文 (樂觀鎖)；成功時将当前版本写入 sys_page_revision 再 bump 版本
func (s *PageService) SaveContent(ctx context.Context, workspaceID, pageID, userID uuid.UUID, content []byte, currentVersion int) (int, error) {
	newVersion := currentVersion + 1
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p model.Page
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND workspace_id = ? AND delete_time IS NULL", pageID, workspaceID).
			First(&p).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrPageNotFound
			}
			return err
		}
		if p.Version != currentVersion {
			return errs.ErrPageContentConflict
		}
		if err := s.insertPageRevision(tx, &p, userID); err != nil {
			return err
		}
		now := time.Now()
		result := tx.Model(&model.Page{}).
			Where("id = ? AND workspace_id = ? AND version = ? AND delete_time IS NULL", pageID, workspaceID, currentVersion).
			Updates(map[string]interface{}{
				"content":     datatypes.JSON(content),
				"version":     newVersion,
				"update_by":   userID,
				"update_time": now,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errs.ErrPageContentConflict
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return newVersion, nil
}

// ApplyContentPatch 对 content 根 JSON 应用 RFC6902 Patch，成功后同样归档并 bump 版本
func (s *PageService) ApplyContentPatch(ctx context.Context, workspaceID, pageID, userID uuid.UUID, baseVersion int, patch json.RawMessage) (newVersion int, patched []byte, err error) {
	patchDoc, err := jsonpatch.DecodePatch(patch)
	if err != nil {
		return 0, nil, fmt.Errorf("%w: %v", errs.ErrPagePatchInvalid, err)
	}
	err = s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p model.Page
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND workspace_id = ? AND delete_time IS NULL", pageID, workspaceID).
			First(&p).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrPageNotFound
			}
			return err
		}
		if p.Version != baseVersion {
			return errs.ErrPageContentConflict
		}
		doc := []byte(p.Content)
		if len(doc) == 0 {
			doc = []byte("[]")
		}
		out, err := patchDoc.Apply(doc)
		if err != nil {
			return fmt.Errorf("%w: %v", errs.ErrPagePatchInvalid, err)
		}
		if !json.Valid(out) {
			return fmt.Errorf("%w: patch 结果不是合法 JSON", errs.ErrPagePatchInvalid)
		}
		if err := s.insertPageRevision(tx, &p, userID); err != nil {
			return err
		}
		nv := p.Version + 1
		newVersion = nv
		patched = out
		now := time.Now()
		res := tx.Model(&model.Page{}).
			Where("id = ? AND workspace_id = ? AND version = ? AND delete_time IS NULL", pageID, workspaceID, baseVersion).
			Updates(map[string]interface{}{
				"content":     datatypes.JSON(append([]byte(nil), out...)),
				"version":     nv,
				"update_by":   userID,
				"update_time": now,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.ErrPageContentConflict
		}
		return nil
	})
	if err != nil {
		return 0, nil, err
	}
	return newVersion, patched, nil
}

// ListPageRevisionMeta 快照列表（不含 content）
func (s *PageService) ListPageRevisionMeta(ctx context.Context, workspaceID, pageID uuid.UUID, limit int) ([]playload.PageRevisionMetaDTO, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var rows []model.PageRevision
	err := s.Dao.DB.WithContext(ctx).
		Model(&model.PageRevision{}).
		Select("page_version", "create_by", "create_time").
		Where("workspace_id = ? AND page_id = ?", workspaceID, pageID).
		Order("page_version DESC").
		Limit(limit).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]playload.PageRevisionMetaDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, playload.PageRevisionMetaDTO{
			PageVersion: r.PageVersion,
			CreateBy:    r.CreateBy,
			CreateTime:  r.CreateTime.Format(time.RFC3339Nano),
		})
	}
	return out, nil
}

// GetPageRevision 读取某一历史版本的完整 content
func (s *PageService) GetPageRevision(ctx context.Context, workspaceID, pageID uuid.UUID, pageVersion int) (*model.PageRevision, error) {
	var rev model.PageRevision
	err := s.Dao.DB.WithContext(ctx).
		Where("workspace_id = ? AND page_id = ? AND page_version = ?", workspaceID, pageID, pageVersion).
		First(&rev).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rev, nil
}

// RestoreFromRevision 用历史快照覆盖当前页，作为新版本（先归档当前头）
func (s *PageService) RestoreFromRevision(ctx context.Context, workspaceID, pageID, userID uuid.UUID, sourcePageVersion, baseVersion int) (int, error) {
	var newVersion int
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p model.Page
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND workspace_id = ? AND delete_time IS NULL", pageID, workspaceID).
			First(&p).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrPageNotFound
			}
			return err
		}
		if p.Version != baseVersion {
			return errs.ErrPageContentConflict
		}
		var rev model.PageRevision
		if err := tx.Where("workspace_id = ? AND page_id = ? AND page_version = ?", workspaceID, pageID, sourcePageVersion).
			First(&rev).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrPageRevisionNotFound
			}
			return err
		}
		if err := s.insertPageRevision(tx, &p, userID); err != nil {
			return err
		}
		nv := p.Version + 1
		newVersion = nv
		now := time.Now()
		res := tx.Model(&model.Page{}).
			Where("id = ? AND workspace_id = ? AND version = ? AND delete_time IS NULL", pageID, workspaceID, baseVersion).
			Updates(map[string]interface{}{
				"content":     rev.Content,
				"version":     nv,
				"update_by":   userID,
				"update_time": now,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.ErrPageContentConflict
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return newVersion, nil
}

// GetByIDGlobal 僅按頁面主鍵查詢（協作鉴权用：document_name 即 pageId；不承載 ProseMirror 正文）。
func (s *PageService) GetByIDGlobal(ctx context.Context, pageID uuid.UUID) (*model.Page, error) {
	var page model.Page
	err := s.Dao.DB.WithContext(ctx).
		Where("id = ? AND delete_time IS NULL", pageID).
		First(&page).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &page, nil
}

// GetDetail 獲取頁面詳情
func (s *PageService) GetDetail(ctx context.Context, workspaceID, pageID uuid.UUID) (*model.Page, error) {
	var page model.Page
	err := s.Dao.DB.WithContext(ctx).
		Where("id = ? AND workspace_id = ? AND delete_time IS NULL", pageID, workspaceID).
		First(&page).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &page, nil
}

// GetYdocStateAndContentForCollab 一次读取 ydoc_state 与 content：优先用前者协同快照，否则可用后者 JSON 初始化（见 collab-server）。
func (s *PageService) GetYdocStateAndContentForCollab(ctx context.Context, pageID uuid.UUID) (ydoc []byte, content datatypes.JSON, err error) {
	var p model.Page
	err = s.Dao.DB.WithContext(ctx).
		Select("ydoc_state", "content").
		Where("id = ? AND delete_time IS NULL", pageID).
		First(&p).Error
	if err != nil {
		return nil, nil, err
	}
	return p.YdocState, p.Content, nil
}

// GetYdocState 读取协同归档字节流（供 Hocuspocus onLoadDocument 从 Gin 拉取初始 Yjs update）。
func (s *PageService) GetYdocState(ctx context.Context, pageID uuid.UUID) ([]byte, error) {
	var p model.Page
	err := s.Dao.DB.WithContext(ctx).
		Select("ydoc_state").
		Where("id = ? AND delete_time IS NULL", pageID).
		First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return p.YdocState, nil
}

// UpdateYdocArchive 将协同归档写入 sys_page.ydoc_state（opaque bytea），供 Hocuspocus Webhook worker 异步调用。
func (s *PageService) UpdateYdocArchive(ctx context.Context, pageID uuid.UUID, ydocBytes []byte) error {
	return s.UpdateCollabSnapshot(ctx, pageID, ydocBytes, nil, "", nil)
}

// UpdateCollabSnapshot 同时写入 ydoc_state；若 PM content 相对库中有变化则归档旧版到 sys_page_revision 并 bump version（与 SaveContent 一致）。
// updatedBy 可为 nil（协同异步任务）：落库时用页 update_by / create_by 兜底。
func (s *PageService) UpdateCollabSnapshot(ctx context.Context, pageID uuid.UUID, ydocBytes []byte, contentJSON datatypes.JSON, contentText string, updatedBy *uuid.UUID) error {
	ct := strings.TrimSpace(contentText)
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p model.Page
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND delete_time IS NULL", pageID).
			First(&p).Error; err != nil {
			return err
		}
		eff := effectiveUserIDForPageUpdate(p, updatedBy)
		now := time.Now()
		u := map[string]interface{}{
			"ydoc_state":  ydocBytes,
			"update_time": now,
			"update_by":   eff,
		}
		contentChanged := len(contentJSON) > 0 && !bytes.Equal([]byte(p.Content), []byte(contentJSON))
		if contentChanged {
			if err := s.insertPageRevision(tx, &p, eff); err != nil {
				return err
			}
			nv := p.Version + 1
			u["content"] = contentJSON
			u["version"] = nv
			if ct != "" {
				u["content_text"] = ct
			}
			res := tx.Model(&model.Page{}).
				Where("id = ? AND version = ? AND delete_time IS NULL", pageID, p.Version).
				Updates(u)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return errs.ErrPageContentConflict
			}
			return nil
		}
		if ct != "" {
			u["content_text"] = ct
		}
		return tx.Model(&model.Page{}).
			Where("id = ? AND delete_time IS NULL", pageID).
			Updates(u).Error
	})
}

// UpdateMeta 更新页面元数据（仅允许白名单字段）
func (s *PageService) UpdateMeta(ctx context.Context, workspaceID, pageID uuid.UUID, fields map[string]interface{}) error {
	allowed := map[string]struct{}{
		"title": {}, "visibility": {}, "inherit_config": {}, "update_by": {},
	}
	clean := make(map[string]interface{}, len(fields))
	for k, v := range fields {
		if _, ok := allowed[k]; ok {
			clean[k] = v
		}
	}
	if len(clean) == 0 {
		return nil
	}
	clean["update_time"] = time.Now()
	return s.Dao.DB.WithContext(ctx).
		Model(&model.Page{}).
		Where("id = ? AND workspace_id = ? AND delete_time IS NULL", pageID, workspaceID).
		Updates(clean).Error
}
