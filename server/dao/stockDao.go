package dao

import (
	"app/model"
)

type StockDao struct {
	BaseDao[model.Stock]
}

//func (c *StockDao) QueryList(conditionData playload.ConditionData) ([]model.Stock, error) {
//	var m []model.Stock
//	query := db.DB.Select("id")
//	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
//		for key, value := range *conditionData.Filter {
//			switch value.(type) {
//			case int:
//				query = query.Where(fmt.Sprintf("%s = ?", key), value)
//			case string:
//				if len(value.(string)) > 0 {
//					//if common.IsValidDate(fmt.Sprintf("%v", value)) {
//					//	query = query.Where(fmt.Sprintf("%s = ?", key), fmt.Sprintf("%s", value))
//					//} else {
//					query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//					// }
//				}
//			default:
//				//if len(value.(string)) > 0 {
//				//	query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//				//}
//			}
//		}
//	}
//	if conditionData.OrderBy != nil {
//		var orderByBuilder strings.Builder
//		if len(conditionData.OrderBy.Asc) > 0 {
//			orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Asc, ","))
//		}
//		if len(conditionData.OrderBy.Desc) > 0 {
//			orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Desc, " DESC,"))
//		}
//		orderByStr := orderByBuilder.String()
//		if len(orderByStr) > 0 {
//			query = query.Order(orderByStr)
//		}
//	}
//	if conditionData.Offset != nil {
//		query = query.Offset(*conditionData.Offset)
//	}
//	if conditionData.Limit != nil {
//		query = query.Limit(*conditionData.Limit)
//	}
//	query = query.Find(&m)
//	result := db.DB.Model(&m).Joins("INNER JOIN (?) b on sys_stock.id = b.id", query).Scan(&m)
//	if result.Error != nil {
//		return m, result.Error
//	}
//	return m, nil
//}
//
//func (c *StockDao) QueryCount(conditionData playload.ConditionData) (int64, error) {
//	var m []model.Stock
//	var count int64
//	query := db.DB.Model(&m).Select("id")
//	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
//		for key, value := range *conditionData.Filter {
//			switch value.(type) {
//			case int:
//				query = query.Where(fmt.Sprintf("%s = ?", key), value)
//			case string:
//				if len(value.(string)) > 0 {
//					//if common.IsValidDate(fmt.Sprintf("%v", value)) {
//					//	query = query.Where(fmt.Sprintf("%s = ?", key), fmt.Sprintf("%s", value))
//					//} else {
//					query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//					// }
//				}
//			default:
//				//if len(value.(string)) > 0 {
//				//	query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//				//}
//			}
//		}
//	}
//	result := query.Count(&count)
//	if result.Error != nil {
//		return count, result.Error
//	}
//	return count, nil
//}
