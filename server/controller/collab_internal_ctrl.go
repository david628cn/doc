package controller

import (
	"app/errs"
	"app/logger"
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// CollabInternalCtrl：協作服務內部接口——Verify（JWT）、Load（ydoc_state）、Persist（异步入队写库）。
type CollabInternalCtrl struct {
	UserSrv        *services.UserService
	PageCtrl       *PageCtrl
	Dispatcher     *services.CollabWebhookDispatcher
	Redis          *redis.Client
	VerifyCacheTTL time.Duration
	RedisKeyPrefix string // 已规范化（含尾部 ":"），与 Hocuspocus REDIS_PREFIX 隔离
}

func NewCollabInternalCtrl(userSrv *services.UserService, pageCtrl *PageCtrl, disp *services.CollabWebhookDispatcher, rdb *redis.Client, verifyTTL time.Duration, redisKeyPrefix string) *CollabInternalCtrl {
	return &CollabInternalCtrl{
		UserSrv: userSrv, PageCtrl: pageCtrl, Dispatcher: disp,
		Redis: rdb, VerifyCacheTTL: verifyTTL, RedisKeyPrefix: redisKeyPrefix,
	}
}

func collabVerifyCacheKey(keyPrefix, rawToken string, pageID uuid.UUID, sessionRO bool) string {
	t := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(rawToken), "Bearer "))
	sum := sha256.Sum256([]byte(t))
	ro := "0"
	if sessionRO {
		ro = "1"
	}
	return keyPrefix + "verify:v1:" + hex.EncodeToString(sum[:]) + ":" + pageID.String() + ":" + ro
}

func claimIntCollab(v interface{}) int {
	switch x := v.(type) {
	case int:
		return x
	case int64:
		return int(x)
	case float64:
		return int(x)
	case string:
		n, _ := strconv.Atoi(x)
		return n
	default:
		return 0
	}
}

func (h *CollabInternalCtrl) resolveUser(ctx context.Context, token string) (*model.User, error) {
	token = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(token), "Bearer "))
	if token == "" {
		return nil, errs.ErrUnauthorized
	}
	claims, err := utils.ParseToken(token)
	if err != nil {
		return nil, err
	}
	if !claims.VerifyExpiresAt(time.Now().Unix(), false) {
		return nil, errs.ErrUnauthorized
	}
	idStr, ok := claims["id"].(string)
	if !ok {
		return nil, errs.ErrUnauthorized
	}
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return nil, errs.ErrUnauthorized
	}
	user, err := h.UserSrv.FindByID(ctx, uid)
	if err != nil || user == nil {
		return nil, errs.ErrUnauthorized
	}
	if user.PwdVersion != claimIntCollab(claims["pwd_version"]) {
		return nil, errs.ErrUnauthorized
	}
	if user.Status != 1 || user.DeleteTime != nil {
		return nil, errs.ErrUnauthorized
	}
	return user, nil
}

type collabVerifyReq struct {
	Token        string `json:"token"`
	DocumentName string `json:"document_name"`
	// SessionReadOnly：前端「阅读模式」协同会话自愿只读（JWT 可为 editor）；不可用于提权写入，仅可降级为只读。
	SessionReadOnly bool `json:"session_read_only"`
}

// Verify 供 Hocuspocus 節點校驗 JWT 與頁面讀權限；read_only 表示頁面角色低於 editor（僅同步、不可寫）。
func (h *CollabInternalCtrl) Verify(c *gin.Context) {
	var req collabVerifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		playload.SendError(c, "invalid body")
		return
	}
	pageID, err := uuid.Parse(req.DocumentName)
	if err != nil {
		playload.SendError(c, "invalid document_name")
		return
	}
	if h.Redis != nil && h.VerifyCacheTTL > 0 {
		key := collabVerifyCacheKey(h.RedisKeyPrefix, req.Token, pageID, req.SessionReadOnly)
		val, err := h.Redis.Get(c.Request.Context(), key).Bytes()
		if err != nil && err != redis.Nil {
			logger.Warn("Redis GET collab verify 缓存失败",
				zap.String("page_id", pageID.String()),
				zap.Error(err))
		}
		if err == nil && len(val) > 0 {
			var data gin.H
			if json.Unmarshal(val, &data) == nil {
				logger.Debug("collab verify 缓存命中", zap.String("page_id", pageID.String()))
				playload.SendSuccess(c, data, "ok")
				return
			}
			logger.Warn("collab verify 缓存 JSON 损坏", zap.String("page_id", pageID.String()))
		}
	}
	user, err := h.resolveUser(c.Request.Context(), req.Token)
	if err != nil {
		playload.SendUnauthorized(c, "令牌无效或已过期")
		return
	}
	page, err := h.PageCtrl.PageSrv.GetByIDGlobal(c.Request.Context(), pageID)
	if err != nil {
		playload.SendInternalError(c, "查询页面失败")
		return
	}
	if page == nil {
		playload.SendError(c, "页面不存在")
		return
	}
	if err := h.PageCtrl.checkPageReadFull(c.Request.Context(), page.WorkspaceID, user.ID, page); err != nil {
		playload.SendErr(c, err)
		return
	}
	role, err := h.PageCtrl.effectivePageRole(c.Request.Context(), page.WorkspaceID, page.ID, page.SpaceID, user.ID)
	if err != nil {
		playload.SendErr(c, err)
		return
	}
	roleReadOnly := model.GetSpaceRoleWeight(role) < model.GetSpaceRoleWeight(model.SpaceRoleEditor)
	readOnly := roleReadOnly
	if req.SessionReadOnly {
		readOnly = true
	}
	data := gin.H{
		"user_id":   user.ID.String(),
		"read_only": readOnly,
	}
	if h.Redis != nil && h.VerifyCacheTTL > 0 {
		key := collabVerifyCacheKey(h.RedisKeyPrefix, req.Token, pageID, req.SessionReadOnly)
		if b, err := json.Marshal(data); err != nil {
			logger.Warn("collab verify 缓存序列化失败", zap.String("page_id", pageID.String()), zap.Error(err))
		} else if err := h.Redis.Set(c.Request.Context(), key, b, h.VerifyCacheTTL).Err(); err != nil {
			logger.Warn("Redis SET collab verify 缓存失败",
				zap.String("page_id", pageID.String()),
				zap.Error(err))
		}
	}
	playload.SendSuccess(c, data, "ok")
}

// normalizePmDocJSON 将 sys_page.content（jsonb）变为 ProseMirror doc 根 JSON；顶层为数组时包一层 doc。
func normalizePmDocJSON(raw datatypes.JSON) (json.RawMessage, bool) {
	b := bytes.TrimSpace([]byte(raw))
	if len(b) == 0 || bytes.Equal(b, []byte("null")) {
		return nil, false
	}
	if b[0] == '[' {
		out := append([]byte(`{"type":"doc","content":`), b...)
		out = append(out, '}')
		return json.RawMessage(out), true
	}
	return json.RawMessage(b), true
}

// LoadYdoc GET /internal/collab/ydoc/:pageId — 优先返回 ydoc_state（octet-stream）；若无则用 content 的 PM JSON（application/json）。
func (h *CollabInternalCtrl) LoadYdoc(c *gin.Context) {
	pageID, err := uuid.Parse(c.Param("pageId"))
	if err != nil {
		playload.SendError(c, "invalid page id")
		return
	}
	ydoc, content, err := h.PageCtrl.PageSrv.GetYdocStateAndContentForCollab(c.Request.Context(), pageID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.Status(404)
			return
		}
		playload.SendInternalError(c, "读取页面失败")
		return
	}
	if len(ydoc) > 0 {
		c.Data(200, "application/octet-stream", ydoc)
		return
	}
	docJSON, ok := normalizePmDocJSON(content)
	if ok && len(docJSON) > 0 {
		c.JSON(200, gin.H{"kind": "pm_json", "doc": docJSON})
		return
	}
	c.Status(204)
}

type collabPersistYdocReq struct {
	DocumentName string          `json:"document_name"`
	YdocBase64   string          `json:"ydoc_base64"`
	Content      json.RawMessage `json:"content,omitempty"`
	ContentText  string          `json:"content_text,omitempty"`
	UpdatedBy    *string         `json:"updated_by,omitempty"` // 可选：当前编辑用户 UUID 字符串
}

// PersistYdoc POST /internal/collab/persist-ydoc — 接收 Yjs encodeStateAsUpdate 的 Base64，异步入队更新 ydoc_state，立即返回。
func (h *CollabInternalCtrl) PersistYdoc(c *gin.Context) {
	var req collabPersistYdocReq
	if err := c.ShouldBindJSON(&req); err != nil {
		playload.SendError(c, "invalid body")
		return
	}
	pageID, err := uuid.Parse(strings.TrimSpace(req.DocumentName))
	if err != nil {
		playload.SendError(c, "invalid document_name")
		return
	}
	raw, err := base64.StdEncoding.DecodeString(req.YdocBase64)
	if err != nil {
		playload.SendError(c, "invalid ydoc_base64")
		return
	}
	if len(raw) == 0 {
		c.JSON(200, gin.H{"code": 200, "message": "accepted", "data": nil})
		return
	}
	var upd *uuid.UUID
	if req.UpdatedBy != nil {
		s := strings.TrimSpace(*req.UpdatedBy)
		if s != "" {
			if id, err := uuid.Parse(s); err == nil {
				upd = &id
			}
		}
	}
	if h.Dispatcher == nil || !h.Dispatcher.SubmitYdocBinary(pageID, raw, req.Content, req.ContentText, upd) {
		c.JSON(503, gin.H{"code": 503, "message": "持久化队列已满", "data": nil})
		return
	}
	c.JSON(200, gin.H{"code": 200, "message": "accepted", "data": nil})
}
