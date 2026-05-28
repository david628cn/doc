package db

import (
	"app/config"
	"database/sql"
	"fmt"
	"log"
	"os"
	"runtime"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

//var DB *gorm.DB

func InitDB() (*gorm.DB, *sql.DB, error) {
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second, // Slow SQL threshold
			LogLevel:                  logger.Info, // Log level
			IgnoreRecordNotFoundError: false,       // Ignore ErrRecordNotFound error for logger
			ParameterizedQueries:      false,       // Don't include params in the SQL log
			Colorful:                  true,        // Disable color
		},
	)
	// 获取全局配置实例
	cfg := config.Get()
	dsn := cfg.Database.DSN
	var db *gorm.DB
	var err error
	if strings.HasPrefix(dsn, "postgres") {
		// dsn := "root:root@tcp(127.0.0.1:3306)/qoue?charset=utf8mb4&parseTime=True&loc=Local"
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			QueryFields:                              true,
			SkipDefaultTransaction:                   true,
			DisableForeignKeyConstraintWhenMigrating: true,
			PrepareStmt:                              true,
			Logger:                                   newLogger,
		})
	} else {
		// dsn := "root:root@tcp(127.0.0.1:3306)/qoue?charset=utf8mb4&parseTime=True&loc=Local"
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			QueryFields:                              true,
			SkipDefaultTransaction:                   true,
			DisableForeignKeyConstraintWhenMigrating: true,
			PrepareStmt:                              true,
			Logger:                                   newLogger,
		})
	}

	if err != nil {
		return nil, nil, fmt.Errorf("数据库连接失败: %w", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(runtime.NumCPU() * 2)
	sqlDB.SetMaxOpenConns(150)
	sqlDB.SetConnMaxLifetime(3 * time.Minute)
	//db.Use(prometheus.New(prometheus.Config{
	//	StartServer: true,
	//}))
	//DB = db
	fmt.Println("数据库连接成功")
	return db, sqlDB, nil
}
