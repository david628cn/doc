package services

import (
	"app/errs"
	"app/model"
	"app/playload"
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

type JoinRequestService struct {
	BaseService[model.JoinRequest]
	SpaceSrv         *SpaceService
	WorkspaceUserSrv *WorkspaceUserService
	WSM              IWebSocketManager
}

func NewJoinRequestService(db *gorm.DB, spaceSrv *SpaceService, wu *WorkspaceUserService, wsm IWebSocketManager) *JoinRequestService {
	return &JoinRequestService{
		BaseService:      *NewBaseService[model.JoinRequest](db),
		SpaceSrv:         spaceSrv,
		WorkspaceUserSrv: wu,
		WSM:              wsm,
	}
}

func (s *JoinRequestService) hasPendingWorkspaceRequest(tx *gorm.DB, applicantID, workspaceID uuid.UUID) (bool, error) {
	var n int64
	err := tx.Model(&model.JoinRequest{}).
		Where("applicant_id = ? AND workspace_id = ? AND space_id IS NULL AND status = ? AND delete_time IS NULL",
			applicantID, workspaceID, model.JoinRequestStatusPending).
		Count(&n).Error
	return n > 0, err
}

func (s *JoinRequestService) hasPendingSpaceRequest(tx *gorm.DB, applicantID, spaceID uuid.UUID) (bool, error) {
	var n int64
	err := tx.Model(&model.JoinRequest{}).
		Where("applicant_id = ? AND space_id = ? AND status = ? AND delete_time IS NULL",
			applicantID, spaceID, model.JoinRequestStatusPending).
		Count(&n).Error
	return n > 0, err
}

func (s *JoinRequestService) applicantDisplayName(ctx context.Context, userID uuid.UUID) string {
	var u model.User
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", userID).First(&u).Error; err != nil {
		return userID.String()
	}
	if strings.TrimSpace(u.Username) != "" {
		return u.Username
	}
	return userID.String()
}

func dedupeUUIDs(in []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{})
	out := make([]uuid.UUID, 0, len(in))
	for _, id := range in {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

// RequestJoinWorkspace 非成员申请加入工作区
func (s *JoinRequestService) RequestJoinWorkspace(ctx context.Context, applicantID, workspaceID uuid.UUID, msg string) error {
	var ws model.Workspace
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND delete_time IS NULL", workspaceID).First(&ws).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return gorm.ErrRecordNotFound
		}
		return err
	}
	wu, err := s.WorkspaceUserSrv.FindByUser(ctx, workspaceID, applicantID)
	if err != nil {
		return err
	}
	if wu != nil {
		return errs.ErrAlreadyMember
	}

	var notifID uuid.UUID
	var joinRequestID uuid.UUID
	var receiverIDs []uuid.UUID
	var titleOut, contentOut string

	err = s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ok, e := s.hasPendingWorkspaceRequest(tx, applicantID, workspaceID)
		if e != nil {
			return e
		}
		if ok {
			return errs.ErrJoinRequestPending
		}
		jr := model.JoinRequest{
			ID:          utils.UUID(),
			WorkspaceID: workspaceID,
			SpaceID:     nil,
			ApplicantID: applicantID,
			Message:     msg,
			Status:      model.JoinRequestStatusPending,
		}
		if err := tx.Create(&jr).Error; err != nil {
			return err
		}
		joinRequestID = jr.ID
		name := s.applicantDisplayName(utils.ContextWithDB(ctx, tx), applicantID)
		title := fmt.Sprintf("%s 申请加入工作区", name)
		content := fmt.Sprintf("用户「%s」申请加入工作区「%s」。", name, ws.Name)
		if strings.TrimSpace(msg) != "" {
			content = fmt.Sprintf("用户「%s」申请加入工作区「%s」。附言：%s", name, ws.Name, strings.TrimSpace(msg))
		}
		wsPtr := workspaceID
		applicantPtr := applicantID
		jrID := jr.ID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: &wsPtr,
			SenderID:    &applicantPtr,
			Title:       title,
			Content:     content,
			MsgType:     model.MsgTypeJoinRequest,
			RelatedID:   &jrID,
			LinkURL:     "",
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
		notifID = notif.ID
		titleOut = title
		contentOut = content
		receivers, err := s.workspaceAdminReceiverIDsWithTx(tx, workspaceID)
		if err != nil {
			return err
		}
		receivers = dedupeUUIDs(receivers)
		if len(receivers) == 0 {
			return errors.New("工作区无管理员可接收申请")
		}
		for _, rid := range receivers {
			if rid == applicantID {
				continue
			}
			nr := model.NotificationReceiver{
				ID:             utils.UUID(),
				NotificationID: notif.ID,
				ReceiverID:     rid,
				IsRead:         false,
				IsDelivered:    false,
			}
			if err := tx.Create(&nr).Error; err != nil {
				return err
			}
			receiverIDs = append(receiverIDs, rid)
		}
		if len(receiverIDs) == 0 {
			return errors.New("工作区无管理员可接收申请")
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.emitJoinNotificationToReceivers(receiverIDs, notifID, joinRequestID, workspaceID, nil, titleOut, contentOut)
	return nil
}

func (s *JoinRequestService) workspaceAdminReceiverIDsWithTx(tx *gorm.DB, workspaceID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := tx.Model(&model.WorkspaceUser{}).
		Where("workspace_id = ? AND delete_time IS NULL AND role IN ?", workspaceID, []string{model.RoleWorkspaceOwner, model.RoleWorkspaceAdmin}).
		Pluck("user_id", &ids).Error
	return ids, err
}

func (s *JoinRequestService) spaceAdminReceiverIDsWithTx(tx *gorm.DB, spaceID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := tx.Model(&model.SpaceAccess{}).
		Where("space_id = ? AND delete_time IS NULL AND LOWER(TRIM(subject_type)) = ? AND role IN ?",
			spaceID, model.SubjectTypeUser, []string{model.SpaceRoleOwner, model.SpaceRoleAdmin}).
		Pluck("subject_id", &ids).Error
	return ids, err
}

func (s *JoinRequestService) emitJoinNotificationToReceivers(
	receiverIDs []uuid.UUID,
	notifID, joinRequestID, workspaceID uuid.UUID,
	spaceID *uuid.UUID,
	title, content string,
) {
	payload := map[string]interface{}{
		"type":         model.MsgTypeJoinRequest,
		"msg_type":     model.MsgTypeJoinRequest,
		"title":        title,
		"content":      content,
		"id":           notifID,
		"related_id":   joinRequestID.String(),
		"workspace_id": workspaceID.String(),
		"create_time":  time.Now(),
		"is_read":      false,
	}
	if spaceID != nil {
		payload["space_id"] = spaceID.String()
	}
	for _, rid := range receiverIDs {
		s.WSM.Emit(rid.String(), "notification", payload)
	}
}

// RequestJoinSpace 工作区成员申请加入库（private / invite 且当前有效角色低于编辑者）
func (s *JoinRequestService) RequestJoinSpace(ctx context.Context, applicantID, workspaceID, spaceID uuid.UUID, msg string) error {
	wu, err := s.WorkspaceUserSrv.FindByUser(ctx, workspaceID, applicantID)
	if err != nil {
		return err
	}
	if wu == nil {
		return errs.ErrNotWorkspaceMember
	}

	var sp model.Space
	if err := s.Dao.DB.WithContext(ctx).Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, workspaceID).First(&sp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return gorm.ErrRecordNotFound
		}
		return err
	}
	if sp.Visibility != model.SpaceVisibilityPrivate && sp.Visibility != model.SpaceVisibilityInvite {
		return errs.ErrJoinRequestNotApplicable
	}

	role, err := s.SpaceSrv.EffectiveSpaceRoleInTx(s.Dao.DB.WithContext(ctx), workspaceID, spaceID, applicantID)
	if err != nil {
		return err
	}
	// 仅「尚无库内有效角色」可申请；阅读者/编辑者请走成员管理调整
	if role != model.SpaceRoleNone {
		return errs.ErrJoinRequestNotApplicable
	}

	var notifID uuid.UUID
	var joinRequestID uuid.UUID
	var receiverIDs []uuid.UUID
	var titleOut, contentOut string

	err = s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ok, e := s.hasPendingSpaceRequest(tx, applicantID, spaceID)
		if e != nil {
			return e
		}
		if ok {
			return errs.ErrJoinRequestPending
		}
		jr := model.JoinRequest{
			ID:          utils.UUID(),
			WorkspaceID: workspaceID,
			SpaceID:     &spaceID,
			ApplicantID: applicantID,
			Message:     msg,
			Status:      model.JoinRequestStatusPending,
		}
		if err := tx.Create(&jr).Error; err != nil {
			return err
		}
		joinRequestID = jr.ID
		name := s.applicantDisplayName(utils.ContextWithDB(ctx, tx), applicantID)
		title := fmt.Sprintf("%s 申请加入库", name)
		content := fmt.Sprintf("用户「%s」申请加入库「%s」。", name, sp.Name)
		if strings.TrimSpace(msg) != "" {
			content = fmt.Sprintf("用户「%s」申请加入库「%s」。附言：%s", name, sp.Name, strings.TrimSpace(msg))
		}
		wsPtr := workspaceID
		applicantPtr := applicantID
		jrID := jr.ID
		notif := model.Notification{
			ID:          utils.UUID(),
			WorkspaceID: &wsPtr,
			SenderID:    &applicantPtr,
			Title:       title,
			Content:     content,
			MsgType:     model.MsgTypeJoinRequest,
			RelatedID:   &jrID,
			LinkURL:     "",
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
		notifID = notif.ID
		titleOut = title
		contentOut = content
		receivers, err := s.spaceAdminReceiverIDsWithTx(tx, spaceID)
		if err != nil {
			return err
		}
		receivers = dedupeUUIDs(receivers)
		if len(receivers) == 0 {
			return errors.New("库无管理员可接收申请")
		}
		for _, rid := range receivers {
			if rid == applicantID {
				continue
			}
			nr := model.NotificationReceiver{
				ID:             utils.UUID(),
				NotificationID: notif.ID,
				ReceiverID:     rid,
				IsRead:         false,
				IsDelivered:    false,
			}
			if err := tx.Create(&nr).Error; err != nil {
				return err
			}
			receiverIDs = append(receiverIDs, rid)
		}
		if len(receiverIDs) == 0 {
			return errors.New("库无管理员可接收申请")
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.emitJoinNotificationToReceivers(receiverIDs, notifID, joinRequestID, workspaceID, &spaceID, titleOut, contentOut)
	return nil
}

// ListSentByApplicant 当前用户发出的申请记录
func (s *JoinRequestService) ListSentByApplicant(ctx context.Context, applicantID uuid.UUID, offset, limit int) ([]playload.JoinRequestSentDTO, int64, error) {
	var total int64
	q := s.Dao.DB.WithContext(ctx).Table("sys_join_request jr").
		Joins("JOIN sys_workspace w ON w.id = jr.workspace_id AND w.delete_time IS NULL").
		Joins("LEFT JOIN sys_space sp ON sp.id = jr.space_id AND sp.delete_time IS NULL").
		Where("jr.applicant_id = ? AND jr.delete_time IS NULL", applicantID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []playload.JoinRequestSentDTO
	err := s.Dao.DB.WithContext(ctx).Table("sys_join_request jr").
		Select(`jr.id, jr.workspace_id, w.name as workspace_name, jr.space_id,
			COALESCE(sp.name, '') as space_name, jr.message, jr.status, jr.create_time`).
		Joins("JOIN sys_workspace w ON w.id = jr.workspace_id AND w.delete_time IS NULL").
		Joins("LEFT JOIN sys_space sp ON sp.id = jr.space_id AND sp.delete_time IS NULL").
		Where("jr.applicant_id = ? AND jr.delete_time IS NULL", applicantID).
		Order("jr.create_time DESC").
		Limit(limit).Offset(offset).
		Scan(&list).Error
	if err != nil {
		return nil, 0, err
	}
	for i := range list {
		if list[i].SpaceID != nil && *list[i].SpaceID != uuid.Nil {
			list[i].Kind = model.JoinRequestKindSpace
		} else {
			list[i].Kind = model.JoinRequestKindWorkspace
		}
	}
	return list, total, nil
}

func (s *JoinRequestService) markJoinRequestNotificationsRead(tx *gorm.DB, joinRequestID, receiverID uuid.UUID) error {
	return tx.Exec(`
		UPDATE sys_notification_receiver nr
		SET is_read = true, read_time = NOW()
		FROM sys_notification n
		WHERE nr.notification_id = n.id
		  AND n.related_id = ?
		  AND n.msg_type = ?
		  AND nr.receiver_id = ?
		  AND n.delete_time IS NULL
		  AND nr.delete_time IS NULL`,
		joinRequestID, model.MsgTypeJoinRequest, receiverID).Error
}

func (s *JoinRequestService) operatorCanReviewJoinRequest(ctx context.Context, tx *gorm.DB, jr *model.JoinRequest, operatorID uuid.UUID) (bool, error) {
	txCtx := utils.ContextWithDB(ctx, tx)
	if jr.SpaceID == nil || *jr.SpaceID == uuid.Nil {
		return s.WorkspaceUserSrv.CheckIsAdmin(txCtx, jr.WorkspaceID, operatorID)
	}
	role, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, jr.WorkspaceID, *jr.SpaceID, operatorID)
	if err != nil {
		return false, err
	}
	return model.GetSpaceRoleWeight(role) >= model.GetSpaceRoleWeight(model.SpaceRoleAdmin), nil
}

// upsertApplicantSpaceAccess 审批通过：写入库个人 ACL（默认编辑者）
func (s *JoinRequestService) upsertApplicantSpaceAccess(tx *gorm.DB, spaceID, userID uuid.UUID, role string) error {
	role = strings.TrimSpace(role)
	if role == "" {
		role = model.SpaceRoleEditor
	}
	if role == model.SpaceRoleOwner {
		role = model.SpaceRoleEditor
	}
	var active model.SpaceAccess
	err := tx.Where("space_id = ? AND subject_id = ? AND LOWER(TRIM(subject_type)) = ? AND delete_time IS NULL",
		spaceID, userID, model.SubjectTypeUser).First(&active).Error
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
			spaceID, userID, model.SubjectTypeUser).
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
		SpaceID:     spaceID,
		SubjectType: model.SubjectTypeUser,
		SubjectID:   userID,
		Role:        role,
		JoinTime:    time.Now(),
	}
	return tx.Create(&row).Error
}

func (s *JoinRequestService) addWorkspaceMemberFromJoinRequest(tx *gorm.DB, workspaceID, userID uuid.UUID) error {
	var active model.WorkspaceUser
	err := tx.Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", workspaceID, userID).First(&active).Error
	if err == nil {
		return errs.ErrAlreadyMember
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	var dead model.WorkspaceUser
	err = tx.Unscoped().Where("workspace_id = ? AND user_id = ?", workspaceID, userID).Order("update_time DESC").First(&dead).Error
	if err == nil && dead.DeleteTime != nil {
		now := time.Now()
		return tx.Unscoped().Model(&dead).Updates(map[string]interface{}{
			"delete_time": nil,
			"role":        model.RoleWorkspaceMember,
			"status":      1,
			"is_default":  false,
			"join_time":   now,
			"update_time": now,
		}).Error
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	wu := model.WorkspaceUser{
		ID:          utils.UUID(),
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        model.RoleWorkspaceMember,
		Status:      1,
		IsDefault:   false,
		JoinTime:    time.Now(),
	}
	return tx.Create(&wu).Error
}

func (s *JoinRequestService) insertApplicantResultNotification(
	tx *gorm.DB,
	jrID, applicantID, operatorID, workspaceID uuid.UUID,
	spaceID *uuid.UUID,
	approved bool,
	wsName, spaceName, operatorName string,
) (uuid.UUID, string, string, error) {
	var title, content string
	if approved {
		if spaceID != nil && *spaceID != uuid.Nil {
			title = "您的库加入申请已通过"
			content = fmt.Sprintf("管理员「%s」已通过您加入库「%s」（工作区「%s」）的申请。", operatorName, spaceName, wsName)
		} else {
			title = "您的工作区加入申请已通过"
			content = fmt.Sprintf("管理员「%s」已通过您加入工作区「%s」的申请。", operatorName, wsName)
		}
	} else {
		if spaceID != nil && *spaceID != uuid.Nil {
			title = "您的库加入申请未通过"
			content = fmt.Sprintf("管理员「%s」已拒绝您加入库「%s」（工作区「%s」）的申请。", operatorName, spaceName, wsName)
		} else {
			title = "您的工作区加入申请未通过"
			content = fmt.Sprintf("管理员「%s」已拒绝您加入工作区「%s」的申请。", operatorName, wsName)
		}
	}
	wsPtr := workspaceID
	opPtr := operatorID
	rel := jrID
	notif := model.Notification{
		ID:          utils.UUID(),
		WorkspaceID: &wsPtr,
		SenderID:    &opPtr,
		Title:       title,
		Content:     content,
		MsgType:     model.MsgTypeJoinRequestResult,
		RelatedID:   &rel,
		LinkURL:     "",
	}
	if err := tx.Create(&notif).Error; err != nil {
		return uuid.Nil, "", "", err
	}
	nr := model.NotificationReceiver{
		ID:             utils.UUID(),
		NotificationID: notif.ID,
		ReceiverID:     applicantID,
		IsRead:         false,
		IsDelivered:    false,
	}
	if err := tx.Create(&nr).Error; err != nil {
		return uuid.Nil, "", "", err
	}
	return notif.ID, title, content, nil
}

// ApproveJoinRequest 管理员通过加入申请。若申请已非 pending，则仅将当前操作者对应 join_request 通知标已读并返回 noop=true（不写结果通知、不推 WS）。
func (s *JoinRequestService) ApproveJoinRequest(ctx context.Context, joinRequestID, operatorID uuid.UUID) (noop bool, err error) {
	var emitApplicant map[string]interface{}
	var applicantID uuid.UUID
	var noopOut bool
	err = s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var jr model.JoinRequest
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND delete_time IS NULL", joinRequestID).
			First(&jr).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrJoinRequestNotFound
			}
			return err
		}
		if jr.Status != model.JoinRequestStatusPending {
			ok, err := s.operatorCanReviewJoinRequest(ctx, tx, &jr, operatorID)
			if err != nil {
				return err
			}
			if !ok {
				return errs.ErrJoinRequestForbidden
			}
			if err := s.markJoinRequestNotificationsRead(tx, jr.ID, operatorID); err != nil {
				return err
			}
			noopOut = true
			return nil
		}
		ok, err := s.operatorCanReviewJoinRequest(ctx, tx, &jr, operatorID)
		if err != nil {
			return err
		}
		if !ok {
			return errs.ErrJoinRequestForbidden
		}
		var ws model.Workspace
		if err := tx.Where("id = ? AND delete_time IS NULL", jr.WorkspaceID).First(&ws).Error; err != nil {
			return err
		}
		spaceName := ""
		if jr.SpaceID != nil && *jr.SpaceID != uuid.Nil {
			var sp model.Space
			if err := tx.Where("id = ? AND workspace_id = ? AND delete_time IS NULL", *jr.SpaceID, jr.WorkspaceID).First(&sp).Error; err != nil {
				return err
			}
			spaceName = sp.Name
			if err := s.upsertApplicantSpaceAccess(tx, *jr.SpaceID, jr.ApplicantID, model.SpaceRoleEditor); err != nil {
				return err
			}
		} else {
			if err := s.addWorkspaceMemberFromJoinRequest(tx, jr.WorkspaceID, jr.ApplicantID); err != nil {
				return err
			}
		}
		if err := tx.Model(&model.JoinRequest{}).Where("id = ?", jr.ID).Updates(map[string]interface{}{
			"status":      model.JoinRequestStatusApproved,
			"update_time": time.Now(),
		}).Error; err != nil {
			return err
		}
		if err := s.markJoinRequestNotificationsRead(tx, jr.ID, operatorID); err != nil {
			return err
		}
		opName := s.applicantDisplayName(utils.ContextWithDB(ctx, tx), operatorID)
		nid, title, content, err := s.insertApplicantResultNotification(tx, jr.ID, jr.ApplicantID, operatorID, jr.WorkspaceID, jr.SpaceID, true, ws.Name, spaceName, opName)
		if err != nil {
			return err
		}
		applicantID = jr.ApplicantID
		emitApplicant = map[string]interface{}{
			"type":         model.MsgTypeJoinRequestResult,
			"msg_type":     model.MsgTypeJoinRequestResult,
			"title":        title,
			"content":      content,
			"id":           nid,
			"related_id":   jr.ID.String(),
			"workspace_id": jr.WorkspaceID.String(),
			"create_time":  time.Now(),
			"is_read":      false,
		}
		if jr.SpaceID != nil && *jr.SpaceID != uuid.Nil {
			emitApplicant["space_id"] = jr.SpaceID.String()
		}
		return nil
	})
	if err != nil {
		return false, err
	}
	if noopOut {
		return true, nil
	}
	if emitApplicant != nil {
		s.WSM.Emit(applicantID.String(), "notification", emitApplicant)
	}
	return false, nil
}

// RejectJoinRequest 管理员拒绝加入申请。若申请已非 pending，行为同 ApproveJoinRequest 的 noop 分支。
func (s *JoinRequestService) RejectJoinRequest(ctx context.Context, joinRequestID, operatorID uuid.UUID) (noop bool, err error) {
	var emitApplicant map[string]interface{}
	var applicantID uuid.UUID
	var noopOut bool
	err = s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var jr model.JoinRequest
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND delete_time IS NULL", joinRequestID).
			First(&jr).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errs.ErrJoinRequestNotFound
			}
			return err
		}
		if jr.Status != model.JoinRequestStatusPending {
			ok, err := s.operatorCanReviewJoinRequest(ctx, tx, &jr, operatorID)
			if err != nil {
				return err
			}
			if !ok {
				return errs.ErrJoinRequestForbidden
			}
			if err := s.markJoinRequestNotificationsRead(tx, jr.ID, operatorID); err != nil {
				return err
			}
			noopOut = true
			return nil
		}
		ok, err := s.operatorCanReviewJoinRequest(ctx, tx, &jr, operatorID)
		if err != nil {
			return err
		}
		if !ok {
			return errs.ErrJoinRequestForbidden
		}
		var ws model.Workspace
		if err := tx.Where("id = ? AND delete_time IS NULL", jr.WorkspaceID).First(&ws).Error; err != nil {
			return err
		}
		spaceName := ""
		if jr.SpaceID != nil && *jr.SpaceID != uuid.Nil {
			var sp model.Space
			if err := tx.Where("id = ? AND workspace_id = ? AND delete_time IS NULL", *jr.SpaceID, jr.WorkspaceID).First(&sp).Error; err != nil {
				return err
			}
			spaceName = sp.Name
		}
		if err := tx.Model(&model.JoinRequest{}).Where("id = ?", jr.ID).Updates(map[string]interface{}{
			"status":      model.JoinRequestStatusRejected,
			"update_time": time.Now(),
		}).Error; err != nil {
			return err
		}
		if err := s.markJoinRequestNotificationsRead(tx, jr.ID, operatorID); err != nil {
			return err
		}
		opName := s.applicantDisplayName(utils.ContextWithDB(ctx, tx), operatorID)
		nid, title, content, err := s.insertApplicantResultNotification(tx, jr.ID, jr.ApplicantID, operatorID, jr.WorkspaceID, jr.SpaceID, false, ws.Name, spaceName, opName)
		if err != nil {
			return err
		}
		applicantID = jr.ApplicantID
		emitApplicant = map[string]interface{}{
			"type":         model.MsgTypeJoinRequestResult,
			"msg_type":     model.MsgTypeJoinRequestResult,
			"title":        title,
			"content":      content,
			"id":           nid,
			"related_id":   jr.ID.String(),
			"workspace_id": jr.WorkspaceID.String(),
			"create_time":  time.Now(),
			"is_read":      false,
		}
		if jr.SpaceID != nil && *jr.SpaceID != uuid.Nil {
			emitApplicant["space_id"] = jr.SpaceID.String()
		}
		return nil
	})
	if err != nil {
		return false, err
	}
	if noopOut {
		return true, nil
	}
	if emitApplicant != nil {
		s.WSM.Emit(applicantID.String(), "notification", emitApplicant)
	}
	return false, nil
}
