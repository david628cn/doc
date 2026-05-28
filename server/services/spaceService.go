package services

import (
	"app/constants"
	"app/errs"
	"app/model"
	"app/playload"
	"app/utils"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SpaceService struct {
	BaseService[model.Space]
}

func NewSpaceService(db *gorm.DB) *SpaceService {
	return &SpaceService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.Space](db),
	}
}

// EffectiveSpaceRoleInTx 在事务内计算用户在某空间的最终角色
func (s *SpaceService) EffectiveSpaceRoleInTx(tx *gorm.DB, wsID, spaceID, userID uuid.UUID) (string, error) {
	var space model.Space
	if err := tx.Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, wsID).First(&space).Error; err != nil {
		return model.SpaceRoleNone, err
	}
	var wsRole string
	tx.Table("sys_workspace_user").Select("role").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", wsID, userID).
		Scan(&wsRole)
	var aclRoles []string
	tx.Raw(`
		SELECT role FROM sys_space_access
		WHERE space_id = ? AND delete_time IS NULL AND (
			(LOWER(TRIM(subject_type)) = 'user' AND subject_id = ?)
			OR (LOWER(TRIM(subject_type)) = 'group' AND subject_id IN (
				SELECT group_id FROM sys_group_user WHERE user_id = ? AND delete_time IS NULL
			))
		)`, spaceID, userID, userID).Scan(&aclRoles)
	return model.EffectiveSpaceRole(&space, userID, aclRoles, wsRole), nil
}

// AssertCanInviteToSpace 校验邀请人具备空间管理员及以上权限
func (s *SpaceService) AssertCanInviteToSpace(ctx context.Context, wsID, spaceID, inviterID uuid.UUID) error {
	detail, err := s.GetSpaceInfoWithAccess(ctx, spaceID, inviterID, wsID)
	if err != nil {
		return errs.ErrForbidden
	}
	if model.GetSpaceRoleWeight(detail.Role) < model.GetSpaceRoleWeight(model.SpaceRoleAdmin) {
		return errs.ErrForbidden
	}
	return nil
}

// ValidateSpaceInviteTarget 受邀人须为工作区成员，且尚无该空间个人 ACL、且未仅通过组已拥有该空间访问权
func (s *SpaceService) ValidateSpaceInviteTarget(ctx context.Context, wsID, spaceID, inviteeID uuid.UUID) error {
	var n int64
	s.Dao.DB.WithContext(ctx).Table("sys_workspace_user").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", wsID, inviteeID).
		Count(&n)
	if n == 0 {
		return errs.ErrTargetNotInWorkspace
	}
	s.Dao.DB.WithContext(ctx).Table("sys_space_access").
		Where("space_id = ? AND LOWER(TRIM(subject_type)) = ? AND subject_id = ? AND delete_time IS NULL", spaceID, model.SubjectTypeUser, inviteeID).
		Count(&n)
	if n > 0 {
		return errs.ErrAlreadyMember
	}
	s.Dao.DB.WithContext(ctx).Table("sys_space_access sa").
		Joins("INNER JOIN sys_group_user gu ON LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id = gu.group_id AND gu.user_id = ? AND gu.delete_time IS NULL", model.SubjectTypeGroup, inviteeID).
		Where("sa.space_id = ? AND sa.delete_time IS NULL", spaceID).
		Count(&n)
	if n > 0 {
		return errs.ErrAlreadyMember
	}
	return nil
}

//func (s *SpaceService) FindUserSpaces(ctx context.Context, workspaceID uuid.UUID, userID uuid.UUID) ([]model.Space, error) {
//	var spaces []model.Space
//
//	// 逻辑：
//	// 1. 查找 Visibility = 'workspace' 的所有空间
//	// 2. 查找 Visibility = 'private' 但在 sys_space_access 中授权给该用户或其所属组的空间
//	err := s.Dao.DB.WithContext(ctx).Raw(`
//		SELECT s.* FROM sys_space s
//		WHERE s.workspace_id = ? AND s.delete_time IS NULL
//		AND (
//			s.visibility = 'workspace'
//			OR s.create_by = ?
//			OR EXISTS (
//				SELECT 1 FROM sys_space_access sa
//				WHERE sa.space_id = s.id
//				AND sa.delete_time IS NULL
//				AND (
//					(sa.subject_type = 'user' AND sa.subject_id = ?)
//					OR (sa.subject_type = 'group' AND sa.subject_id IN (
//						SELECT group_id FROM sys_group_user WHERE user_id = ? AND delete_time IS NULL
//					))
//				)
//			)
//		)
//		ORDER BY s.last_access_time DESC
//	`, workspaceID, userID, userID, userID).Scan(&spaces).Error
//
//	return spaces, err
//}

func (s *SpaceService) FindUserSpaces(ctx context.Context, workspaceID uuid.UUID, userID uuid.UUID) ([]model.Space, error) {
	var spaces []model.Space

	// 使用 SQL 參數綁定常量
	err := s.Dao.DB.WithContext(ctx).Raw(`
		SELECT s.* FROM sys_space s
		WHERE s.workspace_id = ? AND s.delete_time IS NULL
		AND (
			s.visibility = ?  -- 這裡使用參數綁定
			OR s.create_by = ?
			OR EXISTS (
				SELECT 1 FROM sys_space_access sa 
				WHERE sa.space_id = s.id 
				AND sa.delete_time IS NULL
				AND (
					(LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id = ?) -- subject_type 也可以常量化
					OR (LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id IN (
						SELECT group_id FROM sys_group_user WHERE user_id = ? AND delete_time IS NULL
					))
				)
			)
		)
		ORDER BY s.last_access_time DESC
	`,
		workspaceID,
		model.SpaceVisibilityWorkspace, // 使用常量
		userID,
		model.SubjectTypeUser, userID, // 如果 subject_type 也定義了常量，建議一併替換
		model.SubjectTypeGroup, userID,
	).Scan(&spaces).Error

	return spaces, err
}

func (s *SpaceService) CheckAccess(ctx context.Context, spaceID uuid.UUID, workspaceID uuid.UUID, userID uuid.UUID) (bool, error) {
	detail, err := s.GetSpaceInfoWithAccess(ctx, spaceID, userID, workspaceID)
	if err != nil {
		return false, err
	}
	// 只要 Role 不是 None，就代表有访问权
	return detail.Role != model.SpaceRoleNone, nil
}

func (s *SpaceService) SoftDelete(ctx context.Context, spaceID, wsID, operatorID uuid.UUID) error {
	detail, err := s.GetSpaceInfoWithAccess(ctx, spaceID, operatorID, wsID)
	if err != nil {
		return err
	}
	if model.GetSpaceRoleWeight(detail.Role) < model.GetSpaceRoleWeight(model.SpaceRoleOwner) {
		return errs.ErrOnlySpaceOwnerDeletes
	}
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Exec(`
			UPDATE sys_notification_receiver nr SET delete_time = ?
			FROM sys_notification n
			JOIN sys_invite i ON n.related_id = i.id
			WHERE nr.notification_id = n.id AND nr.delete_time IS NULL AND n.delete_time IS NULL
			  AND i.scope_type = ? AND i.scope_id = ?`,
			now, model.InviteScopeSpace, spaceID).Error; err != nil {
			return err
		}
		if err := tx.Exec(`
			UPDATE sys_notification n SET delete_time = ?
			FROM sys_invite i
			WHERE n.related_id = i.id AND n.delete_time IS NULL
			  AND i.scope_type = ? AND i.scope_id = ?`,
			now, model.InviteScopeSpace, spaceID).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Invite{}).
			Where("scope_type = ? AND scope_id = ? AND delete_time IS NULL", model.InviteScopeSpace, spaceID).
			Update("delete_time", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND delete_time IS NULL", spaceID).
			Update("delete_time", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Space{}).
			Where("id = ? AND workspace_id = ?", spaceID, wsID).
			Update("delete_time", now).Error; err != nil {
			return err
		}
		return tx.Table("sys_page").
			Where("space_id = ? AND delete_time IS NULL", spaceID).
			Updates(map[string]interface{}{
				"delete_time": now,
				"update_by":   operatorID,
			}).Error
	})
}

func (s *SpaceService) CreateWithAccess(ctx context.Context, space *model.Space) error {
	// 1. 获取 DB 实例。如果 ctx 中带有事务（Register 传来的），则使用该事务；否则使用默认 DB
	db := s.Dao.DB.WithContext(ctx)

	// 2. 插入 Space 表
	// 如果 ID 为空，手动补齐 UUID
	if space.ID == uuid.Nil {
		space.ID = utils.UUID()
	}
	if err := db.Create(space).Error; err != nil {
		return err
	}

	// 3. 显式写入授权表
	access := model.SpaceAccess{
		ID:          utils.UUID(),
		SpaceID:     space.ID,
		SubjectType: model.SubjectTypeUser,
		SubjectID:   space.CreateBy,
		Role:        model.SpaceRoleOwner,
		JoinTime:    time.Now(),
	}

	return db.Create(&access).Error
}

// 在 SpaceService 裡寫
func (s *SpaceService) Update(ctx context.Context, spaceID, wsID uuid.UUID, fields map[string]interface{}) error {
	// 增加 workspace_id 的過濾條件，確保只能更新自己空間的東西
	return s.Dao.DB.WithContext(ctx).
		Model(&model.Space{}).
		Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, wsID).
		Updates(fields).Error
}

// SearchUserSpaces 搜索当前用户可见的库列表
func (s *SpaceService) SearchUserSpaces(ctx context.Context, p playload.SpaceQueryParam) ([]playload.SpaceListDTO, int64, error) {
	var results []playload.SpaceListDTO
	var total int64

	var wsRole string
	s.Dao.DB.WithContext(ctx).Table("sys_workspace_user").Select("role").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", p.WorkspaceID, p.UserID).
		Scan(&wsRole)

	// 1. 获取用户所属的所有组 ID（用于判定组权限）
	var groupIDs []uuid.UUID
	s.Dao.DB.WithContext(ctx).Table("sys_group_user").
		Where("user_id = ? AND delete_time IS NULL", p.UserID).
		Pluck("group_id", &groupIDs)

	// 2. 构建基础查询：多租户隔离 + 逻辑删除过滤
	query := s.Dao.DB.WithContext(ctx).Model(&model.Space{}).
		Where("workspace_id = ? AND delete_time IS NULL", p.WorkspaceID)

	// 3. 核心权限隔离逻辑（列表「能否看到该库」）：
	// - workspace：工作区内可见（Guest 仍受后续 EffectiveSpaceRole 约束）
	// - invite：工作区 member/admin/owner 可见「壳」；guest 不可见；已有 ACL 或 create_by 同前
	// - private：仅 create_by 或 ACL（绝对屏障）
	permissionSQL := `(
			visibility = ? 
			OR create_by = ? 
			OR id IN (
				SELECT space_id FROM sys_space_access 
				WHERE delete_time IS NULL 
				AND (
					(LOWER(TRIM(subject_type)) = 'user' AND subject_id = ?) 
					OR (LOWER(TRIM(subject_type)) = 'group' AND subject_id IN ?)
				)
			)
			OR (visibility = ? AND ? IN (?, ?, ?))
		)`
	query = query.Where(permissionSQL,
		model.SpaceVisibilityWorkspace,
		p.UserID,
		p.UserID,
		groupIDs,
		model.SpaceVisibilityInvite,
		wsRole,
		model.RoleWorkspaceOwner,
		model.RoleWorkspaceAdmin,
		model.RoleWorkspaceMember,
	)

	// 4. 搜索过滤
	if p.Search != "" {
		query = query.Where("name ILIKE ?", "%"+p.Search+"%")
	}

	// 5. 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []playload.SpaceListDTO{}, 0, nil
	}

	// 6. 执行分页与排序
	if p.PageSize > 0 {
		offset := (p.Page - 1) * p.PageSize
		query = query.Limit(p.PageSize).Offset(offset)
	}
	err := query.Order("create_time DESC").Find(&results).Error
	if err != nil || len(results) == 0 {
		return results, total, err
	}

	// 7. 批量聚合：Role / can_manage_space_members / 成员数 / 头像预览 / ownership 等（与 with_members 无关，保证列表与详情口径一致）
	if len(results) > 0 {
		spaceIDs := make([]uuid.UUID, len(results))
		for i, r := range results {
			spaceIDs[i] = r.ID
		}
		results, err = s.BatchFillMemberData(ctx, results, spaceIDs, p.UserID, wsRole)
	}

	return results, total, err
}

// batchFillMemberData 批量填充成员预览、总数、以及当前用户的角色标识
func (s *SpaceService) BatchFillMemberData(ctx context.Context, list []playload.SpaceListDTO, ids []uuid.UUID, currUserID uuid.UUID, workspaceUserRole string) ([]playload.SpaceListDTO, error) {
	var aggs []playload.SpaceAggResult

	// SQL 聚合：一次性查出所有成员总数（包含创建者）、recent_members 预览条数见 constants.RecentMemberPreviewLimit、及当前用户的角色列表
	err := s.Dao.DB.WithContext(ctx).Raw(fmt.Sprintf(`
		WITH AllSpaceMembers AS (
			SELECT DISTINCT space_id, uid FROM (
				-- 包含空间创建者
				SELECT id as space_id, create_by as uid FROM sys_space WHERE id IN ? AND delete_time IS NULL
				UNION
				-- 包含个人授权
				SELECT space_id, subject_id::uuid as uid FROM sys_space_access WHERE space_id IN ? AND LOWER(TRIM(subject_type)) = 'user' AND delete_time IS NULL
				UNION
				-- 包含组授权
				SELECT sa.space_id, gu.user_id FROM sys_space_access sa
				JOIN sys_group_user gu ON sa.subject_id::uuid = gu.group_id
				WHERE sa.space_id IN ? AND LOWER(TRIM(sa.subject_type)) = 'group' AND sa.delete_time IS NULL AND gu.delete_time IS NULL
			) t
		),
		UserRawRoles AS (
			-- 获取当前用户在这些空间里的所有角色（用于在 Go 中比对权重）
			SELECT space_id, string_agg(role, ',') as roles 
			FROM sys_space_access 
			WHERE space_id IN ? AND delete_time IS NULL
			AND (
				(LOWER(TRIM(subject_type)) = 'user' AND subject_id = ?) 
				OR (LOWER(TRIM(subject_type)) = 'group' AND subject_id IN (SELECT group_id FROM sys_group_user WHERE user_id = ? AND delete_time IS NULL))
			)
			GROUP BY space_id
		)
		SELECT 
			asm_grp.space_id,
			asm_grp.total,
			COALESCE((SELECT json_agg(u) FROM (
				SELECT id, username, real_name, head_sculpture FROM sys_user 
				WHERE id IN (SELECT uid FROM AllSpaceMembers WHERE space_id = asm_grp.space_id) 
				ORDER BY create_time ASC LIMIT %d 
			) u), '[]') as recent_json,
			COALESCE(urr.roles, '') as role_list_raw
		FROM (
			-- 先计算去重后的成员总数
			SELECT space_id, COUNT(DISTINCT uid)::int as total FROM AllSpaceMembers GROUP BY space_id
		) asm_grp
		LEFT JOIN UserRawRoles urr ON asm_grp.space_id = urr.space_id
	`, constants.RecentMemberPreviewLimit),
		ids, ids, ids, // AllSpaceMembers 参数
		ids, currUserID.String(), currUserID, // UserRawRoles 参数
	).Scan(&aggs).Error

	if err != nil {
		return list, err
	}

	aggMap := make(map[uuid.UUID]playload.SpaceAggResult)
	for _, a := range aggs {
		aggMap[a.SpaceID] = a
	}

	// 循环回填数据，处理复杂的“保底权限”逻辑
	for i := range list {
		item := &list[i]
		a, ok := aggMap[item.ID]

		// 1. 权限计算：将 SQL 的 string_agg 结果转为切片
		var aclRoles []string
		if ok && a.RoleListRaw != "" {
			aclRoles = strings.Split(a.RoleListRaw, ",")
		}
		item.Role = model.EffectiveSpaceRole(&item.Space, currUserID, aclRoles, workspaceUserRole)
		explicitACL := ok && strings.TrimSpace(a.RoleListRaw) != ""
		item.CanManageSpaceMembers = spaceCanManageMembersUI(item.Role, explicitACL)
		item.InviteShellOnly = item.Visibility == model.SpaceVisibilityInvite && item.Role == model.SpaceRoleNone

		// 2. 填充成员数据
		if ok {
			item.MemberCount = a.Total
			// 增加对空 JSON 的防御
			if len(a.RecentJson) > 0 && string(a.RecentJson) != "[]" && string(a.RecentJson) != "null" {
				if err := json.Unmarshal(a.RecentJson, &item.RecentMembers); err != nil {
					// 记录日志，但不阻断流程
					// logger.Error("解析成员列表失败", err)
				}
			}
		} else if item.CreateBy == currUserID {
			// 聚合 SQL 未返回该行时的成员数兜底（当前用户为原始建库人）；非用 create_by 判定业务 owner
			item.MemberCount = 1
		}

		// 3. UI 状态
		item.AccessType = item.Visibility
	}

	if err := s.batchFillSpaceOwnershipIDsForList(ctx, list); err != nil {
		return list, err
	}
	return list, nil
}

// batchFillSpaceOwnershipIDsForList 批量写入 business_owner_id / original_creator_id（列表与详情共用）。
func (s *SpaceService) batchFillSpaceOwnershipIDsForList(ctx context.Context, list []playload.SpaceListDTO) error {
	if len(list) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(list))
	for i := range list {
		ids[i] = list[i].ID
		if list[i].CreateBy != uuid.Nil {
			c := list[i].CreateBy
			list[i].OriginalCreatorID = &c
		}
	}
	var rows []struct {
		SpaceID   uuid.UUID `gorm:"column:space_id"`
		SubjectID uuid.UUID `gorm:"column:subject_id"`
	}
	err := s.Dao.DB.WithContext(ctx).Raw(`
		SELECT DISTINCT ON (sa.space_id) sa.space_id, sa.subject_id
		FROM sys_space_access sa
		WHERE sa.space_id IN ?
		  AND sa.delete_time IS NULL
		  AND LOWER(TRIM(sa.subject_type)) = ?
		  AND sa.role = ?
		ORDER BY sa.space_id, sa.join_time ASC
	`, ids, model.SubjectTypeUser, model.SpaceRoleOwner).Scan(&rows).Error
	if err != nil {
		return err
	}
	ownerBySpace := make(map[uuid.UUID]uuid.UUID, len(rows))
	for _, r := range rows {
		ownerBySpace[r.SpaceID] = r.SubjectID
	}
	for i := range list {
		if sid, ok := ownerBySpace[list[i].ID]; ok {
			x := sid
			list[i].BusinessOwnerID = &x
		}
	}
	return nil
}

// spaceCanManageMembersUI 成员管理类 UI：仅「有空间 ACL 个人/组行」且有效角色不低于 admin 为 true（不含纯工作区级联 admin）。
func spaceCanManageMembersUI(effectiveRole string, hasExplicitSpaceACL bool) bool {
	if !hasExplicitSpaceACL {
		return false
	}
	return model.GetSpaceRoleWeight(effectiveRole) >= model.GetSpaceRoleWeight(model.SpaceRoleAdmin)
}

// fillSpaceOwnershipIDs 单条详情补全（复用批量逻辑）。
func (s *SpaceService) fillSpaceOwnershipIDs(ctx context.Context, out *playload.SpaceListDTO) {
	if out == nil {
		return
	}
	slice := []playload.SpaceListDTO{*out}
	if err := s.batchFillSpaceOwnershipIDsForList(ctx, slice); err == nil {
		*out = slice[0]
	}
}

// 推荐：组合式（查 2 次）先获取基础权限详情，再批量填充成员数据
func (s *SpaceService) GetSpaceInfoWithAccess(ctx context.Context, spaceID, userID, workspaceID uuid.UUID) (*playload.SpaceDetailDTO, error) {
	var detail playload.SpaceDetailDTO

	// 1. 获取空间基础信息 (这里 Scan 进 SpaceListDTO.Space)
	err := s.Dao.DB.WithContext(ctx).Model(&model.Space{}).
		Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, workspaceID).
		First(&detail.Space).Error
	if err != nil {
		return nil, err
	}

	var wsRole string
	s.Dao.DB.WithContext(ctx).Table("sys_workspace_user").Select("role").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, userID).
		Scan(&wsRole)

	// 2. 准备 ACL 角色数据用于计算（始终拉取，含 owner 行）
	var aclRoles []string
	s.Dao.DB.WithContext(ctx).Raw(`
			SELECT role FROM sys_space_access 
			WHERE space_id = ? AND delete_time IS NULL 
			AND (
				(LOWER(TRIM(subject_type)) = 'user' AND subject_id = ?) 
				OR 
				(LOWER(TRIM(subject_type)) = 'group' AND subject_id IN (
					SELECT group_id FROM sys_group_user WHERE user_id = ? AND delete_time IS NULL
				))
			)`, spaceID, userID, userID).Scan(&aclRoles)

	// 3. 调用通用逻辑计算并设置 Role
	detail.Role = model.EffectiveSpaceRole(&detail.Space, userID, aclRoles, wsRole)
	detail.AccessType = detail.Visibility

	// 4. 准入：private 且无库内角色 → 不可见；invite 且无角色 → 仅工作区 member+ 返回「壳」（详情可用，CheckAccess 仍为 false）
	if detail.Role == model.SpaceRoleNone {
		switch detail.Visibility {
		case model.SpaceVisibilityPrivate:
			return nil, gorm.ErrRecordNotFound
		case model.SpaceVisibilityInvite:
			if !model.CanSeeInviteSpaceInList(wsRole) {
				return nil, gorm.ErrRecordNotFound
			}
		default:
			if detail.Visibility != model.SpaceVisibilityWorkspace {
				return nil, gorm.ErrRecordNotFound
			}
		}
	}

	// 5. 关键：复用批量填充逻辑来丰富成员和统计信息
	// 此时 detail 已经是 SpaceDetailDTO，包含 SpaceListDTO
	tempList := []playload.SpaceListDTO{detail.SpaceListDTO}
	filled, err := s.BatchFillMemberData(ctx, tempList, []uuid.UUID{spaceID}, userID, wsRole)
	if err == nil && len(filled) > 0 {
		detail.SpaceListDTO = filled[0]
	}
	s.fillSpaceOwnershipIDs(ctx, &detail.SpaceListDTO)
	// 与列表一致：成员管理能力看「本人是否有 sys_space_access 行」，不用 Role 里的工作区级联 alone
	explicitACL := len(aclRoles) > 0
	detail.CanManageSpaceMembers = spaceCanManageMembersUI(detail.Role, explicitACL)

	return &detail, nil
}

// 备选版本：单次查询（极速版）
func (s *SpaceService) GetSpaceInfoSingleWithAccess(ctx context.Context, spaceID, userID, workspaceID uuid.UUID) (*playload.SpaceDetailDTO, error) {
	// 定义一个内部匿名结构体，用于承接 SQL 的所有返回列
	var row struct {
		model.Space
		MemberCount       int    `gorm:"column:member_count"`
		RecentMembersJson []byte `gorm:"column:recent_members_json"`
		RoleListRaw       string `gorm:"column:role_list_raw"`
	}

	err := s.Dao.DB.WithContext(ctx).Raw(`
		WITH AllSpaceMembers AS ( ... 同你之前的 SQL ... )
		SELECT s.*, ... 同你之前的 SQL ...
		FROM sys_space s WHERE s.id = ? AND s.workspace_id = ? AND s.delete_time IS NULL
	`, spaceID, spaceID, spaceID, userID, userID, spaceID, workspaceID).Scan(&row).Error

	if err != nil {
		return nil, err
	}

	// 组装 DTO
	detail := &playload.SpaceDetailDTO{
		SpaceListDTO: playload.SpaceListDTO{
			Space:       row.Space,
			MemberCount: row.MemberCount,
			AccessType:  row.Visibility,
		},
	}

	// 解析成员 JSON
	if len(row.RecentMembersJson) > 0 && string(row.RecentMembersJson) != "[]" {
		json.Unmarshal(row.RecentMembersJson, &detail.RecentMembers)
	}

	var wsRole string
	s.Dao.DB.WithContext(ctx).Table("sys_workspace_user").Select("role").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, userID).
		Scan(&wsRole)

	// 计算最终 Role
	var aclRoles []string
	if row.RoleListRaw != "" {
		aclRoles = strings.Split(row.RoleListRaw, ",")
	}
	detail.Role = model.EffectiveSpaceRole(&detail.Space, userID, aclRoles, wsRole)

	// 准入（与 GetSpaceInfoWithAccess 一致）
	if detail.Role == model.SpaceRoleNone {
		switch detail.Visibility {
		case model.SpaceVisibilityPrivate:
			return nil, gorm.ErrRecordNotFound
		case model.SpaceVisibilityInvite:
			if !model.CanSeeInviteSpaceInList(wsRole) {
				return nil, gorm.ErrRecordNotFound
			}
		default:
			if detail.Visibility != model.SpaceVisibilityWorkspace {
				return nil, gorm.ErrRecordNotFound
			}
		}
	}

	return detail, nil
}

// GetMemberList 库成员（sys_space_access 个人与组授权展开，并始终合并创建者 create_by；
// 与 BatchFillMemberData 成员统计口径一致，避免仅有创建者时 member_count=1 但列表为空）。
// search 支持用户名/姓名/邮箱/手机/工号
func (s *SpaceService) GetMemberList(ctx context.Context, workspaceID, spaceID uuid.UUID, search string) ([]playload.SpaceMemberDTO, error) {
	search = strings.TrimSpace(search)
	kw := "%" + search + "%"
	var members []playload.SpaceMemberDTO

	searchFilter := "TRUE"
	args := []interface{}{spaceID, workspaceID}
	if search != "" {
		searchFilter = `(usr.username ILIKE ? OR usr.real_name ILIKE ? OR usr.email ILIKE ? OR usr.mobile ILIKE ? OR usr.code ILIKE ?)`
		args = append(args, kw, kw, kw, kw, kw)
	}

	q := fmt.Sprintf(`
		WITH sp AS (
			SELECT id, create_by, create_time FROM sys_space
			WHERE id = ? AND workspace_id = ? AND delete_time IS NULL
		)
		SELECT DISTINCT ON (usr.id)
			usr.id,
			usr.username,
			usr.real_name,
			usr.head_sculpture,
			usr.email,
			t.role,
			t.subject_type,
			t.join_time,
			(usr.id = (SELECT create_by FROM sp)) AS is_original_creator,
			CASE
				WHEN (usr.id = (SELECT create_by FROM sp)) THEN '%s'
				WHEN LOWER(TRIM(t.subject_type)) = 'group' THEN '%s'
				ELSE '%s'
			END AS member_source
		FROM (
			SELECT subject_id::uuid AS uid, role, 'user' AS subject_type, join_time,
				CASE WHEN role = 'owner' THEN 4 WHEN role = 'admin' THEN 3 WHEN role = 'editor' THEN 2 ELSE 1 END AS weight
			FROM sys_space_access
			WHERE space_id = (SELECT id FROM sp) AND LOWER(TRIM(subject_type)) = 'user' AND delete_time IS NULL
			UNION ALL
			SELECT gu.user_id AS uid, sa.role, 'group' AS subject_type, gu.join_time,
				CASE WHEN sa.role = 'owner' THEN 4 WHEN sa.role = 'admin' THEN 3 WHEN sa.role = 'editor' THEN 2 ELSE 1 END AS weight
			FROM sys_space_access sa
			JOIN sys_group_user gu ON sa.subject_id::uuid = gu.group_id
			WHERE sa.space_id = (SELECT id FROM sp) AND LOWER(TRIM(sa.subject_type)) = 'group' AND sa.delete_time IS NULL AND gu.delete_time IS NULL
			UNION ALL
			SELECT sp.create_by AS uid, '%s' AS role, 'user' AS subject_type, sp.create_time,
				4 AS weight
			FROM sp
			WHERE sp.create_by IS NOT NULL
		) t
		JOIN sys_user usr ON t.uid = usr.id
		WHERE usr.delete_time IS NULL AND %s
		ORDER BY usr.id, t.weight DESC, t.join_time ASC
	`, playload.SpaceMemberSourceOriginalCreator, playload.SpaceMemberSourceGroup, playload.SpaceMemberSourceDirectUser, model.SpaceRoleOwner, searchFilter)

	err := s.Dao.DB.WithContext(ctx).Raw(q, args...).Scan(&members).Error
	return members, err
}
