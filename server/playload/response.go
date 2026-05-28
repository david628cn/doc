package playload

import (
	"app/errs"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Response 使用泛型 T，讓 Data 類型更精確
type Response struct {
	Code    int    `json:"code"`
	Data    any    `json:"data"`
	Message string `json:"message"`
}

// ResponseSuccess 成功響應
func ResponseSuccess(message string, data any) Response {
	return Response{
		Code:    200,
		Data:    data,
		Message: message,
	}
}

// ResponseError 業務邏輯錯誤 (如：用戶名已存在)
func ResponseError(message string) Response {
	return Response{
		Code:    400, // 建議使用標準 HTTP 狀態碼或其變體
		Data:    nil,
		Message: message,
	}
}

func ResponseInternalError(message string) Response {
	return Response{
		Code:    500, // 500
		Data:    nil,
		Message: message,
	}
}

// ResponseUnauthorized 授權失敗 (如：Token 過期)
func ResponseUnauthorized(message string) Response {
	return Response{
		Code:    401,
		Data:    nil,
		Message: message,
	}
}

// ResponseForbidden 權限不足 (如：不是該 Workspace 成員)
func ResponseForbidden(message string) Response {
	return Response{
		Code:    403,
		Data:    nil,
		Message: message,
	}
}

// ResponseConflict 乐观锁 / 版本冲突 (HTTP 409)
func ResponseConflict(message string) Response {
	return Response{
		Code:    409,
		Data:    nil,
		Message: message,
	}
}

// SendSuccess 成功返回 (HTTP 200)
func SendSuccess(ctx *gin.Context, data any, message ...string) {
	msg := "操作成功"
	if len(message) > 0 {
		msg = message[0]
	}
	ctx.JSON(http.StatusOK, ResponseSuccess(msg, data))
}

// SendError 业务错误 (HTTP 400)
func SendError(ctx *gin.Context, message string) {
	ctx.JSON(http.StatusBadRequest, ResponseError(message))
}

// SendUnauthorized 认证失败 (HTTP 401)
func SendUnauthorized(ctx *gin.Context, message string) {
	ctx.JSON(http.StatusUnauthorized, ResponseUnauthorized(message))
}

// SendForbidden 权限不足 (HTTP 403)
func SendForbidden(ctx *gin.Context, message string) {
	ctx.JSON(http.StatusForbidden, ResponseForbidden(message))
}

// SendConflict 版本冲突 (HTTP 409)
func SendConflict(ctx *gin.Context, message string) {
	ctx.JSON(http.StatusConflict, ResponseConflict(message))
}

// SendInternalError 系统错误 (HTTP 500)
func SendInternalError(ctx *gin.Context, message ...string) {
	msg := "服务器内部错误"
	if len(message) > 0 {
		msg = message[0]
	}
	ctx.JSON(http.StatusInternalServerError, ResponseInternalError(msg))
}

// SendErr 将业务 Sentinel 错误映射为 HTTP 状态码
func SendErr(ctx *gin.Context, err error) {
	if err == nil {
		return
	}
	switch {
	case errors.Is(err, errs.ErrUnauthorized):
		SendUnauthorized(ctx, err.Error())
	case errors.Is(err, errs.ErrForbidden),
		errors.Is(err, errs.ErrNotWorkspaceMember),
		errors.Is(err, errs.ErrCannotRemoveOwner),
		errors.Is(err, errs.ErrCannotModifyOwner),
		errors.Is(err, errs.ErrCannotPromoteToOwner),
		errors.Is(err, errs.ErrOnlySpaceOwnerDeletes),
		errors.Is(err, errs.ErrWorkspaceGuestReadOnly),
		errors.Is(err, errs.ErrInsufficientSpaceRoleForEdit),
		errors.Is(err, errs.ErrInsufficientWorkspaceRoleAdmin),
		errors.Is(err, errs.ErrWorkspaceGuestNoMemberList),
		errors.Is(err, errs.ErrOnlyWorkspaceOwnerGrantsAdmin),
		errors.Is(err, errs.ErrSpaceAlreadyHasOwner):
		SendForbidden(ctx, err.Error())
	case errors.Is(err, errs.ErrResetOwnerTarget):
		SendError(ctx, err.Error())
	case errors.Is(err, errs.ErrPageContentConflict):
		SendConflict(ctx, err.Error())
	case errors.Is(err, errs.ErrPagePatchInvalid):
		SendError(ctx, err.Error())
	case errors.Is(err, errs.ErrJoinRequestPending):
		SendConflict(ctx, err.Error())
	case errors.Is(err, errs.ErrJoinRequestNotApplicable):
		SendError(ctx, err.Error())
	case errors.Is(err, errs.ErrJoinRequestForbidden):
		SendForbidden(ctx, err.Error())
	case errors.Is(err, errs.ErrJoinRequestNotFound):
		ctx.JSON(http.StatusNotFound, ResponseError(err.Error()))
	case errors.Is(err, errs.ErrPageNotFound),
		errors.Is(err, errs.ErrPageRevisionNotFound),
		errors.Is(err, errs.ErrInviteNotFound),
		errors.Is(err, gorm.ErrRecordNotFound):
		ctx.JSON(http.StatusNotFound, ResponseError(err.Error()))
	default:
		SendError(ctx, err.Error())
	}
}
