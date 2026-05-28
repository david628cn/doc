package model

import "time"

type Stock struct {
	ID         int64     `gorm:"column:id" json:"id"`
	Code       string    `gorm:"column:code" json:"code"`
	Name       string    `gorm:"column:name" json:"name"`
	Type       int       `gorm:"column:type" json:"type"`
	Date       time.Time `gorm:"type:date;column:date" json:"date"`
	Current    float64   `gorm:"column:current;type:double(10,2)" json:"current"`     //收盘
	Price      float64   `gorm:"column:price;type:double(10,2)" json:"price"`         //涨跌幅
	Amount     float64   `gorm:"column:amount;type:double(10,2)" json:"amount"`       //涨跌额
	Turnover   float64   `gorm:"column:turnover;type:double(10,2)" json:"turnover"`   //振幅
	Quantity   float64   `gorm:"column:quantity;type:double(10,2)" json:"quantity"`   //换手率
	Volume     float64   `gorm:"column:volume;type:double(30,2)" json:"volume"`       //成交额
	Amplitude  float64   `gorm:"column:amplitude;type:double(10,2)" json:"amplitude"` //振幅
	High       float64   `gorm:"column:high;type:double(10,2)" json:"high"`           //最高
	Low        float64   `gorm:"column:low;type:double(10,2)" json:"low"`             //最低
	Open       float64   `gorm:"column:open;type:double(10,2)" json:"open"`           //开盘
	Prev       float64   `gorm:"column:prev;type:double(10,2)" json:"prev"`           //昨收
	Trends     string    `gorm:"column:trends" json:"trends"`
	MainIn     float64   `gorm:"column:main_in;type:double(30,2)" json:"main_in"`
	MainOut    float64   `gorm:"column:main_out;type:double(30,2)" json:"main_out"`
	MainDelta  float64   `gorm:"column:main_delta;type:double(30,2)" json:"main_delta"`
	LargeIn    float64   `gorm:"column:large_in;type:double(30,2)" json:"large_in"`
	LargeOut   float64   `gorm:"column:large_out;type:double(30,2)" json:"large_out"`
	LargeDelta float64   `gorm:"column:large_delta;type:double(30,2)" json:"large_delta"`
	BigIn      float64   `gorm:"column:big_in;type:double(30,2)" json:"big_in"`
	BigOut     float64   `gorm:"column:big_out;type:double(30,2)" json:"big_out"`
	BigDelta   float64   `gorm:"column:big_delta;type:double(30,2)" json:"big_delta"`
	MidIn      float64   `gorm:"column:mid_in;type:double(30,2)" json:"mid_in"`
	MidOut     float64   `gorm:"column:mid_out;type:double(30,2)" json:"mid_out"`
	MidDelta   float64   `gorm:"column:mid_delta;type:double(30,2)" json:"mid_delta"`
	MinIn      float64   `gorm:"column:min_in;type:double(30,2)" json:"min_in"`
	MinOut     float64   `gorm:"column:min_out;type:double(30,2)" json:"min_out"`
	MinDelta   float64   `gorm:"column:min_delta;type:double(30,2)" json:"min_delta"`
	CreateTime time.Time `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time `gorm:"column:update_time;autoCreateTime;autoUpdateTime" json:"update_time"`
}

func (Stock) TableName() string {
	return "sys_stock"
}
