package services

import (
	"app/model"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkspaceQuotaService struct {
	BaseService[model.WorkspaceQuota]
}

func NewWorkspaceQuotaService(db *gorm.DB) *WorkspaceQuotaService {
	return &WorkspaceQuotaService{
		// 严格遵循你的工厂模式，自动装配 Dao
		BaseService: *NewBaseService[model.WorkspaceQuota](db),
	}
}

// InitWorkspaceQuota 当系统新建工作区成功后，同步调用此方法初始化配额
func (s *WorkspaceQuotaService) InitWorkspaceQuota(ctx context.Context, wsID uuid.UUID, totalGB int64) error {
	if totalGB <= 0 {
		totalGB = 5 // 默认 5GB
	}

	quota := model.WorkspaceQuota{
		WorkspaceID: wsID,
		TotalBytes:  totalGB * 1024 * 1024 * 1024, // 转换为字节数
		UsedBytes:   0,
		UpdateTime:  time.Now(),
	}

	// 1. 【核心修复】：统一使用 s.Dao.DB 替代不存在的 s.db，彻底解决编译报错
	// 2. 【核心修复】：利用 s.Dao.DB.WithContext(ctx) 确保可以从传入的 txCtx 中无缝抓取注册大事务连接
	return s.Dao.DB.WithContext(ctx).
		Table(model.WorkspaceQuota{}.TableName()).
		Where("workspace_id = ?", wsID).
		FirstOrCreate(&quota).Error
}

// UpdateWorkspaceQuota 管理员为企业/团队手动扩容配额
func (s *WorkspaceQuotaService) UpdateWorkspaceQuota(ctx context.Context, wsID uuid.UUID, newTotalGB int64) error {
	if newTotalGB <= 0 {
		return errors.New("无效的配额大小")
	}

	newBytes := newTotalGB * 1024 * 1024 * 1024
	// 【核心修复】：统一改为 s.Dao.DB 驱动
	return s.Dao.DB.WithContext(ctx).
		Table(model.WorkspaceQuota{}.TableName()).
		Where("workspace_id = ?", wsID).
		Update("total_bytes", newBytes).Error
}

// GetWorkspaceQuotaInfo 获取当前空间网盘使用进度
func (s *WorkspaceQuotaService) GetWorkspaceQuotaInfo(ctx context.Context, wsID uuid.UUID) (*model.WorkspaceQuota, error) {
	var quota model.WorkspaceQuota
	// 【核心修复】：统一改为 s.Dao.DB 驱动
	err := s.Dao.DB.WithContext(ctx).
		Table(model.WorkspaceQuota{}.TableName()).
		Where("workspace_id = ?", wsID).
		First(&quota).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 找不到时返回系统默认值，防止上层直接崩溃或弹 500
			return &model.WorkspaceQuota{WorkspaceID: wsID, TotalBytes: 5368709120, UsedBytes: 0}, nil
		}
		return nil, err
	}
	return &quota, nil
}

// SyncActualWorkspaceQuota 空间容量异步对账函数（建议每天凌晨由 Cron 定时触发）
func (s *WorkspaceQuotaService) SyncActualWorkspaceQuota(ctx context.Context, wsID uuid.UUID) error {
	// 【核心修复】：统一改为 s.Dao.DB 开启对账大事务
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		// 1. 聚合查询当前工作区下所有真实存在、状态正常、且未被软删除的文件体积总和
		var actualUsedBytes int64
		err := tx.Table(model.File{}.TableName()).
			Where("workspace_id = ? AND status = 1 AND delete_time IS NULL", wsID).
			Select("COALESCE(SUM(size), 0)"). // 使用 COALESCE 避免没有文件时返回 NULL 导致扫描报错
			Scan(&actualUsedBytes).Error

		if err != nil {
			return err
		}

		// 2. 强制将真实的物理总和校准回 sys_workspace_quota 表中
		result := tx.Table(model.WorkspaceQuota{}.TableName()).
			Where("workspace_id = ?", wsID).
			Update("used_bytes", actualUsedBytes)

		if result.Error != nil {
			return result.Error
		}

		// 3. 防护：如果由于某些历史极端原因导致该空间的配额记录完全不存在，自动完成对账修复
		if result.RowsAffected == 0 {
			err := tx.Table(model.WorkspaceQuota{}.TableName()).Create(map[string]interface{}{
				"workspace_id": wsID,
				"total_bytes":  5368709120, // 默认 5G
				"used_bytes":   actualUsedBytes,
				"update_time":  time.Now(),
			}).Error
			if err != nil {
				return err
			}
		}

		return nil
	})
}
