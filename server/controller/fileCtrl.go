package controller

import (
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/google/uuid"
)

// 用于并发锁定，防止同一个 Hash 同时执行物理合并
var mergeLocks sync.Map

type FileCtrl struct {
	FileSrv *services.FileService
}

func NewFileCtrl(fileSrv *services.FileService) *FileCtrl {
	return &FileCtrl{
		FileSrv: fileSrv,
	}
}

func (c *FileCtrl) CheckChunks(ctx *gin.Context) {
	// --- 1. 安全前置：校验登录态 ---
	currentUser := utils.GetCurrentUser(ctx)
	if currentUser == nil {
		playload.SendUnauthorized(ctx, "未登录用户不可操作")
		return
	}

	var params playload.CheckChunksReq
	if err := ctx.BindJSON(&params); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}

	// 校验业务类型
	_, ok := model.TypeConfigMap[params.RelatedType]
	if !ok {
		playload.SendError(ctx, "不支持的业务类型")
		return
	}

	// 提取并补救当前工作区 ID
	wsID := c.getWorkspaceID(ctx)
	var wsIDPtr *uuid.UUID
	if wsID != uuid.Nil {
		finalID := wsID
		wsIDPtr = &finalID
	}

	// --- 2. 空间配额前置检查 ---
	if wsIDPtr != nil {
		hasQuota, err := c.FileSrv.CheckWorkspaceQuota(*wsIDPtr, params.Size)
		if err != nil || !hasQuota {
			playload.SendError(ctx, "当前工作区云盘空间不足，请联系管理员扩容")
			return
		}
	}

	// 执行 CheckChunks (内含秒传逻辑)
	result, err := c.FileSrv.CheckChunks(ctx, params, wsIDPtr)
	if err != nil {
		playload.SendError(ctx, "检查分片失败")
		return
	}

	// 根据结果赋予 Message
	var msg string
	if result.Skip {
		msg = "文件已存在，秒传成功"

		// 【秒传成功回写缓存】如果是秒传，顺便将该路径写回 Redis 缓存，加速后续下载拦截器的判定
		if result.File != nil && utils.GlobalRedisClient != nil {
			redisKey := fmt.Sprintf("cache:file_meta:%s", result.File.Path)
			// 这里将数据库对象序列化存入
			go func() {
				defer func() { recover() }()
				if jsonBytes, err := json.Marshal(result.File); err == nil {
					utils.GlobalRedisClient.Set(context.Background(), redisKey, string(jsonBytes), 2*time.Hour)
				}
			}()
		}
	} else if len(result.Uploaded) > 0 {
		msg = "获得断点续传进度"
	} else {
		msg = "新文件上传"
	}

	playload.SendSuccess(ctx, result, msg)
}

func (c *FileCtrl) UploadChunks(ctx *gin.Context) {
	// --- 1. 安全前置：校验登录态 ---
	if utils.GetCurrentUser(ctx) == nil {
		playload.SendUnauthorized(ctx, "未登录用户不可操作")
		return
	}

	var params playload.UploadChunksReq
	if err := ctx.ShouldBindWith(&params, binding.FormMultipart); err != nil {
		playload.SendError(ctx, "分片上传参数解析错误: "+err.Error())
		return
	}

	// 业务类型校验
	_, ok := model.TypeConfigMap[params.RelatedType]
	if !ok {
		playload.SendError(ctx, "不支持的业务类型")
		return
	}

	// 调用 Service 执行物理写入
	err := c.FileSrv.UploadChunks(ctx, params)
	if err != nil {
		playload.SendError(ctx, "分片保存失败: "+err.Error())
		return
	}

	playload.SendSuccess(ctx, true, "分片上传成功")
}

func (c *FileCtrl) MergeChunks(ctx *gin.Context) {
	// --- 1. 安全终极防御：未登录用户绝不允许触发物理合并（杜绝高 I/O 资源轰炸） ---
	currentUser := utils.GetCurrentUser(ctx)
	if currentUser == nil {
		playload.SendUnauthorized(ctx, "未登录用户不可操作")
		return
	}

	var params playload.MergeChunksReq
	if err := ctx.BindJSON(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	_, ok := model.TypeConfigMap[params.RelatedType]
	if !ok {
		playload.SendError(ctx, "不支持的业务类型")
		return
	}

	// 获取并补救工作区 ID
	wsID := c.getWorkspaceID(ctx)
	var wsIDPtr *uuid.UUID
	if wsID != uuid.Nil {
		finalID := wsID
		wsIDPtr = &finalID
	}

	// --- 2. 并发锁控制：防止多个请求同时合并同一个 Hash ---
	lock, _ := mergeLocks.LoadOrStore(params.Hash, &sync.Mutex{})
	mu := lock.(*sync.Mutex)
	mu.Lock()
	defer func() {
		mu.Unlock()
		mergeLocks.Delete(params.Hash)
	}()

	// --- 3. 二次检查 (Double Check 秒传) ---
	existing, _ := c.FileSrv.GetReadyFileByHash(ctx, params.Hash, params.RelatedType, &wsID)
	if existing != nil {
		playload.SendSuccess(ctx, existing, "文件已由他人上传完成，秒传成功")
		return
	}

	// --- 4. 执行物理合并 ---
	result, err := c.FileSrv.MergeChunks(ctx, params, wsID)
	if err != nil {
		playload.SendError(ctx, "物理合并失败: "+err.Error())
		return
	}

	// 判定 RelatedID (改用指针，支持数据库 NULL)
	var relIDPtr *uuid.UUID
	if params.RelatedID != "" {
		if id, err := uuid.Parse(params.RelatedID); err == nil {
			relIDPtr = &id
		}
	} else {
		switch params.RelatedType {
		case model.TypeAvatar:
			relIDPtr = &currentUser.ID
		case model.TypeIcon, model.TypeEmoji:
			relIDPtr = &wsID
		}
	}

	date := time.Now()
	m := model.File{
		ID:          uuid.New(),
		Name:        result.Name,
		OriginName:  result.OriginName,
		Type:        result.Type,
		MimeType:    result.MimeType,
		Size:        result.Size,
		Path:        result.Path,
		WorkspaceID: wsIDPtr,
		Hash:        result.Hash,
		Status:      1,
		RelatedType: result.RelatedType,
		RelatedID:   relIDPtr,
		Visibility:  result.Visibility,
		CreateBy:    currentUser.ID,
		UserName:    currentUser.Username,
		RefCount:    1, // 初始引用数显式声明为 1
		CreateTime:  date,
		UpdateTime:  date,
	}

	// --- 5. 联动 Service 执行带空间配额扣减的事务入库 ---
	if err = c.FileSrv.AddWithQuotaDeduction(ctx, &m); err != nil {
		os.Remove(result.Path) // 逻辑落库失败，物理回滚删除合并后的文件
		playload.SendError(ctx, "记录保存失败: "+err.Error())
		return
	}

	// --- 6. 【新增】Redis 缓存动态清空保障 ---
	// 目的：防止在合并成功前，该路径曾被前端拦截器高频访问过进而留下了“404 找不到文件”的脏缓存块。
	if utils.GlobalRedisClient != nil {
		redisKey := fmt.Sprintf("cache:file_meta:%s", m.Path)
		go func() {
			defer func() { recover() }()
			utils.GlobalRedisClient.Del(context.Background(), redisKey)
		}()
	}

	playload.SendSuccess(ctx, m, "上传成功")
}

func (c *FileCtrl) SocialChatUpload(ctx *gin.Context) {
	if utils.GetCurrentUser(ctx) == nil {
		playload.SendUnauthorized(ctx, "未登录用户不可操作")
		return
	}
	fh, err := ctx.FormFile("file")
	if err != nil {
		playload.SendError(ctx, "请选择文件: "+err.Error())
		return
	}
	webPath, err := c.FileSrv.SaveSocialChatAttachment(fh)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, gin.H{"path": webPath}, "上传成功")
}

// 内部提取：统一处理指标与工作区解包逻辑
func (c *FileCtrl) getWorkspaceID(ctx *gin.Context) uuid.UUID {
	wsID := utils.GetWorkspaceID(ctx)
	if wsID == uuid.Nil {
		wsIDStr := ctx.GetHeader("x-workspace-id")
		if wsIDStr == "" {
			wsIDStr = ctx.Query("workspace_id")
		}
		if parsedID, err := uuid.Parse(wsIDStr); err == nil {
			wsID = parsedID
		}
	}
	return wsID
}
