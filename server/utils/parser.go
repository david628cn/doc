package utils

// app/utils/parser.go
import (
	"encoding/json"
	"strings"
)

// ExtractFilePaths 從編輯器 JSON 內容中提取所有文件路徑
// 假設內容中圖片節點格式為 {"type": "image", "attrs": {"src": "/uploads/xxx.png"}}
func ExtractFilePaths(content []byte) map[string]bool {
	paths := make(map[string]bool)
	if len(content) == 0 {
		return paths
	}

	var data interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return paths
	}

	// 開始遞歸遍歷
	findUploadPaths(data, paths)
	return paths
}

// 遞歸輔助函數
func findUploadPaths(data interface{}, paths map[string]bool) {
	switch v := data.(type) {
	case string:
		// 檢查字串是否包含你的上傳目錄前綴
		if strings.HasPrefix(v, "/uploads/") {
			paths[v] = true
		}
	case map[string]interface{}:
		// 遍歷 Map
		for _, value := range v {
			findUploadPaths(value, paths)
		}
	case []interface{}:
		// 遍歷 Array
		for _, value := range v {
			findUploadPaths(value, paths)
		}
	}
}
