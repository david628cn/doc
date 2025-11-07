package dao

import (
	"app/db"
	"app/playload"
	"fmt"
	"reflect"
	"strings"

	"gorm.io/gorm"
)

type BaseDao[T any] struct {
	//DB *gorm.DB
}

func IsNotEmpty(value interface{}) bool {
	val := reflect.ValueOf(value)
	switch val.Kind() {
	case reflect.String:
		return val.String() != ""
	case reflect.Array, reflect.Slice, reflect.Map:
		return val.Len() > 0
	case reflect.Ptr, reflect.Interface, reflect.Chan, reflect.Func:
		return !val.IsNil()
	// 可以根据需要添加更多类型
	default:
		// 对于其他类型，你可能需要自定义逻辑或返回false
		return false
	}
}

//func CombinQuery(query *gorm.DB, conditionData playload.ConditionData, isCount bool) *gorm.DB {
//	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
//		for key, value := range *conditionData.Filter {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s = ?", key), value)
//			}
//		}
//	}
//	if conditionData.StartWith != nil && len(*conditionData.StartWith) > 0 {
//		for key, value := range *conditionData.StartWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%%%s", value))
//			}
//		}
//	}
//	if conditionData.MidWith != nil && len(*conditionData.MidWith) > 0 {
//		for key, value := range *conditionData.MidWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%%%s%%", value))
//			}
//		}
//	}
//	if conditionData.EndWith != nil && len(*conditionData.EndWith) > 0 {
//		for key, value := range *conditionData.EndWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//			}
//		}
//	}
//	if isCount == false {
//		if conditionData.OrderBy != nil {
//			var orderByBuilder strings.Builder
//			if len(conditionData.OrderBy.Asc) > 0 {
//				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Asc, ","))
//			}
//			if len(conditionData.OrderBy.Desc) > 0 {
//				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Desc, " DESC,"))
//				orderByBuilder.WriteString(" DESC")
//			}
//			orderByStr := orderByBuilder.String()
//			if len(orderByStr) > 0 {
//				query = query.Order(orderByStr)
//			}
//		}
//		if conditionData.Offset != nil {
//			query = query.Offset(*conditionData.Offset)
//		}
//		if conditionData.Limit != nil {
//			query = query.Limit(*conditionData.Limit)
//		}
//	}
//	return query
//}

//func CombinQuery(query *gorm.DB, conditionData playload.ConditionData, isCount bool) *gorm.DB {
//	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
//		for key, value := range *conditionData.Filter {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s = ?", key), value)
//			}
//		}
//	}
//	if conditionData.StartWith != nil && len(*conditionData.StartWith) > 0 {
//		for key, value := range *conditionData.StartWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%%%s", value))
//			}
//		}
//	}
//	if conditionData.MidWith != nil && len(*conditionData.MidWith) > 0 {
//		for key, value := range *conditionData.MidWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%%%s%%", value))
//			}
//		}
//	}
//	if conditionData.EndWith != nil && len(*conditionData.EndWith) > 0 {
//		for key, value := range *conditionData.EndWith {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s LIKE ?", key), fmt.Sprintf("%s%%", value))
//			}
//		}
//	}
//	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
//		for key, value := range *conditionData.Filter {
//			if IsNotEmpty(value) == true {
//				query = query.Where(fmt.Sprintf("%s = ?", key), value)
//			}
//		}
//	}
//	if isCount == false {
//		if conditionData.OrderBy != nil {
//			var orderByBuilder strings.Builder
//			if len(conditionData.OrderBy.Asc) > 0 {
//				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Asc, ","))
//			}
//			if len(conditionData.OrderBy.Desc) > 0 {
//				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Desc, " DESC,"))
//				orderByBuilder.WriteString(" DESC")
//			}
//			orderByStr := orderByBuilder.String()
//			if len(orderByStr) > 0 {
//				query = query.Order(orderByStr)
//			}
//		}
//		if conditionData.Offset != nil {
//			query = query.Offset(*conditionData.Offset)
//		}
//		if conditionData.Limit != nil {
//			query = query.Limit(*conditionData.Limit)
//		}
//	}
//	return query
//}

func CombinQuery(query *gorm.DB, conditionData playload.ConditionData, isCount bool) *gorm.DB {
	if conditionData.Filter != nil && len(*conditionData.Filter) > 0 {
		for _, expr := range *conditionData.Filter {
			if expr.Value != nil && len(expr.Value) > 0 {
				switch expr.Op {
				case "%?":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s LIKE ?", expr.Field), fmt.Sprintf("%%%s", expr.Value[0]))
					}
				case "%?%":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s LIKE ?", expr.Field), fmt.Sprintf("%%%s%%", expr.Value[0]))
					}
				case "?%":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s LIKE ?", expr.Field), fmt.Sprintf("%s%%", expr.Value[0]))
					}
				case "=":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s = ?", expr.Field), expr.Value[0])
					}
				case "<":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s < ?", expr.Field), expr.Value[0])
					}
				case "<=":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s <= ?", expr.Field), expr.Value[0])
					}
				case ">":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s > ?", expr.Field), expr.Value[0])
					}
				case ">=":
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s >= ?", expr.Field), expr.Value[0])
					}
				case "<?<":
					if IsNotEmpty(expr.Value[0]) == true && IsNotEmpty(expr.Value[1]) == true {
						query = query.Where(fmt.Sprintf("%s > ?", expr.Field), expr.Value[0])
						query = query.Where(fmt.Sprintf("%s < ?", expr.Field), expr.Value[1])
					}
				case "<=?<":
					if IsNotEmpty(expr.Value[0]) == true && IsNotEmpty(expr.Value[1]) == true {
						query = query.Where(fmt.Sprintf("%s >= ?", expr.Field), expr.Value[0])
						query = query.Where(fmt.Sprintf("%s < ?", expr.Field), expr.Value[1])
					}
				case "<?<=":
					if IsNotEmpty(expr.Value[0]) == true && IsNotEmpty(expr.Value[1]) == true {
						query = query.Where(fmt.Sprintf("%s > ?", expr.Field), expr.Value[0])
						query = query.Where(fmt.Sprintf("%s <= ?", expr.Field), expr.Value[1])
					}
				case "<=?<=":
					if IsNotEmpty(expr.Value[0]) == true && IsNotEmpty(expr.Value[1]) == true {
						query = query.Where(fmt.Sprintf("%s >= ?", expr.Field), expr.Value[0])
						query = query.Where(fmt.Sprintf("%s <= ?", expr.Field), expr.Value[1])
					}
				default:
					if IsNotEmpty(expr.Value[0]) == true {
						query = query.Where(fmt.Sprintf("%s = ?", expr.Field), expr.Value[0])
					}
				}
			}
		}
	}
	if isCount == false {
		if conditionData.OrderBy != nil {
			var orderByBuilder strings.Builder
			if len(conditionData.OrderBy.Asc) > 0 {
				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Asc, ","))
			}
			if len(conditionData.OrderBy.Desc) > 0 {
				orderByBuilder.WriteString(strings.Join(conditionData.OrderBy.Desc, " DESC,"))
				orderByBuilder.WriteString(" DESC")
			}
			orderByStr := orderByBuilder.String()
			if len(orderByStr) > 0 {
				query = query.Order(orderByStr)
			}
		}
		if conditionData.Offset != nil {
			query = query.Offset(*conditionData.Offset)
		}
		if conditionData.Limit != nil {
			query = query.Limit(*conditionData.Limit)
		}
	}
	return query
}

func (c *BaseDao[T]) QueryById(id interface{}) (T, error) {
	var entity T
	result := db.DB.Model(&entity).Where("id = ?", id).Find(&entity)
	if result.Error != nil {
		return entity, result.Error
	}
	return entity, nil
}

func (c *BaseDao[T]) QueryList(conditionData playload.ConditionData) ([]T, error) {
	var entity []T
	query := db.DB.Model(&entity)
	query = CombinQuery(query, conditionData, false)
	result := query.Find(&entity)
	if result.Error != nil {
		return entity, result.Error
	}
	return entity, nil
}

func (c *BaseDao[T]) QueryListEx(conditionData playload.ConditionData) ([]T, error) {
	var entity []T
	query := db.DB.Select("id")
	query = CombinQuery(query, conditionData, false)
	query = query.Model(&entity)
	result := db.DB.Model(&entity).Joins("INNER JOIN (?) b USING(id)", query).Find(&entity)
	if result.Error != nil {
		return entity, result.Error
	}
	return entity, nil
}

func (c *BaseDao[T]) QueryCount(conditionData playload.ConditionData) (int64, error) {
	var entity []T
	var count int64
	query := db.DB.Model(&entity).Select("id")
	query = CombinQuery(query, conditionData, true)
	result := query.Count(&count)
	if result.Error != nil {
		return count, result.Error
	}
	return count, nil
}

func (c *BaseDao[T]) Create(entity T) bool {
	result := db.DB.Create(&entity)
	if result.Error != nil {
		return false
	}
	return true
}

func (c *BaseDao[T]) CreateBat(entity []T) bool {
	result := db.DB.Create(&entity)
	if result.Error != nil {

		return false
	}
	return true
}

func (c *BaseDao[T]) Delete(entity T, id interface{}) bool {
	result := db.DB.Delete(&entity, id)
	if result.Error != nil {
		return false
	}
	return true
}

func (c *BaseDao[T]) DeleteBat(entity T, ids []interface{}) bool {
	result := db.DB.Delete(&entity, ids)
	if result.Error != nil {
		return false
	}
	return true
}

func (c *BaseDao[T]) Update(entity T) bool {
	result := db.DB.Save(&entity)
	if result.Error != nil {
		return false
	}
	return true
}
