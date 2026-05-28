package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MaxBodyBytes limits request body size for non-multipart requests.
// It relies on http.MaxBytesReader which enforces the limit while reading.
func MaxBodyBytes(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip multipart: uploads are handled by multipart parser; use Engine.MaxMultipartMemory for memory cap.
		ct := c.GetHeader("Content-Type")
		if len(ct) >= 19 && ct[:19] == "multipart/form-data" {
			c.Next()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

