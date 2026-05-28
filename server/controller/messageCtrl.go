package controller

import (
	"app/utils"
	"app/ws"

	"github.com/gin-gonic/gin"
)

type MessageCtrl struct {
	WSM *ws.Manager
}

func NewMessageCtrl(wsm *ws.Manager) *MessageCtrl {
	return &MessageCtrl{WSM: wsm}
}

// 在 MessageCtrl.HandleConnect 末尾
func (ctrl *MessageCtrl) HandleConnect(ctx *gin.Context) {
	// 1. 从 JwtAuth 中间件拿到当前用户
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		return
	}

	// 2. 升级为 WebSocket
	conn, err := ctrl.WSM.Upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		return
	}

	// 3. 创建客户端并默认加入“个人通知房”
	// 这样任何地方调用 wsm.Emit(user.ID, ...) 都能推送到这个连接
	client := &ws.Client{
		Conn:   conn,
		UserID: user.ID.String(),
		RoomID: user.ID.String(),
		Send:   make(chan []byte, 256),
	}

	// 4. 注册到 Hub
	ctrl.WSM.Hub.GetRoom(client.RoomID).Register <- client

	// 5. 启动读写循环
	go client.WritePump()
	go client.ReadPump(ctrl.WSM)

	// 增加一步：异步推送未读历史
	//go func() {
	//	var unreads []models.SysNotification
	//	// 伪代码：查询该用户所有未读消息
	//	db.Table("sys_notification").
	//		Joins("JOIN sys_notification_receiver ON ...").
	//		Where("receiver_id = ? AND is_read = false", user.ID).
	//		Find(&unreads)
	//
	//	for _, n := range unreads {
	//		ctrl.WSM.Emit(user.ID.String(), "notification", n)
	//	}
	//}()
}
