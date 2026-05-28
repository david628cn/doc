package controller

import (
	"app/errs"
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type PageCtrl struct {
	PageSrv          *services.PageService
	PageAccessSrv    *services.PageAccessService
	SpaceSrv         *services.SpaceService
	WorkspaceUserSrv *services.WorkspaceUserService
	UserPageLibSrv   *services.UserPageLibraryService
}

func NewPageCtrl(pageSrv *services.PageService, spaceSrv *services.SpaceService, workspaceUserSrv *services.WorkspaceUserService, pageAccessSrv *services.PageAccessService, userPageLibSrv *services.UserPageLibraryService) *PageCtrl {
	return &PageCtrl{
		PageSrv:          pageSrv,
		PageAccessSrv:    pageAccessSrv,
		SpaceSrv:         spaceSrv,
		WorkspaceUserSrv: workspaceUserSrv,
		UserPageLibSrv:   userPageLibSrv,
	}
}

func (c *PageCtrl) effectivePageRole(ctx context.Context, workspaceID, pageID, spaceID, userID uuid.UUID) (string, error) {
	gids, err := c.WorkspaceUserSrv.ListUserGroupIDsInWorkspace(ctx, workspaceID, userID)
	if err != nil {
		return model.SpaceRoleNone, err
	}
	return c.PageAccessSrv.GetUserPageRole(ctx, workspaceID, pageID, spaceID, userID, gids)
}

// checkPageMutate 非 Guest + 能进入空间 + 目标页有效角色 >= editor（含父链继承与 inherit_config）
func (c *PageCtrl) checkPageMutate(ctx context.Context, workspaceID, userID, spaceID, leafPageID uuid.UUID) error {
	wu, err := c.WorkspaceUserSrv.FindByUser(ctx, workspaceID, userID)
	if err != nil {
		return err
	}
	if wu == nil {
		return errs.ErrNotWorkspaceMember
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceMember) {
		return errs.ErrWorkspaceGuestReadOnly
	}
	ok, err := c.SpaceSrv.CheckAccess(ctx, spaceID, workspaceID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errs.ErrForbidden
	}
	role, err := c.effectivePageRole(ctx, workspaceID, leafPageID, spaceID, userID)
	if err != nil {
		return err
	}
	if model.GetSpaceRoleWeight(role) < model.GetSpaceRoleWeight(model.SpaceRoleEditor) {
		return errs.ErrInsufficientSpaceRoleForEdit
	}
	return nil
}

// checkPageCreate 在库下新建页面：根级依赖空间 Editor+；有父级时父页有效角色须 >= editor
func (c *PageCtrl) checkPageCreate(ctx context.Context, workspaceID, userID, spaceID uuid.UUID, parentID *uuid.UUID) error {
	wu, err := c.WorkspaceUserSrv.FindByUser(ctx, workspaceID, userID)
	if err != nil {
		return err
	}
	if wu == nil {
		return errs.ErrNotWorkspaceMember
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceMember) {
		return errs.ErrWorkspaceGuestReadOnly
	}
	ok, err := c.SpaceSrv.CheckAccess(ctx, spaceID, workspaceID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errs.ErrForbidden
	}
	if parentID != nil {
		return c.checkPageMutate(ctx, workspaceID, userID, spaceID, *parentID)
	}
	detail, err := c.SpaceSrv.GetSpaceInfoWithAccess(ctx, spaceID, userID, workspaceID)
	if err != nil {
		return err
	}
	if model.GetSpaceRoleWeight(detail.Role) < model.GetSpaceRoleWeight(model.SpaceRoleEditor) {
		return errs.ErrInsufficientSpaceRoleForEdit
	}
	return nil
}

func (c *PageCtrl) checkPageReadFull(ctx context.Context, workspaceID, userID uuid.UUID, page *model.Page) error {
	ok, err := c.SpaceSrv.CheckAccess(ctx, page.SpaceID, workspaceID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errs.ErrForbidden
	}
	role, err := c.effectivePageRole(ctx, workspaceID, page.ID, page.SpaceID, userID)
	if err != nil {
		return err
	}
	if model.GetSpaceRoleWeight(role) < model.GetSpaceRoleWeight(model.SpaceRoleViewer) {
		return errs.ErrForbidden
	}
	return nil
}

// Tree 獲取頁面樹
func (c *PageCtrl) Tree(ctx *gin.Context) {
	spaceID, err := uuid.Parse(ctx.Query("space_id"))
	if err != nil {
		playload.SendError(ctx, "无效的Space ID")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	// 1. 空間級權限檢查
	hasAccess, err := c.SpaceSrv.CheckAccess(ctx, spaceID, workspaceID, user.ID)
	if err != nil || !hasAccess {
		playload.SendForbidden(ctx, "无权访问该库")
		return
	}

	// 2. 獲取樹形結構 (傳入 workspaceID 確保租戶隔離)
	pages, err := c.PageSrv.TreeBySpaceID(ctx, workspaceID, spaceID)
	if err != nil {
		playload.SendError(ctx, "获取页面失败")
		return
	}

	playload.SendSuccess(ctx, pages, "获取成功")
}

// Create 創建新頁面
func (c *PageCtrl) Create(ctx *gin.Context) {
	var req struct {
		SpaceID       uuid.UUID  `json:"space_id" binding:"required"`
		ParentID      *uuid.UUID `json:"parent_id"`
		Title         string     `json:"title"`
		InheritConfig *bool      `json:"inherit_config"`
		PageType      *string    `json:"page_type"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	if err := c.checkPageCreate(ctx.Request.Context(), workspaceID, user.ID, req.SpaceID, req.ParentID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	title := req.Title
	if title == "" {
		title = "未命名"
	}

	pageType := model.PageTypeDocument
	if req.PageType != nil && strings.TrimSpace(*req.PageType) != "" {
		t := strings.TrimSpace(strings.ToLower(*req.PageType))
		if !model.IsValidPageType(t) {
			playload.SendError(ctx, "无效的 page_type，可选：document、ppt")
			return
		}
		pageType = t
	}

	newPage := &model.Page{
		WorkspaceID:   workspaceID,
		SpaceID:       req.SpaceID,
		ParentID:      req.ParentID,
		Title:         title,
		PageType:      pageType,
		CreateBy:      user.ID,
		UpdateBy:      user.ID,
		Content:       datatypes.JSON([]byte("[]")),
		InheritConfig: true,
	}
	if req.InheritConfig != nil {
		newPage.InheritConfig = *req.InheritConfig
	}

	if err := c.PageSrv.Create(ctx, newPage); err != nil {
		playload.SendError(ctx, "创建页面失败")
		return
	}

	playload.SendSuccess(ctx, newPage, "创建成功")
}

// UpdateMeta 更新标题、可见性、是否继承父级/空间权限
func (c *PageCtrl) UpdateMeta(ctx *gin.Context) {
	var req playload.PageUpdateMetaReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)
	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.ID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, page.SpaceID, page.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}
	fields := map[string]interface{}{}
	if req.Title != nil {
		fields["title"] = *req.Title
	}
	if req.Visibility != nil {
		if *req.Visibility != model.PageVisibilityWorkspace && *req.Visibility != model.PageVisibilityPrivate {
			playload.SendError(ctx, "无效的 visibility")
			return
		}
		fields["visibility"] = *req.Visibility
	}
	if req.InheritConfig != nil {
		fields["inherit_config"] = *req.InheritConfig
	}
	if len(fields) == 0 {
		playload.SendError(ctx, "无更新字段")
		return
	}
	fields["update_by"] = user.ID
	if err := c.PageSrv.UpdateMeta(ctx, workspaceID, req.ID, fields); err != nil {
		playload.SendError(ctx, "更新失败")
		return
	}
	updated, err := c.PageSrv.GetDetail(ctx, workspaceID, req.ID)
	if err != nil || updated == nil {
		playload.SendSuccess(ctx, nil, "更新成功")
		return
	}
	playload.SendSuccess(ctx, updated, "更新成功")
}

// Move 處理頁面拖拽排序
func (c *PageCtrl) Move(ctx *gin.Context) {
	var req playload.MovePageReq // 使用定義好的 DTO
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, req.SpaceID, req.PageID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	// 調用修正後的 Service (傳入 workspaceID)
	if err := c.PageSrv.MovePage(ctx, workspaceID, user.ID, req); err != nil {
		playload.SendError(ctx, "移动页面失败")
		return
	}

	playload.SendSuccess(ctx, nil, "移动成功")
}

// Delete 軟刪除頁面
func (c *PageCtrl) Delete(ctx *gin.Context) {
	pageID, err := uuid.Parse(ctx.Query("id"))
	if err != nil {
		playload.SendError(ctx, "无效页面 ID")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	// 1. 獲取頁面確保 SpaceID 正確
	page, err := c.PageSrv.GetDetail(ctx, workspaceID, pageID)
	if err != nil || page == nil {
		playload.SendError(ctx, "页面不存在")
		return
	}

	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, page.SpaceID, page.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	// 3. 執行帶租戶隔離的級聯軟刪除
	if err := c.PageSrv.SoftDelete(ctx, workspaceID, pageID, user.ID); err != nil {
		playload.SendError(ctx, "删除失败")
		return
	}

	playload.SendSuccess(ctx, nil, "删除成功")
}

// Save 保存頁面內容
func (c *PageCtrl) Save(ctx *gin.Context) {
	var req struct {
		ID      uuid.UUID      `json:"id" binding:"required"`
		Content datatypes.JSON `json:"content" binding:"required"`
		Version int            `json:"version" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	// 1. 先獲取詳情以檢查權限
	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.ID)
	if err != nil || page == nil {
		playload.SendError(ctx, "页面不存在")
		return
	}

	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, page.SpaceID, page.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	// 3. 保存內容並獲取新版本
	newVersion, err := c.PageSrv.SaveContent(ctx, workspaceID, req.ID, user.ID, req.Content, req.Version)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, gin.H{"version": newVersion}, "保存成功")
}

// SavePatch 对页面 content 应用 JSON Patch（RFC 6902），成功后归档当前版本
func (c *PageCtrl) SavePatch(ctx *gin.Context) {
	var req playload.PageSavePatchReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.ID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, page.SpaceID, page.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	newVersion, patched, err := c.PageSrv.ApplyContentPatch(ctx, workspaceID, req.ID, user.ID, req.Version, req.Patch)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, gin.H{
		"version": newVersion,
		"content": patched,
	}, "保存成功")
}

// ListRevisions 快照列表（不含正文大字段）
func (c *PageCtrl) ListRevisions(ctx *gin.Context) {
	pageID, err := uuid.Parse(ctx.Query("page_id"))
	if err != nil {
		playload.SendError(ctx, "无效页面 ID")
		return
	}
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, pageID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "50"))
	meta, err := c.PageSrv.ListPageRevisionMeta(ctx, workspaceID, pageID, limit)
	if err != nil {
		playload.SendError(ctx, "获取快照列表失败")
		return
	}

	playload.SendSuccess(ctx, gin.H{
		"current_version": page.Version,
		"revisions":       meta,
	}, "获取成功")
}

// GetRevision 获取某一历史版本的完整 content
func (c *PageCtrl) GetRevision(ctx *gin.Context) {
	pageID, err := uuid.Parse(ctx.Query("page_id"))
	if err != nil {
		playload.SendError(ctx, "无效页面 ID")
		return
	}
	pageVersion, err := strconv.Atoi(ctx.Query("page_version"))
	if err != nil || pageVersion < 1 {
		playload.SendError(ctx, "无效的 page_version")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, pageID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	rev, err := c.PageSrv.GetPageRevision(ctx, workspaceID, pageID, pageVersion)
	if err != nil {
		playload.SendError(ctx, "查询失败")
		return
	}
	if rev == nil {
		playload.SendErr(ctx, errs.ErrPageRevisionNotFound)
		return
	}

	playload.SendSuccess(ctx, gin.H{
		"page_version": rev.PageVersion,
		"content":      rev.Content,
		"create_by":    rev.CreateBy,
		"create_time":  rev.CreateTime,
	}, "获取成功")
}

// RestoreRevision 将历史快照写回为最新版（乐观锁 + 先归档当前）
func (c *PageCtrl) RestoreRevision(ctx *gin.Context) {
	var req playload.PageRestoreRevisionReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.PageID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageMutate(ctx.Request.Context(), workspaceID, user.ID, page.SpaceID, page.ID); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	newVersion, err := c.PageSrv.RestoreFromRevision(ctx, workspaceID, req.PageID, user.ID, req.SourcePageVersion, req.BaseVersion)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}

	playload.SendSuccess(ctx, gin.H{"version": newVersion}, "恢复成功")
}

// Detail 獲取頁面詳情
func (c *PageCtrl) Detail(ctx *gin.Context) {
	pageID, err := uuid.Parse(ctx.Query("id"))
	if err != nil {
		playload.SendError(ctx, "无效页面 ID")
		return
	}

	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, pageID)
	if err != nil || page == nil {
		playload.SendError(ctx, "页面不存在")
		return
	}

	if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	role, err := c.effectivePageRole(ctx.Request.Context(), workspaceID, page.ID, page.SpaceID, user.ID)
	if err != nil {
		playload.SendErr(ctx, err)
		return
	}
	canEdit := model.GetSpaceRoleWeight(role) >= model.GetSpaceRoleWeight(model.SpaceRoleEditor)
	payload := map[string]interface{}{}
	raw, mErr := json.Marshal(page)
	if mErr != nil {
		playload.SendInternalError(ctx, "序列化失败")
		return
	}
	if uErr := json.Unmarshal(raw, &payload); uErr != nil {
		playload.SendInternalError(ctx, "序列化失败")
		return
	}
	payload["can_edit"] = canEdit
	if c.UserPageLibSrv != nil {
		starred, _ := c.UserPageLibSrv.IsStarred(ctx.Request.Context(), user.ID, pageID)
		payload["is_starred"] = starred
	} else {
		payload["is_starred"] = false
	}

	// 異步更新訪問時間
	go func(id uuid.UUID) {
		db := c.PageSrv.Dao.DB
		db.Model(&model.Page{}).Where("id = ?", id).Update("last_access_time", time.Now())
	}(pageID)

	playload.SendSuccess(ctx, payload, "获取成功")
}

// TouchRecent 记录当前用户最近打开（进入文档页后调用）
func (c *PageCtrl) TouchRecent(ctx *gin.Context) {
	var req struct {
		PageID uuid.UUID `json:"page_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.PageID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	if err := c.UserPageLibSrv.TouchRecent(ctx.Request.Context(), user.ID, workspaceID, req.PageID); err != nil {
		playload.SendError(ctx, "记录失败")
		return
	}
	playload.SendSuccess(ctx, nil, "成功")
}

// SetStar 收藏 / 取消收藏
func (c *PageCtrl) SetStar(ctx *gin.Context) {
	var req struct {
		PageID  uuid.UUID `json:"page_id" binding:"required"`
		Starred bool      `json:"starred"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		playload.SendError(ctx, "参数错误")
		return
	}
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	page, err := c.PageSrv.GetDetail(ctx, workspaceID, req.PageID)
	if err != nil || page == nil {
		playload.SendErr(ctx, errs.ErrPageNotFound)
		return
	}
	if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
		playload.SendErr(ctx, err)
		return
	}

	if err := c.UserPageLibSrv.SetStarred(ctx.Request.Context(), user.ID, workspaceID, req.PageID, req.Starred); err != nil {
		playload.SendError(ctx, "操作失败")
		return
	}
	playload.SendSuccess(ctx, gin.H{"starred": req.Starred}, "成功")
}

// MyRecent 当前工作区内最近打开列表（按权限过滤）
func (c *PageCtrl) MyRecent(ctx *gin.Context) {
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "50"))
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	rows, err := c.UserPageLibSrv.ListRecent(ctx.Request.Context(), user.ID, workspaceID, limit)
	if err != nil {
		playload.SendError(ctx, "获取失败")
		return
	}
	out := make([]playload.UserPageLibraryItemDTO, 0, len(rows))
	for _, row := range rows {
		page, gErr := c.PageSrv.GetDetail(ctx, workspaceID, row.PageID)
		if gErr != nil || page == nil {
			continue
		}
		if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
			continue
		}
		out = append(out, playload.UserPageLibraryItemDTO{
			PageID:   row.PageID,
			Title:    page.Title,
			SpaceID:  row.SpaceID,
			PageType: model.NormalizePageType(page.PageType),
			SortTime: row.LastOpenAt.Format(time.RFC3339),
		})
	}
	playload.SendSuccess(ctx, out, "获取成功")
}

// MyStarred 当前工作区内收藏列表（按权限过滤）
func (c *PageCtrl) MyStarred(ctx *gin.Context) {
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "50"))
	workspaceID := utils.GetWorkspaceID(ctx)
	user := utils.GetCurrentUser(ctx)

	rows, err := c.UserPageLibSrv.ListStarred(ctx.Request.Context(), user.ID, workspaceID, limit)
	if err != nil {
		playload.SendError(ctx, "获取失败")
		return
	}
	out := make([]playload.UserPageLibraryItemDTO, 0, len(rows))
	for _, row := range rows {
		page, gErr := c.PageSrv.GetDetail(ctx, workspaceID, row.PageID)
		if gErr != nil || page == nil {
			continue
		}
		if err := c.checkPageReadFull(ctx.Request.Context(), workspaceID, user.ID, page); err != nil {
			continue
		}
		out = append(out, playload.UserPageLibraryItemDTO{
			PageID:   row.PageID,
			Title:    page.Title,
			SpaceID:  row.SpaceID,
			PageType: model.NormalizePageType(page.PageType),
			SortTime: row.CreateTime.Format(time.RFC3339),
		})
	}
	playload.SendSuccess(ctx, out, "获取成功")
}
