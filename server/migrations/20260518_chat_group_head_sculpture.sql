-- 群自定义头像（与 sys_user.head_sculpture 相同语义：相对路径或可访问 URL）
ALTER TABLE sys_chat_group ADD COLUMN IF NOT EXISTS head_sculpture varchar(512);
