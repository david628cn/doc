package common

import (
	"app/config"
	"time"

	"github.com/dgrijalva/jwt-go"
)

func GenerateToken(data map[string]string) (string, error) {
	// 获取全局配置实例
	cfg := config.Get()
	currentTime := time.Now()
	// 将毫秒直接转换为纳秒（因为time.Duration是以纳秒为单位的）
	nanoseconds := int64(cfg.Jwt.AccessTokenExpireMinutes) * 1e6 // 1e6 是 1,000,000，即1,000,000毫秒 = 1,000,000,000纳秒
	// 创建time.Duration对象
	duration := time.Duration(nanoseconds)
	claims := jwt.MapClaims{}
	claims["id"] = data["id"]
	claims["name"] = data["username"]
	claims["password"] = data["password"]
	claims["iat"] = currentTime.Unix()
	claims["exp"] = currentTime.Add(duration).Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(cfg.Jwt.SecretKey))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func ParseToken(tokenString string) (jwt.MapClaims, error) {
	cfg := config.Get()
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.Jwt.SecretKey), nil
	})
	if err != nil {
		return jwt.MapClaims{}, err
	}
	claims, _ := token.Claims.(jwt.MapClaims)
	return claims, nil
}
