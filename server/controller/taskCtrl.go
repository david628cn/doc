package controller

import (
	"app/playload"
	"app/services"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type TaskCtrl struct {
	service *services.TaskService
}

func NewTaskCtrl(service *services.TaskService) *TaskCtrl {
	return &TaskCtrl{service: service}
}

//func (c *TaskCtrl) List(context *gin.Context) {
//	var params playload.ConditionRequest
//	if err := context.ShouldBindJSON(&params); err != nil {
//		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
//		return
//	}
//	offsetLimit := playload.OffsetLimitData(params.PageNum, params.PageSize)
//	//filterParams := make(map[string]playload.Expression)
//	var filterParams []playload.Expression
//	var values []interface{}
//	for key, value := range params.Filter {
//		values = []interface{}{value}
//		if key == "name" {
//			filterParams = append(filterParams, playload.Expression{
//				Field: key,
//				Op:    "?%",
//				Value: values,
//			})
//		} else if key == "price" {
//			filterParams = append(filterParams, playload.Expression{
//				Field: key,
//				Op:    ">=",
//				Value: values,
//			})
//		} else {
//			filterParams = append(filterParams, playload.Expression{
//				Field: key,
//				Op:    "=",
//				Value: values,
//			})
//		}
//	}
//	conditionData := playload.ConditionData{
//		Filter:  &filterParams,
//		OrderBy: &params.OrderBy,
//		Offset:  &offsetLimit.Offset,
//		Limit:   &offsetLimit.Limit,
//	}
//	srv := services.StockService{}
//	result, err := srv.FindList(conditionData)
//	if err != nil {
//		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
//		return
//	}
//	count, err := srv.FindCount(conditionData)
//	if err != nil {
//		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
//		return
//	}
//	context.JSON(http.StatusOK, playload.ResponseSuccess("查询成功", playload.PaginationData{List: result, Total: count}))
//}

func (c *TaskCtrl) Start(context *gin.Context) {
	//var params playload.TradeRequest
	//if err := context.ShouldBindJSON(&params); err != nil {
	//	context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
	//	return
	//}
	//cn := cron.New(cron.WithSeconds())
	//id, err := cn.AddFunc("*/5 * * * * *", func() {
	//	fmt.Println("每5秒执行定时任务", time.Now().Format("15:04:05"))
	//})
	//fmt.Println("Task Start")
	//cn.Start()
	//defer cn.Stop()
	err := c.service.AddTask("task0", "*/5 * * * * *", func() {
		// 任务执行逻辑
		fmt.Println("每5秒执行定时任务", time.Now().Format("15:04:05"))
	})
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
	}
	c.service.StartTask("task0")
	context.JSON(http.StatusOK, playload.ResponseSuccess("启动成功", "task0"))
}

func (c *TaskCtrl) Stop(context *gin.Context) {
	var params playload.TaskRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	ok := c.service.RemoveTask(params.Id)
	if !ok {
		context.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("停止成功", ok))
}

func (c *TaskCtrl) ReStart(context *gin.Context) {
	var params playload.TradeRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("重启成功", nil))
}

//func CreateUsers(context *gin.Context) {
//	var users model.Users
//	if err := context.ShouldBindJSON(&users); err != nil {
//		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
//		return
//	}
//
//	if result := db.DB.Create(&users); result.Error != nil {
//		context.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
//		return
//	}
//
//	context.JSON(http.StatusCreated, users)
//}
//
//func GetUsers(context *gin.Context) {
//	var users []model.Users
//	if result := db.DB.Find(&users); result.Error != nil {
//		context.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
//		return
//	}
//	context.JSON(http.StatusOK, users)
//}
