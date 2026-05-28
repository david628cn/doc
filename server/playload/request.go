package playload

import (
	"time"

	"github.com/google/uuid"
)

type ConditionReq struct {
	Filter   map[string]interface{} `json:"filter"`
	OrderBy  `json:"orderBy"`
	PageNum  int `json:"pageNum"`
	PageSize int `json:"pageSize"`
}

type DeleteReq struct {
	IDs []uuid.UUID `json:"ids"`
}

type LoginReq struct {
	Username string `form:"username" json:"username" binding:"required"`
	Password string `form:"password" json:"password" binding:"required"`
}

type RegisterReq struct {
	Username      string `form:"username" json:"username" binding:"required"`
	Email         string `form:"email" json:"email" binding:"omitempty,min=1"`
	Mobile        string `form:"mobile" json:"mobile" binding:"omitempty,min=1"`
	HeadSculpture string `form:"headSculpture" json:"headSculpture" binding:"omitempty,min=1"`
	Password      string `form:"password" json:"password" binding:"required"`
	RePassword    string `form:"rePassword" json:"rePassword" binding:"required"`
}

type CheckUsernameReq struct {
	Username string `form:"username" json:"username" binding:"required"`
}

type CheckEmailReq struct {
	Email string `form:"email" json:"email" binding:"required"`
}

type CheckMobileReq struct {
	Mobile string `form:"mobile" json:"mobile" binding:"required"`
}

type TradeReq struct {
	Code string    `json:"code"`
	Date time.Time `json:"date"`
}
