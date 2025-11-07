package services

import (
	"app/dao"
	"app/model"
	"app/playload"
)

type StockService struct{}

func (c *StockService) FindList(conditionData playload.ConditionData) ([]model.Stock, error) {
	d := dao.StockDao{}
	result, err := d.QueryListEx(conditionData)
	if err != nil {
		return result, err
	}
	return result, nil
}

func (c *StockService) FindCount(conditionData playload.ConditionData) (int64, error) {
	d := dao.StockDao{}
	result, err := d.QueryCount(conditionData)
	if err != nil {
		return result, err
	}
	return result, nil
}
