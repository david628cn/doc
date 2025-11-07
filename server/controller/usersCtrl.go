package controller

import (
	"app/db"
	"app/model"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UsersCtrl struct{}

//func (p *UsersCtrl) List(c *gin.Context) {
//	c.JSON(http.StatusOK, gin.H{"message": "用户列表"})
//}

func (c *UsersCtrl) List(context *gin.Context) {
	var m []model.Users
	if result := db.DB.Find(&m); result.Error != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	context.JSON(http.StatusOK, m)
}

//func CreateUsers(context *gin.Context) {
//	var users model.Users
//	if err := context.ShouldBindJSON(&users); err != nil {
//		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
//		return
//	}
//
//	if result := db.DB.Create(&users); result.Error != nil {
//		context.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
//		return
//	}
//
//	context.JSON(http.StatusCreated, users)
//}
//
//func GetUsers(context *gin.Context) {
//	var users []model.Users
//	if result := db.DB.Find(&users); result.Error != nil {
//		context.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
//		return
//	}
//	context.JSON(http.StatusOK, users)
//}
