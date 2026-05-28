package services

import (
	"app/model"
	"app/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// 定义一个接口，描述你需要的功能
type IWebSocketManager interface {
	PushToQueue(msg *model.ChatMessage)
	Emit(roomID string, msgType string, payload interface{})
}

type ChatService struct {
	BaseService[model.ChatMessage]
	WSM IWebSocketManager
}

func NewChatService(db *gorm.DB) *ChatService {
	return &ChatService{
		BaseService: *NewBaseService[model.ChatMessage](db),
	}
}

func (s *ChatService) SetManager(wsm IWebSocketManager) {
	s.WSM = wsm
}

func (s *ChatService) PushToQueue(msg *model.ChatMessage) {
	if s.WSM != nil {
		s.WSM.PushToQueue(msg)
	}
}

func truncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}

// chatMessageListPreview 会话列表最后一条展示：媒体类固定文案，文本类取正文（兼容 JSON 信封与纯文本旧数据）。
func chatMessageListPreview(last model.ChatMessage) string {
	switch last.MsgType {
	case model.ChatMsgTypeImage:
		return "[图片]"
	case model.ChatMsgTypeVideo:
		return "[视频]"
	case model.ChatMsgTypeFile:
		return "[文件]"
	case model.ChatMsgTypeSystem:
		return truncateRunes(chatPlainTextFromContent(last.Content), 120)
	default:
		return truncateRunes(chatPlainTextFromContent(last.Content), 120)
	}
}

func chatPlainTextFromContent(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	if strings.HasPrefix(content, "{") {
		var obj map[string]interface{}
		if json.Unmarshal([]byte(content), &obj) == nil && len(obj) > 0 {
			if mt, ok := obj["msg_type"].(string); ok {
				switch mt {
				case model.ChatMsgTypeImage:
					return "[图片]"
				case model.ChatMsgTypeVideo:
					return "[视频]"
				case model.ChatMsgTypeFile:
					return "[文件]"
				}
			}
			if t, ok := obj["text"].(string); ok && strings.TrimSpace(t) != "" {
				return t
			}
			if t, ok := obj["content"].(string); ok && strings.TrimSpace(t) != "" {
				return t
			}
		}
	}
	return content
}

// SaveChatMessage 由 Worker Pool 調用，執行真正的入庫操作
func (s *ChatService) SaveChatMessage(msg *model.ChatMessage) error {
	if msg.MsgType == "" {
		msg.MsgType = model.ChatMsgTypeText
	}
	// 平台私聊 / 群聊消息不按文档工作区隔离
	if IsPlatformChatRoom(msg.RoomID) {
		msg.WorkspaceID = nil
		return s.Dao.DB.Create(msg).Error
	}
	// WS 未带 workspace 时会写成零 UUID，与 HTTP 历史查询（默认工作区）不一致，导致列表无记录
	if msg.WorkspaceID == nil || *msg.WorkspaceID == uuid.Nil {
		ws, err := s.ResolveWorkspaceID(context.Background(), msg.SenderID, "")
		if err != nil {
			return err
		}
		msg.WorkspaceID = &ws
	}
	return s.Dao.DB.Create(msg).Error
}

// DeliverChatFanout 投递到各用户「通知频道」（用户 ID = room），用于私聊/群聊 WS 送达
func (s *ChatService) DeliverChatFanout(roomID string, msg *model.ChatMessage, senderID uuid.UUID) {
	if s.WSM == nil {
		return
	}
	payload := map[string]interface{}{
		"id":          msg.ID.String(),
		"room_id":     roomID,
		"sender_id":   senderID.String(),
		"content":     msg.Content,
		"msg_type":    msg.MsgType,
		"create_time": msg.CreateTime.Format(time.RFC3339Nano),
	}
	switch {
	case strings.HasPrefix(roomID, "priv:"):
		peer, ok := PrivatePeer(roomID, senderID)
		if ok {
			s.WSM.Emit(peer.String(), "chat_message", payload)
		}
	case strings.HasPrefix(roomID, "grp:"):
		gid, ok := ParseGroupID(roomID)
		if !ok {
			return
		}
		var userIDs []uuid.UUID
		if err := s.Dao.DB.Model(&model.ChatGroupMember{}).Where("group_id = ?", gid).Pluck("user_id", &userIDs).Error; err != nil {
			return
		}
		for _, uid := range userIDs {
			if uid == senderID {
				continue
			}
			s.WSM.Emit(uid.String(), "chat_message", payload)
		}
	}
	// 发送方也会开独立 WS（聊天页）：推一条回显，避免只能等 HTTP 拉历史且入库延迟时空白
	s.WSM.Emit(senderID.String(), "chat_message", payload)
}

// ResolveWorkspaceID 解析聊天所用工作区：query 优先，否则默认工作区
func (s *ChatService) ResolveWorkspaceID(ctx context.Context, userID uuid.UUID, queryWorkspace string) (uuid.UUID, error) {
	q := strings.TrimSpace(queryWorkspace)
	if q != "" {
		ws, err := uuid.Parse(q)
		if err != nil {
			return uuid.Nil, errors.New("无效的工作区 id")
		}
		return ws, nil
	}
	var wu model.WorkspaceUser
	if err := s.Dao.DB.WithContext(ctx).Where("user_id = ? AND is_default = ? AND delete_time IS NULL", userID, true).First(&wu).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, errors.New("未找到默认工作区，请先选择工作区或在请求中携带 workspace_id")
		}
		return uuid.Nil, err
	}
	return wu.WorkspaceID, nil
}

func (s *ChatService) peerSummary(ctx context.Context, viewer, ws uuid.UUID, roomID string) (*PeerChatSummary, error) {
	if IsPlatformChatRoom(roomID) {
		return s.peerSummarySocial(ctx, viewer, roomID)
	}
	return s.peerSummaryWorkspace(ctx, viewer, ws, roomID)
}

func (s *ChatService) peerSummarySocial(ctx context.Context, viewer uuid.UUID, roomID string) (*PeerChatSummary, error) {
	var last model.ChatMessage
	err := s.Dao.DB.WithContext(ctx).
		Where("room_id = ? AND delete_time IS NULL", roomID).
		Order("create_time DESC").Limit(1).Take(&last).Error
	hasLast := err == nil
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var mr model.ChatMemberRead
	err = s.Dao.DB.WithContext(ctx).Where("user_id = ? AND room_id = ?", viewer, roomID).First(&mr).Error
	var since time.Time
	if err == nil && mr.LastReadTime != nil {
		since = *mr.LastReadTime
	}

	var unread int64
	q := s.Dao.DB.WithContext(ctx).Model(&model.ChatMessage{}).
		Where("room_id = ? AND delete_time IS NULL AND sender_id <> ?", roomID, viewer)
	if !since.IsZero() {
		q = q.Where("create_time > ?", since)
	}
	_ = q.Count(&unread).Error

	sum := &PeerChatSummary{RoomID: roomID, UnreadCount: int(unread)}
	if hasLast {
		sum.LastMessagePreview = chatMessageListPreview(last)
		sum.LastMessageAt = last.CreateTime.Format(time.RFC3339)
	}
	return sum, nil
}

func (s *ChatService) peerSummaryWorkspace(ctx context.Context, viewer, ws uuid.UUID, roomID string) (*PeerChatSummary, error) {
	var last model.ChatMessage
	err := s.Dao.DB.WithContext(ctx).
		Where("room_id = ? AND workspace_id = ? AND delete_time IS NULL", roomID, ws).
		Order("create_time DESC").Limit(1).Take(&last).Error
	hasLast := err == nil
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var mr model.ChatMemberRead
	err = s.Dao.DB.WithContext(ctx).Where("user_id = ? AND room_id = ?", viewer, roomID).First(&mr).Error
	var since time.Time
	if err == nil && mr.LastReadTime != nil {
		since = *mr.LastReadTime
	}

	var unread int64
	q := s.Dao.DB.WithContext(ctx).Model(&model.ChatMessage{}).
		Where("room_id = ? AND workspace_id = ? AND delete_time IS NULL AND sender_id <> ?", roomID, ws, viewer)
	if !since.IsZero() {
		q = q.Where("create_time > ?", since)
	}
	_ = q.Count(&unread).Error

	sum := &PeerChatSummary{RoomID: roomID, UnreadCount: int(unread)}
	if hasLast {
		sum.LastMessagePreview = chatMessageListPreview(last)
		sum.LastMessageAt = last.CreateTime.Format(time.RFC3339)
	}
	return sum, nil
}

func parsePeerSummaryTime(iso string) time.Time {
	q := strings.TrimSpace(iso)
	if q == "" {
		return time.Time{}
	}
	if t, err := time.Parse(time.RFC3339Nano, q); err == nil {
		return t
	}
	t, err := time.Parse(time.RFC3339, q)
	if err != nil {
		return time.Time{}
	}
	return t
}

// mergePrivatePeerSummaries 合并平台私聊与旧版 priv:{ws}: 会话（历史数据可能只在旧 room_id 下）
func mergePrivatePeerSummaries(social, legacy *PeerChatSummary, socialRid string) *PeerChatSummary {
	if social == nil && legacy == nil {
		return &PeerChatSummary{RoomID: socialRid, UnreadCount: 0}
	}
	if legacy == nil {
		return social
	}
	if social == nil {
		return legacy
	}
	ts := parsePeerSummaryTime(social.LastMessageAt)
	tl := parsePeerSummaryTime(legacy.LastMessageAt)
	unread := social.UnreadCount + legacy.UnreadCount
	if tl.After(ts) && legacy.LastMessagePreview != "" {
		return &PeerChatSummary{
			RoomID:             legacy.RoomID,
			LastMessagePreview: legacy.LastMessagePreview,
			LastMessageAt:      legacy.LastMessageAt,
			UnreadCount:        unread,
		}
	}
	return &PeerChatSummary{
		RoomID:             social.RoomID,
		LastMessagePreview: social.LastMessagePreview,
		LastMessageAt:      social.LastMessageAt,
		UnreadCount:        unread,
	}
}

func (s *ChatService) peerSummaryPeerPair(ctx context.Context, viewer, peer uuid.UUID) *PeerChatSummary {
	socialRid := SocialPrivateRoomID(viewer, peer)
	sumSoc, err1 := s.peerSummarySocial(ctx, viewer, socialRid)
	if err1 != nil {
		sumSoc = nil
	}
	var sumLeg *PeerChatSummary
	if ws, err := s.ResolveWorkspaceID(ctx, viewer, ""); err == nil {
		legRid := PrivateRoomID(ws, viewer, peer)
		var err2 error
		sumLeg, err2 = s.peerSummaryWorkspace(ctx, viewer, ws, legRid)
		if err2 != nil {
			sumLeg = nil
		}
	}
	return mergePrivatePeerSummaries(sumSoc, sumLeg, socialRid)
}

// EnrichFollowRows 为关注/粉丝列表附加私聊摘要（平台私聊，不依赖文档工作区）
func (s *ChatService) EnrichFollowRows(ctx context.Context, viewer uuid.UUID, rows []FollowListRow) {
	for i := range rows {
		pid := rows[i].User.ID
		rows[i].Chat = s.peerSummaryPeerPair(ctx, viewer, pid)
	}
}

// EnrichFriendRows 为好友列表附加私聊摘要
func (s *ChatService) EnrichFriendRows(ctx context.Context, viewer uuid.UUID, rows []FriendRequestDTO) {
	for i := range rows {
		pid := rows[i].Peer.ID
		rows[i].Chat = s.peerSummaryPeerPair(ctx, viewer, pid)
	}
}

// GroupChatRow 群会话列表行
type GroupChatRow struct {
	GroupID            uuid.UUID `json:"group_id"`
	RoomID             string    `json:"room_id"`
	Name               string    `json:"name"`
	HeadSculpture      string    `json:"head_sculpture,omitempty"` // 自定义群头像，空则前端用成员拼图
	MemberCount        int       `json:"member_count"`
	MemberAvatarURLs   []string  `json:"member_avatar_urls,omitempty"` // 前 9 人头像 URL，用于拼图头像
	MemberDisplayLabels []string `json:"member_display_labels,omitempty"` // 与头像同序，用于无头像占位首字
	LastMessagePreview string    `json:"last_message_preview,omitempty"`
	LastMessageAt      string    `json:"last_message_at,omitempty"`
	UnreadCount        int       `json:"unread_count"`
}

// CreateGroup 创建平台级群并添加成员（含群主），不绑定文档工作区
func (s *ChatService) CreateGroup(ctx context.Context, ownerID uuid.UUID, name string, memberIDs []uuid.UUID) (*model.ChatGroup, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("群名称不能为空")
	}
	gid := uuid.New()
	g := model.ChatGroup{
		ID:          gid,
		WorkspaceID: nil,
		Name:        name,
		OwnerID:     ownerID,
	}
	var rows []model.ChatGroupMember
	seen := map[uuid.UUID]struct{}{ownerID: {}}
	rows = append(rows, model.ChatGroupMember{GroupID: gid, UserID: ownerID})
	for _, uid := range memberIDs {
		if uid == uuid.Nil {
			continue
		}
		if _, ok := seen[uid]; ok {
			continue
		}
		seen[uid] = struct{}{}
		rows = append(rows, model.ChatGroupMember{GroupID: gid, UserID: uid})
	}
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&g).Error; err != nil {
			return err
		}
		for i := range rows {
			if err := tx.Create(&rows[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &g, nil
}

// ListGroupChats 当前用户参与的平台级群（不按工作区过滤）
func (s *ChatService) ListGroupChats(ctx context.Context, userID uuid.UUID) ([]GroupChatRow, error) {
	var groups []model.ChatGroup
	err := s.Dao.DB.WithContext(ctx).Table("sys_chat_group AS g").
		Select("g.*").
		Joins("JOIN sys_chat_group_member m ON m.group_id = g.id AND m.user_id = ?", userID).
		Where("g.delete_time IS NULL").
		Order("g.update_time DESC").
		Limit(100).
		Find(&groups).Error
	if err != nil {
		return nil, err
	}
	out := make([]GroupChatRow, 0, len(groups))
	for _, g := range groups {
		rid := GroupRoomID(g.ID)
		var n int64
		_ = s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupMember{}).Where("group_id = ?", g.ID).Count(&n).Error
		var slots []struct {
			HeadSculpture string `gorm:"column:head_sculpture"`
			Username      string `gorm:"column:username"`
			GroupAlias    string `gorm:"column:group_alias"`
		}
		_ = s.Dao.DB.WithContext(ctx).Table("sys_chat_group_member AS m").
			Select("u.head_sculpture AS head_sculpture, u.username AS username, m.group_alias AS group_alias").
			Joins("JOIN sys_user AS u ON u.id = m.user_id AND u.delete_time IS NULL").
			Where("m.group_id = ?", g.ID).
			Order("m.create_time ASC").
			Limit(9).
			Scan(&slots).Error
		avatarURLs := make([]string, 0, len(slots))
		displayLabels := make([]string, 0, len(slots))
		for _, sl := range slots {
			avatarURLs = append(avatarURLs, sl.HeadSculpture)
			displayLabels = append(displayLabels, utils.SocialDisplayLabel(sl.GroupAlias, sl.Username))
		}
		sum, err := s.peerSummary(ctx, userID, uuid.Nil, rid)
		if err != nil {
			continue
		}
		row := GroupChatRow{
			GroupID:            g.ID,
			RoomID:             rid,
			Name:               g.Name,
			HeadSculpture:       strings.TrimSpace(g.HeadSculpture),
			MemberCount:         int(n),
			MemberAvatarURLs:    avatarURLs,
			MemberDisplayLabels: displayLabels,
			LastMessagePreview: "",
			LastMessageAt:      "",
			UnreadCount:        0,
		}
		if sum != nil {
			row.LastMessagePreview = sum.LastMessagePreview
			row.LastMessageAt = sum.LastMessageAt
			row.UnreadCount = sum.UnreadCount
		}
		out = append(out, row)
	}
	return out, nil
}

// GroupMemberBrief 群成员摘要（群详情）
type GroupMemberBrief struct {
	UserID        uuid.UUID `json:"user_id" gorm:"column:user_id"`
	Username      string    `json:"username" gorm:"column:username"`
	RealName      string    `json:"real_name,omitempty" gorm:"column:real_name"`
	HeadSculpture string    `json:"head_sculpture,omitempty" gorm:"column:head_sculpture"`
	GroupAlias    string    `json:"group_alias,omitempty" gorm:"column:group_alias"` // 该成员在本群的自拟别名
	DisplayLabel  string    `json:"display_label,omitempty" gorm:"-"`                // 别名（用户名）或用户名
}

// GroupDetailOut 群详情（仅成员可调）
type GroupDetailOut struct {
	GroupID       uuid.UUID          `json:"group_id"`
	RoomID        string             `json:"room_id"`
	Name          string             `json:"name"`
	HeadSculpture string             `json:"head_sculpture,omitempty"`
	Announcement  string             `json:"announcement,omitempty"`
	OwnerID       uuid.UUID          `json:"owner_id"`
	IAmOwner      bool               `json:"i_am_owner"`
	Members       []GroupMemberBrief `json:"members"`
}

// GetGroupDetail 群信息与成员列表
func (s *ChatService) GetGroupDetail(ctx context.Context, viewerID, groupID uuid.UUID) (*GroupDetailOut, error) {
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("群不存在")
		}
		return nil, err
	}
	var mem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, viewerID).First(&mem).Error; err != nil {
		return nil, errors.New("您不在该群中")
	}
	var members []GroupMemberBrief
	err := s.Dao.DB.WithContext(ctx).Table("sys_chat_group_member AS m").
		Select("m.user_id, u.username, u.real_name, u.head_sculpture, m.group_alias").
		Joins("JOIN sys_user AS u ON u.id = m.user_id AND (u.delete_time IS NULL)").
		Where("m.group_id = ?", groupID).
		Order("m.create_time ASC").
		Scan(&members).Error
	if err != nil {
		return nil, err
	}
	for i := range members {
		members[i].DisplayLabel = utils.SocialDisplayLabel(members[i].GroupAlias, members[i].Username)
	}
	return &GroupDetailOut{
		GroupID:       g.ID,
		RoomID:        GroupRoomID(g.ID),
		Name:          g.Name,
		HeadSculpture: strings.TrimSpace(g.HeadSculpture),
		Announcement:  g.Announcement,
		OwnerID:       g.OwnerID,
		IAmOwner:      g.OwnerID == viewerID,
		Members:       members,
	}, nil
}

// UpdateGroupName 仅群主可改群名称
func (s *ChatService) UpdateGroupName(ctx context.Context, actorID, groupID uuid.UUID, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("群名称不能为空")
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	if g.OwnerID != actorID {
		return errors.New("仅群主可修改群名称")
	}
	return s.Dao.DB.WithContext(ctx).Model(&model.ChatGroup{}).Where("id = ?", groupID).
		Updates(map[string]interface{}{"name": name, "update_time": time.Now()}).Error
}

// UpdateGroupAnnouncement 仅群主可编辑群公告
func (s *ChatService) UpdateGroupAnnouncement(ctx context.Context, actorID, groupID uuid.UUID, text string) error {
	text = strings.TrimSpace(text)
	if utf8.RuneCountInString(text) > 2000 {
		r := []rune(text)
		text = string(r[:2000])
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	if g.OwnerID != actorID {
		return errors.New("仅群主可修改群公告")
	}
	return s.Dao.DB.WithContext(ctx).Model(&model.ChatGroup{}).Where("id = ?", groupID).
		Updates(map[string]interface{}{"announcement": text, "update_time": time.Now()}).Error
}

// UpdateGroupAvatar 仅群主可设置群头像；空字符串表示清空后使用成员拼图
func (s *ChatService) UpdateGroupAvatar(ctx context.Context, actorID, groupID uuid.UUID, avatar string) error {
	avatar = strings.TrimSpace(avatar)
	if utf8.RuneCountInString(avatar) > 512 {
		r := []rune(avatar)
		avatar = string(r[:512])
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	if g.OwnerID != actorID {
		return errors.New("仅群主可修改群头像")
	}
	return s.Dao.DB.WithContext(ctx).Model(&model.ChatGroup{}).Where("id = ?", groupID).
		Updates(map[string]interface{}{"head_sculpture": avatar, "update_time": time.Now()}).Error
}

// UpdateMyGroupAlias 成员设置本人在群内的显示别名（全员按「别名（用户名）」或用户名展示）
func (s *ChatService) UpdateMyGroupAlias(ctx context.Context, userID, groupID uuid.UUID, alias string) error {
	alias = strings.TrimSpace(alias)
	if utf8.RuneCountInString(alias) > 64 {
		runes := []rune(alias)
		alias = string(runes[:64])
	}
	var mem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, userID).First(&mem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("您不在该群中")
		}
		return err
	}
	return s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, userID).
		Update("group_alias", alias).Error
}

// TransferGroupOwnership 群主将权限转让给群内其他成员
func (s *ChatService) TransferGroupOwnership(ctx context.Context, actorID, groupID, newOwnerID uuid.UUID) error {
	if newOwnerID == uuid.Nil || newOwnerID == actorID {
		return errors.New("请选择群内其他成员作为新群主")
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	if g.OwnerID != actorID {
		return errors.New("仅群主可转让群主权限")
	}
	var newMem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, newOwnerID).First(&newMem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("新群主必须是群内成员")
		}
		return err
	}
	err := s.Dao.DB.WithContext(ctx).Model(&model.ChatGroup{}).
		Where("id = ? AND owner_id = ?", groupID, actorID).
		Updates(map[string]interface{}{"owner_id": newOwnerID, "update_time": time.Now()}).Error
	if err != nil {
		return err
	}
	s.emitGroupInviteSync(actorID, newOwnerID)
	return nil
}

// RemoveGroupMember 群主将群内成员移出（不可移除群主；群主自己退出请使用 LeaveGroup）
func (s *ChatService) RemoveGroupMember(ctx context.Context, actorID, groupID, targetID uuid.UUID) error {
	if targetID == uuid.Nil {
		return errors.New("无效的用户")
	}
	if targetID == actorID {
		return errors.New("移出自己请使用退出群聊")
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	if g.OwnerID != actorID {
		return errors.New("仅群主可移除成员")
	}
	if targetID == g.OwnerID {
		return errors.New("不能移除群主")
	}
	var tgtMem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, targetID).First(&tgtMem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("该用户不在群内")
		}
		return err
	}
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ? AND user_id = ?", groupID, targetID).Delete(&model.ChatGroupMember{}).Error; err != nil {
			return err
		}
		return tx.Model(&model.ChatGroup{}).Where("id = ?", groupID).Update("update_time", time.Now()).Error
	})
	if err != nil {
		return err
	}
	s.emitGroupInviteSync(actorID, targetID)
	return nil
}

func (s *ChatService) userDisplayName(ctx context.Context, userID uuid.UUID) string {
	var u model.User
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", userID).First(&u).Error; err != nil {
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

func (s *ChatService) addGroupMemberTx(tx *gorm.DB, groupID, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return nil
	}
	var n int64
	if err := tx.Model(&model.ChatGroupMember{}).Where("group_id = ? AND user_id = ?", groupID, userID).Count(&n).Error; err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	if err := tx.Create(&model.ChatGroupMember{GroupID: groupID, UserID: userID}).Error; err != nil {
		return err
	}
	return tx.Model(&model.ChatGroup{}).Where("id = ?", groupID).Update("update_time", time.Now()).Error
}

func (s *ChatService) emitGroupInviteSync(userIDs ...uuid.UUID) {
	if s.WSM == nil {
		return
	}
	p := map[string]interface{}{"msg_type": "group_invite_sync"}
	seen := map[uuid.UUID]struct{}{}
	for _, uid := range userIDs {
		if uid == uuid.Nil {
			continue
		}
		if _, ok := seen[uid]; ok {
			continue
		}
		seen[uid] = struct{}{}
		s.WSM.Emit(uid.String(), "group_invite_sync", p)
	}
}

func (s *ChatService) emitNotificationWS(receiverID uuid.UUID, notifID uuid.UUID, msgType, title, content string, relatedID uuid.UUID) {
	if s.WSM == nil {
		return
	}
	payload := map[string]interface{}{
		"type":        msgType,
		"msg_type":    msgType,
		"title":       title,
		"content":     content,
		"id":          notifID,
		"related_id":  relatedID.String(),
		"create_time": time.Now(),
		"is_read":     false,
	}
	s.WSM.Emit(receiverID.String(), "notification", payload)
}

// InviteGroupMembers 群内成员发起邀请，被邀请人同意后才会入群
func (s *ChatService) InviteGroupMembers(ctx context.Context, actorID, groupID uuid.UUID, inviteeIDs []uuid.UUID) error {
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	var actorMem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, actorID).First(&actorMem).Error; err != nil {
		return errors.New("您不在该群中")
	}

	type pendingEmit struct {
		notifID   uuid.UUID
		inviteID  uuid.UUID
		title     string
		content   string
		inviteeID uuid.UUID
	}
	var toEmit []pendingEmit

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		actorName := s.userDisplayName(ctx, actorID)
		for _, uid := range inviteeIDs {
			if uid == uuid.Nil || uid == actorID {
				continue
			}
			var cnt int64
			if err := tx.Model(&model.User{}).Where("id = ? AND delete_time IS NULL AND status = 1", uid).Count(&cnt).Error; err != nil {
				return err
			}
			if cnt == 0 {
				continue
			}
			var inGroup int64
			if err := tx.Model(&model.ChatGroupMember{}).Where("group_id = ? AND user_id = ?", groupID, uid).Count(&inGroup).Error; err != nil {
				return err
			}
			if inGroup > 0 {
				continue
			}
			var pend int64
			if err := tx.Model(&model.ChatGroupInvite{}).
				Where("group_id = ? AND kind = ? AND invitee_id = ? AND status = ?", groupID, model.ChatGroupInviteKindInvite, uid, model.ChatGroupInviteStatusPending).
				Count(&pend).Error; err != nil {
				return err
			}
			if pend > 0 {
				continue
			}
			invID := utils.UUID()
			inv := model.ChatGroupInvite{
				ID:        invID,
				GroupID:   groupID,
				Kind:      model.ChatGroupInviteKindInvite,
				ActorID:   actorID,
				InviteeID: &uid,
				Status:    model.ChatGroupInviteStatusPending,
				Message:   "",
			}
			if err := tx.Create(&inv).Error; err != nil {
				return err
			}
			title := fmt.Sprintf("%s 邀请你加入群「%s」", actorName, g.Name)
			content := fmt.Sprintf("用户「%s」邀请你加入群聊「%s」。", actorName, g.Name)
			senderPtr := actorID
			relPtr := invID
			notif := model.Notification{
				ID:          utils.UUID(),
				WorkspaceID: nil,
				SenderID:    &senderPtr,
				Title:       title,
				Content:     content,
				MsgType:     model.MsgTypeGrpInvite,
				RelatedID:   &relPtr,
				LinkURL:     "/contacts",
			}
			if err := tx.Create(&notif).Error; err != nil {
				return err
			}
			nr := model.NotificationReceiver{
				ID:             utils.UUID(),
				NotificationID: notif.ID,
				ReceiverID:     uid,
				IsRead:         false,
				IsDelivered:    false,
			}
			if err := tx.Create(&nr).Error; err != nil {
				return err
			}
			toEmit = append(toEmit, pendingEmit{
				notifID: notif.ID, inviteID: invID, title: title, content: content, inviteeID: uid,
			})
		}
		return nil
	})
	if err != nil {
		return err
	}
	for _, e := range toEmit {
		s.emitNotificationWS(e.inviteeID, e.notifID, model.MsgTypeGrpInvite, e.title, e.content, e.inviteID)
		s.emitGroupInviteSync(actorID, e.inviteeID, g.OwnerID)
	}
	return nil
}

// ApplyJoinGroup 申请加入群聊（仅通知群主审批）
func (s *ChatService) ApplyJoinGroup(ctx context.Context, applicantID, groupID uuid.UUID, message string) error {
	message = strings.TrimSpace(message)
	if utf8.RuneCountInString(message) > 512 {
		message = truncateRunes(message, 512)
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	var inGroup int64
	if err := s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupMember{}).Where("group_id = ? AND user_id = ?", groupID, applicantID).Count(&inGroup).Error; err != nil {
		return err
	}
	if inGroup > 0 {
		return errors.New("您已在该群中")
	}
	var pend int64
	if err := s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupInvite{}).
		Where("group_id = ? AND kind = ? AND actor_id = ? AND status = ?", groupID, model.ChatGroupInviteKindApply, applicantID, model.ChatGroupInviteStatusPending).
		Count(&pend).Error; err != nil {
		return err
	}
	if pend > 0 {
		return errors.New("您已有待处理的入群申请")
	}

	var notifID uuid.UUID
	var titleOut, contentOut string
	invID := utils.UUID()

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		inv := model.ChatGroupInvite{
			ID:        invID,
			GroupID:   groupID,
			Kind:      model.ChatGroupInviteKindApply,
			ActorID:   applicantID,
			InviteeID: nil,
			Status:    model.ChatGroupInviteStatusPending,
			Message:   message,
		}
		if err := tx.Create(&inv).Error; err != nil {
			return err
		}
		applicantName := s.userDisplayName(ctx, applicantID)
		title := fmt.Sprintf("%s 申请加入群「%s」", applicantName, g.Name)
		content := fmt.Sprintf("用户「%s」申请加入群聊「%s」。", applicantName, g.Name)
		if message != "" {
			content = fmt.Sprintf("用户「%s」申请加入群聊「%s」。附言：%s", applicantName, g.Name, message)
		}
		senderPtr := applicantID
		relPtr := invID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: nil,
			SenderID:    &senderPtr,
			Title:       title,
			Content:     content,
			MsgType:     model.MsgTypeGrpApply,
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
			ReceiverID:     g.OwnerID,
			IsRead:         false,
			IsDelivered:    false,
		}
		return tx.Create(&nr).Error
	})
	if err != nil {
		return err
	}
	s.emitNotificationWS(g.OwnerID, notifID, model.MsgTypeGrpApply, titleOut, contentOut, invID)
	s.emitGroupInviteSync(applicantID, g.OwnerID)
	return nil
}

// RespondGroupInvite 被邀请人同意/拒绝邀请；群主同意/拒绝入群申请
func (s *ChatService) RespondGroupInvite(ctx context.Context, responderID, inviteID uuid.UUID, accept bool) error {
	var inv model.ChatGroupInvite
	if err := s.Dao.DB.WithContext(ctx).Where("id = ?", inviteID).First(&inv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("邀请不存在")
		}
		return err
	}
	if inv.Status != model.ChatGroupInviteStatusPending {
		return errors.New("该请求已处理")
	}
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", inv.GroupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}

	switch inv.Kind {
	case model.ChatGroupInviteKindInvite:
		if inv.InviteeID == nil || *inv.InviteeID != responderID {
			return errors.New("仅被邀请人可处理该邀请")
		}
	case model.ChatGroupInviteKindApply:
		if g.OwnerID != responderID {
			return errors.New("仅群主可审批入群申请")
		}
	default:
		return errors.New("无效的邀请类型")
	}

	var resultNotifID uuid.UUID
	var resultTitle, resultContent string
	var notifyUser uuid.UUID

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		st := model.ChatGroupInviteStatusRejected
		if accept {
			st = model.ChatGroupInviteStatusAccepted
		}
		if err := tx.Model(&model.ChatGroupInvite{}).Where("id = ? AND status = ?", inviteID, model.ChatGroupInviteStatusPending).
			Updates(map[string]interface{}{"status": st, "update_time": time.Now()}).Error; err != nil {
			return err
		}
		if accept {
			joinUser := inv.ActorID
			if inv.Kind == model.ChatGroupInviteKindInvite && inv.InviteeID != nil {
				joinUser = *inv.InviteeID
			}
			if err := s.addGroupMemberTx(tx, inv.GroupID, joinUser); err != nil {
				return err
			}
		}

		groupName := g.Name
		switch inv.Kind {
		case model.ChatGroupInviteKindInvite:
			notifyUser = inv.ActorID
			inviteeName := s.userDisplayName(ctx, *inv.InviteeID)
			if accept {
				resultTitle = fmt.Sprintf("%s 已同意加入群「%s」", inviteeName, groupName)
				resultContent = fmt.Sprintf("用户「%s」已同意加入群聊「%s」。", inviteeName, groupName)
			} else {
				resultTitle = fmt.Sprintf("%s 未接受群「%s」的邀请", inviteeName, groupName)
				resultContent = fmt.Sprintf("用户「%s」未接受加入群聊「%s」的邀请。", inviteeName, groupName)
			}
		case model.ChatGroupInviteKindApply:
			notifyUser = inv.ActorID
			if accept {
				resultTitle = fmt.Sprintf("已同意你加入群「%s」", groupName)
				resultContent = fmt.Sprintf("群主已同意你加入群聊「%s」。", groupName)
			} else {
				resultTitle = fmt.Sprintf("未通过入群「%s」的申请", groupName)
				resultContent = fmt.Sprintf("群主未通过你加入群聊「%s」的申请。", groupName)
			}
		}

		senderPtr := responderID
		relPtr := inviteID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: nil,
			SenderID:    &senderPtr,
			Title:       resultTitle,
			Content:     resultContent,
			MsgType:     model.MsgTypeGrpInvResult,
			RelatedID:   &relPtr,
			LinkURL:     "/contacts",
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
		resultNotifID = notif.ID
		nr := model.NotificationReceiver{
			ID:             utils.UUID(),
			NotificationID: notif.ID,
			ReceiverID:     notifyUser,
			IsRead:         false,
			IsDelivered:    false,
		}
		if err := tx.Create(&nr).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.emitNotificationWS(notifyUser, resultNotifID, model.MsgTypeGrpInvResult, resultTitle, resultContent, inviteID)
	syncIDs := []uuid.UUID{responderID, notifyUser, g.OwnerID}
	if inv.InviteeID != nil {
		syncIDs = append(syncIDs, *inv.InviteeID)
	}
	s.emitGroupInviteSync(syncIDs...)
	return nil
}

// GroupInvitePendingRow 待处理群邀请/申请（列表展示）
type GroupInvitePendingRow struct {
	ID          uuid.UUID  `json:"id"`
	GroupID     uuid.UUID  `json:"group_id"`
	GroupName   string     `json:"group_name"`
	RoomID      string     `json:"room_id"`
	Kind        string     `json:"kind"`
	ActorID     uuid.UUID  `json:"actor_id"`
	ActorName   string     `json:"actor_name"`
	InviteeID   *uuid.UUID `json:"invitee_id,omitempty"`
	InviteeName string     `json:"invitee_name,omitempty"`
	Message     string     `json:"message,omitempty"`
	CreateTime  string     `json:"create_time"`
}

// PendingGroupInvitesOut 当前用户相关的待办群邀请
type PendingGroupInvitesOut struct {
	InviteToMe      []GroupInvitePendingRow `json:"invite_to_me"`
	ApplyToMyGroups []GroupInvitePendingRow `json:"apply_to_my_groups"`
	MyInvitesSent   []GroupInvitePendingRow `json:"my_invites_sent"`
	MyApplies       []GroupInvitePendingRow `json:"my_applies"`
}

func (s *ChatService) enrichInviteRow(ctx context.Context, inv model.ChatGroupInvite) (GroupInvitePendingRow, error) {
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", inv.GroupID).First(&g).Error; err != nil {
		return GroupInvitePendingRow{}, err
	}
	row := GroupInvitePendingRow{
		ID:         inv.ID,
		GroupID:    inv.GroupID,
		GroupName:  g.Name,
		RoomID:     GroupRoomID(g.ID),
		Kind:       inv.Kind,
		ActorID:    inv.ActorID,
		ActorName:  s.userDisplayName(ctx, inv.ActorID),
		Message:    inv.Message,
		CreateTime: inv.CreateTime.Format(time.RFC3339),
	}
	if inv.InviteeID != nil {
		row.InviteeID = inv.InviteeID
		row.InviteeName = s.userDisplayName(ctx, *inv.InviteeID)
	}
	return row, nil
}

// ListPendingGroupInvites 待处理的邀请/申请列表
func (s *ChatService) ListPendingGroupInvites(ctx context.Context, userID uuid.UUID) (*PendingGroupInvitesOut, error) {
	out := &PendingGroupInvitesOut{
		InviteToMe:      []GroupInvitePendingRow{},
		ApplyToMyGroups: []GroupInvitePendingRow{},
		MyInvitesSent:   []GroupInvitePendingRow{},
		MyApplies:       []GroupInvitePendingRow{},
	}

	var inviteToMe []model.ChatGroupInvite
	if err := s.Dao.DB.WithContext(ctx).
		Where("invitee_id = ? AND kind = ? AND status = ?", userID, model.ChatGroupInviteKindInvite, model.ChatGroupInviteStatusPending).
		Order("create_time DESC").
		Find(&inviteToMe).Error; err != nil {
		return nil, err
	}
	for _, inv := range inviteToMe {
		row, err := s.enrichInviteRow(ctx, inv)
		if err != nil {
			continue
		}
		out.InviteToMe = append(out.InviteToMe, row)
	}

	var applyRows []model.ChatGroupInvite
	if err := s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupInvite{}).
		Joins("JOIN sys_chat_group g ON g.id = sys_chat_group_invite.group_id AND g.delete_time IS NULL").
		Where("g.owner_id = ? AND sys_chat_group_invite.kind = ? AND sys_chat_group_invite.status = ?",
			userID, model.ChatGroupInviteKindApply, model.ChatGroupInviteStatusPending).
		Order("sys_chat_group_invite.create_time DESC").
		Find(&applyRows).Error; err != nil {
		return nil, err
	}
	for _, inv := range applyRows {
		row, err := s.enrichInviteRow(ctx, inv)
		if err != nil {
			continue
		}
		out.ApplyToMyGroups = append(out.ApplyToMyGroups, row)
	}

	var sent []model.ChatGroupInvite
	if err := s.Dao.DB.WithContext(ctx).
		Where("actor_id = ? AND kind = ? AND status = ?", userID, model.ChatGroupInviteKindInvite, model.ChatGroupInviteStatusPending).
		Order("create_time DESC").
		Find(&sent).Error; err != nil {
		return nil, err
	}
	for _, inv := range sent {
		row, err := s.enrichInviteRow(ctx, inv)
		if err != nil {
			continue
		}
		out.MyInvitesSent = append(out.MyInvitesSent, row)
	}

	var applies []model.ChatGroupInvite
	if err := s.Dao.DB.WithContext(ctx).
		Where("actor_id = ? AND kind = ? AND status = ?", userID, model.ChatGroupInviteKindApply, model.ChatGroupInviteStatusPending).
		Order("create_time DESC").
		Find(&applies).Error; err != nil {
		return nil, err
	}
	for _, inv := range applies {
		row, err := s.enrichInviteRow(ctx, inv)
		if err != nil {
			continue
		}
		out.MyApplies = append(out.MyApplies, row)
	}

	return out, nil
}

// LeaveGroup 退群；群主退出时转让给其他成员（最早入群者优先）；仅剩一人则解散群
func (s *ChatService) LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	var g model.ChatGroup
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", groupID).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("群不存在")
		}
		return err
	}
	var mem model.ChatGroupMember
	if err := s.Dao.DB.WithContext(ctx).Where("group_id = ? AND user_id = ?", groupID, userID).First(&mem).Error; err != nil {
		return errors.New("您不在该群中")
	}
	var n int64
	if err := s.Dao.DB.WithContext(ctx).Model(&model.ChatGroupMember{}).Where("group_id = ?", groupID).Count(&n).Error; err != nil {
		return err
	}
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if n <= 1 {
			now := time.Now()
			if err := tx.Model(&model.ChatGroup{}).Where("id = ?", groupID).Update("delete_time", now).Error; err != nil {
				return err
			}
			return tx.Where("group_id = ?", groupID).Delete(&model.ChatGroupMember{}).Error
		}
		if g.OwnerID == userID {
			var next model.ChatGroupMember
			if err := tx.Where("group_id = ? AND user_id <> ?", groupID, userID).
				Order("create_time ASC").First(&next).Error; err != nil {
				return errors.New("无法转让群主")
			}
			if err := tx.Model(&model.ChatGroup{}).Where("id = ?", groupID).
				Updates(map[string]interface{}{"owner_id": next.UserID, "update_time": time.Now()}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("group_id = ? AND user_id = ?", groupID, userID).Delete(&model.ChatGroupMember{}).Error; err != nil {
			return err
		}
		return tx.Model(&model.ChatGroup{}).Where("id = ?", groupID).Update("update_time", time.Now()).Error
	})
}

// MarkRoomRead 标记会话已读到指定时间（通常传当前时间或最后一条消息时间）；workspaceID 为 nil 表示平台私聊/群聊
func (s *ChatService) MarkRoomRead(ctx context.Context, userID uuid.UUID, workspaceID *uuid.UUID, roomID string, readAt time.Time) error {
	var row model.ChatMemberRead
	err := s.Dao.DB.WithContext(ctx).Where("user_id = ? AND room_id = ?", userID, roomID).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		rec := model.ChatMemberRead{
			UserID:       userID,
			RoomID:       roomID,
			WorkspaceID:  workspaceID,
			LastReadTime: &readAt,
		}
		return s.Dao.DB.Create(&rec).Error
	}
	if err != nil {
		return err
	}
	if row.LastReadTime == nil || readAt.After(*row.LastReadTime) {
		return s.Dao.DB.Model(&model.ChatMemberRead{}).
			Where("user_id = ? AND room_id = ?", userID, roomID).
			Update("last_read_time", readAt).Error
	}
	return nil
}

func (s *ChatService) GetChatHistory(ctx context.Context, roomID string, workspaceID uuid.UUID, pageSize int, lastTime *time.Time) ([]model.ChatMessage, error) {
	var messages []model.ChatMessage
	if pageSize < 1 || pageSize > 100 {
		pageSize = 30
	}
	db := s.Dao.DB.WithContext(ctx).
		Where("room_id = ? AND delete_time IS NULL", roomID)
	if !IsPlatformChatRoom(roomID) {
		db = db.Where("workspace_id = ?", workspaceID)
	}
	if lastTime != nil && !lastTime.IsZero() {
		db = db.Where("create_time < ?", lastTime)
	}
	db = db.Order("create_time DESC").Limit(pageSize)
	err := db.Find(&messages).Error
	return messages, err
}
