package ws

import (
	"app/logger"
	"sync"
)

type Room struct {
	ID         string
	Clients    map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	Mu         sync.Mutex
}

func (r *Room) Run(h *Hub) {
	defer r.Cleanup()
	for {
		select {
		case client := <-r.Register:
			r.Mu.Lock()
			r.Clients[client] = true
			r.Mu.Unlock()
			logger.Info(client.UserID + " 加入 " + r.ID)
		case client := <-r.Unregister:
			r.Mu.Lock()
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)
				if len(r.Clients) == 0 {
					h.RemoveRoom(r.ID)
					r.Mu.Unlock()
					return
				}
			}
			r.Mu.Unlock()
		case message := <-r.Broadcast:
			r.Mu.Lock()
			for client := range r.Clients {
				// 如果 From 為 nil (系統發送) 或者 client 不是發送者，則發送
				if message.From == nil || client != message.From {
					select {
					case client.Send <- message.Data:
					default:
						close(client.Send)
						delete(r.Clients, client)
					}
				}
			}
			r.Mu.Unlock()
		}
	}
}

func (r *Room) Cleanup() {
	r.Mu.Lock()
	defer r.Mu.Unlock()
	for client := range r.Clients {
		close(client.Send)
		delete(r.Clients, client)
	}
}
