package ws

import (
	"app/logger"
	"sync"
)

type Room struct {
	ID         string
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	Mu         sync.Mutex
}

func (r *Room) Cleanup() {
	logger.Info("Room-" + r.ID + " cleanup")
	r.Mu.Lock()
	defer r.Mu.Unlock()
	for client := range r.Clients {
		close(client.Send)
		delete(r.Clients, client)
	}
	close(r.Broadcast)
	close(r.Register)
	close(r.Unregister)
}

func (r *Room) Run(h *Hub) {
	defer r.Cleanup()
	for {
		select {
		case client := <-r.Register:
			r.Mu.Lock()
			r.Clients[client] = true
			r.Mu.Unlock()
			logger.Info(client.UserID + " 加入" + r.ID)
		case client := <-r.Unregister:
			r.Mu.Lock()
			if _, ok := r.Clients[client]; ok {
				logger.Info(client.UserID + " 离开" + r.ID)
				delete(r.Clients, client)
				close(client.Send)
				if len(r.Clients) == 0 {
					logger.Info("人数为0, 删除Room" + r.ID)
					h.RemoveRoom(r.ID)
					r.Mu.Unlock()
					return
				}
			}
			logger.Info("r.Mu.Unlock()")
			r.Mu.Unlock()
		case message := <-r.Broadcast:
			r.Mu.Lock()
			for client := range r.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(r.Clients, client)
				}
			}
			r.Mu.Unlock()
		}
	}
}
