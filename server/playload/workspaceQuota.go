package playload

type WorkspaceQuotaQueryResp struct {
	WorkspaceID string  `json:"workspace_id"`
	TotalBytes  int64   `json:"total_bytes"`  // 总字节数 (如 5368709120)
	UsedBytes   int64   `json:"used_bytes"`   // 已用字节数 (如 12345678)
	UsedPercent float64 `json:"used_percent"` // 已用百分比 (如 22.8)
	TotalText   string  `json:"total_text"`   // 可读文本 (如 "5.00 GB")
	UsedText    string  `json:"used_text"`    // 可读文本 (如 "1.15 GB")
}
