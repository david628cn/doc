package ws

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

//var upgrader = websocket.Upgrader{
//	CheckOrigin: func(r *http.Request) bool { return true },
//}
//
//var hub = &Hub{
//	rooms: make(map[string]*Room),
//}

type Manager struct {
	Upgrader websocket.Upgrader
	Hub      *Hub
}

//func (c *Manager) GetRoom(roomID string) *Room {
//	return c.Hub.GetRoom(roomID)
//}
//
//func (c *Manager) CreateClient(roomID string, conn *websocket.Conn) *Client {
//	return &Client{
//		Conn: conn,
//		Send: make(chan []byte, 256),
//		Room: roomID,
//	}
//}

func NewManager(rb int, wb int) *Manager {
	return &Manager{
		Upgrader: websocket.Upgrader{
			ReadBufferSize:  rb, //读取缓冲区大小
			WriteBufferSize: wb, //写入缓冲区大小
			CheckOrigin:     func(r *http.Request) bool { return true },
		},
		Hub: &Hub{
			Rooms: sync.Map{},
		},
	}
}
