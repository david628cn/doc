package controller

import (
	"app/common"
	"app/config"
	"app/logger"
	"app/model"
	"app/playload"
	"app/services"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
)

type FilesCtrl struct {
}

func GetUploadPath() string {
	cfg := config.Get()
	return cfg.Upload.Path
}

func (c *FilesCtrl) CheckChunks(context *gin.Context) {
	var params playload.CheckChunksRequest
	if err := context.BindQuery(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	uploadPath := GetUploadPath()
	md5Dir := filepath.Join(uploadPath, params.Md5)
	fileType := filepath.Ext(params.FileName)
	md5FileName := md5Dir + fileType
	result := playload.CheckChunksData{
		Skip:     false,
		Uploaded: nil,
	}
	var msg string
	var currentList []string
	if !common.FileIsExist(md5FileName) {
		if common.FileIsExist(md5Dir) {
			md5DirSubFileList := common.GetSubFilesByDir(md5Dir)
			for _, subFile := range md5DirSubFileList {
				currentList = append(currentList, subFile.Name())
			}
		}
		msg = "获取已上传文件分片"
		result.Skip = false
		result.Uploaded = currentList

	} else {
		msg = "文件已存在，上传成功"
		result.Skip = true
		result.Uploaded = currentList
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess(msg, result))
}

func (c *FilesCtrl) UploadChunks(context *gin.Context) {
	var params playload.UploadChunksRequest
	if err := context.ShouldBindWith(&params, binding.FormMultipart); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	uploadPath := GetUploadPath()
	md5Dir := filepath.Join(uploadPath, params.Md5)
	if err := os.MkdirAll(md5Dir, 0755); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	chunkFilename := filepath.Join(md5Dir, strconv.FormatInt(params.ChunkNumber, 10))
	if err := common.UploadFile(params.File, chunkFilename); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("写入文件切片成功", nil))
}

func (c *FilesCtrl) MergeChunks(context *gin.Context) {
	var params playload.MergeChunksRequest
	if err := context.BindQuery(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	uploadPath := GetUploadPath()
	md5Dir := filepath.Join(uploadPath, params.Md5)

	md5DirSubFileList := common.GetSubFilesByDir(md5Dir)
	if len(md5DirSubFileList) == 0 {
		context.JSON(http.StatusOK, playload.ResponseSuccess("上传失败, 文件分片不存在", nil))
		return
	}

	fileType := filepath.Ext(params.FileName)
	//md5FileName := md5Dir + fileType
	outFileName := filepath.Join(uploadPath, params.FileName)
	var chunkPathList []string
	for index := range len(md5DirSubFileList) {
		chunkPathList = append(chunkPathList, filepath.Join(md5Dir, strconv.Itoa(index)))
	}
	if err := common.MergeFlies(chunkPathList, outFileName); err != nil {
		context.JSON(http.StatusOK, playload.ResponseSuccess("上传失败，合并文件切片失败", outFileName))
		return
	}
	if err := common.DeleteDir(md5Dir); err != nil {
		logger.Warn(err.Error())
	}

	currentUser := common.GetCurrentUser(context)
	if currentUser != nil {
		fileInfo, _ := os.Stat(outFileName)
		m := model.Files{
			Name:       params.FileName,
			Type:       fileType,
			Size:       fileInfo.Size(),
			Path:       outFileName,
			Desc:       params.Desc,
			UserId:     currentUser.ID,
			CreateDate: time.Now(),
			UpdateDate: time.Now(),
		}
		srv := services.FilesService{}
		if is := srv.Add(m); is == false {
			context.JSON(http.StatusOK, playload.ResponseError("上传失败", nil))
		}
	}

	context.JSON(http.StatusOK, playload.ResponseSuccess("上传成功", outFileName))
}

func (c *FilesCtrl) Upload(context *gin.Context) {
	var params playload.UploadRequest
	if err := context.ShouldBindWith(&params, binding.FormMultipart); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	//// 使用 MultipartForm 方法解析 multipart/form-data 表单数据
	//form, err := context.MultipartForm()
	//if err != nil {
	//	context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
	//	return
	//}
	//
	//// 获取表单中的文件，这里的 "file" 是表单字段的名字
	//files := form.File["file"] // 获取所有上传的文件，这里的 "file" 是表单字段的名字
	//if len(files) == 0 {
	//	context.JSON(http.StatusOK, playload.ResponseError("No file uploaded", nil))
	//	return
	//}
	//
	//// 处理单个文件上传
	//file := files[0] // 取第一个文件，如果有多个文件上传，可以循环处理每个文件
	uploadPath := GetUploadPath()
	file := params.File
	outFileName := filepath.Join(uploadPath, file.Filename)
	if err := common.UploadFile(file, outFileName); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}

	//// 首先获取文件名，然后去除扩展名
	//fileName := filepath.Base(file.Filename)
	//baseName := strings.TrimSuffix(fileName, filepath.Ext(fileName))

	fileName := filepath.Base(file.Filename)
	fileType := filepath.Ext(file.Filename)
	fileSize := file.Size

	currentUser := common.GetCurrentUser(context)
	if currentUser != nil {
		m := model.Files{
			Name:       fileName,
			Type:       fileType,
			Size:       fileSize,
			Path:       outFileName,
			Desc:       params.Desc,
			UserId:     currentUser.ID,
			CreateDate: time.Now(),
			UpdateDate: time.Now(),
		}
		srv := services.FilesService{}
		if is := srv.Add(m); is == false {
			context.JSON(http.StatusOK, playload.ResponseError("上传失败", nil))
		}
	}

	// 返回成功响应
	context.JSON(http.StatusOK, playload.ResponseSuccess("上传成功", outFileName))
}

func (c *FilesCtrl) List(context *gin.Context) {
	var params playload.ConditionRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	offsetLimit := playload.OffsetLimitData(params.PageNum, params.PageSize)
	var filterParams []playload.Expression
	for key, value := range params.Filter {
		val, ok := value.(map[string]interface{})
		if ok {
			filterParams = append(filterParams, playload.Expression{
				Field: key,
				Op:    val["op"].(string),
				Value: val["value"].([]interface{}),
			})
		} else {
			filterParams = append(filterParams, playload.Expression{
				Field: key,
				Op:    "=",
				Value: []interface{}{value},
			})
		}
	}
	conditionData := playload.ConditionData{
		Filter:  &filterParams,
		OrderBy: &params.OrderBy,
		Offset:  &offsetLimit.Offset,
		Limit:   &offsetLimit.Limit,
	}
	srv := services.FilesService{}
	result, err := srv.FindList(conditionData)
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	count, err := srv.FindCount(conditionData)
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("查询成功", playload.PaginationData{List: result, Total: count}))
}

func (c *FilesCtrl) Delete(context *gin.Context) {
	var params playload.DeleteRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	if len(params.Ids) > 0 {
		var m []interface{}
		for _, value := range params.Ids {
			m = append(m, value)
		}
		srv := services.FilesService{}
		if is := srv.Remove(m); is == false {
			context.JSON(http.StatusOK, playload.ResponseError("操作失败", nil))
		}
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("操作成功", nil))
}
