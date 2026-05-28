package middleware

import (
	"net"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimitByIP applies a simple in-memory token bucket per client IP.
// ratePerSec: refill rate (tokens/second)
// burst: maximum burst size
func RateLimitByIP(ratePerSec float64, burst int) gin.HandlerFunc {
	var (
		mu       sync.Mutex
		visitors = make(map[string]*ipLimiter)
	)

	// Best-effort cleanup to avoid unbounded growth.
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			cutoff := time.Now().Add(-15 * time.Minute)
			mu.Lock()
			for ip, v := range visitors {
				if v.lastSeen.Before(cutoff) {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	getIP := func(c *gin.Context) string {
		ip := c.ClientIP()
		if h, _, err := net.SplitHostPort(ip); err == nil {
			return h
		}
		return ip
	}

	return func(c *gin.Context) {
		// Hocuspocus Webhook / 协作内部接口可能高频；不入桶以免误伤协同归档。
		if strings.HasPrefix(c.Request.URL.Path, "/hocuspocus-webhook") ||
			strings.HasPrefix(c.Request.URL.Path, "/internal/collab/") {
			c.Next()
			return
		}

		ip := getIP(c)

		mu.Lock()
		v, ok := visitors[ip]
		if !ok {
			v = &ipLimiter{
				limiter:  rate.NewLimiter(rate.Limit(ratePerSec), burst),
				lastSeen: time.Now(),
			}
			visitors[ip] = v
		} else {
			v.lastSeen = time.Now()
		}
		lim := v.limiter
		mu.Unlock()

		if !lim.Allow() {
			c.AbortWithStatusJSON(429, gin.H{"code": 429, "message": "请求过于频繁，请稍后再试", "data": nil})
			return
		}

		c.Next()
	}
}

