package model

import "time"

type Users struct {
	ID            int64     `gorm:"column:id" json:"id"`
	Code          string    `gorm:"column:code" json:"code"`
	Username      string    `gorm:"column:username" json:"username"`
	RealName      string    `gorm:"column:real_name" json:"real_name"`
	Password      string    `gorm:"column:password" json:"password"`
	Sex           int       `gorm:"column:sex" json:"sex"`
	RoleCode      int       `gorm:"column:role_code" json:"role_code"`
	HeadSculpture string    `gorm:"column:head_sculpture" json:"head_sculpture"`
	Mobile        string    `gorm:"column:mobile" json:"mobile"`
	Status        int       `gorm:"column:status" json:"status"`
	Address       string    `gorm:"column:address" json:"address"`
	Email         string    `gorm:"column:email" json:"email"`
	IdentityCard  string    `gorm:"column:identity_card" json:"identity_card"`
	Birthday      time.Time `gorm:"type:date;column:birthday;default:value" json:"birthday"`
	Sort          int       `gorm:"column:sort" json:"sort"`
	LoginTime     time.Time `gorm:"type:date;column:login_time;default:value" json:"login_time"`
	CreateDate    time.Time `gorm:"type:date;column:create_date" json:"create_date"`
	UpdateDate    time.Time `gorm:"type:date;column:update_date" json:"update_date"`
}

func (Users) TableName() string {
	return "sys_users"
}
