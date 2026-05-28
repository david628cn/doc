package services

import (
	"app/errs"
	"app/model"
	"app/utils"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// InviteSendOpts 通用邀请发送参数
type InviteSendOpts struct {
	WorkspaceID uuid.UUID
	ScopeType   string
	ScopeID     uuid.UUID
	InviterID   uuid.UUID
	InviteeID   uuid.UUID
	Role        string
	Title       string
	Content     string
	MsgType     string
	BuildLink   func(inviteID uuid.UUID) string
}

// InviteAcceptor 按 scope 处理接受逻辑
type InviteAcceptor interface {
	Validate(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error
	OnAccept(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error
}

type WorkspaceInviteAcceptor struct {
	DB *gorm.DB
}

func (a *WorkspaceInviteAcceptor) Validate(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error {
	var n int64
	tx.Model(&model.WorkspaceUser{}).
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", inv.ScopeID, userID).
		Count(&n)
	if n > 0 {
		return errs.ErrAlreadyMember
	}
	return nil
}

func (a *WorkspaceInviteAcceptor) OnAccept(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error {
	wu := model.WorkspaceUser{
		ID:          uuid.New(),
		WorkspaceID: inv.ScopeID,
		UserID:      userID,
		Role:        inv.Role,
		Status:      1,
		JoinTime:    time.Now(),
	}
	return tx.Create(&wu).Error
}

type SpaceInviteAcceptor struct {
	DB *gorm.DB
}

func (a *SpaceInviteAcceptor) Validate(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error {
	var n int64
	tx.Table("sys_workspace_user").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", inv.WorkspaceID, userID).
		Count(&n)
	if n == 0 {
		return errs.ErrTargetNotInWorkspace
	}
	tx.Table("sys_space_access").
		Where("space_id = ? AND LOWER(TRIM(subject_type)) = ? AND subject_id = ? AND delete_time IS NULL",
			inv.ScopeID, model.SubjectTypeUser, userID).
		Count(&n)
	if n > 0 {
		return errs.ErrAlreadyMember
	}
	tx.Table("sys_space_access sa").
		Joins("INNER JOIN sys_group_user gu ON LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id = gu.group_id AND gu.user_id = ? AND gu.delete_time IS NULL", model.SubjectTypeGroup, userID).
		Where("sa.space_id = ? AND sa.delete_time IS NULL", inv.ScopeID).
		Count(&n)
	if n > 0 {
		return errs.ErrAlreadyMember
	}
	return nil
}

// upsertInviteePersonalAccess 写入受邀人在该库的个人 ACL；不依赖 ON CONFLICT 与部分唯一索引的方言细节。
func (a *SpaceInviteAcceptor) upsertInviteePersonalAccess(tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error {
	role := strings.TrimSpace(inv.Role)
	if role == "" {
		role = model.SpaceRoleViewer
	}
	// 邀请表若存 owner 会与「每空间唯一 owner 行」约束冲突，且与创建者 ACL 语义不符
	if role == model.SpaceRoleOwner {
		role = model.SpaceRoleEditor
	}

	var active model.SpaceAccess
	err := tx.Where("space_id = ? AND subject_id = ? AND LOWER(TRIM(subject_type)) = ? AND delete_time IS NULL",
		inv.ScopeID, userID, model.SubjectTypeUser).First(&active).Error
	if err == nil {
		return tx.Model(&active).Updates(map[string]interface{}{
			"role":        role,
			"update_time": time.Now(),
		}).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	var dead model.SpaceAccess
	err = tx.Unscoped().
		Where("space_id = ? AND subject_id = ? AND LOWER(TRIM(subject_type)) = ? AND delete_time IS NOT NULL",
			inv.ScopeID, userID, model.SubjectTypeUser).
		Order("update_time DESC").
		First(&dead).Error
	if err == nil {
		return tx.Unscoped().Model(&dead).Updates(map[string]interface{}{
			"delete_time": nil,
			"role":        role,
			"update_time": time.Now(),
		}).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	row := model.SpaceAccess{
		ID:          utils.UUID(),
		SpaceID:     inv.ScopeID,
		SubjectType: model.SubjectTypeUser,
		SubjectID:   userID,
		Role:        role,
		JoinTime:    time.Now(),
	}
	return tx.Create(&row).Error
}

func (a *SpaceInviteAcceptor) OnAccept(ctx context.Context, tx *gorm.DB, inv *model.Invite, userID uuid.UUID) error {
	return a.upsertInviteePersonalAccess(tx, inv, userID)
}

type InviteService struct {
	BaseService[model.Invite]
	WSM            IWebSocketManager
	acceptors      map[string]InviteAcceptor
	spaceSendGuard func(ctx context.Context, o *InviteSendOpts) error
}

func NewInviteService(db *gorm.DB, wsm IWebSocketManager) *InviteService {
	return &InviteService{
		BaseService: *NewBaseService[model.Invite](db),
		WSM:         wsm,
		acceptors:   make(map[string]InviteAcceptor),
	}
}

func (s *InviteService) Register(scope string, a InviteAcceptor) {
	s.acceptors[scope] = a
}

func (s *InviteService) SetSpaceSendGuard(g func(ctx context.Context, o *InviteSendOpts) error) {
	s.spaceSendGuard = g
}

func markInviteNotificationsRead(tx *gorm.DB, inviteID uuid.UUID, userID uuid.UUID) error {
	return tx.Model(&model.NotificationReceiver{}).
		Where("receiver_id = ? AND notification_id IN (?)",
			userID,
			tx.Table("sys_notification").Select("id").Where("related_id = ?", inviteID),
		).
		Updates(map[string]interface{}{
			"is_read":   true,
			"read_time": time.Now(),
		}).Error
}

// insertInviterInviteOutcomeInTx 被邀请人同意/拒绝后通知邀请人（事务内写入通知与收件人）
func (s *InviteService) insertInviterInviteOutcomeInTx(ctx context.Context, tx *gorm.DB, inv *model.Invite, inviteeID uuid.UUID, accepted bool) (map[string]interface{}, uuid.UUID, error) {
	name := inviteeDisplayName(ctx, tx, inviteeID)
	var ws model.Workspace
	if err := tx.Where("id = ? AND delete_time IS NULL", inv.WorkspaceID).First(&ws).Error; err != nil {
		return nil, uuid.Nil, err
	}
	wsName := strings.TrimSpace(ws.Name)
	if wsName == "" {
		wsName = "未命名"
	}
	var title, content string
	if inv.ScopeType == model.InviteScopeSpace {
		var sp model.Space
		if err := tx.Where("id = ? AND workspace_id = ? AND delete_time IS NULL", inv.ScopeID, inv.WorkspaceID).First(&sp).Error; err != nil {
			return nil, uuid.Nil, err
		}
		spName := strings.TrimSpace(sp.Name)
		if spName == "" {
			spName = "未命名"
		}
		if accepted {
			title = "库邀请已被接受"
			content = fmt.Sprintf("用户「%s」已同意加入库「%s」（工作区「%s」）。", name, spName, wsName)
		} else {
			title = "库邀请已被拒绝"
			content = fmt.Sprintf("用户「%s」已拒绝加入库「%s」（工作区「%s」）的邀请。", name, spName, wsName)
		}
	} else {
		if accepted {
			title = "工作区邀请已被接受"
			content = fmt.Sprintf("用户「%s」已同意加入工作区「%s」。", name, wsName)
		} else {
			title = "工作区邀请已被拒绝"
			content = fmt.Sprintf("用户「%s」已拒绝加入工作区「%s」的邀请。", name, wsName)
		}
	}
	wsPtr := inv.WorkspaceID
	inviteePtr := inviteeID
	rel := inv.ID
	notif := model.Notification{
		ID:          utils.UUID(),
		WorkspaceID: &wsPtr,
		SenderID:    &inviteePtr,
		Title:       title,
		Content:     content,
		MsgType:     model.MsgTypeInviteResponse,
		RelatedID:   &rel,
		LinkURL:     "",
	}
	if err := tx.Create(&notif).Error; err != nil {
		return nil, uuid.Nil, err
	}
	nr := model.NotificationReceiver{
		ID:             utils.UUID(),
		NotificationID: notif.ID,
		ReceiverID:     inv.InviterID,
		IsRead:         false,
		IsDelivered:    false,
	}
	if err := tx.Create(&nr).Error; err != nil {
		return nil, uuid.Nil, err
	}
	emit := map[string]interface{}{
		"type":         model.MsgTypeInviteResponse,
		"title":        title,
		"content":      content,
		"id":           notif.ID,
		"workspace_id": inv.WorkspaceID.String(),
		"create_time":  time.Now(),
	}
	if inv.ScopeType == model.InviteScopeSpace {
		emit["space_id"] = inv.ScopeID.String()
	}
	return emit, inv.InviterID, nil
}

func (s *InviteService) Send(ctx context.Context, o *InviteSendOpts) error {
	if o.BuildLink == nil {
		return errors.New("BuildLink 未设置")
	}
	st := strings.TrimSpace(o.ScopeType)
	if st != model.InviteScopeWorkspace && st != model.InviteScopeSpace {
		return fmt.Errorf("invite scope_type 非法或为空: %q（须为 %q 或 %q）", o.ScopeType, model.InviteScopeWorkspace, model.InviteScopeSpace)
	}
	o.ScopeType = st

	if o.ScopeType == model.InviteScopeSpace && s.spaceSendGuard != nil {
		if err := s.spaceSendGuard(ctx, o); err != nil {
			return err
		}
	}

	var emit map[string]interface{}

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		exp := now.AddDate(0, 0, 7)
		token := utils.GenerateRandomString(32)

		var inv model.Invite
		q := tx.Where("scope_type = ? AND scope_id = ? AND invitee_id = ? AND status = ? AND delete_time IS NULL",
			o.ScopeType, o.ScopeID, o.InviteeID, model.InviteStatusPending)
		err := q.First(&inv).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			inv = model.Invite{
				ID:          uuid.New(),
				WorkspaceID: o.WorkspaceID,
				ScopeType:   o.ScopeType,
				ScopeID:     o.ScopeID,
				InviterID:   o.InviterID,
				InviteeID:   &o.InviteeID,
				Role:        o.Role,
				Status:      model.InviteStatusPending,
				Token:       token,
				ExpireTime:  exp,
			}
			if err := tx.Create(&inv).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			if err := tx.Model(&inv).Updates(map[string]interface{}{
				"role":        o.Role,
				"expire_time": exp,
				"token":       token,
				"inviter_id":  o.InviterID,
				"update_time": now,
			}).Error; err != nil {
				return err
			}
		}

		link := o.BuildLink(inv.ID)
		var notif model.Notification
		err = tx.Where("related_id = ? AND delete_time IS NULL", inv.ID).First(&notif).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			notif = model.Notification{
				ID:          uuid.New(),
				WorkspaceID: &o.WorkspaceID,
				SenderID:    &o.InviterID,
				Title:       o.Title,
				Content:     o.Content,
				MsgType:     o.MsgType,
				RelatedID:   &inv.ID,
				LinkURL:     link,
			}
			if err := tx.Create(&notif).Error; err != nil {
				return err
			}
			recv := model.NotificationReceiver{
				ID:             uuid.New(),
				NotificationID: notif.ID,
				ReceiverID:     o.InviteeID,
				IsRead:         false,
				IsDelivered:    false,
			}
			if err := tx.Create(&recv).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			if err := tx.Model(&notif).Updates(map[string]interface{}{
				"title":       o.Title,
				"content":     o.Content,
				"link_url":    link,
				"msg_type":    o.MsgType,
				"sender_id":   o.InviterID,
				"update_time": now,
			}).Error; err != nil {
				return err
			}
		}

		// 重新加载 notification id（新建或已存在）
		if err := tx.Where("related_id = ? AND delete_time IS NULL", inv.ID).First(&notif).Error; err != nil {
			return err
		}

		emit = map[string]interface{}{
			"type":         o.MsgType,
			"title":        o.Title,
			"content":      o.Content,
			"id":           notif.ID,
			"workspace_id": o.WorkspaceID,
			"space_id":     o.ScopeID,
			"create_time":  time.Now(),
		}
		return nil
	})

	if err == nil && emit != nil {
		s.WSM.Emit(o.InviteeID.String(), "notification", emit)
	}
	return err
}

func (s *InviteService) Accept(ctx context.Context, inviteID, userID uuid.UUID) error {
	var emitToInviter map[string]interface{}
	var inviterID uuid.UUID

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv model.Invite
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND invitee_id = ? AND delete_time IS NULL", inviteID, userID).
			First(&inv).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrInviteNotFound
			}
			return err
		}
		if inv.Status == model.InviteStatusAccepted {
			// 幂等补写：避免历史上「邀请已接受但 sys_space_access 未写入」的半状态（含 ON CONFLICT 方言问题、早退等）
			if inv.ScopeType == model.InviteScopeSpace {
				if acc, ok := s.acceptors[model.InviteScopeSpace]; ok {
					if err := acc.OnAccept(ctx, tx, &inv, userID); err != nil {
						return err
					}
				}
			}
			return nil
		}
		if inv.Status != model.InviteStatusPending {
			return errs.ErrInviteNotFound
		}
		if !inv.ExpireTime.After(time.Now()) {
			return errs.ErrInviteNotFound
		}

		acc, ok := s.acceptors[inv.ScopeType]
		if !ok {
			return errs.ErrInvalidScope
		}
		if err := acc.Validate(ctx, tx, &inv, userID); err != nil {
			// 已是工作区/库成员时仍可能收到待处理通知（重复邀请、先通过其他入口加入等）：关闭邀请并标记已读，避免前端反复提示「已是成员」
			if errors.Is(err, errs.ErrAlreadyMember) {
				if err2 := tx.Model(&inv).Update("status", model.InviteStatusAccepted).Error; err2 != nil {
					return err2
				}
				if err2 := markInviteNotificationsRead(tx, inviteID, userID); err2 != nil {
					return err2
				}
				emit, iid, errN := s.insertInviterInviteOutcomeInTx(ctx, tx, &inv, userID, true)
				if errN != nil {
					return errN
				}
				emitToInviter, inviterID = emit, iid
				return nil
			}
			return err
		}
		if err := acc.OnAccept(ctx, tx, &inv, userID); err != nil {
			return err
		}
		if err := tx.Model(&inv).Update("status", model.InviteStatusAccepted).Error; err != nil {
			return err
		}
		if err := markInviteNotificationsRead(tx, inviteID, userID); err != nil {
			return err
		}
		emit, iid, errN := s.insertInviterInviteOutcomeInTx(ctx, tx, &inv, userID, true)
		if errN != nil {
			return errN
		}
		emitToInviter, inviterID = emit, iid
		return nil
	})
	if err != nil {
		return err
	}
	if emitToInviter != nil && s.WSM != nil {
		s.WSM.Emit(inviterID.String(), "notification", emitToInviter)
	}
	return nil
}

func (s *InviteService) Reject(ctx context.Context, inviteID, userID uuid.UUID) error {
	var emitToInviter map[string]interface{}
	var inviterID uuid.UUID

	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv model.Invite
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND invitee_id = ? AND delete_time IS NULL", inviteID, userID).
			First(&inv).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrInviteNotFound
			}
			return err
		}
		if inv.Status != model.InviteStatusPending || !inv.ExpireTime.After(time.Now()) {
			return errs.ErrInviteNotFound
		}
		if err := tx.Model(&inv).Update("status", model.InviteStatusRejected).Error; err != nil {
			return err
		}
		if err := markInviteNotificationsRead(tx, inviteID, userID); err != nil {
			return err
		}
		emit, iid, errN := s.insertInviterInviteOutcomeInTx(ctx, tx, &inv, userID, false)
		if errN != nil {
			return errN
		}
		emitToInviter, inviterID = emit, iid
		return nil
	})
	if err != nil {
		return err
	}
	if emitToInviter != nil && s.WSM != nil {
		s.WSM.Emit(inviterID.String(), "notification", emitToInviter)
	}
	return nil
}
