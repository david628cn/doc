package dao

import (
	"app/playload"
	"app/utils"
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BaseDao[T any] struct {
	DB *gorm.DB
}

var fieldNameRegexp = regexp.MustCompile(`^[a-zA-Z0-9_\.]+$`)
var validBasicOps = map[string]bool{"=": true, "<": true, ">": true, "<=": true, ">=": true, "!=": true}

// 辅助函数：只生成 SQL 片段和参数，不操作 DB 对象
func BuildRawCondition(e *playload.Expression) (interface{}, []interface{}) {
	if !fieldNameRegexp.MatchString(e.Field) || len(e.Value) == 0 {
		return nil, nil
	}

	op := strings.ToUpper(e.Op)
	col := clause.Column{Name: e.Field}

	switch op {
	case "IN":
		return clause.IN{Column: col, Values: e.Value}, nil
	case "NOT IN":
		return clause.Not(clause.IN{Column: col, Values: e.Value}), nil
	case "IS NULL":
		return clause.Eq{Column: col, Value: nil}, nil
	case "IS NOT NULL":
		return clause.Neq{Column: col, Value: nil}, nil

	// 模糊查询：自动处理前缀/后缀/全包含
	case "LIKE", "%?", "?%", "%?%":
		val := fmt.Sprintf("%v", e.Value[0])
		// 如果 op 包含 %，则按规则拼接；否则按原生 LIKE 处理（要求 Value 自带 %）
		if strings.Contains(op, "%") {
			if strings.HasPrefix(op, "%") {
				val = "%" + val
			}
			if strings.HasSuffix(op, "%") {
				val = val + "%"
			}
		}
		return gorm.Expr("? LIKE ?", col, val), nil

	// 范围查询：解析 4 种闭合/开区间组合
	// 格式：<?< (开), <=?< (左闭), <?<= (右闭), <=?<= (全闭)
	case "<?<", "<=?<", "<?<=", "<=?<=":
		if len(e.Value) < 2 {
			return nil, nil
		}
		leftOp, rightOp := ">", "<"
		if strings.HasPrefix(op, "<=") {
			leftOp = ">="
		}
		if strings.HasSuffix(op, "<=") {
			rightOp = "<="
		}

		// 使用 Expr 确保字段名被正确转义，且参数占位符清晰
		return gorm.Expr(fmt.Sprintf("? %s ? AND ? %s ?", leftOp, rightOp),
			col, e.Value[0], col, e.Value[1]), nil

	// 基础比较操作符
	case "=", "!=", ">", ">=", "<", "<=":
		return gorm.Expr(fmt.Sprintf("? %s ?", op), col, e.Value[0]), nil

	default:
		// 默认兜底为等于
		return gorm.Expr("? = ?", col, e.Value[0]), nil
	}
}

// 辅助函数：只生成 Where 條件
func BuildFilter(query *gorm.DB, conditionData *playload.ConditionData) *gorm.DB {
	if conditionData == nil || conditionData.Filter == nil {
		return query
	}

	for _, expr := range *conditionData.Filter {
		cond, args := BuildRawCondition(&expr)
		if cond == nil {
			continue
		}

		// 处理逻辑连接词 (AND/OR)
		if strings.EqualFold(expr.Logic, "OR") {
			query = query.Or(cond, args...)
		} else {
			query = query.Where(cond, args...)
		}
	}
	return query
}

// 处理排序
func BuildOrder(query *gorm.DB, conditionData *playload.ConditionData) *gorm.DB {
	if conditionData.OrderBy != nil {
		var columns []clause.OrderByColumn

		for _, f := range conditionData.OrderBy.Asc {
			if fieldNameRegexp.MatchString(f) {
				columns = append(columns, clause.OrderByColumn{
					Column: clause.Column{Name: f},
					Desc:   false,
				})
			}
		}
		for _, f := range conditionData.OrderBy.Desc {
			if fieldNameRegexp.MatchString(f) {
				columns = append(columns, clause.OrderByColumn{
					Column: clause.Column{Name: f},
					Desc:   true,
				})
			}
		}

		if len(columns) > 0 {
			query = query.Clauses(clause.OrderBy{Columns: columns})
		}
	}
	return query
}

// 处理分页
func BuildPagination(query *gorm.DB, conditionData *playload.ConditionData) *gorm.DB {
	// Default limit guardrail: avoid accidental full table scans.
	// Callers that truly need unbounded results should set Limit explicitly.
	const defaultLimit = 100
	const maxLimit = 500

	if conditionData == nil {
		return query.Limit(defaultLimit)
	}
	if conditionData.Offset != nil {
		query.Offset(*conditionData.Offset)
	}
	if conditionData.Limit != nil {
		lim := *conditionData.Limit
		if lim <= 0 {
			lim = defaultLimit
		} else if lim > maxLimit {
			lim = maxLimit
		}
		query.Limit(lim)
	} else {
		query.Limit(defaultLimit)
	}
	return query
}

func (c *BaseDao[T]) QueryById(ctx context.Context, id uuid.UUID) (*T, error) {
	var entity T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	if err := executor.Model(&entity).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

func (c *BaseDao[T]) QueryList(ctx context.Context, conditionData *playload.ConditionData) ([]T, error) {
	var entity []T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	query := executor.Model(&entity)
	query = BuildFilter(query, conditionData)
	query = BuildOrder(query, conditionData)
	query = BuildPagination(query, conditionData)
	if err := query.Find(&entity).Error; err != nil {
		return nil, err
	}
	return entity, nil
}

func (c *BaseDao[T]) QueryListEx(ctx context.Context, conditionData *playload.ConditionData) ([]T, error) {
	var entity []T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	query := executor.Select("id")
	query = BuildFilter(query, conditionData)
	query = BuildOrder(query, conditionData)
	query = BuildPagination(query, conditionData)
	query = query.Model(&entity)
	// if err := executor.Model(&entity).Joins("INNER JOIN (?) b USING(id)", query).Find(&entity).Error; err != nil {
	if err := executor.Model(&entity).Joins("INNER JOIN (?) AS b ON ?.id = b.id", query, clause.Table{Name: executor.Statement.Table}).Find(&entity).Error; err != nil {
		return nil, err
	}
	return entity, nil
}

func (c *BaseDao[T]) QueryFirst(ctx context.Context, conditionData *playload.ConditionData) (*T, error) {
	var entity T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)

	// 複用過濾和排序邏輯
	query := executor.Model(&entity)
	query = BuildFilter(query, conditionData)
	query = BuildOrder(query, conditionData)

	// 強制限制 1 條，並使用 Find 避免 ErrRecordNotFound 報錯
	err := query.First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // ✅ 關鍵：找不到數據時，返回 (nil, nil) 而不是 error
		}
		return nil, err
	}
	return &entity, nil
}

func (c *BaseDao[T]) QueryFirstEx(ctx context.Context, conditionData *playload.ConditionData) (*T, error) {
	var entity T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)

	// 內部子查詢只取 1 個 ID
	subQuery := executor.Select("id")
	subQuery = BuildFilter(subQuery, conditionData)
	subQuery = BuildOrder(subQuery, conditionData)
	subQuery = subQuery.Limit(1).Model(&entity)

	// 執行延遲關聯查詢
	err := executor.Model(&entity).
		// Joins("INNER JOIN (?) b USING(id)", subQuery).
		Joins("INNER JOIN (?) AS b ON ?.id = b.id", subQuery).
		First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // ✅ 關鍵：找不到數據時，返回 (nil, nil) 而不是 error
		}
		return nil, err
	}
	return &entity, nil
}

//func (c *BaseDao[T]) QueryCount(conditionData *playload.ConditionData) (int64, error) {
//	var entity []T
//	var count int64
//	query := c.DB.Model(&entity).Select("id")
//	query = CombinQuery(query, conditionData, true)
//	result := query.Count(&count)
//	if result.Error != nil {
//		return count, result.Error
//	}
//	return count, nil
//}

//一个潜在的逻辑小坑（针对 QueryCount）
//在 QueryCount 方法中，你定义了 var entity []T。
//在 GORM 中，执行 Count 时不需要定义切片，只需要指定模型即可。使用切片可能会触发不必要的内存分配。

func (c *BaseDao[T]) QueryCount(ctx context.Context, conditionData *playload.ConditionData) (int64, error) {
	var count int64
	var entity T
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	// 使用单个实体作为模型
	query := executor.Model(&entity) // 告诉 GORM 是哪张表
	query = BuildFilter(query, conditionData)
	if err := query.Count(&count).Error; err != nil {
		return count, err
	}
	return count, nil
}

func (c *BaseDao[T]) Create(ctx context.Context, entity *T) error {
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	return executor.Create(entity).Error
}

func (c *BaseDao[T]) CreateBat(ctx context.Context, entity []T) error {
	if len(entity) == 0 {
		return nil
	}
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	//return executor.Create(entity).Error
	// 業界標準：使用 CreateInBatches 分批寫入（例如每 100 條一組）
	// 這能防止單條 SQL 語句過大導致數據庫報錯
	return executor.CreateInBatches(entity, 100).Error
}

func (c *BaseDao[T]) Delete(ctx context.Context, id uuid.UUID) error {
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	//return executor.Delete(entity, id).Error
	// 使用 new(T) 定位模型，直接傳入 id 值
	return executor.Delete(new(T), id).Error
}

//func (c *BaseDao[T]) DeleteBat(entity T, ids []interface{}) bool {
//	result := c.DB.Delete(&entity, ids)
//	if result.Error != nil {
//		return false
//	}
//	return true
//}

func (c *BaseDao[T]) DeleteBat(ctx context.Context, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)

	// 加上 .Where("id IN ?", ids) 會更明確
	// return executor.Where("id IN ?", &ids).Delete(&entity).Error

	// GORM 的 Delete 方法原生支持傳入切片作為 ID 列表
	return executor.Delete(new(T), ids).Error
}

//func (c *BaseDao[T]) Update(ctx context.Context, entity *T) error {
//	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
//	return executor.Save(entity).Error
//}

func (c *BaseDao[T]) Update(ctx context.Context, id uuid.UUID, fields map[string]interface{}) error {
	executor := utils.GetDB(ctx, c.DB).WithContext(ctx)
	// 自动处理 UpdatedAt 等钩子
	return executor.Model(new(T)).Where("id = ?", id).Updates(fields).Error
}

func (c *BaseDao[T]) WithTx(tx *gorm.DB) *BaseDao[T] {
	return &BaseDao[T]{DB: tx}
}
