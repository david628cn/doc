package services

import (
	"fmt"
	"sync"

	"github.com/robfig/cron/v3"
)

type TaskService struct {
	cron    *cron.Cron
	entries *sync.Map
	//mu      sync.RWMutex
}

func NewTaskService() *TaskService {
	return &TaskService{
		cron:    cron.New(cron.WithSeconds()),
		entries: &sync.Map{},
	}
}

func (s *TaskService) AddTask(id, spec string, job func()) error {
	//s.mu.Lock()
	//defer s.mu.Unlock()

	entryID, err := s.cron.AddFunc(spec, job)
	if err != nil {
		return err
	}
	s.entries.Store(id, entryID)
	return nil
}

func (s *TaskService) GetTask(id string) (cron.Entry, bool) {
	//s.mu.Lock()
	//defer s.mu.Lock()
	fmt.Println(">>>>>>>>>>", id)
	entryID, exists := s.entries.Load(id)
	fmt.Println(entryID, exists)
	if !exists {
		return cron.Entry{}, false
	}
	return s.cron.Entry(entryID.(cron.EntryID)), true
}

func (s *TaskService) RemoveTask(id string) bool {
	//s.mu.Lock()
	//defer s.mu.Unlock()
	entry, exists := s.GetTask(id)
	if !exists {
		return false
	}
	fmt.Println(entry.ID)
	s.cron.Remove(entry.ID)
	s.entries.Delete(id)
	return true
}

func (s *TaskService) StartTask(id string) bool {
	_, exists := s.GetTask(id)
	if !exists {
		return false
	}
	s.cron.Start()
	return true
}

//func (s *TaskService) StopTask(id string) bool {
//	s.mu.Lock()
//	defer s.mu.Unlock()
//
//	_, exists := s.GetTask(id)
//	if !exists {
//		return false
//	}
//	s.cron.Stop()
//	return true
//}
