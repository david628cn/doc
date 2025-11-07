package common

import "time"

func IsValidDate(dateStr string) bool {
	layouts := []string{
		"2006-01-02",          // 标准日期格式
		"2006/01/02",          // 斜杠分隔格式
		"02-01-2006",          // 欧洲日期格式
		"2006年01月02日",         // 中文日期格式
		"2006-01-02 15:04:05", // 包含时间
	}

	for _, layout := range layouts {
		if _, err := time.Parse(layout, dateStr); err == nil {
			return true
		}
	}
	return false
}
