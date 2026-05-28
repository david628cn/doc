package utils

import (
	"context"
	"errors"
	"github.com/redis/go-redis/v9"
	"time"
)

// GlobalRedisClient 你的全局 Redis 客户端实例
var GlobalRedisClient *redis.Client

// SafeGetFromRedis 安全读取 Redis 缓存（带容错降级）
func SafeGetFromRedis(ctx context.Context, key string) (string, error) {
	if GlobalRedisClient == nil {
		return "", nil // Redis 未启用，返回空触发降级查库
	}

	// 捕获可能由于 Redis 挂掉引发的底层非预期异常
	defer func() { recover() }()

	val, err := GlobalRedisClient.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", nil // 缓存未命中
	}
	return val, err
}

// SafeSetToRedis 安全写入 Redis 缓存（带容错降级）
func SafeSetToRedis(ctx context.Context, key string, val string, expiration time.Duration) {
	if GlobalRedisClient == nil {
		return
	}
	defer func() { recover() }()

	// 使用短暂的超时控制，防止 Redis 响应慢卡住主流程
	timeoutCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	GlobalRedisClient.Set(timeoutCtx, key, val, expiration)
}
