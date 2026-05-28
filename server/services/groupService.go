package services

import (
	"app/model"

	"gorm.io/gorm"
)

type GroupService struct {
	BaseService[model.Group]
}

func NewGroupService(db *gorm.DB) *GroupService {
	return &GroupService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.Group](db),
	}
}
