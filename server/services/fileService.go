package services

import (
	"app/config"
	"app/model"
	"app/playload"
	"app/utils"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileService struct {
	BaseService[model.File]
}

func NewFileService(db *gorm.DB) *FileService {
	return &FileService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.File](db),
	}
}

// GetReadyFileByHash 核心：秒传判定（带物理检查）
func (s *FileService) GetReadyFileByHash(ctx context.Context, hash string, relType string, wsID *uuid.UUID) (*model.File, error) {
	var file model.File
	query := s.Dao.DB.WithContext(ctx).Where("hash = ? AND status = 1 AND delete_time IS NULL", hash)

	if relType == model.TypeAvatar || relType == model.TypeEmoji || relType == model.TypeIcon {
		// 公共资源跨空间秒传
		// 公共資源：不校驗 workspace_id，實現跨空間秒傳
		// 建議加上查詢條件：workspace_id IS NULL，確保秒傳的是真正的公共文件
		// query = query.Where("workspace_id IS NULL")
	} else if wsID != nil && *wsID != uuid.Nil {
		query = query.Where("workspace_id = ?", wsID)
	} else {
		return nil, nil
	}

	if err := query.First(&file).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	// 4. 【重要】物理一致性檢查
	// 避免數據庫有記錄但物理文件被刪除的情況
	//if !utils.FileIsExist(file.Path) {
	//	// 如果物理文件丟失，邏輯刪除該記錄，防止下次繼續誤判秒传
	//	go s.Dao.DB.Model(&model.File{}).Where("id = ?", file.ID).Update("delete_time", time.Now())
	//	return nil, nil
	//}

	return &file, nil
}

func (s *FileService) CheckChunks(ctx context.Context, params playload.CheckChunksReq, wsID *uuid.UUID) (playload.CheckChunksResult, error) {
	result := playload.CheckChunksResult{Skip: false}

	// 1. 逻辑+物理双重秒传校验
	existing, _ := s.GetReadyFileByHash(ctx, params.Hash, params.RelatedType, wsID)
	if existing != nil {
		if utils.FileIsExist(existing.Path) {
			result.Skip = true
			result.File = existing
			return result, nil
		} else {
			// 物理文件缺失，标记逻辑失效
			go s.Dao.DB.Model(&model.File{}).Where("id = ?", existing.ID).Update("delete_time", time.Now())
		}
	}

	// 2. 物理判定：断点续传（检查 temp 目录）
	basePath := config.Get().Upload.Path
	hashDir := filepath.Join(basePath, "temp", params.Hash)
	if utils.FileIsExist(hashDir) {
		subFiles := utils.GetSubFilesByDir(hashDir)
		var currentList []string
		for _, subFile := range subFiles {
			if !subFile.IsDir() {
				currentList = append(currentList, subFile.Name())
			}
		}
		result.Uploaded = currentList
	}

	return result, nil
}

func (s *FileService) UploadChunks(ctx context.Context, params playload.UploadChunksReq) error {
	// 分片统一放在 uploads/temp/{hash}
	basePath := config.Get().Upload.Path
	hashDir := filepath.Join(basePath, "temp", params.Hash)
	if err := os.MkdirAll(hashDir, 0755); err != nil {
		return err
	}
	chunkFilename := filepath.Join(hashDir, strconv.FormatInt(params.Index, 10))
	return utils.UploadFile(params.File, chunkFilename)
}

func (s *FileService) MergeChunks(ctx context.Context, params playload.MergeChunksReq, wsID uuid.UUID) (playload.MergeChunksResult, error) {
	basePath := config.Get().Upload.Path
	hashDir := filepath.Join(basePath, "temp", params.Hash)
	result := playload.MergeChunksResult{Hash: params.Hash}

	// 1. 获取业务变量化配置
	_, ok := model.TypeConfigMap[params.RelatedType]
	if !ok {
		return result, errors.New("不支持的业务类型")
	}

	// 2. 确定最终存储目录: uploads/{ws_id}/{sub_path}
	saveDir, visibility := utils.GetSaveDir(basePath, wsID, params.RelatedType)
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return result, errors.New("创建存储目录失败")
	}

	// 3. 生成物理唯一文件名
	fileExt := filepath.Ext(params.FileName)
	outFileName := uuid.New().String() + fileExt
	targetPath := filepath.Join(saveDir, outFileName)

	// 4. 执行物理合并 (直接传入 hashDir 让 utils 内部处理排序和合并)
	// 注意：根据之前的定义，utils.MergeFiles 接收 (srcDir, targetPath)
	if err := utils.MergeFiles(hashDir, targetPath); err != nil {
		return result, err
	}

	// 5. 二次校验：物理文件 Hash 对比
	// 防止合并过程出错或分片损坏
	ok, actualHash, err := utils.VerifyFile(targetPath, params.Hash)
	if err != nil {
		os.Remove(targetPath) // 删除损坏的合并后文件
		return result, errors.New("文件校验过程出错: " + err.Error())
	}
	if !ok {
		os.Remove(targetPath) // 删除损坏的合并后文件
		os.RemoveAll(hashDir) // 【新增】删除损坏的分片，强制用户下次重新上传完整数据
		return result, errors.New("文件完整性校验失败: 预期 " + params.Hash + " 实际 " + actualHash)
	}

	// 6. 校验通过，清理临时分片目录
	_ = os.RemoveAll(hashDir)

	// 7. 获取最终文件信息并返回
	fileInfo, err := os.Stat(targetPath)
	if err != nil {
		return result, errors.New("获取合并后文件信息失败")
	}

	result.Name = params.FileName
	result.OriginName = params.FileName
	result.Type = fileExt
	result.MimeType = utils.GetFileMimeType(targetPath)
	result.Size = fileInfo.Size()
	result.Path = targetPath
	result.Visibility = visibility
	result.RelatedType = params.RelatedType
	return result, nil
}

var chatAttachmentAllowedExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	".mp4": true, ".mov": true, ".webm": true,
}

// SaveSocialChatAttachment 保存聊天附件到 uploads/public/chat，返回浏览器可用路径（如 /uploads/public/chat/uuid.jpg）。
func (s *FileService) SaveSocialChatAttachment(fh *multipart.FileHeader) (string, error) {
	if fh == nil {
		return "", errors.New("empty file")
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !chatAttachmentAllowedExt[ext] {
		return "", errors.New("不支持的文件类型")
	}
	maxSz := int64(80 << 20)
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		maxSz = 25 << 20
	}
	if fh.Size > 0 && fh.Size > maxSz {
		return "", errors.New("文件过大")
	}

	basePath := config.Get().Upload.Path
	saveDir, _ := utils.GetSaveDir(basePath, uuid.Nil, model.TypeChat)
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return "", err
	}
	outName := uuid.New().String() + ext
	diskPath := filepath.Join(saveDir, outName)

	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(diskPath)
	if err != nil {
		return "", err
	}
	n, err := io.Copy(dst, src)
	dst.Close()
	if err != nil {
		_ = os.Remove(diskPath)
		return "", err
	}
	if n > maxSz {
		_ = os.Remove(diskPath)
		return "", errors.New("文件过大")
	}

	return "/uploads/public/chat/" + outName, nil
}

//func (s *FileService) Upload(ctx context.Context, params playload.UploadRequest, wsID uuid.UUID) (playload.MergeChunksResult, error) {
//	cfg := model.TypeConfigMap[params.RelatedType]
//	basePath := config.Get().Upload.Path
//	saveDir := filepath.Join(basePath, wsID.String(), cfg.SubPath)
//	os.MkdirAll(saveDir, 0755)
//
//	fileExt := filepath.Ext(params.File.Filename)
//	targetPath := filepath.Join(saveDir, uuid.New().String()+fileExt)
//
//	result := playload.MergeChunksResult{Hash: params.Hash}
//	if err := utils.UploadFile(params.File, targetPath); err != nil {
//		return result, err
//	}
//
//	result.Name = params.File.Filename
//	result.OriginName = params.File.Filename
//	result.Type = fileExt
//	result.MimeType = utils.GetFileMimeType(targetPath)
//	result.Size = params.File.Size
//	result.Path = targetPath
//	return result, nil
//}

//func (s *FileService) CleanUnusedFiles(ctx context.Context) error {
//	var files []model.File
//	// 1. 獲取所有未標記為永久存放或超過 24 小時的文件
//	err := s.Dao.DB.WithContext(ctx).
//		Where("create_time < ?", time.Now().Add(-24*time.Hour)).
//		Find(&files).Error
//	if err != nil {
//		return err
//	}
//
//	for _, file := range files {
//		// 2. 檢查該文件的路徑或 ID 是否出現在 sys_page 的 content (jsonb) 中
//		var count int64
//		// 使用 Postgres 的 jsonb 搜索功能
//		s.Dao.DB.Table("sys_page").
//			Where("content @> ?", fmt.Sprintf(`[{"url": "%s"}]`, file.Path)).
//			Count(&count)
//
//		if count == 0 {
//			// 3. 如果沒有被任何頁面引用，執行物理刪除
//			if err := os.Remove(file.Path); err != nil {
//				//logger.Warn("物理文件刪除失敗: " + file.Path)
//				errors.New("物理文件刪除失敗: " + file.Path)
//			}
//			// 4. 刪除數據庫記錄
//			s.Dao.DB.Delete(&file)
//		}
//	}
//	return nil
//}

// CheckWorkspaceQuota 检查工作区（租户）的剩余云盘空间是否足够
func (s *FileService) CheckWorkspaceQuota(wsID uuid.UUID, fileSize int64) (bool, error) {
	var quota struct {
		TotalBytes int64 `gorm:"column:total_bytes"`
		UsedBytes  int64 `gorm:"column:used_bytes"`
	}

	// 查找当前工作区的配额情况（对应你在前几轮建好的 sys_workspace_quota 表）
	err := s.Dao.DB.Table("sys_workspace_quota").
		Select("total_bytes, used_bytes").
		Where("workspace_id = ?", wsID).
		Scan(&quota).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果该团队从未配置过，走系统默认兜底配额：例如 5GB
			return fileSize <= 5368709120, nil
		}
		return false, err
	}

	// 判定：当前已用空间 + 准备上传的文件体积，是否超过总配额限制
	if quota.UsedBytes+fileSize > quota.TotalBytes {
		return false, nil
	}
	return true, nil
}

// AddWithQuotaDeduction 开启 DB 事务：实现记录入库、引用计数增加与工作区配额扣减的强原子性
func (s *FileService) AddWithQuotaDeduction(ctx context.Context, file *model.File) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		// 1. 二次兜底检查是否存在完全一样的物理秒传记录（防止并发入库问题）
		var count int64
		tx.Model(&model.File{}).
			Where("hash = ? AND status = 1 AND delete_time IS NULL", file.Hash).
			Count(&count)

		if count > 0 {
			// 如果在你物理合并期间，另一个同文件的线程已经入库成功了，
			// 则此线程自动转为“增加引用计数”，不需要重复插入新的记录
			return tx.Model(&model.File{}).
				Where("hash = ? AND delete_time IS NULL", file.Hash).
				UpdateColumn("ref_count", gorm.Expr("ref_count + 1")).Error
		}

		// 2. 插入新的一条 sys_file 记录
		file.RefCount = 1 // 初始引用计数设为 1
		if err := tx.Create(file).Error; err != nil {
			return err
		}

		// 3. 核心：如果有关联的工作区，联动扣减空间配额
		if file.WorkspaceID != nil && *file.WorkspaceID != uuid.Nil {
			result := tx.Table("sys_workspace_quota").
				Where("workspace_id = ?", *file.WorkspaceID).
				UpdateColumn("used_bytes", gorm.Expr("used_bytes + ?", file.Size))

			if result.Error != nil {
				return result.Error
			}

			// 容错兼容：如果该工作区此前没有任何配额记录，执行初始化行插入
			if result.RowsAffected == 0 {
				err := tx.Table("sys_workspace_quota").Create(map[string]interface{}{
					"workspace_id": *file.WorkspaceID,
					"total_bytes":  5368709120, // 默认 5GB
					"used_bytes":   file.Size,
					"update_time":  gorm.Expr("NOW()"),
				}).Error
				if err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// DeleteFile 协同附件逻辑删除（递减引用计数与返还空间配额）
func (s *FileService) DeleteFile(ctx context.Context, fileID uuid.UUID) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var file model.File
		if err := tx.Where("id = ? AND delete_time IS NULL", fileID).First(&file).Error; err != nil {
			return err
		}

		// 1. 如果存在多文档间（跨页面秒传）复用该路径，只减少引用计数，不释放物理资源
		if file.RefCount > 1 {
			return tx.Model(&file).UpdateColumn("ref_count", gorm.Expr("ref_count - 1")).Error
		}

		// 2. 如果当前引用的文档是最后一个（ref_count 将降为 0），则安全归还当前工作区的云盘空间
		if file.WorkspaceID != nil && *file.WorkspaceID != uuid.Nil {
			err := tx.Table("sys_workspace_quota").
				Where("workspace_id = ?", *file.WorkspaceID).
				UpdateColumn("used_bytes", gorm.Expr("GREATEST(used_bytes - ?, 0)", file.Size)).Error // 使用 GREATEST 函数防止扣减变成负数
			if err != nil {
				return err
			}
		}

		// 3. 逻辑删除 sys_file 记录，打上打上删除时间戳
		if err := tx.Model(&file).Update("delete_time", gorm.Expr("NOW()")).Error; err != nil {
			return err
		}

		// 4. 清理 Redis 的访问元数据缓存，让拦截器无法再被越权越限访问
		if utils.GlobalRedisClient != nil {
			redisKey := fmt.Sprintf("cache:file_meta:%s", file.Path)
			go func() {
				defer func() { recover() }()
				utils.GlobalRedisClient.Del(context.Background(), redisKey)
			}()
		}

		return nil
	})
}
