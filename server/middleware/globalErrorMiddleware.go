package middleware

import (
	"app/playload"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GlobalErrorMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if len(c.Errors) > 0 {
				err := c.Errors.Last()
				//fmt.Printf("xxxxxx %v\n", err.Error())
				c.AbortWithStatusJSON(http.StatusInternalServerError, playload.ResponseError(err.Error(), nil))
			}
		}()
		c.Next()
	}
	//return func(c *gin.Context) {
	//	c.Next()
	//	if len(c.Errors) > 0 {
	//		err := c.Errors.Last()
	//		c.JSON(http.StatusInternalServerError, common.ResponseError(err.Error(), nil))
	//		return
	//	}
	//}
}
