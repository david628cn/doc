-- 平台级私聊消息不再绑定文档工作区；群聊仍使用 workspace_id
ALTER TABLE sys_chat_message ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE sys_chat_member_read ALTER COLUMN workspace_id DROP NOT NULL;
