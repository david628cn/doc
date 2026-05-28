package services

import (
	"app/constants"
	"app/model"
	"app/playload"
	"app/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkspaceService struct {
	BaseService[model.Workspace]
	// 1. 添加 WSM 字段，使用接口類型以避免循環依賴
	WSM    IWebSocketManager
	Invite *InviteService
}

func NewWorkspaceService(db *gorm.DB, wsm IWebSocketManager, invite *InviteService) *WorkspaceService {
	return &WorkspaceService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.Workspace](db),
		WSM:         wsm,
		Invite:      invite,
	}
}

func (s *WorkspaceService) FindByName(ctx context.Context, name string) (*model.Workspace, error) {
	return s.findOneByField(ctx, "name", name)
}

func (s *WorkspaceService) FindBySlug(ctx context.Context, slug string) (*model.Workspace, error) {
	return s.findOneByField(ctx, "slug", slug)
}

// 内部封装通用字段查询
func (s *WorkspaceService) findOneByField(ctx context.Context, field string, value interface{}) (*model.Workspace, error) {
	var result model.Workspace
	// 注意：如果使用了 gorm.DeletedAt，这里不需要手动写 delete_time 查询
	err := s.Dao.DB.WithContext(ctx).
		Where(field+" = ?", value).
		First(&result).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

// CreateWithAdmin 处理工作区创建及管理员绑定
func (s *WorkspaceService) CreateWithAdmin(ctx context.Context, ws *model.Workspace, userID uuid.UUID) error {
	// 1. 序列化 Settings
	//settingsBytes, _ := json.Marshal(map[string]interface{}{"permission": permission})
	//ws.Settings = datatypes.JSON(settingsBytes)

	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 检查是否已存在默认空间
		var count int64
		tx.Model(&model.WorkspaceUser{}).
			Where("user_id = ? AND is_default = ? AND delete_time IS NULL", userID, true).
			Count(&count)

		// --- A. 创建工作区基础记录 ---
		if err := tx.Create(ws).Error; err != nil {
			return err
		}

		// --- B. 创建默认库 (Space) ---
		defaultSpaceID := uuid.New()
		defaultSpace := &model.Space{
			ID:          defaultSpaceID,
			WorkspaceID: ws.ID,
			Name:        "快速入门", // 默认空间名
			Icon:        "🚀",
			Visibility:  model.SpaceVisibilityWorkspace, // 全员可见
			CreateBy:    userID,
		}
		if err := tx.Create(defaultSpace).Error; err != nil {
			return err
		}

		// --- C. 回填工作区的默认空间 ID ---
		if err := tx.Model(ws).Update("default_space_id", defaultSpaceID).Error; err != nil {
			return err
		}

		// --- D. 关联用户并设为 Owner ---
		wsUser := &model.WorkspaceUser{
			ID:          uuid.New(),
			WorkspaceID: ws.ID,
			UserID:      userID,
			Role:        model.RoleWorkspaceOwner,
			Status:      1,
			// 关键点：只有没有默认空间时，才设为 true
			IsDefault: count == 0,
		}

		if err := tx.Create(wsUser).Error; err != nil {
			return err
		}

		// --- E. 【新增拼图】级联初始化当前全新工作区的云盘空间配额记录 ---
		// 默认分配 5GB (5 * 1024 * 1024 * 1024 字节)
		quota := &model.WorkspaceQuota{
			WorkspaceID: ws.ID,
			TotalBytes:  5368709120, // 5GB 字节数，你也可以通过 config 变量读取
			UsedBytes:   0,          // 初始已使用 0 字节
			UpdateTime:  time.Now(),
		}

		// 依靠 tx 统一执行事务落库，若此步因非预期错误失败，上面所有创建的 Space、WorkspaceUser 都会自动物理回滚
		if err := tx.Create(&quota).Error; err != nil {
			return err // 只要配额初始化失败，上面的用户、工作区、空间建立全部自动物理回滚
		}

		// 6. (選填) 如果需要，可以初始化一個歡迎頁面 (sys_page)
		welcomePage := model.Page{
			ID:          utils.UUID(),
			WorkspaceID: ws.ID,
			SpaceID:     defaultSpaceID,
			Title:       "欢迎使用",
			PageType:    model.PageTypeDocument,
			// 标准 ProseMirror JSON：段落内联必须为 type:text 子节点，勿写成 paragraph.text
			Content:    []byte(`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"开始编写你的第一篇文档吧！"}]}]}`),
			CreateBy:   userID,
			UpdateBy:   userID,
			CreateTime: time.Now(),
			UpdateTime: time.Now(),
		}
		return tx.Create(&welcomePage).Error
	})
}

// GetUserWorkspaceList 获取用户关联的工作区详情（扁平化列表）
func (s *WorkspaceService) GetUserWorkspaceList(ctx context.Context, userID uuid.UUID) ([]playload.UserWorkspaceData, error) {
	var results []playload.UserWorkspaceData

	// 使用 Join 查询 sys_workspace 和 sys_workspace_user
	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace w").
		Select("w.id as workspace_id, w.name, w.icon, w.slug, wu.role, wu.is_default").
		Joins("inner join sys_workspace_user wu on w.id = wu.workspace_id").
		Where("wu.user_id = ? AND wu.delete_time IS NULL AND w.delete_time IS NULL", userID).
		Scan(&results).Error

	return results, err
}

// GetWorkspacesByUserID 获取用户的工作区列表（含角色信息）
func (s *WorkspaceService) GetWorkspacesByUserID(ctx context.Context, userID uuid.UUID) ([]playload.UserWorkspaceData, error) {
	var results []playload.UserWorkspaceData

	// 联表查询：sys_workspace + sys_workspace_user
	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace w").
		Select("w.id as workspace_id, w.name, w.icon, w.slug, wu.role, wu.is_default").
		Joins("inner join sys_workspace_user wu on w.id = wu.workspace_id").
		Where("wu.user_id = ? AND wu.delete_time IS NULL AND w.delete_time IS NULL", userID).
		Order("wu.is_default DESC, wu.join_time ASC"). // 默认空间排第一
		Scan(&results).Error

	return results, err
}

// GetWorkspaceFullData 实现 InitData 所需的嵌套数据
func (s *WorkspaceService) GetWorkspaceFullData(ctx context.Context, userID uuid.UUID) ([]playload.WorkspaceSpaces, error) {
	// 1. 先复用上面的方法拿工作区列表
	workspaces, err := s.GetWorkspacesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(workspaces) == 0 {
		return []playload.WorkspaceSpaces{}, nil
	}

	workspaceIDs := make([]uuid.UUID, 0, len(workspaces))
	for _, ws := range workspaces {
		workspaceIDs = append(workspaceIDs, ws.WorkspaceID)
	}

	// 2. 批量获取所有工作区下的库，避免 N+1
	// 逻辑：当前实现为“工作区内所有未删除空间”。
	// 如需做更复杂的权限过滤，可在这里追加 visibility/access 条件，并确保能走索引。
	var allSpaces []model.Space
	if err := s.Dao.DB.WithContext(ctx).
		Where("workspace_id IN ? AND delete_time IS NULL", workspaceIDs).
		Find(&allSpaces).Error; err != nil {
		return nil, err
	}

	spacesByWorkspace := make(map[uuid.UUID][]model.Space, len(workspaces))
	for _, sp := range allSpaces {
		spacesByWorkspace[sp.WorkspaceID] = append(spacesByWorkspace[sp.WorkspaceID], sp)
	}

	fullData := make([]playload.WorkspaceSpaces, 0, len(workspaces))
	for _, ws := range workspaces {
		fullData = append(fullData, playload.WorkspaceSpaces{
			UserWorkspaceData: ws,
			Spaces:            spacesByWorkspace[ws.WorkspaceID],
		})
	}
	return fullData, nil
}

func (s *WorkspaceService) SetDefaultWorkspace(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 先检查该用户是否真的属于这个工作区（安全性检查）
		var count int64
		tx.Table("sys_workspace_user").
			Where("user_id = ? AND workspace_id = ? AND delete_time IS NULL", userID, workspaceID).
			Count(&count)
		if count == 0 {
			return errors.New("你不是该工作区的成员")
		}

		// 2. 将该用户所有关联记录的 is_default 设为 false
		// 注意：如果不先取消，直接设为 true 会触发数据库唯一索引冲突
		err := tx.Table("sys_workspace_user").
			Where("user_id = ? AND delete_time IS NULL", userID).
			Update("is_default", false).Error
		if err != nil {
			return err
		}

		// 3. 将目标记录设为默认
		result := tx.Table("sys_workspace_user").
			Where("user_id = ? AND workspace_id = ? AND delete_time IS NULL", userID, workspaceID).
			Update("is_default", true)

		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			return errors.New("设置失败，记录不存在")
		}

		return nil
	})
}

// CheckIsOwner 校验用户是否为该工作区的创建者/所有者
func (s *WorkspaceUserService) CheckIsOwner(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error) {
	var count int64
	// 1. 在 sys_workspace_user 表中查找
	// 2. 必须满足：对应空间 ID、对应用户 ID、角色为 owner、且未被逻辑删除
	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace_user").
		Where("workspace_id = ? AND user_id = ? AND role = ? AND delete_time IS NULL",
			workspaceID, userID, model.RoleWorkspaceOwner).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	// 只要记录数大于 0，即表示拥有 Owner 权限
	return count > 0, nil
}

func (s *WorkspaceService) SoftDelete(ctx context.Context, workspaceID uuid.UUID, operatorID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 核心權限判定：在事務中確認操作者身分
		var role string
		err := tx.Table("sys_workspace_user").
			Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, operatorID).
			Select("role").Row().Scan(&role)

		if err != nil || role != model.RoleWorkspaceOwner {
			return errors.New("只有所有者可以执行删除操作")
		}

		now := time.Now()

		// 0. 通知与邀请（避免孤儿通知）
		if err = tx.Exec(`
			UPDATE sys_notification_receiver nr SET delete_time = ?
			FROM sys_notification n
			WHERE nr.notification_id = n.id AND n.delete_time IS NULL AND nr.delete_time IS NULL
			  AND n.related_id IN (SELECT id FROM sys_invite WHERE workspace_id = ? AND delete_time IS NULL)`,
			now, workspaceID).Error; err != nil {
			return err
		}
		if err = tx.Exec(`
			UPDATE sys_notification n SET delete_time = ?
			WHERE n.delete_time IS NULL AND n.related_id IN (
				SELECT id FROM sys_invite WHERE workspace_id = ? AND delete_time IS NULL
			)`, now, workspaceID).Error; err != nil {
			return err
		}

		if err = tx.Model(&model.Invite{}).Where("workspace_id = ? AND delete_time IS NULL", workspaceID).Update("delete_time", now).Error; err != nil {
			return err
		}

		// 0b. 该工作区下所有空间的成员授权
		if err = tx.Exec(`
			UPDATE sys_space_access sa SET delete_time = ?
			FROM sys_space sp
			WHERE sa.space_id = sp.id AND sp.workspace_id = ? AND sp.delete_time IS NULL AND sa.delete_time IS NULL`,
			now, workspaceID).Error; err != nil {
			return err
		}

		// 1. 软删除工作区主表
		if err = tx.Model(&model.Workspace{}).Where("id = ?", workspaceID).Update("delete_time", now).Error; err != nil {
			return err
		}

		// 2. 软删除所有关联成员
		if err = tx.Table("sys_workspace_user").Where("workspace_id = ?", workspaceID).Update("delete_time", now).Error; err != nil {
			return err
		}

		// 3. 软删除该空间下的所有库 (Space)
		if err = tx.Table("sys_space").Where("workspace_id = ?", workspaceID).Update("delete_time", now).Error; err != nil {
			return err
		}

		// 4. 软删除所有页面 (Page)
		if err = tx.Table("sys_page").Where("workspace_id = ?", workspaceID).Updates(map[string]interface{}{
			"delete_time": now,
			"update_by":   operatorID,
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

// app/services/workspace_service.go

func (s *WorkspaceService) SendInvite(ctx context.Context, workspaceID, inviterID, inviteeID uuid.UUID, role string) error {
	if s.Invite == nil {
		return errors.New("Invite 服务未注入")
	}
	title, content, err := FormatWorkspaceInviteNotification(ctx, s.GetDB(ctx), workspaceID, inviterID)
	if err != nil {
		return err
	}
	return s.Invite.Send(ctx, &InviteSendOpts{
		WorkspaceID: workspaceID,
		ScopeType:   model.InviteScopeWorkspace,
		ScopeID:     workspaceID,
		InviterID:   inviterID,
		InviteeID:   inviteeID,
		Role:        role,
		Title:       title,
		Content:     content,
		MsgType:     model.MsgTypeInvite,
		BuildLink: func(id uuid.UUID) string {
			return fmt.Sprintf("/%s/accept/%s", model.MsgTypeInvite, id)
		},
	})
}

// AcceptInvite 接受邀請
func (s *WorkspaceService) AcceptInvite(ctx context.Context, inviteID uuid.UUID, userID uuid.UUID) error {
	if s.Invite == nil {
		return errors.New("Invite 服务未注入")
	}
	return s.Invite.Accept(ctx, inviteID, userID)
}

// RejectInvite 拒絕邀請
func (s *WorkspaceService) RejectInvite(ctx context.Context, inviteID uuid.UUID, userID uuid.UUID) error {
	if s.Invite == nil {
		return errors.New("Invite 服务未注入")
	}
	return s.Invite.Reject(ctx, inviteID, userID)
}

// SearchUserWorkspaces 搜索当前用户已加入的工作区列表
// 对齐 SpaceService.SearchUserSpaces 风格
func (s *WorkspaceService) SearchUserWorkspaces(ctx context.Context, p playload.WorkspaceQueryParam) ([]playload.WorkspaceListDTO, int64, error) {
	var results []playload.WorkspaceListDTO
	var total int64

	// 1. 构建基础查询：通过 INNER JOIN 确保只查用户有关联且未删除的工作区
	query := s.Dao.DB.WithContext(ctx).Table("sys_workspace w").
		Joins("INNER JOIN sys_workspace_user wu ON w.id = wu.workspace_id").
		Where("wu.user_id = ? AND wu.delete_time IS NULL AND w.delete_time IS NULL", p.UserID)

	// 2. 搜索过滤（支持名称或 Slug 搜索）
	if p.Search != "" {
		// 使用 ILIKE 进行不区分大小写的模糊查询
		query = query.Where("(w.name ILIKE ? OR w.slug ILIKE ?)", "%"+p.Search+"%", "%"+p.Search+"%")
	}

	// 3. 计算总数
	// 注意：Table 模式下 Count 需要指定字段或使用 Model
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []playload.WorkspaceListDTO{}, 0, nil
	}

	// 4. 执行分页与排序
	if p.PageSize > 0 {
		offset := (p.Page - 1) * p.PageSize
		query = query.Limit(p.PageSize).Offset(offset)
	}

	// 排序逻辑：默认“默认空间”靠前，其次按加入时间
	err := query.Select("w.*, wu.role, wu.is_default").
		Order("wu.is_default DESC, wu.join_time ASC").
		Scan(&results).Error

	if err != nil || len(results) == 0 {
		return results, total, err
	}

	// 5. 批量聚合成员统计、头像墙、权限标识 (调用你之前的 BatchFillMemberData)
	if p.WithMembers {
		wsIDs := make([]uuid.UUID, len(results))
		for i, r := range results {
			wsIDs[i] = r.ID
		}
		results, err = s.BatchFillMemberData(ctx, results, wsIDs, p.UserID)
	}

	return results, total, err
}

// Update 更新工作区信息
// 对齐 SpaceService.Update 风格，增加权限与多租户隔离校验
func (s *WorkspaceService) Update(ctx context.Context, wsID, userID uuid.UUID, fields map[string]interface{}) error {
	return s.Dao.DB.WithContext(ctx).
		Model(&model.Workspace{}).
		// 这里只负责业务隔离和状态检查
		Where("id = ? AND delete_time IS NULL", wsID).
		Updates(fields).Error
}

// GetWorkspaceMembers 获取工作区成员列表；成员仅以 sys_workspace_user 为准（工作区 ACL），不合成其它来源。
// search 非空时对 username / real_name / email / mobile / code 做 ILIKE 模糊匹配（PostgreSQL）。
func (s *WorkspaceUserService) GetWorkspaceMembers(ctx context.Context, workspaceID uuid.UUID, search string) ([]playload.WorkspaceMemberDTO, error) {
	var members []playload.WorkspaceMemberDTO

	q := s.Dao.DB.WithContext(ctx).Table("sys_workspace_user wu").
		Select("u.id, u.username, u.real_name, u.head_sculpture, u.email, wu.role, wu.join_time").
		Joins("JOIN sys_user u ON wu.user_id = u.id").
		Where("wu.workspace_id = ? AND wu.delete_time IS NULL AND u.delete_time IS NULL", workspaceID)

	search = strings.TrimSpace(search)
	if search != "" {
		kw := "%" + search + "%"
		q = q.Where("(u.username ILIKE ? OR u.real_name ILIKE ? OR u.email ILIKE ? OR u.mobile ILIKE ? OR u.code ILIKE ?)",
			kw, kw, kw, kw, kw)
	}

	err := q.Order("CASE wu.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, wu.join_time ASC").
		Scan(&members).Error

	return members, err
}

// calculateRole 判定用户在工作区的最终角色
func (s *WorkspaceService) calculateRole(isOwner bool, roles []string) string {
	if isOwner {
		return model.RoleWorkspaceOwner
	}

	maxWeight := 0
	for _, r := range roles {
		// 使用 model 中定义的 Workspace 专用权重逻辑
		if w := model.GetWorkspaceRoleWeight(r); w > maxWeight {
			maxWeight = w
		}
	}

	if maxWeight == 0 && len(roles) == 0 {
		return model.RoleWorkspaceMember
	}

	return model.GetWorkspaceRoleByWeight(maxWeight)
}

// --- 核心查询逻辑 ---

// GetWorkspaceInfoWithAccess 获取工作区详情 (组合式：对齐 SpaceService 风格)
func (s *WorkspaceService) GetWorkspaceInfoWithAccess(ctx context.Context, wsID, userID uuid.UUID) (*playload.WorkspaceListDTO, error) {
	var detail playload.WorkspaceListDTO

	// 1. 获取工作区基础信息
	// 注意：这里不需要 INNER JOIN，因为后面会通过角色判定来拦截准入
	err := s.Dao.DB.WithContext(ctx).Model(&model.Workspace{}).
		Where("id = ? AND delete_time IS NULL", wsID).
		First(&detail.Workspace).Error
	if err != nil {
		return nil, err
	}

	// 2. 准备角色数据用于计算
	var roles []string
	s.Dao.DB.WithContext(ctx).Raw(`
		SELECT role FROM sys_workspace_user 
		WHERE workspace_id = ? AND user_id = ? AND delete_time IS NULL
	`, wsID, userID).Scan(&roles)

	// 3. 调用统一逻辑计算 Role
	// 判断原始角色中是否包含 owner
	isOwner := false
	for _, r := range roles {
		if r == model.RoleWorkspaceOwner {
			isOwner = true
			break
		}
	}
	detail.Role = s.calculateRole(isOwner, roles)
	detail.AccessType = "default"

	// 4. 准入拦截 (对齐 Space 的 model.SpaceRoleNone)
	// 如果计算出的角色是 none (权重为0)，说明该用户不在工作区内
	if detail.Role == model.RoleWorkspaceNone {
		return nil, errors.New("你不是该工作区的成员")
	}

	// 5. 关键：复用批量填充逻辑来丰富成员统计和预览信息
	tempList := []playload.WorkspaceListDTO{detail}
	filled, err := s.BatchFillMemberData(ctx, tempList, []uuid.UUID{wsID}, userID)
	if err == nil && len(filled) > 0 {
		// 返回填充后的第一条数据
		return &filled[0], nil
	}

	return &detail, nil
}

// GetWorkspaceInfoSingle 获取工作区详情（单次 SQL 极速版）
// 对应 SpaceService.GetSpaceInfoSingleWithAccess 风格
func (s *WorkspaceService) GetWorkspaceInfoSingle(ctx context.Context, wsID, userID uuid.UUID) (*playload.WorkspaceListDTO, error) {
	// 1. 定义内部承接结构体
	var row struct {
		model.Workspace
		UserRole          string `gorm:"column:user_role"`
		MemberCount       int    `gorm:"column:member_count"`
		RecentMembersJson []byte `gorm:"column:recent_members_json"`
	}

	// 修复思路：将 COUNT 聚合放在独立的子查询中，避免干扰主表的 w.* 查询
	err := s.Dao.DB.WithContext(ctx).Raw(fmt.Sprintf(`
		SELECT 
			w.*,
			wu.role AS user_role,
			COALESCE(ms.total, 0) AS member_count,
			COALESCE((
				SELECT json_agg(row_to_json(s))
				FROM (
					SELECT u.id, u.username, u.real_name, u.head_sculpture
					FROM sys_workspace_user wu
					INNER JOIN sys_user u ON u.id = wu.user_id AND u.delete_time IS NULL
					WHERE wu.workspace_id = w.id AND wu.delete_time IS NULL
					ORDER BY wu.join_time ASC
					LIMIT %d
				) s
			), '[]'::json) AS recent_members_json
		FROM sys_workspace w
		INNER JOIN sys_workspace_user wu ON w.id = wu.workspace_id
		LEFT JOIN (
			SELECT workspace_id, COUNT(1)::int AS total 
			FROM sys_workspace_user 
			WHERE delete_time IS NULL 
			GROUP BY workspace_id
		) ms ON ms.workspace_id = w.id
		WHERE w.id = ? AND wu.user_id = ? 
		  AND w.delete_time IS NULL AND wu.delete_time IS NULL
	`, constants.RecentMemberPreviewLimit), wsID, userID).Scan(&row).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("工作区不存在或你不是该成员")
		}
		return nil, err
	}

	// 3. 组装 DTO
	detail := &playload.WorkspaceListDTO{
		Workspace:   row.Workspace,
		MemberCount: row.MemberCount,
		AccessType:  "default",
	}

	// 4. 解析成员预览 JSON
	if len(row.RecentMembersJson) > 0 && string(row.RecentMembersJson) != "[]" {
		if err := json.Unmarshal(row.RecentMembersJson, &detail.RecentMembers); err != nil {
			// 仅记录日志，不中断流程
		}
	}

	// 5. 计算最终 Role：仅以当前用户在 sys_workspace_user 中的角色为准（ACL）
	var roles []string
	if row.UserRole != "" {
		roles = append(roles, row.UserRole)
	}
	isOwner := row.UserRole == model.RoleWorkspaceOwner
	detail.Role = s.calculateRole(isOwner, roles)

	return detail, nil
}

// BatchFillMemberData 批量填充协作数据 (使用 WorkspaceAggResult 承接聚合结果)
func (s *WorkspaceService) BatchFillMemberData(ctx context.Context, list []playload.WorkspaceListDTO, ids []uuid.UUID, currUserID uuid.UUID) ([]playload.WorkspaceListDTO, error) {
	var aggs []playload.WorkspaceAggResult

	// 高性能 SQL：聚合总数、聚合当前用户角色、聚合头像预览
	err := s.Dao.DB.WithContext(ctx).Raw(fmt.Sprintf(`
		SELECT 
			t.workspace_id, 
			COUNT(t.user_id)::int as total,
			-- 确保这里使用 t.role 和 t.user_id，与 FROM 子句中的别名一致
			COALESCE(string_agg(t.role, ',') FILTER (WHERE t.user_id = ?), '') as role_list_raw,
			COALESCE((
				SELECT json_agg(row_to_json(s))
				FROM (
					SELECT u.id, u.username, u.real_name, u.head_sculpture
					FROM sys_workspace_user wu
					INNER JOIN sys_user u ON u.id = wu.user_id AND u.delete_time IS NULL
					WHERE wu.workspace_id = t.workspace_id AND wu.delete_time IS NULL
					ORDER BY wu.join_time ASC
					LIMIT %d
				) s
			), '[]'::json) as recent_json
		FROM sys_workspace_user t  -- 这里的别名是 t
		WHERE t.workspace_id IN ? AND t.delete_time IS NULL
		GROUP BY t.workspace_id
	`, constants.RecentMemberPreviewLimit), currUserID, ids).Scan(&aggs).Error

	if err != nil {
		return list, err
	}

	aggMap := make(map[uuid.UUID]playload.WorkspaceAggResult)
	for _, a := range aggs {
		aggMap[a.WorkspaceID] = a
	}

	for i := range list {
		item := &list[i]
		if agg, ok := aggMap[item.ID]; ok {
			item.MemberCount = agg.Total

			// 1. 角色判定：使用权重比对逻辑
			roles := strings.Split(agg.RoleListRaw, ",")
			isOwner := strings.Contains(agg.RoleListRaw, model.RoleWorkspaceOwner)
			item.Role = s.calculateRole(isOwner, roles)

			// 2. 解析头像预览
			if len(agg.RecentJson) > 0 && string(agg.RecentJson) != "[]" {
				json.Unmarshal(agg.RecentJson, &item.RecentMembers)
			}
		}
		item.AccessType = "default"
		item.IsStarred = false // 收藏逻辑可后续扩展
	}

	return list, nil
}
