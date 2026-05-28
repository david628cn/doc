package services

import (
	"strings"

	"github.com/google/uuid"
)

// SocialPrivateRoomID 平台私聊（与文档工作区无关）：priv:{较小用户 id}:{较大用户 id}
func SocialPrivateRoomID(userA, userB uuid.UUID) string {
	sa, sb := userA.String(), userB.String()
	if sa > sb {
		sa, sb = sb, sa
	}
	return "priv:" + sa + ":" + sb
}

// IsSocialPrivateRoom 新私聊格式（仅两段用户 UUID，无工作区）
func IsSocialPrivateRoom(roomID string) bool {
	if !strings.HasPrefix(roomID, "priv:") {
		return false
	}
	rest := strings.TrimPrefix(roomID, "priv:")
	parts := strings.Split(rest, ":")
	return len(parts) == 2
}

// IsPlatformChatRoom 平台级会话：两端私聊 + 群聊（均不按文档工作区隔离）
func IsPlatformChatRoom(roomID string) bool {
	r := strings.TrimSpace(roomID)
	if IsSocialPrivateRoom(r) {
		return true
	}
	return strings.HasPrefix(r, "grp:")
}

// PrivateRoomID 旧版私聊 priv:{workspace}:{较小用户 id}:{较大用户 id}（兼容历史数据）
func PrivateRoomID(workspaceID, userA, userB uuid.UUID) string {
	sa, sb := userA.String(), userB.String()
	if sa > sb {
		sa, sb = sb, sa
	}
	return "priv:" + workspaceID.String() + ":" + sa + ":" + sb
}

// PrivatePeer 从私聊 room_id 解析对方用户（sender 之外的一方）；兼容新旧 priv 格式
func PrivatePeer(roomID string, senderID uuid.UUID) (uuid.UUID, bool) {
	if !strings.HasPrefix(roomID, "priv:") {
		return uuid.Nil, false
	}
	rest := strings.TrimPrefix(roomID, "priv:")
	parts := strings.Split(rest, ":")
	if len(parts) == 2 {
		a, e1 := uuid.Parse(parts[0])
		b, e2 := uuid.Parse(parts[1])
		if e1 != nil || e2 != nil {
			return uuid.Nil, false
		}
		if a == senderID {
			return b, true
		}
		if b == senderID {
			return a, true
		}
		return uuid.Nil, false
	}
	if len(parts) == 3 {
		a, e1 := uuid.Parse(parts[1])
		b, e2 := uuid.Parse(parts[2])
		if e1 != nil || e2 != nil {
			return uuid.Nil, false
		}
		if a == senderID {
			return b, true
		}
		if b == senderID {
			return a, true
		}
		return uuid.Nil, false
	}
	return uuid.Nil, false
}

func GroupRoomID(groupID uuid.UUID) string {
	return "grp:" + groupID.String()
}

func ParseGroupID(roomID string) (uuid.UUID, bool) {
	if !strings.HasPrefix(roomID, "grp:") {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(strings.TrimPrefix(roomID, "grp:"))
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}
