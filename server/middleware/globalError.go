package middleware

import (
	"app/playload"

	"github.com/gin-gonic/gin"
)

func GlobalError() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Next()

		// 避免“已写响应后再次写入”的双响应问题
		if ctx.Writer.Written() || ctx.IsAborted() {
			return
		}

		if len(ctx.Errors) > 0 {
			err := ctx.Errors.Last()
			playload.SendInternalError(ctx, err.Error())
		}
	}
	//return func(ctx *gin.Context) {
	//	ctx.Next()
	//	if len(c.Errors) > 0 {
	//		err := ctx.Errors.Last()
	//		// ctx.JSON(http.StatusInternalServerError, common.ResponseError(err.Error(), nil))
	//      playload.SendInternalError(ctx, err.Error())
	//		return
	//	}
	//}
}
