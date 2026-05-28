-- 页面业务类型：文档、演示等（默认 document）

ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS page_type varchar(32) NOT NULL DEFAULT 'document';

CREATE INDEX IF NOT EXISTS idx_sys_page_workspace_page_type ON sys_page(workspace_id, page_type);
