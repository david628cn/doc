package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID  `gorm:"column:id;type:uuid;primaryKey;autoIncrement:false" json:"id"`
	Code          string     `gorm:"column:code" json:"code"`
	Username      string     `gorm:"column:username" json:"username"`
	RealName      string     `gorm:"column:real_name" json:"real_name"`
	Password      string     `gorm:"column:password" json:"-"`
	PwdVersion    int        `gorm:"column:pwd_version" json:"pwd_version"`
	Sex           int        `gorm:"column:sex;default:0" json:"sex"` // 0:未知, 1:男, 2:女
	RoleCode      int        `gorm:"column:role_code" json:"role_code"`
	HeadSculpture string     `gorm:"column:head_sculpture" json:"head_sculpture"`
	Mobile        string     `gorm:"column:mobile" json:"mobile"`
	Status        int        `gorm:"column:status;default:1" json:"status"` // 1:正常, 0:禁用
	Address       string     `gorm:"column:address" json:"address"`
	Email         string     `gorm:"column:email" json:"email"`
	IdentityCard  string     `gorm:"column:identity_card" json:"identity_card"`
	Birthday      *time.Time `gorm:"type:date;column:birthday" json:"birthday"`
	LoginTime     *time.Time `gorm:"column:login_time" json:"login_time"`
	CreateTime    time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime    time.Time  `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
	DeleteTime    *time.Time `gorm:"column:delete_time;index" json:"-"`
}

func (User) TableName() string {
	return "sys_user"
}
