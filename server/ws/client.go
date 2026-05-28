package ws

import (
	"app/logger"
	"app/model"
	"app/services"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// decodeChatEnvelope 解析 WS payload：JSON 对象（含 msg_type）存库为 JSON 字符串；兼容旧版纯文本字符串。
func decodeChatEnvelope(raw json.RawMessage) (msgType string, content string) {
	if len(raw) == 0 {
		return model.ChatMsgTypeText, ""
	}
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err == nil && len(obj) > 0 {
		if mt, ok := obj["msg_type"].(string); ok && mt != "" {
			b, err := json.Marshal(obj)
			if err != nil {
				return mt, strings.TrimSpace(string(raw))
			}
			return mt, string(b)
		}
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return model.ChatMsgTypeText, s
	}
	return model.ChatMsgTypeText, strings.TrimSpace(string(raw))
}

// 假设你在 services 里定义了 PushToQueue 接口方法
type ChatServiceExtension interface {
	PushToQueue(msg *model.ChatMessage)
}

type Client struct {
	Conn   *websocket.Conn
	UserID string
	RoomID string
	Send   chan []byte
}

func (c *Client) ReadPump(wsm *Manager) {
	defer func() {
		wsm.Hub.GetRoom(c.RoomID).Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, rawData, err := c.Conn.ReadMessage()
		if err != nil {
			return
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(rawData, &wsMsg); err != nil {
			continue
		}

		switch wsMsg.Type {
		case TypeChat:
			// 不在 Hub 上按聊天 room_id（grp:/priv:…）做 Broadcast：客户端只注册在「本人 userId」
			// 这一个 Hub room（见 HandleConnect），会话 room 内本无 subscriber，Broadcast 无效。
			// 实时下发依赖 ChatService.DeliverChatFanout → Manager.Emit(对方用户ID, …)。

			// 安全调用入库（平台私聊不带 workspace_id）
			mt, body := decodeChatEnvelope(wsMsg.Payload)
			chatMsg := &model.ChatMessage{
				ID:         uuid.New(),
				RoomID:     wsMsg.RoomID,
				SenderID:   uuid.MustParse(c.UserID),
				Content:    body,
				MsgType:    mt,
				CreateTime: time.Now(),
			}
			if services.IsPlatformChatRoom(wsMsg.RoomID) {
				chatMsg.WorkspaceID = nil
			} else if wsMsg.WorkspaceID != "" {
				if parsedID, err := uuid.Parse(wsMsg.WorkspaceID); err != nil {
					logger.Warn("无效的 WorkspaceID 格式: " + wsMsg.WorkspaceID)
				} else {
					chatMsg.WorkspaceID = &parsedID
				}
			}

			// 先投递到对方用户的 WS「通知房」（房间模型见 DeliverChatFanout），再异步入库
			if wsm.ChatSrv != nil {
				wsm.ChatSrv.DeliverChatFanout(wsMsg.RoomID, chatMsg, uuid.MustParse(c.UserID))
			}
			wsm.PushToQueue(chatMsg)

		case TypePing:
			c.Send <- []byte(`{"type":"pong"}`)
		case TypeAck:
			var ack struct {
				MsgID  string `json:"msg_id"`
				Status string `json:"status"` // "read" 或 "delivered"
			}
			// 這裡建議檢查 Unmarshal 的錯誤
			if err := json.Unmarshal(wsMsg.Payload, &ack); err != nil {
				logger.Error("解析回执失败: " + err.Error())
				continue
			}

			// 1. 直接開啟異步協程處理數據庫更新
			// 由於 Service 內部直接使用 s.Dao.DB，它會使用全局連接池的默認超時控制
			if ack.Status == "read" {
				go func() {
					if err := wsm.NotifySrv.MarkAsRead(ack.MsgID, c.UserID); err != nil {
						logger.Error("标记已读失败: " + err.Error())
					}
				}()
			} else if ack.Status == "delivered" {
				go func() {
					if err := wsm.NotifySrv.MarkAsDelivered(ack.MsgID, c.UserID); err != nil {
						logger.Error("标记送达失败: " + err.Error())
					}
				}()
			}
		}
	}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			// 使用 TextMessage 兼容前端 JSON 解析
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		}
	}
}
