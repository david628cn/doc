package playload

type RegisterRequest struct {
	Username      string `form:"username" json:"username" binding:"required"`
	Email         string `form:"email" json:"email" binding:"omitempty,min=1"`
	Mobile        string `form:"mobile" json:"mobile" binding:"omitempty,min=1"`
	HeadSculpture string `form:"headSculpture" json:"headSculpture" binding:"omitempty,min=1"`
	Password      string `form:"password" json:"password" binding:"required"`
	RePassword    string `form:"rePassword" json:"rePassword" binding:"required"`
}

type CheckUsernameRequest struct {
	Username string `form:"username" json:"username" binding:"required"`
}
