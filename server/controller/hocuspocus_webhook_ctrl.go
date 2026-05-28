package controller

import (
	"app/logger"
	"app/playload"
	"app/services"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// HocuspocusWebhookCtrl 接收 Node extension-webhook POST，正文为 JSON.stringify({ event, payload })。
type HocuspocusWebhookCtrl struct {
	Dispatcher *services.CollabWebhookDispatcher
	secret     string
}

func NewHocuspocusWebhookCtrl(d *services.CollabWebhookDispatcher, secret string) *HocuspocusWebhookCtrl {
	return &HocuspocusWebhookCtrl{Dispatcher: d, secret: strings.TrimSpace(secret)}
}

func hocuspocusSignature(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func signatureOK(secret string, body []byte, headerVal string) bool {
	if secret == "" {
		return true
	}
	if headerVal == "" {
		return false
	}
	expected := hocuspocusSignature(secret, body)
	return hmac.Equal([]byte(expected), []byte(strings.TrimSpace(headerVal)))
}

// Webhook POST /hocuspocus-webhook — 校验签名（若配置了 HOCUSPOCUS_WEBHOOK_SECRET）后入队并立即返回。
func (h *HocuspocusWebhookCtrl) Webhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.Warn("hocuspocus webhook: 读取 body 失败", zap.Error(err))
		playload.SendInternalError(c, "读取请求失败")
		return
	}

	secret := h.secret
	if secret == "" {
		secret = strings.TrimSpace(os.Getenv("HOCUSPOCUS_WEBHOOK_SECRET"))
	}
	if !signatureOK(secret, body, c.GetHeader("X-Hocuspocus-Signature-256")) {
		playload.SendUnauthorized(c, "无效签名")
		return
	}

	if h.Dispatcher == nil || !h.Dispatcher.Submit(body) {
		c.JSON(503, gin.H{"code": 503, "message": "持久化队列已满，请稍后重试", "data": nil})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "accepted", "data": nil})
}
