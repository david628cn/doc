package common

import (
	"app/model"

	"github.com/gin-gonic/gin"
)

func GetCurrentUser(context *gin.Context) *model.Users {
	users, exists := context.Get("currentUser")
	if exists {
		currentUsers := users.(model.Users)
		return &currentUsers
	}
	return nil
}

func SetCurrentUser(user model.Users, context *gin.Context) {
	context.Set("currentUser", user)
}
