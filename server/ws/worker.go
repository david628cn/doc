package ws

import (
	"app/logger"
	"app/model"
	"fmt"
)

// 1. 定義隊列容量
const MaxQueueSize = 10000
const WorkerCount = 5 // 同時寫入數據庫的協程數

type MessageWorker struct {
	Queue   chan *model.ChatMessage
	chatSrv ChatServiceHandler
}

func NewMessageWorker(srv ChatServiceHandler) *MessageWorker {
	return &MessageWorker{
		Queue:   make(chan *model.ChatMessage, MaxQueueSize),
		chatSrv: srv,
	}
}

// 2. 啟動工作池
func (w *MessageWorker) Start() {
	for i := 0; i < WorkerCount; i++ {
		go func(workerID int) {
			logger.Info(fmt.Sprintf("Chat Worker %d 启动", workerID))
			for msg := range w.Queue {
				// 執行入庫
				if err := w.chatSrv.SaveChatMessage(msg); err != nil {
					logger.Info(fmt.Sprintf("Worker %d 入库失败: %v", workerID, err))
				}
			}
		}(i)
	}
}
