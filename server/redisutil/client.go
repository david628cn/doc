package redisutil

import (
	"app/config"
	"app/logger"
	"context"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// New 返回已 Ping 成功的客户端；addr 为空或连接失败时返回 nil（降级为无 Redis）。
func New(cfg config.Redis) *redis.Client {
	if strings.TrimSpace(cfg.Addr) == "" {
		logger.Debug("Redis 未配置 addr，跳过初始化")
		return nil
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Error("Redis 连接失败，已跳过 Redis 功能（WS Pub/Sub、verify 缓存）",
			zap.String("addr", cfg.Addr),
			zap.Int("db", cfg.DB),
			zap.Error(err))
		_ = rdb.Close()
		return nil
	}
	logger.Info("Redis 已连接",
		zap.String("addr", cfg.Addr),
		zap.Int("db", cfg.DB))
	return rdb
}
