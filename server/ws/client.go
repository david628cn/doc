package ws

import (
	"app/logger"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn   *websocket.Conn
	UserID string
	RoomID string
	Send   chan []byte
}

func (c *Client) ReadPump(wsm *Manager) {
	defer func() {
		logger.Info(c.UserID + "conn Close In ReadPump")
		wsm.Hub.GetRoom(c.RoomID).Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			logger.Warn("ReadPump.CloseMessage: " + string(message))
			return
		}
		logger.Info("ReadPump: " + string(message))
		wsm.Hub.GetRoom(c.RoomID).Broadcast <- message
	}
}

func (c *Client) WritePump() {
	defer func() {
		logger.Info(c.UserID + "conn Close In WritePump")
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				logger.Warn("WritePump.CloseMessage: " + string(message))
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			logger.Info("WritePump: " + string(message))
			if err := c.Conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
				return
			}
		}
	}
}
