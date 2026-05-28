package utils

import (
	"context"

	"gorm.io/gorm"
)

type ctxTransactionKey struct{}

// ContextWithDB 将 tx 注入 context
func ContextWithDB(ctx context.Context, tx *gorm.DB) context.Context {
	return context.WithValue(ctx, ctxTransactionKey{}, tx)
}

// GetDB 从 context 获取 tx，获取不到则回退到传入的默认 db
func GetDB(ctx context.Context, defaultDB *gorm.DB) *gorm.DB {
	if tx, ok := ctx.Value(ctxTransactionKey{}).(*gorm.DB); ok {
		return tx
	}
	return defaultDB
}
