package middleware

import (
	"app/playload"
	"app/services"
	"app/utils"
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func WorkspacesAuth(workspaceUserSrv *services.WorkspaceUserService) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// 1. 获取工作区 ID
		workspaceIDStr := ctx.GetHeader("x-workspace-id")
		if workspaceIDStr == "" {
			workspaceIDStr = ctx.Query("workspace_id")
		}

		// 显式拦截空 ID，避免进入 uuid.Parse 产生解析错误
		if workspaceIDStr == "" {
			playload.SendError(ctx, "请选择一个工作区")
			ctx.Abort() // 建议显式调用 Abort 停止后续 Handler 执行
			return
		}

		workspaceID, err := uuid.Parse(workspaceIDStr)
		if err != nil {
			playload.SendError(ctx, "无效的工作区标识")
			ctx.Abort()
			return
		}

		// 2. 获取当前用户 (假设 JwtAuth 已在其之前运行)
		user := utils.GetCurrentUser(ctx)
		if user == nil {
			playload.SendUnauthorized(ctx, "身份验证失效")
			ctx.Abort()
			return
		}

		// 3. 校验权限
		wu, err := workspaceUserSrv.FindByUser(ctx, workspaceID, user.ID)
		if err != nil || wu == nil {
			playload.SendForbidden(ctx, "您不是该工作区的成员")
			ctx.Abort()
			return
		}

		// 4. 异步更新访问时间
		go workspaceUserSrv.UpdateLastAccess(context.Background(), user.ID, workspaceID)

		// 5. 存入上下文供 Controller 使用
		utils.SetWorkspaceID(workspaceID, ctx)
		utils.SetWorkspaceRole(wu.Role, ctx)

		ctx.Next()
	}
}
