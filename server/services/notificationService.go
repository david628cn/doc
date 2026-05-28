package services

import (
	"app/model"
	"app/playload"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationService struct {
	BaseService[model.NotificationReceiver]
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		BaseService: *NewBaseService[model.NotificationReceiver](db),
	}
}

func buildInviteStatusCaseSQL() string {
	return fmt.Sprintf(`
		CASE 
			WHEN n.msg_type NOT IN ('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s') THEN %d 
			WHEN i.status != %d THEN i.status 
			WHEN i.expire_time < NOW() THEN %d 
			ELSE %d 
		END as invite_status`,
		model.MsgTypeInvite,
		model.MsgTypeSpaceInvite,
		model.MsgTypeJoinRequest,
		model.MsgTypeJoinRequestResult,
		model.MsgTypeInviteResponse,
		model.MsgTypeFriendRequest,
		model.MsgTypeFriendRequestResult,
		model.MsgTypeNewFollow,
		model.InviteStatusPending,
		model.InviteStatusPending,
		model.InviteStatusExpired,
		model.InviteStatusPending,
	)
}

func joinRequestStatusScalarSQL() string {
	return "(SELECT jr.status FROM sys_join_request jr WHERE jr.delete_time IS NULL AND jr.id = n.related_id AND n.msg_type = '" + model.MsgTypeJoinRequest + "')"
}

func friendRequestStatusScalarSQL() string {
	return "(SELECT f.status FROM sys_friend f WHERE f.delete_time IS NULL AND f.id = n.related_id AND n.msg_type = '" + model.MsgTypeFriendRequest + "')"
}

// MarkAsRead 標記為已讀
func (s *NotificationService) MarkAsRead(msgID string, userID string) error {
	return s.Dao.DB.Model(&model.NotificationReceiver{}).
		Where("notification_id = ? AND receiver_id = ?", msgID, userID).
		Updates(map[string]interface{}{
			"is_read":   true,
			"read_time": time.Now(),
		}).Error
}

// MarkAsDelivered 標記為已送達 (必須實現，否則會報錯)
func (s *NotificationService) MarkAsDelivered(msgID string, userID string) error {
	return s.Dao.DB.Model(&model.NotificationReceiver{}).
		Where("notification_id = ? AND receiver_id = ?", msgID, userID).
		Updates(map[string]interface{}{
			"is_delivered":   true,
			"delivered_time": time.Now(),
		}).Error
}

// MarkAllAsRead 将当前用户所有未读通知标为已读
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	var nids []uuid.UUID
	err := s.Dao.DB.WithContext(ctx).Table("sys_notification_receiver nr").
		Joins("JOIN sys_notification n ON nr.notification_id = n.id AND n.delete_time IS NULL").
		Where("nr.receiver_id = ? AND nr.delete_time IS NULL AND nr.is_read = ?", userID, false).
		Pluck("nr.notification_id", &nids).Error
	if err != nil {
		return err
	}
	if len(nids) == 0 {
		return nil
	}
	now := time.Now()
	return s.Dao.DB.WithContext(ctx).Model(&model.NotificationReceiver{}).
		Where("receiver_id = ? AND notification_id IN ?", userID, nids).
		Updates(map[string]interface{}{
			"is_read":   true,
			"read_time": now,
		}).Error
}

// GetUnreadCount 当前用户未读通知数量
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := s.Dao.DB.WithContext(ctx).Table("sys_notification_receiver nr").
		Joins("JOIN sys_notification n ON nr.notification_id = n.id AND n.delete_time IS NULL").
		Where("nr.receiver_id = ? AND nr.delete_time IS NULL AND nr.is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

func (s *NotificationService) GetUserNotifications(ctx context.Context, userID uuid.UUID, offset, limit int) ([]playload.NotificationListDTO, int64, error) {
	var list []playload.NotificationListDTO
	var total int64

	inviteStatusSql := buildInviteStatusCaseSQL()
	jrStatusSQL := joinRequestStatusScalarSQL()
	frStatusSQL := friendRequestStatusScalarSQL()

	// 2. 構建查詢 (Select 部分也加上 n.related_id 以便前端使用)
	query := s.Dao.DB.WithContext(ctx).Table("sys_notification_receiver nr").
		Select(
			"n.id, nr.id as receiver_id, n.title, n.content, n.msg_type, n.link_url, n.related_id, "+
				"nr.is_read, n.create_time, u.username as sender_name, u.head_sculpture as sender_avatar, "+
				"i.expire_time, "+inviteStatusSql+", "+jrStatusSQL+" as join_request_status, "+frStatusSQL+" as friend_request_status",
		).
		Joins("JOIN sys_notification n ON nr.notification_id = n.id").
		Joins("LEFT JOIN sys_user u ON n.sender_id = u.id").
		Joins("LEFT JOIN sys_invite i ON n.related_id = i.id").
		Where("nr.receiver_id = ? AND nr.delete_time IS NULL", userID)

	// 3. 統計總數
	query.Count(&total)

	// 4. 執行查詢並 Scan 到 DTO
	err := query.Order("n.create_time DESC").
		Limit(limit).Offset(offset).
		Scan(&list).Error

	return list, total, err
}

// GetSentNotifications 当前用户作为发送者的通知（邀请、加入申请等），形态与收件列表 DTO 一致便于前端复用
func (s *NotificationService) GetSentNotifications(ctx context.Context, userID uuid.UUID, offset, limit int) ([]playload.NotificationListDTO, int64, error) {
	var list []playload.NotificationListDTO
	var total int64

	inviteStatusSql := buildInviteStatusCaseSQL()
	jrStatusSQL := joinRequestStatusScalarSQL()
	frStatusSQL := friendRequestStatusScalarSQL()

	query := s.Dao.DB.WithContext(ctx).Table("sys_notification n").
		Select(
			"n.id, n.id as receiver_id, n.title, n.content, n.msg_type, n.link_url, n.related_id, "+
				"true as is_read, n.create_time, u.username as sender_name, u.head_sculpture as sender_avatar, "+
				"i.expire_time, "+inviteStatusSql+", "+jrStatusSQL+" as join_request_status, "+frStatusSQL+" as friend_request_status",
		).
		Joins("LEFT JOIN sys_user u ON n.sender_id = u.id").
		Joins("LEFT JOIN sys_invite i ON n.related_id = i.id").
		Where("n.sender_id = ? AND n.delete_time IS NULL", userID)

	query.Count(&total)

	err := query.Order("n.create_time DESC").
		Limit(limit).Offset(offset).
		Scan(&list).Error

	return list, total, err
}
