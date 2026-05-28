package utils

import (
	"app/config"
	"crypto/rand"
	"encoding/hex"
	"math/big"
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
	// claims["password"] = data["password"]
	claims["pwd_version"] = data["pwd_version"]
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

// GenerateRandomString 用于生成邀请码等随机字符串
func GenerateRandomString(n int) string {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		// 使用 crypto/rand 保证安全性
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return ""
		}
		ret[i] = letters[num.Int64()]
	}
	return string(ret)
}

// GenerateHexID 生成一个随机的十六进制字符串（如 32 位）
func GenerateHexID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}
