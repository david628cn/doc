package services

import (
	"app/model"
	"app/utils"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RelationService struct {
	DB  *gorm.DB
	WSM IWebSocketManager
}

func NewRelationService(db *gorm.DB, wsm IWebSocketManager) *RelationService {
	return &RelationService{DB: db, WSM: wsm}
}

func (s *RelationService) userDisplayName(tx *gorm.DB, userID uuid.UUID) string {
	var u model.User
	if err := tx.Where("id = ? AND delete_time IS NULL", userID).First(&u).Error; err != nil {
		return userID.String()
	}
	if n := strings.TrimSpace(u.RealName); n != "" {
		return n
	}
	if n := strings.TrimSpace(u.Username); n != "" {
		return n
	}
	return userID.String()
}

// insertFriendResultNotification 好友申请处理结果（通过 / 被拒绝 / 撤回）
func (s *RelationService) insertFriendResultNotification(tx *gorm.DB, receiverID, actorID, relatedFriendID uuid.UUID, accepted, withdraw bool) (uuid.UUID, string, string, error) {
	actorName := s.userDisplayName(tx, actorID)
	var title, content string
	switch {
	case withdraw:
		title = fmt.Sprintf("%s 撤回了好友申请", actorName)
		content = fmt.Sprintf("用户「%s」撤回了向你发起的好友申请。", actorName)
	case accepted:
		title = "好友申请已通过"
		content = fmt.Sprintf("用户「%s」已同意你的好友申请。", actorName)
	default:
		title = "好友申请未通过"
		content = fmt.Sprintf("用户「%s」未通过你的好友申请。", actorName)
	}
	actorPtr := actorID
	relPtr := relatedFriendID
	notif := model.Notification{
		ID:          utils.UUID(),
		WorkspaceID: nil,
		SenderID:    &actorPtr,
		Title:       title,
		Content:     content,
		MsgType:     model.MsgTypeFriendRequestResult,
		RelatedID:   &relPtr,
		LinkURL:     "/contacts",
	}
	if err := tx.Create(&notif).Error; err != nil {
		return uuid.Nil, "", "", err
	}
	nr := model.NotificationReceiver{
		ID:             utils.UUID(),
		NotificationID: notif.ID,
		ReceiverID:     receiverID,
		IsRead:         false,
		IsDelivered:    false,
	}
	if err := tx.Create(&nr).Error; err != nil {
		return uuid.Nil, "", "", err
	}
	return notif.ID, title, content, nil
}

// emitFriendSocialSync 通讯录「收到/发出申请」等列表多端实时刷新
func (s *RelationService) emitFriendSocialSync(ids ...uuid.UUID) {
	if s.WSM == nil {
		return
	}
	p := map[string]interface{}{"msg_type": "social_friend_sync"}
	seen := make(map[uuid.UUID]struct{})
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		s.WSM.Emit(id.String(), "social_friend_sync", p)
	}
}

// UserBrief 列表展示用
type UserBrief struct {
	ID             uuid.UUID `json:"id"`
	Username       string    `json:"username"`
	RealName       string    `json:"real_name,omitempty"`
	HeadSculpture  string    `json:"head_sculpture,omitempty"`
}

// PeerChatSummary 私聊会话摘要（依赖 workspace 与会话 room_id）
type PeerChatSummary struct {
	RoomID             string `json:"room_id"`
	LastMessagePreview string `json:"last_message_preview,omitempty"`
	LastMessageAt      string `json:"last_message_at,omitempty"`
	UnreadCount        int    `json:"unread_count"`
}

type FollowListRow struct {
	User      UserBrief        `json:"user"`
	CreatedAt string           `json:"created_at"`
	Chat      *PeerChatSummary `json:"chat,omitempty"`
}

type PageResult[T any] struct {
	List  []T   `json:"list"`
	Total int64 `json:"total"`
}

func (s *RelationService) loadUserBrief(ctx context.Context, id uuid.UUID) (*UserBrief, error) {
	var u model.User
	if err := s.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", id).First(&u).Error; err != nil {
		return nil, err
	}
	return &UserBrief{
		ID:            u.ID,
		Username:      u.Username,
		RealName:      u.RealName,
		HeadSculpture: u.HeadSculpture,
	}, nil
}

// Follow 关注 followeeID（sys_follow + 通知被关注方 + WS；对方已关注你时文案为互关）
func (s *RelationService) Follow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	if followerID == followeeID {
		return errors.New("不能关注自己")
	}

	var notifID uuid.UUID
	var followRowID uuid.UUID
	var titleOut, contentOut string

	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var cnt int64
		if err := tx.Model(&model.User{}).Where("id = ? AND delete_time IS NULL AND status = 1", followeeID).Count(&cnt).Error; err != nil {
			return err
		}
		if cnt == 0 {
			return errors.New("用户不存在")
		}
		var exists int64
		if err := tx.Model(&model.Follow{}).
			Where("follower_id = ? AND followee_id = ?", followerID, followeeID).
			Count(&exists).Error; err != nil {
			return err
		}
		if exists > 0 {
			return errors.New("已关注该用户")
		}

		var theyFollowMe int64
		if err := tx.Model(&model.Follow{}).
			Where("follower_id = ? AND followee_id = ?", followeeID, followerID).
			Count(&theyFollowMe).Error; err != nil {
			return err
		}
		isMutualAfter := theyFollowMe > 0

		followRowID = utils.UUID()
		f := model.Follow{
			ID:         followRowID,
			FollowerID: followerID,
			FolloweeID: followeeID,
		}
		if err := tx.Create(&f).Error; err != nil {
			return err
		}

		name := s.userDisplayName(tx, followerID)
		var title, content string
		if isMutualAfter {
			title = fmt.Sprintf("%s 与你互相关注", name)
			content = fmt.Sprintf("用户「%s」关注了你，你们已成为互相关注。", name)
		} else {
			title = fmt.Sprintf("%s 关注了你", name)
			content = fmt.Sprintf("用户「%s」关注了你。", name)
		}

		senderPtr := followerID
		relPtr := followRowID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: nil,
			SenderID:    &senderPtr,
			Title:       title,
			Content:     content,
			MsgType:     model.MsgTypeNewFollow,
			RelatedID:   &relPtr,
			LinkURL:     "/contacts",
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
		notifID = notif.ID
		titleOut = title
		contentOut = content

		nr := model.NotificationReceiver{
			ID:             utils.UUID(),
			NotificationID: notif.ID,
			ReceiverID:     followeeID,
			IsRead:         false,
			IsDelivered:    false,
		}
		return tx.Create(&nr).Error
	})
	if err != nil {
		return err
	}

	if s.WSM != nil {
		payload := map[string]interface{}{
			"type":        model.MsgTypeNewFollow,
			"msg_type":    model.MsgTypeNewFollow,
			"title":       titleOut,
			"content":     contentOut,
			"id":          notifID,
			"related_id":  followRowID.String(),
			"create_time": time.Now(),
			"is_read":     false,
		}
		s.WSM.Emit(followeeID.String(), "notification", payload)
		s.emitFriendSocialSync(followerID, followeeID)
	}
	return nil
}

// Unfollow 取消关注
func (s *RelationService) Unfollow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	res := s.DB.WithContext(ctx).Where("follower_id = ? AND followee_id = ?", followerID, followeeID).Delete(&model.Follow{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("未关注该用户")
	}
	return nil
}

// FollowingList 我关注的（分页）
func (s *RelationService) FollowingList(ctx context.Context, userID uuid.UUID, page, pageSize int) (*PageResult[FollowListRow], error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var total int64
	s.DB.WithContext(ctx).Model(&model.Follow{}).Where("follower_id = ?", userID).Count(&total)

	var rows []model.Follow
	if err := s.DB.WithContext(ctx).Where("follower_id = ?", userID).
		Order("create_time DESC").Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]FollowListRow, 0, len(rows))
	for _, r := range rows {
		brief, err := s.loadUserBrief(ctx, r.FolloweeID)
		if err != nil {
			continue
		}
		out = append(out, FollowListRow{
			User:      *brief,
			CreatedAt: r.CreateTime.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return &PageResult[FollowListRow]{List: out, Total: total}, nil
}

// FollowersList 粉丝（关注我的人）
func (s *RelationService) FollowersList(ctx context.Context, userID uuid.UUID, page, pageSize int) (*PageResult[FollowListRow], error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var total int64
	s.DB.WithContext(ctx).Model(&model.Follow{}).Where("followee_id = ?", userID).Count(&total)

	var rows []model.Follow
	if err := s.DB.WithContext(ctx).Where("followee_id = ?", userID).
		Order("create_time DESC").Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]FollowListRow, 0, len(rows))
	for _, r := range rows {
		brief, err := s.loadUserBrief(ctx, r.FollowerID)
		if err != nil {
			continue
		}
		out = append(out, FollowListRow{
			User:      *brief,
			CreatedAt: r.CreateTime.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return &PageResult[FollowListRow]{List: out, Total: total}, nil
}

// FriendApply 发起好友申请：sys_friend 持久化「发出/收到」申请记录；sys_notification 通知对方；WS 推送
func (s *RelationService) FriendApply(ctx context.Context, fromID, toID uuid.UUID, message string) error {
	if fromID == toID {
		return errors.New("不能添加自己为好友")
	}
	message = strings.TrimSpace(message)
	if len(message) > 512 {
		message = message[:512]
	}

	var notifID uuid.UUID
	var frID uuid.UUID
	var titleOut, contentOut string

	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var cnt int64
		if err := tx.Model(&model.User{}).Where("id = ? AND delete_time IS NULL AND status = 1", toID).Count(&cnt).Error; err != nil {
			return err
		}
		if cnt == 0 {
			return errors.New("用户不存在")
		}

		var accepted int64
		if err := tx.Model(&model.Friend{}).
			Where("delete_time IS NULL AND status = ?", model.FriendStatusAccepted).
			Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", fromID, toID, toID, fromID).
			Count(&accepted).Error; err != nil {
			return err
		}
		if accepted > 0 {
			return errors.New("已是好友")
		}

		var reversePending int64
		if err := tx.Model(&model.Friend{}).
			Where("delete_time IS NULL AND status = ?", model.FriendStatusPending).
			Where("user_id = ? AND friend_id = ?", toID, fromID).
			Count(&reversePending).Error; err != nil {
			return err
		}
		if reversePending > 0 {
			return errors.New("对方已向你发起好友申请，请到「收到的申请」中处理")
		}

		var minePending int64
		if err := tx.Model(&model.Friend{}).
			Where("delete_time IS NULL AND status = ?", model.FriendStatusPending).
			Where("user_id = ? AND friend_id = ?", fromID, toID).
			Count(&minePending).Error; err != nil {
			return err
		}
		if minePending > 0 {
			return errors.New("已发送申请，请等待对方处理")
		}

		frID = utils.UUID()
		fr := model.Friend{
			ID:           frID,
			UserID:       fromID,
			FriendID:     toID,
			Status:       model.FriendStatusPending,
			ApplyMessage: message,
		}
		if err := tx.Create(&fr).Error; err != nil {
			return err
		}

		var fromUser model.User
		if err := tx.Where("id = ? AND delete_time IS NULL", fromID).First(&fromUser).Error; err != nil {
			return err
		}
		name := strings.TrimSpace(fromUser.RealName)
		if name == "" {
			name = strings.TrimSpace(fromUser.Username)
		}
		if name == "" {
			name = fromID.String()
		}

		title := fmt.Sprintf("%s 申请添加你为好友", name)
		content := fmt.Sprintf("用户「%s」向你发送了好友申请。", name)
		if message != "" {
			content = fmt.Sprintf("用户「%s」向你发送了好友申请。附言：%s", name, message)
		}

		senderPtr := fromID
		relPtr := fr.ID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: nil,
			SenderID:    &senderPtr,
			Title:       title,
			Content:     content,
			MsgType:     model.MsgTypeFriendRequest,
			RelatedID:   &relPtr,
			LinkURL:     "/contacts",
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
		notifID = notif.ID
		titleOut = title
		contentOut = content

		nr := model.NotificationReceiver{
			ID:             utils.UUID(),
			NotificationID: notif.ID,
			ReceiverID:     toID,
			IsRead:         false,
			IsDelivered:    false,
		}
		return tx.Create(&nr).Error
	})
	if err != nil {
		return err
	}

	if s.WSM != nil {
		payload := map[string]interface{}{
			"type":        model.MsgTypeFriendRequest,
			"msg_type":    model.MsgTypeFriendRequest,
			"title":       titleOut,
			"content":     contentOut,
			"id":          notifID,
			"related_id":  frID.String(),
			"create_time": time.Now(),
			"is_read":     false,
		}
		s.WSM.Emit(toID.String(), "notification", payload)
		s.emitFriendSocialSync(fromID, toID)
	}
	return nil
}

type FriendRequestDTO struct {
	ID           uuid.UUID         `json:"id"`
	UserID       uuid.UUID         `json:"user_id"`
	FriendID     uuid.UUID         `json:"friend_id"`
	Status       int               `json:"status"`
	ApplyMessage string            `json:"apply_message,omitempty"`
	Remark       string            `json:"remark,omitempty"`        // 我对好友的备注（原文）
	DisplayLabel string            `json:"display_label,omitempty"` // 展示：备注（用户名）或用户名
	CreateTime   string            `json:"create_time"`
	Peer         UserBrief         `json:"peer"` // 对当前用户而言的「另一方」
	Chat         *PeerChatSummary  `json:"chat,omitempty"`
}

func friendToDTO(ctx context.Context, s *RelationService, fr model.Friend, viewer uuid.UUID) (FriendRequestDTO, error) {
	peerID := fr.FriendID
	if fr.FriendID == viewer {
		peerID = fr.UserID
	}
	brief, err := s.loadUserBrief(ctx, peerID)
	if err != nil {
		return FriendRequestDTO{}, err
	}
	myRemark := ""
	if viewer == fr.UserID {
		myRemark = strings.TrimSpace(fr.RemarkUser)
	} else {
		myRemark = strings.TrimSpace(fr.RemarkFriend)
	}
	displayLabel := utils.SocialDisplayLabel(myRemark, brief.Username)
	return FriendRequestDTO{
		ID:           fr.ID,
		UserID:       fr.UserID,
		FriendID:     fr.FriendID,
		Status:       fr.Status,
		ApplyMessage: fr.ApplyMessage,
		Remark:       myRemark,
		DisplayLabel: displayLabel,
		CreateTime:   fr.CreateTime.Format("2006-01-02T15:04:05Z07:00"),
		Peer:         *brief,
	}, nil
}

// UpdateFriendRemark 设置我对好友的备注（已通过的好友）
func (s *RelationService) UpdateFriendRemark(ctx context.Context, viewerID, peerID uuid.UUID, remark string) error {
	if viewerID == peerID {
		return errors.New("无效的好友")
	}
	remark = strings.TrimSpace(remark)
	if utf8.RuneCountInString(remark) > 200 {
		runes := []rune(remark)
		remark = string(runes[:200])
	}
	var fr model.Friend
	err := s.DB.WithContext(ctx).
		Where("delete_time IS NULL AND status = ? AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))",
			model.FriendStatusAccepted, viewerID, peerID, peerID, viewerID).
		First(&fr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("对方不是您的好友")
		}
		return err
	}
	updates := map[string]interface{}{"update_time": time.Now()}
	if viewerID == fr.UserID {
		updates["remark_user"] = remark
	} else {
		updates["remark_friend"] = remark
	}
	return s.DB.WithContext(ctx).Model(&model.Friend{}).Where("id = ?", fr.ID).Updates(updates).Error
}

// FriendIncoming 收到的申请历史（我是 friend_id）：待处理优先，含已同意/已拒绝/对方撤回
func (s *RelationService) FriendIncoming(ctx context.Context, userID uuid.UUID, page, pageSize int) (*PageResult[FriendRequestDTO], error) {
	return s.listFriendRequests(ctx, userID, "incoming", page, pageSize)
}

// FriendOutgoing 发出的申请历史（我是 user_id）：待处理优先，含已同意/已拒绝/已撤回
func (s *RelationService) FriendOutgoing(ctx context.Context, userID uuid.UUID, page, pageSize int) (*PageResult[FriendRequestDTO], error) {
	return s.listFriendRequests(ctx, userID, "outgoing", page, pageSize)
}

func (s *RelationService) listFriendRequests(ctx context.Context, userID uuid.UUID, kind string, page, pageSize int) (*PageResult[FriendRequestDTO], error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	tx := s.DB.WithContext(ctx).Model(&model.Friend{}).Where("delete_time IS NULL")
	if kind == "incoming" {
		tx = tx.Where("friend_id = ?", userID)
	} else {
		tx = tx.Where("user_id = ?", userID)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, err
	}

	var rows []model.Friend
	if err := tx.Order("(CASE WHEN status = 0 THEN 0 ELSE 1 END) ASC").
		Order("create_time DESC").
		Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]FriendRequestDTO, 0, len(rows))
	for _, fr := range rows {
		dto, err := friendToDTO(ctx, s, fr, userID)
		if err != nil {
			continue
		}
		out = append(out, dto)
	}
	return &PageResult[FriendRequestDTO]{List: out, Total: total}, nil
}

// FriendList 已通过的好友列表
func (s *RelationService) FriendList(ctx context.Context, userID uuid.UUID, page, pageSize int) (*PageResult[FriendRequestDTO], error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	tx := s.DB.WithContext(ctx).Model(&model.Friend{}).
		Where("delete_time IS NULL AND status = ?", model.FriendStatusAccepted).
		Where("user_id = ? OR friend_id = ?", userID, userID)

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, err
	}

	var rows []model.Friend
	if err := tx.Order("update_time DESC").Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]FriendRequestDTO, 0, len(rows))
	for _, fr := range rows {
		dto, err := friendToDTO(ctx, s, fr, userID)
		if err != nil {
			continue
		}
		out = append(out, dto)
	}
	return &PageResult[FriendRequestDTO]{List: out, Total: total}, nil
}

// FriendAccept 同意申请（仅接收方可操作）：结果通知申请人 + 双方通讯录实时刷新
func (s *RelationService) FriendAccept(ctx context.Context, viewerID, relationID uuid.UUID) error {
	var emitApplicant map[string]interface{}
	var applicantID uuid.UUID

	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var fr model.Friend
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND delete_time IS NULL", relationID).First(&fr).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("申请不存在")
			}
			return err
		}
		if fr.Status != model.FriendStatusPending {
			return errors.New("申请已处理")
		}
		if fr.FriendID != viewerID {
			return errors.New("无权操作该申请")
		}
		if err := tx.Model(&model.Friend{}).Where("id = ?", relationID).
			Update("status", model.FriendStatusAccepted).Error; err != nil {
			return err
		}
		nid, title, content, err := s.insertFriendResultNotification(tx, fr.UserID, fr.FriendID, fr.ID, true, false)
		if err != nil {
			return err
		}
		applicantID = fr.UserID
		emitApplicant = map[string]interface{}{
			"type":        model.MsgTypeFriendRequestResult,
			"msg_type":    model.MsgTypeFriendRequestResult,
			"title":       title,
			"content":     content,
			"id":          nid,
			"related_id":  fr.ID.String(),
			"create_time": time.Now(),
			"is_read":     false,
		}
		return nil
	})
	if err != nil {
		return err
	}
	if s.WSM != nil && emitApplicant != nil {
		s.WSM.Emit(applicantID.String(), "notification", emitApplicant)
		s.emitFriendSocialSync(applicantID, viewerID)
	}
	return nil
}

// FriendReject 拒绝申请（接收方）或撤回发出的申请（发起方）：结果通知对方 + 双方通讯录实时刷新
func (s *RelationService) FriendReject(ctx context.Context, viewerID, relationID uuid.UUID) error {
	var emitOther map[string]interface{}
	var emitTo uuid.UUID

	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var fr model.Friend
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND delete_time IS NULL", relationID).First(&fr).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("申请不存在")
			}
			return err
		}
		if fr.Status != model.FriendStatusPending {
			return errors.New("申请已处理")
		}

		var receiverID uuid.UUID
		var withdraw bool
		switch {
		case fr.FriendID == viewerID:
			receiverID = fr.UserID
			withdraw = false
		case fr.UserID == viewerID:
			receiverID = fr.FriendID
			withdraw = true
		default:
			return errors.New("无权操作该申请")
		}

		nid, title, content, err := s.insertFriendResultNotification(tx, receiverID, viewerID, fr.ID, false, withdraw)
		if err != nil {
			return err
		}
		st := model.FriendStatusRejected
		if withdraw {
			st = model.FriendStatusWithdrawn
		}
		if err := tx.Model(&model.Friend{}).Where("id = ?", relationID).Update("status", st).Error; err != nil {
			return err
		}

		emitTo = receiverID
		emitOther = map[string]interface{}{
			"type":        model.MsgTypeFriendRequestResult,
			"msg_type":    model.MsgTypeFriendRequestResult,
			"title":       title,
			"content":     content,
			"id":          nid,
			"related_id":  relationID.String(),
			"create_time": time.Now(),
			"is_read":     false,
		}
		return nil
	})
	if err != nil {
		return err
	}
	if s.WSM != nil && emitOther != nil {
		s.WSM.Emit(emitTo.String(), "notification", emitOther)
		s.emitFriendSocialSync(viewerID, emitTo)
	}
	return nil
}

// FriendRemove 删除好友（accepted）；pending 走拒绝/撤回逻辑以保留历史状态
func (s *RelationService) FriendRemove(ctx context.Context, viewerID, relationID uuid.UUID) error {
	var fr model.Friend
	if err := s.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", relationID).First(&fr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("记录不存在")
		}
		return err
	}
	if fr.UserID != viewerID && fr.FriendID != viewerID {
		return errors.New("无权操作")
	}
	if fr.Status == model.FriendStatusPending {
		return s.FriendReject(ctx, viewerID, relationID)
	}
	if fr.Status != model.FriendStatusAccepted {
		return errors.New("记录不可删除")
	}
	peer := fr.FriendID
	if fr.FriendID == viewerID {
		peer = fr.UserID
	}
	if err := s.DB.WithContext(ctx).Where("id = ?", relationID).Delete(&model.Friend{}).Error; err != nil {
		return err
	}
	s.emitFriendSocialSync(viewerID, peer)
	return nil
}
