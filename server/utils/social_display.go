package utils

import (
	"strings"
)

// SocialDisplayLabel 有备注/别名时：备注（用户名）；否则仅用户名
func SocialDisplayLabel(remarkOrAlias, username string) string {
	r := strings.TrimSpace(remarkOrAlias)
	u := strings.TrimSpace(username)
	if u == "" {
		u = "用户"
	}
	if r == "" {
		return u
	}
	return r + "（" + u + "）"
}
