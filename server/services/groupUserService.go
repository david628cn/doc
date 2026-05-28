package services

import (
	"app/model"

	"gorm.io/gorm"
)

type GroupUserService struct {
	BaseService[model.GroupUser]
}

func NewGroupUserService(db *gorm.DB) *GroupUserService {
	return &GroupUserService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService: *NewBaseService[model.GroupUser](db),
	}
}
