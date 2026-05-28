-- 全文检索关键字：由协同归档任务从 PM 文档折叠的纯文本
ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS content_text text;

COMMENT ON COLUMN sys_page.content_text IS 'ProseMirror 正文折叠纯文本，供搜索；与 content jsonb、ydoc_state 协同更新';
