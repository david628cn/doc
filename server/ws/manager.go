package ws

import (
	"app/logger"
	"app/model"
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// 定义一个接口，描述 Manager 需要 Service 做的事情
// 这样 ws 包就不需要 import "app/services" 了
type ChatServiceHandler interface {
	SaveChatMessage(msg *model.ChatMessage) error
	DeliverChatFanout(roomID string, msg *model.ChatMessage, senderID uuid.UUID)
}

// 新增：NotificationHandler 處理消息狀態（送達、已讀）
type NotificationHandler interface {
	MarkAsRead(msgID string, userID string) error
	MarkAsDelivered(msgID string, userID string) error
}

type Manager struct {
	Upgrader  websocket.Upgrader
	Hub       *Hub
	Worker    *MessageWorker      // 注入 Worker
	ChatSrv   ChatServiceHandler  // 使用接口代替具体的 *services.ChatService
	NotifySrv NotificationHandler // 注入通知處理接口

	instanceID  string
	redisFanout *redis.Client
	wsPubSubCh  string
}

func NewManager(rb int, wb int, chatSrv ChatServiceHandler, notifySrv NotificationHandler) *Manager {
	worker := NewMessageWorker(chatSrv)
	worker.Start() // 啟動工作池
	return &Manager{
		instanceID: uuid.New().String(),
		Upgrader: websocket.Upgrader{
			ReadBufferSize:  rb,
			WriteBufferSize: wb,
			CheckOrigin:     func(r *http.Request) bool { return true },
		},
		Hub:       &Hub{Rooms: sync.Map{}},
		Worker:    worker,
		ChatSrv:   chatSrv,
		NotifySrv: notifySrv,
	}
}

// ConfigureRedisFanout 多 Gin 副本时启用：Emit 会 Publish 并由各副本 Subscribe 后 emitLocal（本实例发的消息带回 sender_id 跳过，避免重复）。
func (m *Manager) ConfigureRedisFanout(rdb *redis.Client, channel string) {
	m.redisFanout = rdb
	m.wsPubSubCh = channel
}

func (m *Manager) StartRedisSubscriber(ctx context.Context) error {
	if m.redisFanout == nil || m.wsPubSubCh == "" {
		return nil
	}
	pubsub := m.redisFanout.Subscribe(ctx, m.wsPubSubCh)
	go func() {
		defer pubsub.Close()
		ch := pubsub.Channel()
		logger.Info("Redis Pub/Sub 订阅已启动",
			zap.String("channel", m.wsPubSubCh),
			zap.String("instance_id", m.instanceID))
		for {
			select {
			case <-ctx.Done():
				logger.Info("Redis Pub/Sub 订阅结束（上下文取消）",
					zap.String("channel", m.wsPubSubCh))
				return
			case msg, ok := <-ch:
				if !ok {
					logger.Warn("Redis Pub/Sub channel 已关闭",
						zap.String("channel", m.wsPubSubCh))
					return
				}
				if msg == nil {
					continue
				}
				var env struct {
					SenderID string          `json:"sender_id"`
					RoomID   string          `json:"room_id"`
					MsgType  string          `json:"msg_type"`
					Payload  json.RawMessage `json:"payload"`
				}
				if err := json.Unmarshal([]byte(msg.Payload), &env); err != nil {
					logger.Warn("Redis Pub/Sub 消息 JSON 解析失败",
						zap.String("channel", m.wsPubSubCh),
						zap.Int("payload_len", len(msg.Payload)),
						zap.Error(err))
					continue
				}
				if env.SenderID == m.instanceID {
					continue
				}
				m.emitLocalJSON(env.RoomID, env.MsgType, env.Payload)
			}
		}
	}()
	return nil
}

// Emit 向 Hub 中 key 为 roomID 的房间广播（客户端 Send）。
// 聊天场景下 DeliverChatFanout 传入的 roomID 实为接收方用户 ID（个人通知 channel），
// 切勿与聊天会话 ID（grp:/priv:…）混淆。
func (m *Manager) Emit(roomID string, msgType string, payload interface{}) {
	payloadData, _ := json.Marshal(payload)
	if m.redisFanout != nil && m.wsPubSubCh != "" {
		env := struct {
			SenderID string          `json:"sender_id"`
			RoomID   string          `json:"room_id"`
			MsgType  string          `json:"msg_type"`
			Payload  json.RawMessage `json:"payload"`
		}{SenderID: m.instanceID, RoomID: roomID, MsgType: msgType, Payload: payloadData}
		b, err := json.Marshal(env)
		if err != nil {
			logger.Warn("Redis Publish 序列化失败",
				zap.String("channel", m.wsPubSubCh),
				zap.String("room_id", roomID),
				zap.Error(err))
		} else if err := m.redisFanout.Publish(context.Background(), m.wsPubSubCh, b).Err(); err != nil {
			logger.Warn("Redis Publish 失败",
				zap.String("channel", m.wsPubSubCh),
				zap.String("room_id", roomID),
				zap.String("msg_type", msgType),
				zap.Error(err))
		}
	}
	m.emitLocalJSON(roomID, msgType, payloadData)
}

func (m *Manager) emitLocalJSON(roomID string, msgType string, payloadJSON []byte) {
	wsMsg := WSMessage{
		Type:    msgType,
		RoomID:  roomID,
		Payload: payloadJSON,
	}
	finalBytes, _ := json.Marshal(wsMsg)
	room := m.Hub.GetRoom(roomID)
	room.Broadcast <- Message{
		From: nil,
		Data: finalBytes,
	}
}

func (m *Manager) PushToQueue(msg *model.ChatMessage) {
	if m.Worker != nil {
		m.Worker.Queue <- msg
	}
}
