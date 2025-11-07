package middleware

import (
	"app/common"
	"app/playload"
	"app/services"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var re = regexp.MustCompile(`^\/api`)

func JwtAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if re.MatchString(c.Request.RequestURI) {
			token := c.GetHeader("Authorization")
			token = strings.Replace(token, "Bearer ", "", 1)
			claims, err := common.ParseToken(token)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, playload.ResponseUnauthorized("令牌认证失败", nil))
				return
			}
			if claims.VerifyExpiresAt(time.Now().Unix(), false) == false {
				c.AbortWithStatusJSON(http.StatusUnauthorized, playload.ResponseUnauthorized("令牌无效", nil))
				return
			}
			idStr := claims["id"]
			v, ok := idStr.(string)
			if ok == false { // 或者检查其他可能的类型
				c.AbortWithStatusJSON(http.StatusUnauthorized, playload.ResponseUnauthorized("令牌认证失败，用户不存在", nil))
				return
			}
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil { // 或者检查其他可能的类型
				c.AbortWithStatusJSON(http.StatusUnauthorized, playload.ResponseUnauthorized("令牌认证失败，用户不存在", nil))
				return
			}
			srv := services.UsersService{}
			user, err := srv.FindById(id)
			if err != nil || user.Password != claims["password"] {
				c.AbortWithStatusJSON(http.StatusUnauthorized, playload.ResponseUnauthorized("令牌认证失败，用户不存在", nil))
				return
			}
			//c.Set("currentUser", user)
			common.SetCurrentUser(user, c)
		}
		c.Next()
	}
}
