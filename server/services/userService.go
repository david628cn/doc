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
)

type UserService struct {
	BaseService[model.User]
	PageSrv           *PageService
	SpaceSrv          *SpaceService
	WorkspaceSrv      *WorkspaceService     // 注入關聯服務
	WorkspaceUserSrv  *WorkspaceUserService // 注入關聯服務
	WorkspaceQuotaSrv *WorkspaceQuotaService
}

func NewUserService(db *gorm.DB, pageSrv *PageService, spaceSrv *SpaceService, workspaceSrv *WorkspaceService, workspaceUserSrv *WorkspaceUserService, workspaceQuotaSrv *WorkspaceQuotaService) *UserService {
	return &UserService{
		// 调用 Base 工厂，自动装配好底层的 Dao 和 DB
		BaseService:       *NewBaseService[model.User](db),
		PageSrv:           pageSrv,
		SpaceSrv:          spaceSrv,     // 鏈式初始化
		WorkspaceSrv:      workspaceSrv, // 鏈式初始化
		WorkspaceUserSrv:  workspaceUserSrv,
		WorkspaceQuotaSrv: workspaceQuotaSrv,
	}
}

func (s *UserService) FindByName(ctx context.Context, name string) (*model.User, error) {
	var result model.User
	err := s.Dao.DB.WithContext(ctx).
		Where("username = ?", name).
		Where("delete_time IS NULL").
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (s *UserService) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var result model.User
	err := s.Dao.DB.WithContext(ctx).
		Where("email = ?", email).
		Where("delete_time IS NULL").
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (s *UserService) FindByMobile(ctx context.Context, mobile string) (*model.User, error) {
	var result model.User
	err := s.Dao.DB.WithContext(ctx).
		Where("mobile = ?", mobile).
		Where("delete_time IS NULL").
		First(&result).Error

	if err != nil {
		// 如果是“未找到”错误，不向上抛出 error，只返回 nil
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

// GetDefaultWorkspacesID 查找用戶的默認工作空間 ID (新增方法)
func (s *UserService) GetDefaultWorkspaceID(ctx context.Context, userID uuid.UUID) (*model.WorkspaceUser, error) {
	return s.WorkspaceUserSrv.FindDefaultByUserID(ctx, userID)
}

func (s *UserService) Register(ctx context.Context, entry *model.User) error {
	return s.Dao.DB.Transaction(func(tx *gorm.DB) error {
		txCtx := utils.ContextWithDB(ctx, tx)

		// 1. 創建用戶 (複用 c.Add 裡的 UUID 生成邏輯)
		entry.ID = utils.UUID()
		if err := s.Add(txCtx, entry); err != nil {
			return err
		}

		// 2. 預創建工作空間對象 (先不存庫，因為需要 SpaceID)
		workspaceID := utils.UUID()

		// 3. 創建默認空間 (sys_space)
		// 每個 Workspace 至少擁有一個「快速開始」或「預設」空間
		space := model.Space{
			ID:          utils.UUID(),
			WorkspaceID: workspaceID,
			Name:        "私人库",
			Visibility:  model.SpaceVisibilityPrivate, // 私密：僅授權成員可見
			CreateBy:    entry.ID,
		}
		if err := s.SpaceSrv.CreateWithAccess(txCtx, &space); err != nil {
			return err
		}

		// 2. 創建工作空間 (優化 Slug 以防重複)
		wsName := fmt.Sprintf("%s的工作区", strings.TrimSpace(entry.Username))
		if wsName == "的工作区" {
			wsName = "未命名的工作区"
		}
		workspace := model.Workspace{
			ID:   workspaceID,
			Name: wsName,
			// 業界主流：Slug 加上隨機數或時間戳，防止同名用戶註冊失敗
			Slug:           entry.Username,
			DefaultSpaceID: space.ID,
		}
		if err := s.WorkspaceSrv.Add(txCtx, &workspace); err != nil {
			return err
		}

		// 3. 創建成員關聯
		workspaceUser := model.WorkspaceUser{
			ID:          utils.UUID(),
			WorkspaceID: workspace.ID,
			UserID:      entry.ID,
			Role:        model.RoleWorkspaceOwner,
			IsDefault:   true,
		}
		if err := s.WorkspaceUserSrv.Add(txCtx, &workspaceUser); err != nil {
			return err
		}

		// --- 【核心新增拼图】：初始化新工作区的网盘空间配额 ---
		// 由于通过 txCtx 透传了事务，这里直接向 sys_workspace_quota 写入默认的 5GB
		quota := model.WorkspaceQuota{
			WorkspaceID: workspace.ID,
			TotalBytes:  5368709120, // 默认 5GB 字节数，你也可以通过 config 模块读取
			UsedBytes:   0,          // 初始已使用 0 字节
			UpdateTime:  time.Now(),
		}
		// 使用当前事务 tx 执行落库，确保注册流程的强原子性
		if err := s.WorkspaceQuotaSrv.Add(txCtx, &quota); err != nil {
			return err // 只要配额初始化失败，上面的用户、工作区、空间建立全部自动物理回滚
		}

		// 6. (選填) 如果需要，可以初始化一個歡迎頁面 (sys_page)

		welcomePage := model.Page{
			ID:          utils.UUID(),
			WorkspaceID: workspace.ID,
			SpaceID:     space.ID,
			Title:       "欢迎使用",
			PageType:    model.PageTypeDocument,
			// 标准 ProseMirror JSON：段落内联必须为 type:text 子节点，勿写成 paragraph.text
			Content:  []byte(`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"开始编写你的第一篇文档吧！"}]}]}`),
			CreateBy: entry.ID,
			UpdateBy: entry.ID,
		}
		return s.PageSrv.Add(txCtx, &welcomePage)
	})
}

// UpdateProfile 更新当前用户允许修改的基本资料（不含 username）
func (s *UserService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *playload.UpdateUserProfileReq) (*model.User, error) {
	if req == nil || !hasProfileUpdates(req) {
		return nil, errors.New("请提供要修改的字段")
	}

	if req.Sex != nil {
		if *req.Sex < 0 || *req.Sex > 2 {
			return nil, errors.New("性别取值无效")
		}
	}

	if req.Email != nil {
		email := strings.TrimSpace(*req.Email)
		if email != "" {
			other, err := s.FindByEmail(ctx, email)
			if err != nil {
				return nil, err
			}
			if other != nil && other.ID != userID {
				return nil, errors.New("邮箱已被使用")
			}
		}
	}

	if req.Mobile != nil {
		mobile := strings.TrimSpace(*req.Mobile)
		if mobile != "" {
			other, err := s.FindByMobile(ctx, mobile)
			if err != nil {
				return nil, err
			}
			if other != nil && other.ID != userID {
				return nil, errors.New("手机号已被使用")
			}
		}
	}

	fields := map[string]interface{}{
		"update_time": time.Now(),
	}

	if req.RealName != nil {
		fields["real_name"] = *req.RealName
	}
	if req.Sex != nil {
		fields["sex"] = *req.Sex
	}
	if req.Mobile != nil {
		fields["mobile"] = strings.TrimSpace(*req.Mobile)
	}
	if req.Email != nil {
		fields["email"] = strings.TrimSpace(*req.Email)
	}
	if req.Address != nil {
		fields["address"] = *req.Address
	}
	if req.HeadSculpture != nil {
		fields["head_sculpture"] = *req.HeadSculpture
	}
	if req.IdentityCard != nil {
		fields["identity_card"] = *req.IdentityCard
	}
	if req.Birthday != nil {
		v := strings.TrimSpace(*req.Birthday)
		if v == "" {
			fields["birthday"] = nil
		} else {
			t, err := time.ParseInLocation("2006-01-02", v, time.Local)
			if err != nil {
				return nil, errors.New("生日格式应为 YYYY-MM-DD")
			}
			fields["birthday"] = t
		}
	}

	if err := s.Update(ctx, userID, fields); err != nil {
		return nil, err
	}
	return s.FindByID(ctx, userID)
}

func hasProfileUpdates(req *playload.UpdateUserProfileReq) bool {
	return req.RealName != nil || req.Sex != nil || req.Mobile != nil || req.Email != nil ||
		req.Address != nil || req.HeadSculpture != nil || req.Birthday != nil || req.IdentityCard != nil
}

// ChangePassword 校验旧密码后更新哈希并递增 pwd_version，使旧 JWT 失效
func (s *UserService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("用户不存在")
	}
	if !utils.CheckPasswordHash(oldPassword, user.Password) {
		return errors.New("原密码错误")
	}
	hashed, err := utils.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码处理失败")
	}
	return s.Update(ctx, userID, map[string]interface{}{
		"password":    hashed,
		"pwd_version": user.PwdVersion + 1,
		"update_time": time.Now(),
	})
}

func (s *UserService) UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarType string, value string) error {
	var finalValue string

	switch avatarType {
	case "emoji":
		finalValue = "emoji:" + value
	case "svg":
		finalValue = "svg:" + value
	case "img":
		// value 是分片上傳 onSuccess 返回的 res.path
		finalValue = "img:" + value
	default:
		finalValue = value
	}

	return s.Dao.DB.Model(&model.User{}).Where("id = ?", userID).Update("head_sculpture", finalValue).Error
}

// Search 全局用户关键字搜索。匹配 username / real_name / email / mobile / code。
// viewerID 非空时排除自己，并填充关注 / 互关 / 好友状态。
func (s *UserService) Search(ctx context.Context, keyword string, limit int, viewerID *uuid.UUID) ([]playload.UserSearchRowDTO, error) {
	var users []playload.UserBriefDTO
	kw := "%" + keyword + "%"
	q := s.Dao.DB.WithContext(ctx).Table("sys_user").
		Select("id, username, real_name, head_sculpture, email, mobile").
		Where("delete_time IS NULL AND status = 1").
		Where("(username ILIKE ? OR real_name ILIKE ? OR email ILIKE ? OR mobile ILIKE ? OR code ILIKE ?)",
			kw, kw, kw, kw, kw)
	if viewerID != nil {
		q = q.Where("id != ?", *viewerID)
	}
	if err := q.Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}
	out := make([]playload.UserSearchRowDTO, len(users))
	for i, u := range users {
		out[i] = playload.UserSearchRowDTO{UserBriefDTO: u}
	}
	if viewerID == nil || len(users) == 0 {
		return out, nil
	}
	return s.enrichUsersSocial(ctx, *viewerID, out)
}

func (s *UserService) enrichUsersSocial(ctx context.Context, viewer uuid.UUID, rows []playload.UserSearchRowDTO) ([]playload.UserSearchRowDTO, error) {
	if len(rows) == 0 {
		return rows, nil
	}
	ids := make([]uuid.UUID, len(rows))
	for i := range rows {
		ids[i] = rows[i].ID
	}

	var followingIDs []uuid.UUID
	if err := s.Dao.DB.WithContext(ctx).Model(&model.Follow{}).
		Where("follower_id = ? AND followee_id IN ?", viewer, ids).
		Pluck("followee_id", &followingIDs).Error; err != nil {
		return nil, err
	}
	followingSet := make(map[uuid.UUID]struct{}, len(followingIDs))
	for _, id := range followingIDs {
		followingSet[id] = struct{}{}
	}

	var followerIDs []uuid.UUID
	if err := s.Dao.DB.WithContext(ctx).Model(&model.Follow{}).
		Where("followee_id = ? AND follower_id IN ?", viewer, ids).
		Pluck("follower_id", &followerIDs).Error; err != nil {
		return nil, err
	}
	followerSet := make(map[uuid.UUID]struct{}, len(followerIDs))
	for _, id := range followerIDs {
		followerSet[id] = struct{}{}
	}

	var frRows []model.Friend
	if err := s.Dao.DB.WithContext(ctx).Model(&model.Friend{}).
		Where("delete_time IS NULL").
		Where(s.Dao.DB.Where("user_id = ? AND friend_id IN ?", viewer, ids).
			Or("friend_id = ? AND user_id IN ?", viewer, ids)).
		Find(&frRows).Error; err != nil {
		return nil, err
	}

	type peerFriend struct {
		isFriend bool
		pending  string
	}
	friendByPeer := make(map[uuid.UUID]peerFriend)
	for _, fr := range frRows {
		var peer uuid.UUID
		if fr.UserID == viewer {
			peer = fr.FriendID
		} else {
			peer = fr.UserID
		}
		inf := friendByPeer[peer]
		switch fr.Status {
		case model.FriendStatusAccepted:
			inf.isFriend = true
			inf.pending = ""
		case model.FriendStatusPending:
			if !inf.isFriend {
				if fr.UserID == viewer {
					inf.pending = "outgoing"
				} else {
					inf.pending = "incoming"
				}
			}
		default:
			// 已拒绝 / 已撤回：不覆盖好友或 pending
		}
		friendByPeer[peer] = inf
	}

	for i := range rows {
		id := rows[i].ID
		_, fo := followingSet[id]
		_, fb := followerSet[id]
		rows[i].Social.IsFollowing = fo
		rows[i].Social.IsFollowedBy = fb
		rows[i].Social.IsMutualFollow = fo && fb
		if fi, ok := friendByPeer[id]; ok {
			rows[i].Social.IsFriend = fi.isFriend
			rows[i].Social.FriendPending = fi.pending
		}
	}
	return rows, nil
}

func (s *UserService) requireWorkspaceAdminOrAbove(ctx context.Context, workspaceID, operatorID uuid.UUID) error {
	wu, err := s.WorkspaceUserSrv.FindByUser(ctx, workspaceID, operatorID)
	if err != nil {
		return err
	}
	if wu == nil {
		return errs.ErrForbidden
	}
	if model.GetWorkspaceRoleWeight(wu.Role) < model.GetWorkspaceRoleWeight(model.RoleWorkspaceAdmin) {
		return errs.ErrForbidden
	}
	return nil
}

func (s *UserService) requireSpaceAdminOrAbove(ctx context.Context, workspaceID, spaceID, operatorID uuid.UUID) error {
	detail, err := s.SpaceSrv.GetSpaceInfoWithAccess(ctx, spaceID, operatorID, workspaceID)
	if err != nil {
		return errs.ErrForbidden
	}
	if model.GetSpaceRoleWeight(detail.Role) < model.GetSpaceRoleWeight(model.SpaceRoleAdmin) {
		return errs.ErrForbidden
	}
	return nil
}

// SearchForWorkspaceInvite 搜索非工作区成员（仅工作区 admin/owner 可调，用于邀请）
func (s *UserService) SearchForWorkspaceInvite(ctx context.Context, keyword string, workspaceID, operatorID uuid.UUID, limit int) ([]playload.UserBriefDTO, error) {
	if err := s.requireWorkspaceAdminOrAbove(ctx, workspaceID, operatorID); err != nil {
		return nil, err
	}
	var users []playload.UserBriefDTO

	// 使用 NOT EXISTS 子查詢來過濾掉已存在的成員
	err := s.Dao.DB.WithContext(ctx).Table("sys_user").
		Select("id, username, real_name, head_sculpture, email, mobile").

		// 改用 LEFT JOIN，在結果中標記 IsMember
		//s.Dao.DB.WithContext(ctx).Table("sys_user").
		//Select("sys_user.id, sys_user.username, (wu.id IS NOT NULL) as is_member").
		//Joins("LEFT JOIN sys_workspace_user wu ON wu.user_id = sys_user.id AND wu.workspace_id = ? AND wu.delete_time IS NULL", workspaceID).
		//Where...

		Where("delete_time IS NULL AND status = 1").
		Where("(username ILIKE ? OR real_name ILIKE ? OR email ILIKE ? OR mobile ILIKE ? OR code ILIKE ?)",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%").
		Where(`NOT EXISTS (
			SELECT 1 FROM sys_workspace_user 
			WHERE sys_workspace_user.user_id = sys_user.id 
			AND sys_workspace_user.workspace_id = ? 
			AND sys_workspace_user.delete_time IS NULL
		)`, workspaceID).
		Limit(limit).
		Find(&users).Error

	return users, err
}

// SearchForSpaceInvite 可被邀请加入某库的用户列表：工作区成员、尚无该库个人 space_access（组授权用户仍可出现）。
// keyword 为空时返回一批成员（按用户名排序）；非空时对 username / real_name / email / mobile / code 做 ILIKE 模糊匹配（PostgreSQL）。
// 不再用 create_by 排除用户：create_by 表示原始建库人，与当前业务 owner（ACL owner）可分离；用 create_by 排除会误伤转让后仍无个人 ACL 的原创建者。
func (s *UserService) SearchForSpaceInvite(ctx context.Context, keyword string, workspaceID, spaceID, operatorID uuid.UUID, limit int) ([]playload.UserBriefDTO, error) {
	if err := s.requireSpaceAdminOrAbove(ctx, workspaceID, spaceID, operatorID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var users []playload.UserBriefDTO

	q := s.Dao.DB.WithContext(ctx).Table("sys_user u").
		Select("u.id, u.username, u.real_name, u.head_sculpture, u.email, u.mobile").
		Joins("INNER JOIN sys_workspace_user wu ON u.id = wu.user_id AND wu.workspace_id = ? AND wu.delete_time IS NULL", workspaceID).
		Joins("INNER JOIN sys_space sp ON sp.id = ? AND sp.workspace_id = ? AND sp.delete_time IS NULL", spaceID, workspaceID).
		Where("u.delete_time IS NULL AND u.status = 1").
		Where(`NOT EXISTS (
			SELECT 1 FROM sys_space_access sa
			WHERE sa.space_id = sp.id AND LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id = u.id AND sa.delete_time IS NULL
		)`, model.SubjectTypeUser).
		Where(`NOT EXISTS (
			SELECT 1 FROM sys_space_access sa
			INNER JOIN sys_group_user gu ON LOWER(TRIM(sa.subject_type)) = ? AND sa.subject_id = gu.group_id AND gu.user_id = u.id AND gu.delete_time IS NULL
			WHERE sa.space_id = sp.id AND sa.delete_time IS NULL
		)`, model.SubjectTypeGroup)

	if keyword != "" {
		kw := "%" + keyword + "%"
		q = q.Where(`(u.username ILIKE ? OR u.real_name ILIKE ? OR u.email ILIKE ? OR u.mobile ILIKE ? OR u.code ILIKE ?)`,
			kw, kw, kw, kw, kw)
	}

	err := q.Order("u.username ASC").Limit(limit).Scan(&users).Error
	return users, err
}

// SearchSpaceMembers 搜索当前库成员（原始建库人 create_by、个人授权、组授权展开的用户），仅库 admin/owner 可调。
// 其中 sp.create_by = u.id 仅用于「无个人 ACL 行时仍能搜到原始建库人」，业务 owner 以 sys_space_access.role=owner 为准，非用 create_by 替代 owner。
func (s *UserService) SearchSpaceMembers(ctx context.Context, keyword string, workspaceID, spaceID, operatorID uuid.UUID, limit int) ([]playload.UserBriefDTO, error) {
	if err := s.requireSpaceAdminOrAbove(ctx, workspaceID, spaceID, operatorID); err != nil {
		return nil, err
	}
	var users []playload.UserBriefDTO
	q := s.Dao.DB.WithContext(ctx).Table("sys_user u").
		Select("DISTINCT u.id, u.username, u.real_name, u.head_sculpture, u.email, u.mobile").
		Joins("INNER JOIN sys_workspace_user wu ON u.id = wu.user_id AND wu.workspace_id = ? AND wu.delete_time IS NULL", workspaceID).
		Joins("INNER JOIN sys_space sp ON sp.id = ? AND sp.workspace_id = ? AND sp.delete_time IS NULL", spaceID, workspaceID).
		Where("u.delete_time IS NULL AND u.status = 1").
		Where(`(
			sp.create_by = u.id
			OR EXISTS (
				SELECT 1 FROM sys_space_access sa
				WHERE sa.space_id = ? AND LOWER(TRIM(sa.subject_type)) = 'user' AND sa.subject_id = u.id AND sa.delete_time IS NULL
			)
			OR EXISTS (
				SELECT 1 FROM sys_space_access sa
				INNER JOIN sys_group_user gu ON LOWER(TRIM(sa.subject_type)) = 'group' AND sa.subject_id = gu.group_id AND gu.delete_time IS NULL
				WHERE sa.space_id = ? AND sa.delete_time IS NULL AND gu.user_id = u.id
			)
		)`, spaceID, spaceID)
	if keyword != "" {
		kw := "%" + keyword + "%"
		q = q.Where("(u.username ILIKE ? OR u.real_name ILIKE ? OR u.email ILIKE ? OR u.mobile ILIKE ? OR u.code ILIKE ?)",
			kw, kw, kw, kw, kw)
	}
	err := q.Order("u.username ASC").Limit(limit).Scan(&users).Error
	return users, err
}

// UpsertPushDevice 注册或刷新移动端推送令牌（同一 user_id + token 唯一）。
func (s *UserService) UpsertPushDevice(ctx context.Context, userID uuid.UUID, platform, token string) error {
	platform = strings.TrimSpace(strings.ToLower(platform))
	token = strings.TrimSpace(token)
	if token == "" {
		return errors.New("token 不能为空")
	}
	if platform != "ios" && platform != "android" {
		return errors.New("platform 须为 ios 或 android")
	}
	var row model.UserPushDevice
	err := s.Dao.DB.WithContext(ctx).
		Where("user_id = ? AND token = ?", userID, token).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = model.UserPushDevice{
			ID:       uuid.New(),
			UserID:   userID,
			Platform: platform,
			Token:    token,
		}
		return s.Dao.DB.WithContext(ctx).Create(&row).Error
	}
	if err != nil {
		return err
	}
	row.Platform = platform
	return s.Dao.DB.WithContext(ctx).Save(&row).Error
}
