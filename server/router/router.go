package router

import (
	"app/controller"
	"app/services"

	"github.com/gin-gonic/gin"
)

func SetupRouter(r *gin.Engine) {
	adminCtrl := controller.AdminCtrl{}
	aminRg := r.Group("/oauth")
	{
		//aminRg.POST("/login", func(ctx *gin.Context) {
		//	ctx.Writer.Write([]byte("登录"))
		//})
		aminRg.POST("/login", adminCtrl.Login)
		aminRg.POST("/register", adminCtrl.Register)
		aminRg.GET("/checkUsername", adminCtrl.CheckUsername)
		aminRg.POST("/logout", adminCtrl.LoginOut)
		aminRg.GET("/token", adminCtrl.Token)

	}

	//websocketCtrl := controller.WebsocketCtrl{}
	//websocketRg := r.Group("/ws")
	//{
	//	websocketRg.GET("/message", websocketCtrl.WebSocketHandler)
	//}

	//websocketRg := r.Group("/ws")
	//{
	//	websocketRg.GET("/message", ws.WebSocketHandler)
	//}

	apiRg := r.Group("/api")
	{
		usersCtrl := controller.UsersCtrl{}
		usersRg := apiRg.Group("/users")
		{
			usersRg.GET("/list", usersCtrl.List)
		}

		stockCtrl := controller.StockCtrl{}
		stockRg := apiRg.Group("/stock")
		{
			stockRg.POST("/list", stockCtrl.List)
			stockRg.POST("/trade", stockCtrl.Trade)
		}

		filesCtrl := controller.FilesCtrl{}
		fileRg := apiRg.Group("/files")
		{
			fileRg.POST("/list", filesCtrl.List)
			fileRg.POST("/delete", filesCtrl.Delete)
			fileRg.POST("/upload", filesCtrl.Upload)
			fileRg.GET("/checkChunks", filesCtrl.CheckChunks)
			fileRg.POST("/uploadChunks", filesCtrl.UploadChunks)
			fileRg.GET("/mergeChunks", filesCtrl.MergeChunks)
		}

		taskService := services.NewTaskService()
		taskCtrl := controller.NewTaskCtrl(taskService)
		taskRg := apiRg.Group("/task")
		{
			taskRg.POST("/start", taskCtrl.Start)
			taskRg.POST("/stop", taskCtrl.Stop)
			taskRg.POST("/reStart", taskCtrl.ReStart)
		}
	}

	// 初始化文档wx
	docCtrl := controller.DocCtrl{}
	r.GET("/docWs", docCtrl.HandleWebSocket)

	// 初始化聊天室
	//m := ws.NewManager()
	//go m.Run()
	//r.GET("/ws", m.WebSocketHandler)

}
