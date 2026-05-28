package services

import (
	"app/model"
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func inviteeDisplayName(ctx context.Context, db *gorm.DB, userID uuid.UUID) string {
	var u model.User
	err := db.WithContext(ctx).Where("id = ? AND delete_time IS NULL", userID).First(&u).Error
	if err != nil {
		return userID.String()
	}
	if s := strings.TrimSpace(u.Username); s != "" {
		return s
	}
	return userID.String()
}

func inviterDisplayName(ctx context.Context, db *gorm.DB, inviterID uuid.UUID) string {
	var u model.User
	err := db.WithContext(ctx).
		Select("username", "real_name").
		Where("id = ? AND delete_time IS NULL", inviterID).
		First(&u).Error
	if err != nil {
		return "用户"
	}
	if s := strings.TrimSpace(u.RealName); s != "" {
		return s
	}
	if s := strings.TrimSpace(u.Username); s != "" {
		return s
	}
	return "用户"
}

// FormatWorkspaceInviteNotification 工作区邀请文案：「{邀请人}邀请您加入{工作区名}工作区」
func FormatWorkspaceInviteNotification(ctx context.Context, db *gorm.DB, workspaceID, inviterID uuid.UUID) (title, content string, err error) {
	label := inviterDisplayName(ctx, db, inviterID)
	var ws model.Workspace
	if err := db.WithContext(ctx).Where("id = ? AND delete_time IS NULL", workspaceID).First(&ws).Error; err != nil {
		return "", "", err
	}
	wsName := strings.TrimSpace(ws.Name)
	if wsName == "" {
		wsName = "未命名"
	}
	text := fmt.Sprintf("%s邀请您加入%s工作区", label, wsName)
	return text, text, nil
}

// FormatSpaceInviteNotification 库邀请文案：「{邀请人}邀请您加入{工作区名}工作区{库名}库」
func FormatSpaceInviteNotification(ctx context.Context, db *gorm.DB, workspaceID, spaceID, inviterID uuid.UUID) (title, content string, err error) {
	label := inviterDisplayName(ctx, db, inviterID)
	var ws model.Workspace
	if err := db.WithContext(ctx).Where("id = ? AND delete_time IS NULL", workspaceID).First(&ws).Error; err != nil {
		return "", "", err
	}
	wsName := strings.TrimSpace(ws.Name)
	if wsName == "" {
		wsName = "未命名"
	}
	var sp model.Space
	if err := db.WithContext(ctx).
		Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, workspaceID).
		First(&sp).Error; err != nil {
		return "", "", err
	}
	spName := strings.TrimSpace(sp.Name)
	if spName == "" {
		spName = "未命名"
	}
	text := fmt.Sprintf("%s邀请您加入%s工作区%s库", label, wsName, spName)
	return text, text, nil
}
