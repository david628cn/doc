package main

import (
	"app/config"
	"app/db"
	"app/logger"
	"app/middleware"
	"app/router"
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//TIP <p>To run your code, right-click the code and select <b>Run</b>.</p> <p>Alternatively, click
// the <icon src="AllIcons.Actions.Execute"/> icon in the gutter and select the <b>Run</b> menu item from here.</p>

func main() {
	//TIP <p>Press <shortcut actionId="ShowIntentionActions"/> when your caret is at the underlined text
	// to see how GoLand suggests fixing the warning.</p><p>Alternatively, if available, click the lightbulb to view possible fixes.</p>
	//s := "gopher"
	//fmt.Printf("Hello and welcome, %s!\n", s)
	//
	//for i := 1; i <= 5; i++ {
	//	//TIP <p>To start your debugging session, right-click your code in the editor and select the Debug option.</p> <p>We have set one <icon src="AllIcons.Debugger.Db_set_breakpoint"/> breakpoint
	//	// for you, but you can always add more by pressing <shortcut actionId="ToggleLineBreakpoint"/>.</p>
	//	fmt.Println("i =", 100/i)
	//}
	// 初始化配置（支持相对路径）
	if err := config.Init("."); err != nil {
		panic(err)
	}

	// 获取全局配置实例
	cfg := config.Get()

	// 初始化日志
	logger.InitLogger(logger.LogConfig{
		Level:         cfg.Zap.Level,
		FilePath:      cfg.Zap.FilePath,
		MaxSize:       cfg.Zap.MaxSize,
		MaxBackups:    cfg.Zap.MaxBackups,
		MaxAge:        cfg.Zap.MaxAge,
		Compress:      cfg.Zap.Compress,
		ConsoleOutput: cfg.Zap.ConsoleOutput,
	})

	// 初始化数据库
	DB, err := db.InitDB()
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else if cfg.Server.Env == "dev" {
		gin.SetMode(gin.DebugMode)
	}
	r := gin.Default()
	//r.LoadHTMLGlob("templates/*")                  // 加载模板文件，例如index.tmpl位于templates目录下

	//r.Static("/static", "./public/static")
	for _, s := range cfg.Web.Static {
		r.Static("/static", s) // 设置静态文件目录
	}
	// 设置静态文件目录
	r.StaticFile("/", cfg.Web.IndexHtml)                  // 设置首页文件为index.html
	r.StaticFile("/manifest.json", "./web/manifest.json") // 设置manifest.json
	r.StaticFile("/logo192.png", "./web/logo192.png")     // 设置logo
	err = r.SetTrustedProxies(cfg.Proxy.TrustedProxies)
	if err != nil {
		log.Fatalf("TrustedProxies Error: %v", err)
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins: cfg.Proxy.AllowOrigins, // []string{"http://127.0.0.1:3000", "http://localhost:3000"},
		AllowMethods: cfg.Proxy.AllowMethods, // []string{"*"},
		AllowHeaders: cfg.Proxy.AllowHeaders, // []string{"*"},
		// AllowCredentials: cfg.Proxy.AllowCredentials,                  // false,
		// MaxAge:           time.Duration(cfg.Proxy.MaxAge) * time.Hour, // 12 * time.Hour,
	}))
	r.Use(middleware.JwtAuthMiddleware())
	r.Use(middleware.GlobalErrorMiddleware())

	router.SetupRouter(r)
	err = r.Run(fmt.Sprintf(":%d", cfg.Server.Port))

	//srv := &http.Server{
	//	Addr:    ":8000",
	//	Handler: r,
	//}

	if err != nil {
		e := DB.Close()
		if e != nil {
			log.Fatal("数据库释放异常:", err)
		}
		log.Fatalf("服务启动失败: %v", err)
	}

	//// 信号监听与优雅退出
	//quit := make(chan os.Signal, 1)
	//signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	//<-quit
	//
	//log.Println("关闭服务...")
	//_, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	//defer cancel()
	//
	//// 释放数据库连接
	//defer func(DB *sql.DB) {
	//	err := DB.Close()
	//	if err != nil {
	//		log.Fatal("数据库释放异常:", err)
	//	}
	//}(DB)

	//if err := srv.Shutdown(ctx); err != nil {
	//	log.Fatal("服务关闭异常:", err)
	//}
	//log.Println("服务已退出")
}
