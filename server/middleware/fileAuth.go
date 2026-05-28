package middleware

import (
	"app/model"
	"app/playload"
	"app/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FileAccessInterceptor 带 Redis 动态降级缓存的文件路径安全拦截器
func FileAccessInterceptor(db *gorm.DB) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// 1. 获取登录用户
		currentUser := utils.GetCurrentUser(ctx)
		if currentUser == nil {
			playload.SendUnauthorized(ctx, "身份验证失效，请重新登录")
			ctx.Abort()
			return
		}

		// 2. 截取相对 URL 路径 (例如得到 "/uploads/attachment/page/xxx.png")
		requestPath := ctx.Request.URL.Path

		// 3. --- 【Redis 缓存读取层】 ---
		var fileMeta model.File
		cacheHit := false

		// 构造 Redis 唯一 Key，对路径进行简单拼接
		redisKey := fmt.Sprintf("cache:file_meta:%s", requestPath)

		// 使用封装的安全函数读取
		cacheData, err := utils.SafeGetFromRedis(ctx.Request.Context(), redisKey)
		if err == nil && cacheData != "" {
			// 缓存命中：尝试反序列化为结构体
			if json.Unmarshal([]byte(cacheData), &fileMeta) == nil {
				cacheHit = true
			}
		}

		// 4. --- 【数据库穿透/降级层】 ---
		if !cacheHit {
			// 缓存未命中，或者 Redis 出现故障，无缝穿透查 DB
			err := db.Where("path = ? AND delete_time IS NULL", requestPath).First(&fileMeta).Error
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					ctx.JSON(http.StatusNotFound, gin.H{"error": "您访问的文件不存在或已被删除"})
				} else {
					playload.SendError(ctx, "加载文件权限元数据失败")
				}
				ctx.Abort()
				return
			}

			// 查询成功：将元数据异步写回 Redis 缓存，有效期设为 2 小时
			// 转换为 JSON 字符串存入
			if jsonBytes, err := json.Marshal(fileMeta); err == nil {
				// 异步写入，绝不阻塞主响应流程
				go utils.SafeSetToRedis(context.Background(), redisKey, string(jsonBytes), 2*time.Hour)
			}
		}

		// 5. 【多维权限矩阵校验】(保持原有的 Model 强类型常量校验逻辑)
		effectiveVisibility := fileMeta.Visibility
		if effectiveVisibility == model.VisInherit {
			if cfg, exists := model.TypeConfigMap[fileMeta.RelatedType]; exists {
				effectiveVisibility = cfg.Visibility
			}
		}

		switch effectiveVisibility {
		case model.VisPublic:
			break // 公开资源直接放行

		case model.VisPrivate:
			if fileMeta.CreateBy != currentUser.ID {
				playload.SendForbidden(ctx, "您没有访问此私有文件的权限")
				ctx.Abort()
				return
			}

		case model.VisInherit:
			// A. 工作区多租户基本身份拦截
			if fileMeta.WorkspaceID != nil {
				var wsUser model.WorkspaceUser
				err := db.Table(model.WorkspaceUser{}.TableName()).
					Where("workspace_id = ? AND user_id = ? AND status = 1 AND delete_time IS NULL", *fileMeta.WorkspaceID, currentUser.ID).
					First(&wsUser).Error

				if err != nil {
					playload.SendForbidden(ctx, "您不属于当前工作区，无权访问关联附件")
					ctx.Abort()
					return
				}
				ctx.Set("workspace_user_role", wsUser.Role)
			}

			// B. 文档树叶子节点深度级联穿透鉴权
			if fileMeta.RelatedType == model.TypePage && fileMeta.RelatedID != nil {
				wsRole, _ := ctx.Get("workspace_user_role")
				wsRoleStr := model.RoleWorkspaceNone
				if wsRole != nil {
					wsRoleStr = wsRole.(string)
				}

				// 调用先前编写的 checkPageReadPermissionWithModel 函数
				if !CheckPageReadPermissionWithModel(db, *fileMeta.RelatedID, currentUser.ID, wsRoleStr) {
					playload.SendForbidden(ctx, "您没有该文档页面的访问权限，无法查看关联媒体内容")
					ctx.Abort()
					return
				}
			}
		}

		// 6. 鉴权完全通过：吐出本地磁盘文件路径
		localDiskPath := filepath.Clean(strings.TrimPrefix(fileMeta.Path, "/"))
		ctx.Set("validated_local_path", localDiskPath)
		ctx.Set("validated_mime_type", fileMeta.MimeType)

		ctx.Next()
	}
}

// 模型驱动级联鉴权器：完美支持 InheritConfig 熔断机制、过期临时授权与空间角色推算
func CheckPageReadPermissionWithModel(db *gorm.DB, pageID uuid.UUID, userID uuid.UUID, wsRole string) bool {
	// 1. 抓取协同页面的核心安全边界
	var page model.Page
	err := db.Table(model.Page{}.TableName()).
		Select("id, visibility, space_id, create_by, inherit_config").
		Where("id = ? AND delete_time IS NULL", pageID).
		First(&page).Error

	if err != nil {
		return false // 页面已不存在或被软删除
	}

	// 2. 判定一：原始建页人自动放行
	if page.CreateBy == userID {
		return true
	}

	// 3. 判定二：如果页面本身属于 workspace (工作区全员可见)，且前置已过工作区检查，准予放行
	if page.Visibility == model.PageVisibilityWorkspace {
		return true
	}

	// 4. 提取当前用户在该工作区关联的所有部门/组 UUID 列表（支撑 Group 维度的权限交叉匹配）
	var groupIDs []uuid.UUID
	db.Table("sys_group_user").
		Where("user_id = ? AND delete_time IS NULL", userID).
		Pluck("group_id", &groupIDs)

	// 5. 判定三：命中页面级特许显式授权表 (model.PageAccess)
	var pageAccessCount int64
	pageQuery := db.Table(model.PageAccess{}.TableName()).
		Where("page_id = ? AND delete_time IS NULL AND (expired_time IS NULL OR expired_time > ?)", page.ID, time.Now())

	if len(groupIDs) > 0 {
		pageQuery = pageQuery.Where(
			"(subject_type = ? AND subject_id = ?) OR (subject_type = ? AND subject_id IN ?)",
			model.SubjectTypeUser, userID, model.SubjectTypeGroup, groupIDs,
		)
	} else {
		pageQuery = pageQuery.Where("subject_type = ? AND subject_id = ?", model.SubjectTypeUser, userID)
	}

	if err := pageQuery.Count(&pageAccessCount).Error; err == nil && pageAccessCount > 0 {
		return true // 用户个人或其部门已被明确授阅此保密页面
	}

	// 6. 【核心熔断拦截】：判定四：检查是否允许向上追溯继承权限
	// 如果页面的 InheritConfig 被设为 false，代表这是一个“彻底断绝上级继承”的强保密叶子页，
	// 就算用户拥有上级空间的 Admin/Owner，只要 PageAccess 没给他开绿灯，在此处即刻被拦截斩断！
	if !page.InheritConfig {
		return false
	}

	// 7. 判定五：页面允许继承，向上追溯检查对应的知识库空间 (model.Space)
	var space model.Space
	err = db.Table(model.Space{}.TableName()).
		Select("id, visibility, create_by").
		Where("id = ? AND delete_time IS NULL", page.SpaceID).
		First(&space).Error
	if err != nil {
		return false
	}

	// 7.1 如果上级知识库本身是 workspace 全员开放空间，则属于该区的成员（非禁用）默认继承查看权
	if space.Visibility == model.SpaceVisibilityWorkspace {
		return true
	}

	// 7.2 空间的最初创建者，默认继承其下所有开启了权限继承的文档查看权
	if space.CreateBy == userID {
		return true
	}

	// 8. 判定六：去空间授权表 (model.SpaceAccess) 中提取并匹配用户的显式空间授权
	var aclRoles []string
	spaceAclQuery := db.Table(model.SpaceAccess{}.TableName()).
		Where("space_id = ? AND delete_time IS NULL AND (expired_time IS NULL OR expired_time > ?)", space.ID, time.Now())

	if len(groupIDs) > 0 {
		spaceAclQuery = spaceAclQuery.Where(
			"(subject_type = ? AND subject_id = ?) OR (subject_type = ? AND subject_id IN ?)",
			model.SubjectTypeUser, userID, model.SubjectTypeGroup, groupIDs,
		)
	} else {
		spaceAclQuery = spaceAclQuery.Where("subject_type = ? AND subject_id = ?", model.SubjectTypeUser, userID)
	}

	// 拉取该用户个人及所属部门在当前空间被赋予的所有 Role 角色身份
	spaceAclQuery.Pluck("role", &aclRoles)

	// 9. 利用你的 model.EffectiveSpaceRole 高阶函数，将空间可见性、用户 ACL 角色数组、工作区大角色(如 owner 自动提权 admin)
	//    打包丢入其中进行空间最终有效角色的推演算账。
	finalSpaceRole := model.EffectiveSpaceRole(&space, userID, aclRoles, wsRole)

	// 只要最终推导出来的空间角色权重不属于 SpaceRoleNone (即 >= SpaceRoleViewer)，说明具备合法访问资产权
	if model.GetSpaceRoleWeight(finalSpaceRole) >= model.GetSpaceRoleWeight(model.SpaceRoleViewer) {
		return true
	}

	return false // 闯关失败，拒绝访问
}
