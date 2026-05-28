package ws

import "sync"

type Hub struct {
	Rooms sync.Map
}

func (h *Hub) GetRoom(id string) *Room {
	if room, exists := h.Rooms.Load(id); exists {
		return room.(*Room)
	}

	room := &Room{
		ID:         id,
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan Message, 1024), // 统一使用 Message 结构体
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
	h.Rooms.Store(id, room)
	go room.Run(h)
	return room
}

func (h *Hub) RemoveRoom(id string) {
	h.Rooms.Delete(id)
}
