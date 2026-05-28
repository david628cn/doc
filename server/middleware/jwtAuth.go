package middleware

import (
	"app/playload"
	"app/services"
	"app/utils"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

//var re = regexp.MustCompile(`^\/api`)

func JwtAuth(userSrv *services.UserService) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		token := ctx.GetHeader("Authorization")
		if token == "" {
			token = ctx.Query("token")
		}
		if token == "" {
			playload.SendUnauthorized(ctx, "未提供认证令牌")
			return
		}

		token = strings.Replace(token, "Bearer ", "", 1)
		claims, err := utils.ParseToken(token)
		if err != nil {
			playload.SendUnauthorized(ctx, "令牌认证失败")
			return
		}

		// 1. 校驗過期時間
		if !claims.VerifyExpiresAt(time.Now().Unix(), false) {
			playload.SendUnauthorized(ctx, "令牌已过期")
			return
		}

		// 2. 解析用戶 ID
		idStr, ok := claims["id"].(string)
		if !ok {
			playload.SendUnauthorized(ctx, "令牌内容无效")
			return
		}

		id, err := uuid.Parse(idStr)
		if err != nil {
			playload.SendUnauthorized(ctx, "无效用户标识")
			return
		}

		// 3. 獲取用戶詳情並校驗狀態
		user, err := userSrv.FindByID(ctx, id)

		// 這裡移除對 user.Password != claims["password"] 的判斷
		// 改為校驗用戶的基本狀態，確保賬號依然有效
		if err != nil || user == nil {
			playload.SendUnauthorized(ctx, "用户不存在")
			return
		}

		// 3.1 校驗密碼版本號 (核心安全增強)
		// GenerateToken 將 pwd_version 寫入為字符串，JWT 解析後多為 string，需兼容各 JSON 數字類型
		tokenPv := claimInt(claims["pwd_version"])

		if user.PwdVersion != tokenPv {
			playload.SendUnauthorized(ctx, "凭证已失效，请重新登录")
			ctx.Abort() // 记得 Abort
			return
		}

		if user.Status != 1 { // 假設 1 為正常狀態
			playload.SendUnauthorized(ctx, "用户已被禁用")
			return
		}

		if user.DeleteTime != nil { // 確保未被軟刪除
			playload.SendUnauthorized(ctx, "用户已注销")
			return
		}

		// 4. 存入上下文供後續使用
		utils.SetCurrentUser(user, ctx)

		ctx.Next()
	}
}

// claimInt 從 JWT claim 解析整數（簽發時可能為 string / float64 / int 等）
func claimInt(v interface{}) int {
	switch x := v.(type) {
	case int:
		return x
	case int64:
		return int(x)
	case float64:
		return int(x)
	case string:
		if n, err := strconv.Atoi(x); err == nil {
			return n
		}
	case json.Number:
		if n, err := x.Int64(); err == nil {
			return int(n)
		}
	}
	return 0
}
