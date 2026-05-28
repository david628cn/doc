-- 群公告（PostgreSQL）
ALTER TABLE sys_chat_group ADD COLUMN IF NOT EXISTS announcement text;
