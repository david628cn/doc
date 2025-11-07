package services

import (
	"app/dao"
	"app/model"
	"app/playload"
)

type FilesService struct{}

func (c *FilesService) FindList(conditionData playload.ConditionData) ([]model.Files, error) {
	d := dao.FilesDao{}
	result, err := d.QueryListEx(conditionData)
	if err != nil {
		return result, err
	}
	return result, nil
}

func (c *FilesService) FindCount(conditionData playload.ConditionData) (int64, error) {
	d := dao.FilesDao{}
	result, err := d.QueryCount(conditionData)
	if err != nil {
		return result, err
	}
	return result, nil
}

func (c *FilesService) Add(files model.Files) bool {
	d := dao.FilesDao{}
	return d.Create(files)
}

func (c *FilesService) AddBat(files []model.Files) bool {
	d := dao.FilesDao{}
	return d.CreateBat(files)
}

func (c *FilesService) Remove(id interface{}) bool {
	d := dao.FilesDao{}
	return d.Delete(model.Files{}, id)
}

func (c *FilesService) RemoveBat(ids []interface{}) bool {
	d := dao.FilesDao{}
	return d.DeleteBat(model.Files{}, ids)
}
