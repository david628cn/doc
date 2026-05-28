package controller

import (
	"app/playload"
	"app/services"
	"app/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NotificationCtrl struct {
	NotificationSrv *services.NotificationService
}

func NewNotificationCtrl(notificationSrv *services.NotificationService) *NotificationCtrl {
	return &NotificationCtrl{
		NotificationSrv: notificationSrv,
	}
}

func (c *NotificationCtrl) List(ctx *gin.Context) {
	var params playload.PaginationReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}
	offsetLimit := playload.OffsetLimitData(params.PageNum, params.PageSize)
	user := utils.GetCurrentUser(ctx)
	list, total, err := c.NotificationSrv.GetUserNotifications(ctx, user.ID, offsetLimit.Offset, offsetLimit.Limit)
	if err != nil {
		playload.SendError(ctx, "獲取通知失敗")
		return
	}
	// 這裡你可以使用你自定義的分頁封裝，或者直接返回
	playload.SendSuccess(ctx, playload.PaginationData{
		Total: total,
		List:  list,
	})
}

// ListSent GET /api/notification/sent 我发出的通知（含加入申请等）
func (c *NotificationCtrl) ListSent(ctx *gin.Context) {
	var params playload.PaginationReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, "参数错误: "+err.Error())
		return
	}
	offsetLimit := playload.OffsetLimitData(params.PageNum, params.PageSize)
	user := utils.GetCurrentUser(ctx)
	list, total, err := c.NotificationSrv.GetSentNotifications(ctx, user.ID, offsetLimit.Offset, offsetLimit.Limit)
	if err != nil {
		playload.SendError(ctx, "获取已发送消息失败")
		return
	}
	playload.SendSuccess(ctx, playload.PaginationData{
		Total: total,
		List:  list,
	})
}

func (c *NotificationCtrl) UnreadCount(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	n, err := c.NotificationSrv.GetUnreadCount(ctx, user.ID)
	if err != nil {
		playload.SendError(ctx, "获取未读数量失败")
		return
	}
	playload.SendSuccess(ctx, gin.H{"unread_count": n})
}

type markNotificationReadBody struct {
	ID string `json:"id"`
}

func (c *NotificationCtrl) MarkRead(ctx *gin.Context) {
	var body markNotificationReadBody
	if err := ctx.ShouldBindJSON(&body); err != nil || body.ID == "" {
		playload.SendError(ctx, "参数错误")
		return
	}
	if _, err := uuid.Parse(body.ID); err != nil {
		playload.SendError(ctx, "无效的通知 ID")
		return
	}
	user := utils.GetCurrentUser(ctx)
	if err := c.NotificationSrv.MarkAsRead(body.ID, user.ID.String()); err != nil {
		playload.SendError(ctx, "标记已读失败")
		return
	}
	playload.SendSuccess(ctx, nil)
}

func (c *NotificationCtrl) ReadAll(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if err := c.NotificationSrv.MarkAllAsRead(ctx, user.ID); err != nil {
		playload.SendError(ctx, "一键已读失败")
		return
	}
	playload.SendSuccess(ctx, nil)
}
