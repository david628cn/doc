package controller

import (
	"app/common"
	"app/playload"
	"app/services"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type StockCtrl struct{}

func (c *StockCtrl) List(context *gin.Context) {
	var params playload.ConditionRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	offsetLimit := playload.OffsetLimitData(params.PageNum, params.PageSize)
	//filterParams := make(map[string]playload.Expression)
	var filterParams []playload.Expression
	var values []interface{}
	for key, value := range params.Filter {
		values = []interface{}{value}
		if key == "name" {
			filterParams = append(filterParams, playload.Expression{
				Field: key,
				Op:    "?%",
				Value: values,
			})
		} else if key == "price" {
			filterParams = append(filterParams, playload.Expression{
				Field: key,
				Op:    ">=",
				Value: values,
			})
		} else {
			filterParams = append(filterParams, playload.Expression{
				Field: key,
				Op:    "=",
				Value: values,
			})
		}
	}
	conditionData := playload.ConditionData{
		Filter:  &filterParams,
		OrderBy: &params.OrderBy,
		Offset:  &offsetLimit.Offset,
		Limit:   &offsetLimit.Limit,
	}
	srv := services.StockService{}
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

func (c *StockCtrl) Trade(context *gin.Context) {
	var params playload.TradeRequest
	if err := context.ShouldBindJSON(&params); err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	result, err := common.LoadJSON(fmt.Sprintf("F:/python-space/qoue/sync/data/trade/%s-%s.json", params.Code, params.Date.Format("2006-01-02")))
	if err != nil {
		context.JSON(http.StatusOK, playload.ResponseError(err.Error(), nil))
		return
	}
	srv := services.StockService{}
	stocks, err := srv.FindList(playload.ConditionData{
		Filter: &[]playload.Expression{
			{
				Field: "code",
				Op:    "=",
				Value: []interface{}{params.Code},
			},
			{
				Field: "date",
				Op:    "=",
				Value: []interface{}{params.Date.Format("2006-01-02")},
			},
		},
	})
	if err == nil && len(stocks) > 0 {
		if slice, ok := result.([]interface{}); ok {
			result = append([]interface{}{fmt.Sprintf("09:15:00,%.2f,0,0,4", stocks[0].Prev)}, slice...)
		}
	}
	context.JSON(http.StatusOK, playload.ResponseSuccess("查询成功", result))
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
