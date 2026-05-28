package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ExpandYdocHTTPResponse collab-server expand-ydoc 返回
type ExpandYdocHTTPResponse struct {
	Doc         json.RawMessage `json:"doc"`
	ContentText string          `json:"content_text"`
}

// CallCollabExpandYdoc 请求 Node collab-server 将 ydoc 字节反解为 PM JSON + 纯文本（webhook 路径无附带 content 时使用）。
func CallCollabExpandYdoc(ctx context.Context, baseURL, secret string, ydocBytes []byte) (*ExpandYdocHTTPResponse, error) {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" || len(ydocBytes) == 0 {
		return nil, fmt.Errorf("expand ydoc: empty url or ydoc")
	}
	url := strings.TrimRight(baseURL, "/") + "/internal/collab/expand-ydoc"
	payload, err := json.Marshal(map[string]string{
		"ydoc_base64": base64.StdEncoding.EncodeToString(ydocBytes),
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Collab-Internal-Secret", strings.TrimSpace(secret))

	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("expand ydoc: HTTP %d: %s", resp.StatusCode, string(body))
	}
	var out ExpandYdocHTTPResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
