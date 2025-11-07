package dao

import (
	"app/model"
)

type UsersDao struct {
	BaseDao[model.Users]
}

//func (c *UsersDao) QueryByName(name string) ([]model.Users, error) {
//	var entity []model.Users
//	result := db.DB.Model(&entity).Where("username = ?", name).Find(&entity)
//	if result.Error != nil {
//		return entity, result.Error
//	}
//	return entity, nil
//}
//
//func (c *UsersDao) QueryById(id int64) (model.Users, error) {
//	var entity model.Users
//	result := db.DB.Model(&entity).Where("id = ?", id).Find(&entity)
//	if result.Error != nil {
//		return entity, result.Error
//	}
//	return entity, nil
//}
