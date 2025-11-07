package model

import "time"

type Files struct {
	ID         int64     `gorm:"column:id" json:"id"`
	Name       string    `gorm:"column:name" json:"name"`
	Size       int64     `gorm:"column:size" json:"size"`
	Type       string    `gorm:"column:type" json:"type"`
	Path       string    `gorm:"column:path" json:"path"`
	Desc       string    `gorm:"column:desc" json:"desc"`
	UserId     int64     `gorm:"column:userId" json:"userId"`
	UserName   string    `gorm:"column:userName" json:"userName"`
	CreateDate time.Time `gorm:"type:date;column:create_date" json:"create_date"`
	UpdateDate time.Time `gorm:"type:date;column:update_date" json:"update_date"`
}

func (Files) TableName() string {
	return "sys_files"
}
