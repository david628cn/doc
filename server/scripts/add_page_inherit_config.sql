-- 已有库执行一次：页面继承开关（与 RESOURCE_PERMISSION_CHAIN 对齐）
-- PostgreSQL 11+ 可用 IF NOT EXISTS；更低版本若列已存在会报错，可忽略。
ALTER TABLE sys_page
  ADD COLUMN IF NOT EXISTS inherit_config boolean NOT NULL DEFAULT true;
