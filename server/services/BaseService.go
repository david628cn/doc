package services

import (
	"app/dao"
	"app/playload"
	"app/utils"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func NewBaseService[T any](db *gorm.DB) *BaseService[T] {
	return &BaseService[T]{
		// 自动在这里完成 Dao 的实例化和 DB 的注入
		Dao: &dao.BaseDao[T]{DB: db},
	}
}

func (s *BaseService[T]) GetDB(ctx context.Context) *gorm.DB {
	// 這裡調用你之前寫好的 utils.GetDB
	return utils.GetDB(ctx, s.Dao.DB).WithContext(ctx)
}

type BaseService[T any] struct {
	Dao *dao.BaseDao[T]
}

func (s *BaseService[T]) FindByID(ctx context.Context, id uuid.UUID) (*T, error) {
	return s.Dao.QueryById(ctx, id)
}

//func (c *BaseService[T]) FindByName(ctx context.Context, name string) ([]T, error) {
//	result, err := c.Dao.QueryList(ctx, playload.ConditionData{
//		Filter: &[]playload.Expression{
//			{
//				Field: "name",
//				Op:    "=",
//				Value: []interface{}{name},
//			},
//		},
//	})
//	if err != nil {
//		return result, err
//	}
//	return result, nil
//}

func (s *BaseService[T]) FindList(ctx context.Context, conditionData *playload.ConditionData) ([]T, error) {
	return s.Dao.QueryList(ctx, conditionData)
}

func (s *BaseService[T]) FindListEx(ctx context.Context, conditionData *playload.ConditionData) ([]T, error) {
	return s.Dao.QueryListEx(ctx, conditionData)
}

func (s *BaseService[T]) First(ctx context.Context, conditionData *playload.ConditionData) (*T, error) {
	return s.Dao.QueryFirst(ctx, conditionData)
}

func (s *BaseService[T]) FirstEx(ctx context.Context, conditionData *playload.ConditionData) (*T, error) {
	return s.Dao.QueryFirstEx(ctx, conditionData)
}

func (s *BaseService[T]) FindCount(ctx context.Context, conditionData *playload.ConditionData) (int64, error) {
	return s.Dao.QueryCount(ctx, conditionData)
}

func (s *BaseService[T]) Add(ctx context.Context, entity *T) error {
	return s.Dao.Create(ctx, entity)
}

func (s *BaseService[T]) AddBat(ctx context.Context, entity []T) error {
	return s.Dao.CreateBat(ctx, entity)
}

func (s *BaseService[T]) Remove(ctx context.Context, id uuid.UUID) error {
	return s.Dao.Delete(ctx, id)
}

func (s *BaseService[T]) RemoveBat(ctx context.Context, ids []uuid.UUID) error {
	return s.Dao.DeleteBat(ctx, ids)
}

func (s *BaseService[T]) Update(ctx context.Context, id uuid.UUID, fields map[string]interface{}) error {
	return s.Dao.Update(ctx, id, fields)
}
