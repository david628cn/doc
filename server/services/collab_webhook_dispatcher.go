package services

import (
	"app/logger"
	"context"
	"encoding/json"
	"strings"
	"sync"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/datatypes"
)

// collabQueueJob：Webhook JSON（extension-webhook）或与 Hocuspocus onStoreDocument 对齐的 Yjs 二进制归档。
type collabQueueJob struct {
	WebhookJSON []byte
	Ydoc        *ydocPersistPayload
}

type ydocPersistPayload struct {
	PageID      uuid.UUID
	Bytes       []byte
	ContentJSON json.RawMessage
	ContentText string
	UpdatedBy   *uuid.UUID
}

// CollabWebhookDispatcher：HTTP 层仅入队，worker 异步 UPDATE ydoc_state / content / content_text。
type CollabWebhookDispatcher struct {
	queue        chan collabQueueJob
	pageSrv      *PageService
	workers      int
	wg           sync.WaitGroup
	expandURL    string
	expandSecret string
}

func NewCollabWebhookDispatcher(pageSrv *PageService, queueSize, workers int, expandURL, expandSecret string) *CollabWebhookDispatcher {
	if queueSize < 32 {
		queueSize = 512
	}
	if workers < 1 {
		workers = 4
	}
	return &CollabWebhookDispatcher{
		queue:        make(chan collabQueueJob, queueSize),
		pageSrv:      pageSrv,
		workers:      workers,
		expandURL:    strings.TrimSpace(expandURL),
		expandSecret: strings.TrimSpace(expandSecret),
	}
}

func (d *CollabWebhookDispatcher) Start() {
	for i := 0; i < d.workers; i++ {
		d.wg.Add(1)
		go d.runWorker()
	}
}

func (d *CollabWebhookDispatcher) runWorker() {
	defer d.wg.Done()
	for job := range d.queue {
		d.handleJob(context.Background(), job)
	}
}

func (d *CollabWebhookDispatcher) handleJob(ctx context.Context, job collabQueueJob) {
	if job.Ydoc != nil {
		d.flushYdocSnapshot(ctx, job.Ydoc)
		return
	}
	if len(job.WebhookJSON) > 0 {
		d.handleWebhookJSON(ctx, job.WebhookJSON)
	}
}

// flushYdocSnapshot 写入 ydoc_state；必要时 HTTP 调用 collab-server expand-ydoc 得到 content / content_text。
func (d *CollabWebhookDispatcher) flushYdocSnapshot(ctx context.Context, job *ydocPersistPayload) {
	if job == nil || len(job.Bytes) == 0 {
		return
	}
	contentJSON := job.ContentJSON
	contentText := strings.TrimSpace(job.ContentText)
	if len(contentJSON) == 0 && d.expandURL != "" && d.expandSecret != "" {
		if ex, err := CallCollabExpandYdoc(ctx, d.expandURL, d.expandSecret, job.Bytes); err != nil {
			logger.Warn("collab expand-ydoc 失败，仍将写入 ydoc_state",
				zap.String("page_id", job.PageID.String()),
				zap.Error(err))
		} else if len(ex.Doc) > 0 {
			contentJSON = ex.Doc
			if contentText == "" {
				contentText = strings.TrimSpace(ex.ContentText)
			}
		}
	}
	var cj datatypes.JSON
	if len(contentJSON) > 0 {
		cj = datatypes.JSON(append([]byte(nil), contentJSON...))
	}
	if err := d.pageSrv.UpdateCollabSnapshot(ctx, job.PageID, job.Bytes, cj, contentText, job.UpdatedBy); err != nil {
		logger.Error("collab persist: 写入快照失败",
			zap.String("page_id", job.PageID.String()),
			zap.Error(err))
	}
}

type hocuspocusWebhookEnvelope struct {
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}

type hocuspocusChangePayload struct {
	DocumentName string          `json:"documentName"`
	Document     json.RawMessage `json:"document"`
}

func (d *CollabWebhookDispatcher) handleWebhookJSON(ctx context.Context, raw []byte) {
	var env hocuspocusWebhookEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		logger.Warn("hocuspocus webhook: 无法解析 JSON", zap.Error(err))
		return
	}
	if env.Event != "change" {
		return
	}
	var pl hocuspocusChangePayload
	if err := json.Unmarshal(env.Payload, &pl); err != nil {
		logger.Warn("hocuspocus webhook: 无法解析 payload", zap.Error(err))
		return
	}
	pageID, err := uuid.Parse(pl.DocumentName)
	if err != nil {
		logger.Warn("hocuspocus webhook: documentName 不是合法 UUID", zap.String("documentName", pl.DocumentName))
		return
	}
	archive := append([]byte(nil), pl.Document...)
	if len(archive) == 0 {
		return
	}
	d.flushYdocSnapshot(ctx, &ydocPersistPayload{PageID: pageID, Bytes: archive, UpdatedBy: nil})
}

// Submit 非阻塞入队（extension-webhook 原始 JSON）；队列满时返回 false。
func (d *CollabWebhookDispatcher) Submit(rawBody []byte) bool {
	cp := append([]byte(nil), rawBody...)
	select {
	case d.queue <- collabQueueJob{WebhookJSON: cp}:
		return true
	default:
		return false
	}
}

// SubmitYdocBinary 非阻塞入队（onStoreDocument 经 Base64 解码后的完整 Yjs state update；可选已附带 PM JSON 与纯文本）。
func (d *CollabWebhookDispatcher) SubmitYdocBinary(pageID uuid.UUID, ydoc []byte, contentJSON json.RawMessage, contentText string, updatedBy *uuid.UUID) bool {
	cp := append([]byte(nil), ydoc...)
	var cj json.RawMessage
	if len(contentJSON) > 0 {
		cj = append(json.RawMessage(nil), contentJSON...)
	}
	select {
	case d.queue <- collabQueueJob{
		Ydoc: &ydocPersistPayload{
			PageID:      pageID,
			Bytes:       cp,
			ContentJSON: cj,
			ContentText: strings.TrimSpace(contentText),
			UpdatedBy:   updatedBy,
		},
	}:
		return true
	default:
		return false
	}
}

// Shutdown 关闭队列并等待 worker 处理完已在队列中的任务。
func (d *CollabWebhookDispatcher) Shutdown() {
	close(d.queue)
	d.wg.Wait()
}
