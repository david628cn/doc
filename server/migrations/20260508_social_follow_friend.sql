-- 第一期社交：关注表 sys_follow；好友表 sys_friend（PostgreSQL）
-- 对应 model.Follow / model.Friend

CREATE TABLE IF NOT EXISTS sys_follow (
  id uuid PRIMARY KEY,
  follower_id uuid NOT NULL,
  followee_id uuid NOT NULL,
  create_time timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uk_sys_follow_pair UNIQUE (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_follower ON sys_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_followee ON sys_follow(followee_id);

CREATE TABLE IF NOT EXISTS sys_friend (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status int NOT NULL DEFAULT 0,
  apply_message varchar(512),
  remark text,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_sys_friend_user_id ON sys_friend(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_friend_friend_id ON sys_friend(friend_id);
CREATE INDEX IF NOT EXISTS idx_sys_friend_delete_time ON sys_friend(delete_time);

-- 旧库已有 sys_friend、但缺附言列时补齐（新建表已含该列，此处为幂等升级）
ALTER TABLE sys_friend ADD COLUMN IF NOT EXISTS apply_message varchar(512);
