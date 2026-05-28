package middleware

import (
	"app/playload"

	"github.com/gin-gonic/gin"
)

// CollabInternalAuth 協作 Node 服務調用內部接口：校驗 X-Collab-Internal-Secret。不涉及 ProseMirror / 文檔正文。
func CollabInternalAuth(expectedSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("X-Collab-Internal-Secret") != expectedSecret {
			playload.SendForbidden(c, "invalid collaboration internal secret")
			c.Abort()
			return
		}
		c.Next()
	}
}
