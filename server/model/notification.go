package model

import (
	"time"

	"github.com/google/uuid"
)

// 消息类型常量
const (
	MsgTypeInvite      = "invite"       // 工作区邀请消息
	MsgTypeSpaceInvite = "space_invite" // 库邀请
	MsgTypeJoinRequest = "join_request" // 用户申请加入（发给管理员）
	// 须 ≤ DB sys_notification.msg_type（历史库常为 varchar(20)）；过长会导致写入失败
	MsgTypeJoinRequestResult   = "join_req_result" // 审批结果（发给申请人），原 join_request_result 超长
	MsgTypeInviteResponse      = "invite_response" // 被邀请人对邀请的同意/拒绝（通知邀请人）
	MsgTypeFriendRequest       = "friend_request"  // 好友申请（发给被申请人）
	MsgTypeFriendRequestResult = "fr_req_result"   // 好友申请处理结果；原 friend_request_result 超长
	MsgTypeNewFollow           = "new_follow"      // 有人关注你 / 互关提示（发给被关注方）
	MsgTypeMemberEvent         = "member_event"    // 成员变更类（预留）
	MsgTypeSystem              = "system"          // 系统消息
	MsgTypeChat                = "chat"            // 聊天消息
	MsgTypeGrpInvite           = "grp_invite"      // 群成员邀请你入群（≤20）
	MsgTypeGrpApply            = "grp_apply"       // 用户申请入群（通知群主）
	MsgTypeGrpInvResult        = "grp_inv_res"     // 邀请/申请处理结果（回执）
)

// 邀请状态常量
const (
	InviteStatusPending  = 0 // 待处理
	InviteStatusAccepted = 1 // 已接受
	InviteStatusRejected = 2 // 已拒绝
	InviteStatusExpired  = 3 // 已过期
)

// Notification 消息主体表
type Notification struct {
	ID          uuid.UUID  `gorm:"column:id;type:uuid;primaryKey" json:"id"`
	WorkspaceID *uuid.UUID `gorm:"column:workspace_id;index" json:"workspace_id"` // 用於數據隔離 所屬工作區 (全局消息可為 NULL)
	SenderID    *uuid.UUID `gorm:"column:sender_id;type:uuid" json:"sender_id"`   // 發送者 (系統消息可為 NULL)

	Title     string     `gorm:"column:title;not null" json:"title"`
	Content   string     `gorm:"type:text;column:content;not null" json:"content"`
	MsgType   string     `gorm:"column:msg_type;default:'system'" json:"msg_type"` // 'invite', 'system', 'mention'
	Priority  int        `gorm:"column:priority;msg_type;default:1" json:"priority"`
	LinkURL   string     `gorm:"column:link_url" json:"link_url"`
	RelatedID *uuid.UUID `gorm:"column:related_id;type:uuid" json:"related_id"` // 业务关联 ID

	CreateTime time.Time  `gorm:"column:create_time;autoCreateTime" json:"create_time"`
	UpdateTime time.Time  `gorm:"column:update_time;autoUpdateTime" json:"update_time"`
	DeleteTime *time.Time `gorm:"column:delete_time;index" json:"-"`
}

// TableName 指定表名
func (Notification) TableName() string {
	return "sys_notification"
}
