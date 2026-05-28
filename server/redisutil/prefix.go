package redisutil

import "strings"

// NormalizeKeyPrefix trims and appends ":" so application keys are namespaced (e.g. "gin" → "gin:").
// Empty input returns "".
func NormalizeKeyPrefix(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if !strings.HasSuffix(s, ":") {
		return s + ":"
	}
	return s
}
