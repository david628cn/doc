package ws

import (
	"encoding/json"
)

const (
	TypeChat         = "chat"
	TypeNotification = "notification"
	TypePing         = "ping"
)

// WSMessage 前端通讯协议
type WSMessage struct {
	Type        string          `json:"type"`
	RoomID      string          `json:"room_id"`
	WorkspaceID string          `json:"workspace_id"`
	Payload     json.RawMessage `json:"payload"`
	Sender      string          `json:"sender,omitempty"`
}

// Message 内部传输包装
type Message struct {
	From *Client // 来源客户端，系统发送则为 nil
	Data []byte  // 序列化后的 WSMessage 字节流
}

const TypeAck = "msg_ack"

type WSAckPayload struct {
	MsgID  string `json:"msg_id"`
	Status string `json:"status"` // "delivered" (送达) 或 "read" (已读)
}
