package controller

import (
	"app/common"
	"app/model"
	"app/playload"
	"app/services"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type AdminCtrl struct{}

func (c *AdminCtrl) Login(context *gin.Context) {
	var params playload.LoginRequest
	err := context.BindJSON(&params)
	if err != nil || params.Username == "" || params.Password == "" {
		context.JSON(http.StatusOK, playload.ResponseError("用户名或密码错误", nil))
		// c.Error(errors.New("用户名或密码错误"))
		return
	}
	srv := services.UsersService{}
	result, err := srv.FindByName(params.Username)
	if err != nil || len(result) == 0 || result[0].Password != params.Password {
		context.JSON(http.StatusOK, playload.ResponseError("用户名或密码错误", nil))
		// c.Error(errors.New("用户名或密码错误"))
		return
	}
	token, _ := common.GenerateToken(map[string]string{
		"id":       strconv.FormatInt(result[0].ID, 10),
		"username": result[0].Username,
		"password": result[0].Password,
	})
	result[0].LoginTime = time.Now()
	srv.Update(result[0])
	context.JSON(http.StatusOK, playload.ResponseSuccess("登录成功", playload.TokenData{Token: token, TokenType: "Bearer", User: result[0]}))
}

func (c *AdminCtrl) Register(context *gin.Context) {
	var params playload.RegisterRequest
	err := context.BindJSON(&params)
	if err != nil || params.Username == "" || params.Password == "" {
		context.JSON(http.StatusOK, playload.ResponseError("请输入用户名或密码", nil))
		return
	}
	if params.Password != params.RePassword {
		context.JSON(http.StatusOK, playload.ResponseError("密码不一致", nil))
		return
	}
	srv := services.UsersService{}
	result, err := srv.FindByName(params.Username)
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	if len(result) > 0 {
		context.JSON(http.StatusOK, playload.ResponseError("用户名已存在", nil))
		return
	}
	m := model.Users{
		Username:   params.Username,
		Email:      params.Email,
		Password:   params.Password,
		CreateDate: time.Now(),
		UpdateDate: time.Now(),
	}
	if is := srv.Add(m); is == false {
		context.JSON(http.StatusOK, playload.ResponseError("注册失败", nil))
		return
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("注册成功", true))
}

func (c *AdminCtrl) CheckUsername(context *gin.Context) {
	var params playload.CheckUsernameRequest
	if err := context.BindQuery(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	srv := services.UsersService{}
	result, err := srv.FindByName(params.Username)
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	if len(result) > 0 {
		context.JSON(http.StatusOK, playload.ResponseSuccess("用户存在", true))
	} else {
		context.JSON(http.StatusOK, playload.ResponseSuccess("用户不存在", false))
	}
}

func (c *AdminCtrl) LoginOut(context *gin.Context) {
	context.JSON(http.StatusOK, playload.ResponseError("退出", nil))
}
func (c *AdminCtrl) Token(context *gin.Context) {
	token, _ := common.GenerateToken(map[string]string{
		"id":       strconv.Itoa(1),
		"username": "admin",
		"password": "admin",
	})
	claims, _ := common.ParseToken(token)
	fmt.Println(claims.VerifyExpiresAt(time.Now().Unix(), false), claims)
	//time.Sleep(5 * time.Second)
	//fmt.Println(claims.VerifyExpiresAt(time.Now().Unix(), false))
	context.JSON(http.StatusOK, playload.ResponseSuccess("请求成功", token))
}
