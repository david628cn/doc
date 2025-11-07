package controller

import (
	"app/logger"
	"app/ws"

	"github.com/gin-gonic/gin"
)

var wsm = ws.NewManager(4096, 8192)

type DocCtrl struct{}

func (c *DocCtrl) HandleWebSocket(context *gin.Context) {
	roomID := context.Query("roomId")
	userID := context.Query("userId")

	conn, err := wsm.Upgrader.Upgrade(context.Writer, context.Request, nil)
	if err != nil {
		logger.Error(err.Error())
		return
	}

	room := wsm.Hub.GetRoom(roomID)

	client := &ws.Client{
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
		RoomID: roomID,
	}

	room.Register <- client
	//defer func() { room.Unregister <- client }()

	go client.WritePump()
	go client.ReadPump(wsm)
}
