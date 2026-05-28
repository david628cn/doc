package services

import (
	"app/errs"
	"app/model"
	"app/utils"
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SpaceAccessService struct {
	BaseService[model.SpaceAccess]
	WSM      IWebSocketManager
	SpaceSrv *SpaceService
}

func NewSpaceAccessService(db *gorm.DB, wsm IWebSocketManager, spaceSrv *SpaceService) *SpaceAccessService {
	return &SpaceAccessService{
		BaseService: *NewBaseService[model.SpaceAccess](db),
		WSM:         wsm,
		SpaceSrv:    spaceSrv,
	}
}

// GrantAccess 批量授权 (Upsert)
func (s *SpaceAccessService) GrantAccess(ctx context.Context, spaceID uuid.UUID, subjects []model.SpaceAccess) error {
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, access := range subjects {
			err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "space_id"}, {Name: "subject_id"}, {Name: "subject_type"}},
				TargetWhere: clause.Where{
					Exprs: []clause.Expression{clause.Expr{SQL: "delete_time IS NULL"}},
				},
				DoUpdates: clause.Assignments(map[string]interface{}{
					"role":        access.Role,
					"delete_time": nil,
					"update_time": time.Now(),
				}),
			}).Create(&access).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}

// RevokeAccess 移除授权 (软删除)
func (s *SpaceAccessService) RevokeAccess(ctx context.Context, spaceID uuid.UUID, subjectID string, subjectType string) error {
	return s.Dao.DB.WithContext(ctx).Model(&model.SpaceAccess{}).
		Where("space_id = ? AND subject_id = ? AND subject_type = ?", spaceID, subjectID, subjectType).
		Update("delete_time", time.Now()).Error
}

// GetDirectMembers 获取空间下的所有直接成员 (不含组内成员)
func (s *SpaceAccessService) GetDirectMembers(ctx context.Context, spaceID uuid.UUID) ([]model.SpaceAccess, error) {
	var list []model.SpaceAccess
	err := s.Dao.DB.WithContext(ctx).
		Where("space_id = ? AND delete_time IS NULL", spaceID).
		Find(&list).Error
	return list, err
}

// RemoveMember 移除空间成员（仅 user 维度直接授权）
func (s *SpaceAccessService) RemoveMember(ctx context.Context, wsID, spaceID, operatorID, targetUserID uuid.UUID) error {
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		opRole, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, operatorID)
		if err != nil {
			return err
		}
		tgtRole, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, targetUserID)
		if err != nil {
			return err
		}
		opW := model.GetSpaceRoleWeight(opRole)
		tgtW := model.GetSpaceRoleWeight(tgtRole)
		if tgtRole == model.SpaceRoleOwner {
			return errs.ErrCannotRemoveOwner
		}
		if opW < model.GetSpaceRoleWeight(model.SpaceRoleAdmin) {
			return errs.ErrForbidden
		}
		if operatorID != targetUserID && opW <= tgtW {
			return errs.ErrForbidden
		}
		return tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND subject_type = ? AND subject_id = ? AND delete_time IS NULL",
				spaceID, model.SubjectTypeUser, targetUserID).
			Update("delete_time", time.Now()).Error
	})
	if err != nil {
		return err
	}
	if s.WSM != nil {
		s.WSM.Emit(targetUserID.String(), "space:removed", map[string]interface{}{"space_id": spaceID, "workspace_id": wsID})
	}
	return nil
}

// LeaveSpace 当前用户主动退出库（仅软删除本人在 sys_space_access 的直接授权）。
// 转让所有权请单独调用 TransferOwner；若为 owner，须先转让后再调用本接口退出。
func (s *SpaceAccessService) LeaveSpace(ctx context.Context, wsID, spaceID, userID uuid.UUID) error {
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		role, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, userID)
		if err != nil {
			return err
		}
		if role == model.SpaceRoleNone {
			return errors.New("您在该库无访问权限，无需退出")
		}
		if role == model.SpaceRoleOwner {
			return errs.ErrCannotRemoveOwner
		}
		res := tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND subject_type = ? AND subject_id = ? AND delete_time IS NULL",
				spaceID, model.SubjectTypeUser, userID).
			Update("delete_time", time.Now())
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("无法退出：您通过工作区全局权限访问该库，未单独加入成员列表；如需停止访问请联系管理员调整工作区角色")
		}
		return nil
	})
	if err != nil {
		return err
	}
	if s.WSM != nil {
		s.WSM.Emit(userID.String(), "space:left", map[string]interface{}{"space_id": spaceID, "workspace_id": wsID})
	}
	return nil
}

// UpdateMemberRole 修改成员空间角色（不可改 owner）
func (s *SpaceAccessService) UpdateMemberRole(ctx context.Context, wsID, spaceID, operatorID, targetUserID uuid.UUID, newRole string) error {
	if newRole == model.SpaceRoleOwner {
		return errs.ErrCannotPromoteToOwner
	}
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		opRole, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, operatorID)
		if err != nil {
			return err
		}
		tgtRole, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, targetUserID)
		if err != nil {
			return err
		}
		if tgtRole == model.SpaceRoleOwner {
			return errs.ErrCannotModifyOwner
		}
		opW := model.GetSpaceRoleWeight(opRole)
		tgtW := model.GetSpaceRoleWeight(tgtRole)
		if opW < model.GetSpaceRoleWeight(model.SpaceRoleAdmin) {
			return errs.ErrForbidden
		}
		if operatorID != targetUserID && opW <= tgtW {
			return errs.ErrForbidden
		}
		res := tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND subject_type = ? AND subject_id = ? AND delete_time IS NULL",
				spaceID, model.SubjectTypeUser, targetUserID).
			Update("role", newRole)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.ErrNotSpaceMember
		}
		return nil
	})
	if err != nil {
		return err
	}
	if s.WSM != nil {
		s.WSM.Emit(targetUserID.String(), "space:role_changed", map[string]interface{}{
			"space_id": spaceID, "workspace_id": wsID, "role": newRole,
		})
	}
	return nil
}

// transferOwnerInTx 在已有事务内转让库所有权（当前用户须为 ACL 中的 owner）
func (s *SpaceAccessService) transferOwnerInTx(tx *gorm.DB, wsID, spaceID, currentOwnerID, newOwnerID uuid.UUID) error {
	if currentOwnerID == newOwnerID {
		return errors.New("不能转让给自己")
	}
	curRole, err := s.SpaceSrv.EffectiveSpaceRoleInTx(tx, wsID, spaceID, currentOwnerID)
	if err != nil {
		return err
	}
	if curRole != model.SpaceRoleOwner {
		return errs.ErrForbidden
	}
	var n int64
	tx.Table("sys_workspace_user").
		Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", wsID, newOwnerID).
		Count(&n)
	if n == 0 {
		return errs.ErrTargetNotInWorkspace
	}
	var owner model.SpaceAccess
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("space_id = ? AND role = ? AND subject_type = ? AND delete_time IS NULL",
			spaceID, model.SpaceRoleOwner, model.SubjectTypeUser).
		First(&owner).Error; err != nil {
		return errs.ErrForbidden
	}
	if owner.SubjectID != currentOwnerID {
		return errs.ErrForbidden
	}
	if err := tx.Model(&owner).Update("role", model.SpaceRoleAdmin).Error; err != nil {
		return err
	}
	row := model.SpaceAccess{
		ID:          utils.UUID(),
		SpaceID:     spaceID,
		SubjectType: model.SubjectTypeUser,
		SubjectID:   newOwnerID,
		Role:        model.SpaceRoleOwner,
		JoinTime:    time.Now(),
	}
	return tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "space_id"}, {Name: "subject_id"}, {Name: "subject_type"}},
		TargetWhere: clause.Where{
			Exprs: []clause.Expression{clause.Expr{SQL: "delete_time IS NULL"}},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"role":        model.SpaceRoleOwner,
			"delete_time": nil,
			"update_time": time.Now(),
		}),
	}).Create(&row).Error
}

// TransferOwner 转让库所有权
func (s *SpaceAccessService) TransferOwner(ctx context.Context, wsID, spaceID, currentOwnerID, newOwnerID uuid.UUID) error {
	err := s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return s.transferOwnerInTx(tx, wsID, spaceID, currentOwnerID, newOwnerID)
	})
	if err != nil {
		return err
	}
	if s.WSM != nil {
		s.WSM.Emit(currentOwnerID.String(), "space:demoted", map[string]interface{}{"space_id": spaceID, "workspace_id": wsID})
		s.WSM.Emit(newOwnerID.String(), "space:promoted_owner", map[string]interface{}{"space_id": spaceID, "workspace_id": wsID})
	}
	return nil
}

// ResetOwner 当库在 sys_space_access 中无任何有效 Owner 行时，由工作区管理员在审计记录后指定新 Owner（写入 ACL）。
func (s *SpaceAccessService) ResetOwner(ctx context.Context, wsID, spaceID, operatorID, newOwnerID uuid.UUID) error {
	if newOwnerID == uuid.Nil {
		newOwnerID = operatorID
	}
	return s.Dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var sp model.Space
		if err := tx.Where("id = ? AND workspace_id = ? AND delete_time IS NULL", spaceID, wsID).First(&sp).Error; err != nil {
			return err
		}
		var ownerCount int64
		if err := tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND delete_time IS NULL AND LOWER(TRIM(role)) = ?", spaceID, model.SpaceRoleOwner).
			Count(&ownerCount).Error; err != nil {
			return err
		}
		if ownerCount > 0 {
			return errs.ErrSpaceAlreadyHasOwner
		}
		var m int64
		tx.Table("sys_workspace_user").
			Where("workspace_id = ? AND user_id = ? AND delete_time IS NULL", wsID, newOwnerID).
			Count(&m)
		if m == 0 {
			return errs.ErrResetOwnerTarget
		}

		res := tx.Model(&model.SpaceAccess{}).
			Where("space_id = ? AND LOWER(TRIM(subject_type)) = LOWER(?) AND subject_id = ?",
				spaceID, model.SubjectTypeUser, newOwnerID).
			Updates(map[string]interface{}{
				"role":        model.SpaceRoleOwner,
				"delete_time": nil,
				"update_time": time.Now(),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			row := model.SpaceAccess{
				ID:          utils.UUID(),
				SpaceID:     spaceID,
				SubjectType: model.SubjectTypeUser,
				SubjectID:   newOwnerID,
				Role:        model.SpaceRoleOwner,
				JoinTime:    time.Now(),
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}

		payload, _ := json.Marshal(map[string]string{
			"space_id":     spaceID.String(),
			"new_owner_id": newOwnerID.String(),
			"operator_id":  operatorID.String(),
		})
		al := model.AuditLog{
			ID:           utils.UUID(),
			WorkspaceID:  &wsID,
			UserID:       &operatorID,
			Action:       "SPACE_RESET_OWNER",
			ResourceType: "space",
			ResourceID:   &spaceID,
			Payload:      datatypes.JSON(payload),
		}
		return tx.Create(&al).Error
	})
}
