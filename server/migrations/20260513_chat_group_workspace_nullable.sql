-- 群聊改为平台级，不再绑定文档工作区（可与私聊一致地为 NULL）
ALTER TABLE sys_chat_group ALTER COLUMN workspace_id DROP NOT NULL;
