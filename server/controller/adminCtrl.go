package controller

import (
	"app/model"
	"app/playload"
	"app/services"
	"app/utils"
	"context"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminCtrl struct {
	UserSrv *services.UserService
}

func NewAdminCtrl(userSrv *services.UserService) *AdminCtrl {
	return &AdminCtrl{
		UserSrv: userSrv,
	}
}

func (c *AdminCtrl) Login(ctx *gin.Context) {
	var params playload.LoginReq
	// 1. 绑定并校验参数
	if err := ctx.BindJSON(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if params.Username == "" || params.Password == "" {
		playload.SendError(ctx, "请输入用户名或密码")
		return
	}
	// 2. 传入 ctx 调用 FindByName
	user, err := c.UserSrv.FindByName(ctx, params.Username)
	if err != nil || user == nil || !utils.CheckPasswordHash(params.Password, user.Password) {
		playload.SendError(ctx, "用户名或密码错误")
		return
	}

	token, _ := utils.GenerateToken(map[string]string{
		"id":          user.ID.String(),
		"username":    user.Username,
		"pwd_version": strconv.Itoa(user.PwdVersion),
		// "password": user.Password,
	})
	now := time.Now()
	// 异步更新登录时间
	go func(uid uuid.UUID) {
		// 建议在 Service 层提供一个专门只更新 LoginTime 的方法，减少开销
		_ = c.UserSrv.Update(context.Background(), uid, map[string]interface{}{
			"login_time": now,
		})
	}(user.ID)
	// 非阻塞
	//go func() { _ = c.UserSrv.Update(context, user) }()
	// 1. 獲取空間列表（SQL 已按最後訪問時間排序）
	//workspaces, _ := c.UserSrv.WorkspaceUserSrv.GetUserWorkspaceList(ctx, user.ID)
	//var workspaceID uuid.UUID
	//// var currentWorkspace *playload.UserWorkspaceData
	//if len(workspaces) > 0 {
	//	// 直接取第一個，就是「最後訪問」的工作區
	//	// currentWorkspace = &workspaces[0]
	//	workspaceID = workspaces[0].WorkspaceId
	//}

	// 2. 如果有当前工作区，查出其下的 Spaces
	// var spaces []model.Space
	// if currentWorkspace != nil {
	// spaces, _ = c.UserSrv.SpaceSrv.FindByWorkspaceID(ctx, currentWorkspace.WorkspaceId)

	// }

	// 2. 更新用戶登錄時間
	//user.LoginTime = time.Now()
	//go func(u model.User) {
	//	// 這裡建議傳入一個獨立的 ctx 防止主請求結束後被 cancel
	//	_ = c.UserSrv.Update(ctx, &u)
	//}(*user)

	playload.SendSuccess(ctx, playload.AuthData{
		Token:     token,
		TokenType: "Bearer",
		User:      user,
		// WorkspaceID: defaultWSID,
	}, "登录成功")
}

func (c *AdminCtrl) Register(ctx *gin.Context) {
	var params playload.RegisterReq

	if err := ctx.ShouldBindJSON(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if params.Username == "" || params.Password == "" {
		playload.SendError(ctx, "请输入用户名/密码")
		return
	}
	if params.Password != params.RePassword {
		playload.SendError(ctx, "密码不一致")
		return
	}
	if params.Email == "" {
		playload.SendError(ctx, "请输入邮箱")
		return
	}

	user, err := c.UserSrv.FindByName(ctx, params.Username)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if user != nil {
		playload.SendError(ctx, "用户名已存在")
		return
	}

	resEmails, err := c.UserSrv.FindByEmail(ctx, params.Email)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}

	if resEmails != nil {
		playload.SendError(ctx, "邮箱已注册")
		return
	}
	// 4. 構造模型（建議密碼在此處或 Service 層進行 Hash 加密）
	// 對密碼進行哈希加密
	hashedPwd, err := utils.HashPassword(params.Password)
	if err != nil {
		playload.SendError(ctx, "密码格式不对")
		return
	}
	now := time.Now()
	m := model.User{
		Username:   params.Username,
		Email:      params.Email,
		Password:   hashedPwd, // 建議：utils.HashPassword(params.Password)
		CreateTime: now,
		UpdateTime: now,
	}

	// 5. 調用 Service 事務方法（包含創建用戶、空間及關聯）
	err = c.UserSrv.Register(ctx, &m)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, true, "注册成功")
}

func (c *AdminCtrl) CheckUsername(ctx *gin.Context) {
	var params playload.CheckUsernameReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	user, err := c.UserSrv.FindByName(ctx, params.Username)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if user != nil {
		playload.SendSuccess(ctx, true, "用户名已注册")
		return
	}
	playload.SendSuccess(ctx, false, "用户名未注册")
}

func (c *AdminCtrl) CheckEmail(ctx *gin.Context) {
	var params playload.CheckEmailReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	user, err := c.UserSrv.FindByEmail(ctx, params.Email)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if user != nil {
		playload.SendSuccess(ctx, true, "邮箱已注册")
		return
	}
	playload.SendSuccess(ctx, false, "邮箱未注册")
}

func (c *AdminCtrl) CheckMobile(ctx *gin.Context) {
	var params playload.CheckMobileReq
	if err := ctx.BindQuery(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	user, err := c.UserSrv.FindByMobile(ctx, params.Mobile)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	if user != nil {
		playload.SendSuccess(ctx, true, "手机已注册")
		return
	}
	playload.SendSuccess(ctx, false, "手机未注册")
}

func (c *AdminCtrl) LoginOut(ctx *gin.Context) {
	playload.SendSuccess(ctx, true, "退出")
}
func (c *AdminCtrl) Token(ctx *gin.Context) {
	user := utils.GetCurrentUser(ctx)
	if user == nil {
		playload.SendError(ctx, "用户不存在，生成token失败")
		return
	}
	token, _ := utils.GenerateToken(map[string]string{
		"id":          user.ID.String(),
		"username":    user.Username,
		"pwd_version": strconv.Itoa(user.PwdVersion),
		//"password": "admin",
	})
	// claims, _ := utils.ParseToken(token)
	// fmt.Println(claims.VerifyExpiresAt(time.Now().Unix(), false), claims)

	//time.Sleep(5 * time.Second)
	//fmt.Println(claims.VerifyExpiresAt(time.Now().Unix(), false))
	//ctx.JSON(http.StatusOK, playload.ResponseSuccess("请求成功", token))
	playload.SendSuccess(ctx, token, "请求成功")
}
