package utils

import (
	"app/model"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetCurrentUser(ctx *gin.Context) *model.User {
	user, exists := ctx.Get("currentUser")
	if exists {
		currentUser := user.(*model.User)
		return currentUser
	}
	return nil
}

func SetCurrentUser(user *model.User, ctx *gin.Context) {
	ctx.Set("currentUser", user)
}

func GetCurrentUserID(ctx *gin.Context) uuid.UUID {
	user := GetCurrentUser(ctx) // 你現有的獲取 User 方法
	if user != nil {
		return user.ID
	}
	return uuid.Nil
}

func SetWorkspaceID(workspaceID uuid.UUID, ctx *gin.Context) {
	ctx.Set("workspace_id", workspaceID)
}

func SetWorkspaceRole(role string, ctx *gin.Context) {
	ctx.Set("workspace_role", role) // 如 'owner', 'admin', 'member'
}

func GetWorkspaceID(ctx *gin.Context) uuid.UUID {
	val, exists := ctx.Get("workspace_id")
	if exists {
		if id, ok := val.(uuid.UUID); ok {
			return id
		}
	}
	return uuid.Nil
}

// GetWorkspaceRole 獲取當前用戶在該空間的角色
func GetWorkspaceRole(ctx *gin.Context) string {
	val, exists := ctx.Get("workspace_role")
	if exists {
		return val.(string)
	}
	return ""
}
