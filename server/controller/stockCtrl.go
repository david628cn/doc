package controller

import (
	"app/playload"
	"app/services"
	"app/utils"
	"fmt"

	"github.com/gin-gonic/gin"
)

type StockCtrl struct {
	StockSrv *services.StockService
}

func NewStockCtrl(stockSrv *services.StockService) *StockCtrl {
	return &StockCtrl{
		StockSrv: stockSrv,
	}
}

func (c *StockCtrl) List(ctx *gin.Context) {
	var params playload.ConditionReq
	if err := ctx.ShouldBindJSON(&params); err != nil {
		playload.SendError(ctx, err.Error())
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
	result, err := c.StockSrv.FindList(ctx, &conditionData)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	count, err := c.StockSrv.FindCount(ctx, &conditionData)
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	playload.SendSuccess(ctx, playload.PaginationData{List: result, Total: count}, "查询成功")
}

func (c *StockCtrl) Trade(ctx *gin.Context) {
	var params playload.TradeReq
	if err := ctx.ShouldBindJSON(&params); err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	result, err := utils.LoadJSON(fmt.Sprintf("F:/python-space/qoue/sync/data/trade/%s/%s-%s.json", params.Date.Format("2006-01-02"), params.Code, params.Date.Format("2006-01-02")))
	if err != nil {
		playload.SendError(ctx, err.Error())
		return
	}
	stocks, err := c.StockSrv.FindList(ctx, &playload.ConditionData{
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
	playload.SendSuccess(ctx, result, "查询成功")
}
