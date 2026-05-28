package playload

import "github.com/google/uuid"

// UpdateUserProfileReq 当前用户资料更新（仅非 nil 字段写入库）
type UpdateUserProfileReq struct {
	RealName      *string `json:"real_name"`
	Sex           *int    `json:"sex"`
	Mobile        *string `json:"mobile"`
	Email         *string `json:"email"`
	Address       *string `json:"address"`
	HeadSculpture *string `json:"head_sculpture"`
	Birthday      *string `json:"birthday"` // YYYY-MM-DD，传空字符串可清空
	IdentityCard  *string `json:"identity_card"`
}

// ChangePasswordReq 修改密码（成功后 JWT 中 pwd_version 不再匹配，需重新登录）
type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type UserBriefDTO struct {
	ID            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	RealName      string    `json:"real_name"`
	HeadSculpture string    `json:"head_sculpture"`
	Email         string    `json:"email"`
	Mobile        string    `json:"mobile"`
}

// UserSocialBriefDTO 当前登录用户对搜索结果用户的关注 / 好友关系（用于全局用户搜索）
type UserSocialBriefDTO struct {
	IsFollowing    bool   `json:"is_following"`     // 当前用户已关注对方
	IsFollowedBy   bool   `json:"is_followed_by"`   // 对方关注了当前用户
	IsMutualFollow bool   `json:"is_mutual_follow"` // 互相关注
	IsFriend       bool   `json:"is_friend"`        // 已是好友
	FriendPending  string `json:"friend_pending"`   // "" | "outgoing" | "incoming"
}

// UserSearchRowDTO 用户搜索单行（含社交关系）
type UserSearchRowDTO struct {
	UserBriefDTO
	Social UserSocialBriefDTO `json:"social"`
}
