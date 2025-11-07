package services

import (
	"app/dao"
	"app/model"
	"app/playload"
)

type UsersService struct{}

func (c *UsersService) FindByName(name string) ([]model.Users, error) {
	d := dao.UsersDao{}
	//filterParams := []playload.Expression{
	//	{
	//		Field: "username",
	//		Op:    "=",
	//		Value: []interface{}{name},
	//	},
	//}
	result, err := d.QueryList(playload.ConditionData{
		Filter: &[]playload.Expression{
			{
				Field: "username",
				Op:    "=",
				Value: []interface{}{name},
			},
		},
	})
	if err != nil {
		return result, err
	}
	return result, nil
}

func (c *UsersService) FindById(id interface{}) (model.Users, error) {
	d := dao.UsersDao{}
	result, err := d.QueryById(id)
	if err != nil {
		return result, err
	}
	return result, nil
}

func (c *UsersService) Add(users model.Users) bool {
	d := dao.UsersDao{}
	return d.Create(users)
}

func (c *UsersService) AddBat(users []model.Users) bool {
	d := dao.UsersDao{}
	return d.CreateBat(users)
}

func (c *UsersService) Remove(id interface{}) bool {
	d := dao.UsersDao{}
	return d.Delete(model.Users{}, id)
}

func (c *UsersService) RemoveBat(ids []interface{}) bool {
	d := dao.UsersDao{}
	return d.DeleteBat(model.Users{}, ids)
}

func (c *UsersService) Update(users model.Users) bool {
	d := dao.UsersDao{}
	return d.Update(users)
}
