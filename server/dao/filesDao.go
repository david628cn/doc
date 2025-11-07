package dao

import (
	"app/db"
	"app/model"
	"app/playload"
)

type FilesDao struct {
	BaseDao[model.Files]
}

func (c *FilesDao) QueryListEx(conditionData playload.ConditionData) ([]model.Files, error) {
	var entity []model.Files
	query := db.DB.Select("id")
	query = CombinQuery(query, conditionData, false)
	query = query.Model(&entity)
	result := db.DB.Model(&entity).
		Select(
			"sys_files.id, sys_files.name, sys_files.size, sys_files.type, sys_files.path, sys_files.desc, sys_files.userId, sys_users.username AS userName, sys_files.create_date, sys_files.update_date").
		Joins("INNER JOIN (?) b USING(id)", query).
		Joins("LEFT JOIN sys_users ON sys_users.id = sys_files.userId", query).
		Find(&entity)
	if result.Error != nil {
		return entity, result.Error
	}
	return entity, nil
}
