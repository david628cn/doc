package services

import (
	"app/model"

	"gorm.io/gorm"
)

type StockService struct {
	BaseService[model.Stock]
}

func NewStockService(db *gorm.DB) *StockService {
	return &StockService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.Stock](db),
	}
}
