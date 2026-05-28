-- 用户维度：页面收藏、最近打开（PostgreSQL）

CREATE TABLE IF NOT EXISTS sys_user_page_star (
  user_id uuid NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES sys_page(id) ON DELETE CASCADE,
  create_time timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_user_page_star_ws ON sys_user_page_star(user_id, workspace_id);

CREATE TABLE IF NOT EXISTS sys_user_page_recent (
  user_id uuid NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES sys_page(id) ON DELETE CASCADE,
  last_open_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_user_page_recent_ws_time ON sys_user_page_recent(user_id, workspace_id, last_open_at DESC);
