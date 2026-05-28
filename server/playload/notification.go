package playload

import (
	"time"

	"github.com/google/uuid"
)

type NotificationListDTO struct {
	ID         uuid.UUID `json:"id"` // 這是 NotificationID
	ReceiverID uuid.UUID `json:"receiver_id"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	MsgType    string    `json:"msg_type"` // invite, system...

	// --- 新增字段 ---
	RelatedID    *uuid.UUID `json:"related_id"`    // 核心：存放 sys_workspace_invite 的 ID
	InviteStatus int        `json:"invite_status"` // 0:待处理, 1:已接受, 2:已拒绝, 3:已过期
	ExpireTime   *time.Time `json:"expire_time"`   // 邀请的截止时间
	// ----------------

	LinkURL      string    `json:"link_url"`
	IsRead       bool      `json:"is_read"`
	CreateTime   time.Time `json:"create_time"`
	SenderName   string    `json:"sender_name"`
	SenderAvatar string    `json:"sender_avatar"`

	// 仅 join_request 类通知有值：对应 sys_join_request.status（接收列表、已发送列表均可能返回）
	JoinRequestStatus *int `json:"join_request_status,omitempty" gorm:"column:join_request_status"`

	// 仅 friend_request：对应 sys_friend.status（0 待处理 1 已通过 2 已拒绝 3 已撤回；删行后为 NULL）
	FriendRequestStatus *int `json:"friend_request_status,omitempty" gorm:"column:friend_request_status"`
}
