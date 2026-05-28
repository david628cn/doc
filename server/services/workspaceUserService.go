package services

import (
	"app/model"
	"app/playload"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkspaceUserService struct {
	BaseService[model.WorkspaceUser]
}

func NewWorkspaceUserService(db *gorm.DB) *WorkspaceUserService {
	return &WorkspaceUserService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.WorkspaceUser](db),
	}
}

func (s *WorkspaceUserService) FindDefaultByUserID(ctx context.Context, userID uuid.UUID) (*model.WorkspaceUser, error) {
	var result model.WorkspaceUser

	err := s.Dao.DB.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("is_default = ?", true).
		Where("delete_time IS NULL").
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &result, nil
}

// GetUserWorkspaceDetail 獲取特定工作空間的用戶視圖詳情 (用於獲取 CurrentWorkspace)
func (s *WorkspaceUserService) GetUserWorkspaceDetail(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*playload.UserWorkspaceData, error) {
	var result playload.UserWorkspaceData

	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace_user wu").
		Select("w.id as workspace_id, w.name, w.icon, w.slug, wu.role, wu.is_default").
		Joins("inner join sys_workspace w on wu.workspace_id = w.id").
		Where("wu.user_id = ? AND wu.workspace_id = ? AND wu.delete_time IS NULL AND w.delete_time IS NULL", userID, workspaceID).
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (s *WorkspaceUserService) GetUserWorkspaceList(ctx context.Context, userID uuid.UUID) ([]playload.UserWorkspaceData, error) {
	results := make([]playload.UserWorkspaceData, 0)
	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace_user wu").
		// 確保把 last_access_time 也查出來，方便後續邏輯判斷
		Select("w.id as workspace_id, w.name, w.icon, w.slug, wu.role, wu.is_default, wu.last_access_time").
		Joins("inner join sys_workspace w on wu.workspace_id = w.id").
		Where("wu.user_id = ? AND wu.delete_time IS NULL AND w.delete_time IS NULL", userID).
		// 核心：優先按最後訪問時間降序，其次按是否默認，最後按加入時間
		Order("wu.last_access_time DESC NULLS LAST, wu.is_default DESC, wu.join_time ASC").
		Scan(&results).Error
	return results, err
}

func (s *WorkspaceUserService) FindByUser(ctx context.Context, workspaceID uuid.UUID, userID uuid.UUID) (*model.WorkspaceUser, error) {
	var result model.WorkspaceUser

	// 使用 GORM 原生链式调用
	err := s.Dao.DB.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Where("user_id = ?", userID).
		Where("delete_time IS NULL"). // 显式处理逻辑删除
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &result, nil
}

func (s *WorkspaceUserService) UpdateLastAccess(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) error {
	// 1. 使用 Updates 更新特定字段
	// 2. 這裡使用 Model(&model.WorkspaceUser{}) 是為了讓 GORM 知道操作哪張表
	// 3. 使用 map 或指定字段更新可以避免觸發全表字段覆蓋
	now := time.Now()
	return s.Dao.DB.WithContext(ctx).
		Model(&model.WorkspaceUser{}).
		Where("user_id = ? AND workspace_id = ? AND delete_time IS NULL", userID, workspaceID).
		Updates(map[string]interface{}{
			"last_access_time": now,
			"update_time":      now, // 確保更新時間也同步變化
		}).Error
}

func (s *WorkspaceUserService) SetDefault(ctx context.Context, userID, workspaceID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 先取消该用户之前所有的默认设置
		tx.Model(&model.WorkspaceUser{}).
			Where("user_id = ?", userID).
			Update("is_default", false)

		// 2. 设置新的默认空间
		return tx.Model(&model.WorkspaceUser{}).
			Where("user_id = ? AND workspace_id = ?", userID, workspaceID).
			Update("is_default", true).Error
	})
}

// Leave 退出工作區
func (s *WorkspaceUserService) Leave(ctx context.Context, userID, workspaceID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 檢查用戶身份
		var wu model.WorkspaceUser
		err := tx.Where("user_id = ? AND workspace_id = ? AND delete_time IS NULL", userID, workspaceID).
			First(&wu).Error
		if err != nil {
			return errors.New("未找到成员记录")
		}

		// 2. 限制：Owner 不允許直接退出
		if wu.Role == "owner" {
			return errors.New("所有者不能直接退出，请先转让所有权或解散工作区")
		}

		// 3. 同步移除该用户在本工作区下所有库的直接授权
		now := time.Now()
		if err := tx.Exec(`
			UPDATE sys_space_access sa SET delete_time = ?
			FROM sys_space sp
			WHERE sa.space_id = sp.id AND sp.workspace_id = ? AND sp.delete_time IS NULL
			  AND LOWER(TRIM(sa.subject_type)) = 'user' AND sa.subject_id = ? AND sa.delete_time IS NULL`,
			now, workspaceID, userID).Error; err != nil {
			return err
		}

		// 4. 軟刪除成員關係
		return tx.Model(&wu).Update("delete_time", now).Error
	})
}

func (s *WorkspaceUserService) AddMember(ctx context.Context, workspaceID uuid.UUID, identifier string, role string) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 查找用戶 (根據 Email 或 Username)
		var user model.User
		err := tx.Table("sys_user").
			Where("(email = ? OR username = ?) AND delete_time IS NULL", identifier, identifier).
			First(&user).Error
		if err != nil {
			return errors.New("用户不存在")
		}

		// 2. 檢查是否已經是成員
		var count int64
		tx.Model(&model.WorkspaceUser{}).
			Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, user.ID).
			Count(&count)
		if count > 0 {
			return errors.New("该用户已经是成员")
		}

		// 3. 創建關聯記錄
		now := time.Now()
		newMember := &model.WorkspaceUser{
			ID:          uuid.New(),
			WorkspaceID: workspaceID,
			UserID:      user.ID,
			Role:        role,
			Status:      1, // 正常
			JoinTime:    now,
		}

		return tx.Create(newMember).Error
	})
}

func (s *WorkspaceUserService) CheckIsAdmin(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error) {
	var count int64
	err := s.Dao.DB.WithContext(ctx).
		Table("sys_workspace_user").
		Where("workspace_id = ? AND user_id = ? AND role IN ? AND delete_time IS NULL",
			workspaceID, userID, []string{model.RoleWorkspaceOwner, model.RoleWorkspaceAdmin}).
		Count(&count).Error

	return count > 0, err
}

// RemoveMember 從工作區移除成員
func (s *WorkspaceUserService) RemoveMember(ctx context.Context, workspaceID, targetUserID, operatorID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 獲取操作者和被操作者的記錄
		var operator, target model.WorkspaceUser

		if err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, operatorID).First(&operator).Error; err != nil {
			return errors.New("操作者不属于该工作区")
		}
		if err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, targetUserID).First(&target).Error; err != nil {
			return errors.New("目标用户不属于该工作区")
		}

		// 2. 權限校驗
		// 只有 Owner 和 Admin 可以移除成員
		if operator.Role != model.RoleWorkspaceOwner && operator.Role != model.RoleWorkspaceAdmin {
			return errors.New("权限不足，仅管理员可操作")
		}

		// 3. 安全限制
		// 不能移除 Owner
		if target.Role == model.RoleWorkspaceOwner {
			return errors.New("不能移出工作区Owner")
		}
		// Admin 不能移除另一個 Admin (可選，視業務而定)
		if operator.Role == model.RoleWorkspaceAdmin && target.Role == model.RoleWorkspaceAdmin {
			return errors.New("管理员不能移除其他管理员")
		}

		// 4. 執行軟刪除工作区成员
		now := time.Now()
		if err := tx.Model(&target).Update("delete_time", now).Error; err != nil {
			return err
		}
		// 5. 同步移除该用户在本工作区下所有库的直接授权
		return tx.Exec(`
			UPDATE sys_space_access sa SET delete_time = ?
			FROM sys_space sp
			WHERE sa.space_id = sp.id AND sp.workspace_id = ? AND sp.delete_time IS NULL
			  AND LOWER(TRIM(sa.subject_type)) = 'user' AND sa.subject_id = ? AND sa.delete_time IS NULL`,
			now, workspaceID, targetUserID).Error
	})
}

// TransferOwner 转让工作区所有权
func (s *WorkspaceUserService) TransferOwner(ctx context.Context, workspaceID, currentOwnerID, newOwnerID uuid.UUID) error {
	if currentOwnerID == newOwnerID {
		return errors.New("不能转让给自己")
	}
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 校验当前操作者是否为 Owner
		var currentRel model.WorkspaceUser
		if err := tx.Where("workspace_id = ? AND user_id = ? AND role = ? AND delete_time IS NULL",
			workspaceID, currentOwnerID, model.RoleWorkspaceOwner).First(&currentRel).Error; err != nil {
			return errors.New("只有所有者有权转让工作区")
		}

		// 2. 校验接收者是否在工作区
		var newOwnerRel model.WorkspaceUser
		if err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL",
			workspaceID, newOwnerID).First(&newOwnerRel).Error; err != nil {
			return errors.New("目标用户不是工作区成员")
		}

		// 3. 执行对调：旧 Owner 降级为 Admin，新用户提拔为 Owner
		if err := tx.Model(&currentRel).Update("role", model.RoleWorkspaceAdmin).Error; err != nil {
			return err
		}
		if err := tx.Model(&newOwnerRel).Update("role", model.RoleWorkspaceOwner).Error; err != nil {
			return err
		}

		return nil
	})
}

// UpdateMemberRole 修改角色（包含赋权与自我降级）
func (s *WorkspaceUserService) UpdateMemberRole(ctx context.Context, workspaceID, operatorID, targetUserID uuid.UUID, newRole string) error {
	// 拦截：禁止直接设置 Owner
	if newRole == model.RoleWorkspaceOwner {
		return errors.New("禁止直接提升为所有者，请走转让流程")
	}
	if !model.IsInvitableWorkspaceRole(newRole) {
		return errors.New("无效的工作区角色")
	}

	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 获取目标记录
		var target model.WorkspaceUser
		if err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, targetUserID).First(&target).Error; err != nil {
			return errors.New("成员不存在")
		}

		// 2. 保护：Owner 角色不可在此修改
		if target.Role == model.RoleWorkspaceOwner {
			return errors.New("不能通过此接口修改所有者角色")
		}

		curW := model.GetWorkspaceRoleWeight(target.Role)
		newW := model.GetWorkspaceRoleWeight(newRole)

		// 3. 自我操作：仅允许降级或平级，禁止自行提升
		if operatorID == targetUserID {
			if newW > curW {
				return errors.New("无权自行提升角色")
			}
			return tx.Model(&target).Update("role", newRole).Error
		}

		// 4. 修改他人：须为 owner 或 admin
		var operator model.WorkspaceUser
		if err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, operatorID).First(&operator).Error; err != nil {
			return errors.New("操作者不属于该工作区")
		}
		if operator.Role != model.RoleWorkspaceOwner && operator.Role != model.RoleWorkspaceAdmin {
			return errors.New("权限不足，仅管理员可修改他人角色")
		}
		if operator.Role == model.RoleWorkspaceAdmin && target.Role == model.RoleWorkspaceAdmin {
			return errors.New("无权修改其他管理员角色")
		}
		if newRole == model.RoleWorkspaceAdmin && operator.Role != model.RoleWorkspaceOwner {
			return errors.New("仅所有者可授予管理员角色")
		}

		return tx.Model(&target).Update("role", newRole).Error
	})
}

// ListUserGroupIDsInWorkspace 当前用户在该工作区下所属组的 ID（用于空间/页面 ACL 组展开）
func (s *WorkspaceUserService) ListUserGroupIDsInWorkspace(ctx context.Context, workspaceID, userID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := s.Dao.DB.WithContext(ctx).Raw(`
		SELECT gu.group_id FROM sys_group_user gu
		INNER JOIN sys_group g ON g.id = gu.group_id AND g.delete_time IS NULL
		WHERE gu.user_id = ? AND gu.delete_time IS NULL AND g.workspace_id = ?
	`, userID, workspaceID).Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	return ids, nil
}
