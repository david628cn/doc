-- 群聊与私聊已读游标（PostgreSQL）
CREATE TABLE IF NOT EXISTS sys_chat_group (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name varchar(200) NOT NULL,
  owner_id uuid NOT NULL,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_group_ws ON sys_chat_group (workspace_id) WHERE delete_time IS NULL;

CREATE TABLE IF NOT EXISTS sys_chat_group_member (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  create_time timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_member_uid ON sys_chat_group_member (user_id);

CREATE TABLE IF NOT EXISTS sys_chat_member_read (
  user_id uuid NOT NULL,
  room_id varchar(160) NOT NULL,
  workspace_id uuid NOT NULL,
  last_read_time timestamptz,
  update_time timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_member_read_uid ON sys_chat_member_read (user_id);
