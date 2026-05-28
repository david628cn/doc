package utils

import (
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func UUID() uuid.UUID {
	return uuid.Must(uuid.NewV7())
}

// HashPassword 將明文密碼轉為哈希值（用於註冊/修改密碼）
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash 校驗明文密碼與哈希值是否匹配（用於登錄）
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
