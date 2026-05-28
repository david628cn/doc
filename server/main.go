package main

import (
	"app/config"
	"app/db"
	"app/logger"
	"app/middleware"
	"app/model"
	"app/redisutil"
	"app/router"
	"app/services"
	"app/ws"
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
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
	gormDB, sqlDB, err := db.InitDB()
	if err != nil {
		logger.Error(fmt.Sprintf("数据库初始化失败: %v", err))
	}
	// 確保在 main 退出時關閉標準庫連接
	defer sqlDB.Close()

	// --- 核心步驟 3：初始化 ChatService ---
	// 必須先有 Service，Manager 才能把消息存入數據庫
	chatSrv := services.NewChatService(gormDB)
	notifySrv := services.NewNotificationService(gormDB)

	// --- 核心步驟 4：初始化 WebSocket Manager ---
	// 這一步會自動調用你寫的 NewMessageWorker 並啟動 5 個 Worker 協程
	wsm := ws.NewManager(1024, 1024, chatSrv, notifySrv)

	rdb := redisutil.New(cfg.Redis)
	if rdb != nil {
		defer rdb.Close()
	}
	ginRedisPrefix := redisutil.NormalizeKeyPrefix(cfg.Redis.KeyPrefix)
	if v := strings.TrimSpace(os.Getenv("GIN_REDIS_KEY_PREFIX")); v != "" {
		ginRedisPrefix = redisutil.NormalizeKeyPrefix(v)
	}
	wsChan := strings.TrimSpace(cfg.Redis.WsPubSubChannel)
	if v := strings.TrimSpace(os.Getenv("GIN_WS_REDIS_CHANNEL")); v != "" {
		wsChan = v
	} else if wsChan == "" && ginRedisPrefix != "" {
		wsChan = ginRedisPrefix + "ws:broadcast"
	}
	fanoutCtx, cancelFanout := context.WithCancel(context.Background())
	if rdb != nil && wsChan != "" {
		wsm.ConfigureRedisFanout(rdb, wsChan)
		if err := wsm.StartRedisSubscriber(fanoutCtx); err != nil {
			logger.Error(fmt.Sprintf("WS Redis 订阅启动失败: %v", err))
		} else {
			logger.Info("WS 跨实例广播已启用 channel=" + wsChan)
		}
	}
	verifyTTL := time.Duration(cfg.Redis.VerifyCacheTTLSeconds) * time.Second
	if v := strings.TrimSpace(os.Getenv("COLLAB_VERIFY_CACHE_SECONDS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			verifyTTL = time.Duration(n) * time.Second
		}
	}

	// 3. 手動閉環：把建好的 wsm 塞回 chatSrv
	// 這樣 chatSrv 以後調用 s.WSM.Worker.Queue 時才不會報 nil 指針錯誤
	chatSrv.SetManager(wsm)
	// notifySrv.SetManager(wsm) // 如果 NotifySrv 也需要發送實時消息

	//// 3. 初始化 Service (包含 FilesService)
	//filesSrv := services.NewFilesService(gormDB)
	//
	//// 4. 啟動定時清理任務 (異步啟動)
	//go func() {
	//	// 使用 robfig/cron 庫
	//	c := cron.New()
	//	// 每天凌晨 3 點運行： "0 3 * * *"
	//	c.AddFunc("0 3 * * *", func() {
	//		filesSrv.RunCleanupTask()
	//	})
	//	c.Start()
	//}()

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else if cfg.Server.Env == "dev" {
		gin.SetMode(gin.DebugMode)
	}
	r := gin.Default()

	// --- Basic hardening & perf middleware ---
	// Multipart memory cap (files are streamed to temp files beyond this).
	r.MaxMultipartMemory = 32 << 20 // 32 MiB

	// Compress HTTP responses.
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	// Limit request body size (non-multipart). Upstream proxy should also enforce.
	r.Use(middleware.MaxBodyBytes(10 << 20)) // 10 MiB

	// Basic per-IP rate limiting (in-memory). Tune as needed for production.
	r.Use(middleware.RateLimitByIP(20, 40))

	//r.LoadHTMLGlob("templates/*")                  // 加载模板文件，例如index.tmpl位于templates目录下

	//r.Static("/static", "./public/static")
	for _, s := range cfg.Web.Static {
		r.Static("/static", s) // 可选：额外静态目录（与 Vite 的 /assets 无关）
	}
	// Vite 构建产物入口为 /assets/*（见 web/dist/index.html），必须挂载，否则会落入 NoRoute 返回 HTML，脚本无法执行
	indexPath := cfg.Web.IndexHtml
	if indexPath == "" {
		indexPath = "./web/dist/index.html"
	}
	distRoot := filepath.Dir(indexPath)
	r.Static("/assets", filepath.Join(distRoot, "assets"))

	r.StaticFile("/manifest.json", filepath.Join(distRoot, "manifest.json"))
	r.StaticFile("/favicon.json", filepath.Join(distRoot, "favicon.json"))
	r.StaticFile("/logo192.png", filepath.Join(distRoot, "logo192.png"))

	// 2. 映射公共资源目录 (头像、图标、表情)
	// 这样访问 http://domain/uploads/public/avatars/xxx.png 就能直接看到图片
	// 注意：这里的 "public" 对应我们之前在 TypeConfigMap 中定义的 SubPath
	r.Static("/uploads/public", filepath.Join(cfg.Upload.Path, model.VisPublic))

	// 3. (可选) 如果你希望开发环境下能直接看到所有文件（不建议生产环境这样做）
	// r.Static("/uploads/attachments", filepath.Join(uploadBasePath, "attachments"))

	err = r.SetTrustedProxies(cfg.Proxy.TrustedProxies)
	if err != nil {
		logger.Error(fmt.Sprintf("TrustedProxies Error: %v", err))
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins: cfg.Proxy.AllowOrigins, // []string{"http://127.0.0.1:3000", "http://localhost:3000"},
		AllowMethods: cfg.Proxy.AllowMethods, // []string{"*"},
		AllowHeaders: cfg.Proxy.AllowHeaders, // []string{"*"},
		// AllowCredentials: cfg.Proxy.AllowCredentials,                  // false,
		// MaxAge:           time.Duration(cfg.Proxy.MaxAge) * time.Hour, // 12 * time.Hour,
	}))
	// 注意：JwtAuthMiddleware 應放在 SetupRouter 內部或根據路由分組掛載
	// 如果全局掛載，登錄/註冊接口也會被攔截
	//r.Use(middleware.JwtAuth())
	r.Use(middleware.GlobalError())

	webhookDisp := router.SetupRouter(r, gormDB, wsm, rdb, verifyTTL, ginRedisPrefix)

	// 8. 啟動服務並支持優雅退出
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: r,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error(fmt.Sprintf("服务启动失败: %v", err))
		}
	}()

	// 監聽信號
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("正在关闭服务...")
	cancelFanout()

	// --- HTTP graceful shutdown ---
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error(fmt.Sprintf("HTTP 优雅关闭失败: %v", err))
	}

	if webhookDisp != nil {
		logger.Info("正在关闭 Hocuspocus Webhook 写入队列...")
		webhookDisp.Shutdown()
	}

	// --- 核心步驟 9：優雅關閉 Worker Pool ---
	// 關閉 Channel 會讓 Worker 處理完隊列中剩餘的消息再退出
	if wsm != nil && wsm.Worker != nil {
		close(wsm.Worker.Queue)
		logger.Info("正在等待缓存消息入库...")
		// 可以在這裡加一個短暫的 time.Sleep 給 Worker 時間處理
		time.Sleep(time.Second * 1)
	}

	logger.Info("服务已安全退出")
}
