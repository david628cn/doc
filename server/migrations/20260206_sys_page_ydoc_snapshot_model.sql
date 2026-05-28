-- JSON 快照(content) + 协同归档(ydoc_state) + 细增量(Redis Stream)；可选 ydoc_baseline_at
-- 执行：psql $DATABASE_URL -f editor/server/migrations/20260206_sys_page_ydoc_snapshot_model.sql

ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS ydoc_baseline_at timestamptz;

COMMENT ON COLUMN sys_page.ydoc_state IS
  '协同归档：折叠后的 Y.encodeStateAsUpdate 全文（bytea）。细粒度编辑增量在 Redis Stream；详见 collaborate-server reader §0.0。';

COMMENT ON COLUMN sys_page.ydoc_baseline_at IS
  '最近一次协同归档写入 ydoc_state 的时间。';

COMMENT ON COLUMN sys_page.content IS
  'JSON 快照（PM 文档树）：检索/预设；打开时可 JSON→Y；刷库后可从 Y 反写对齐（COLLAB_FLUSH_SYNC_CONTENT_JSON）。';
