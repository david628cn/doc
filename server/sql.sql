-- 1. 用户表
CREATE TABLE sys_user (
  id uuid PRIMARY KEY, 
  username varchar(50) NOT NULL,
  password varchar(255) NOT NULL,
  pwd_version integer NOT NULL DEFAULT 1,
  real_name varchar(50),
  code varchar(50),
  sex smallint DEFAULT 1, -- 0:男, 1:女
  role_code integer,
  identity_card varchar(18),
  birthday date,
  address text,
  head_sculpture varchar(512),
  status smallint DEFAULT 1, -- 1:正常, 0:禁用
  email varchar(100),
  mobile varchar(20),
  login_time timestamptz,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- 修正字段名引用: delete_time
CREATE UNIQUE INDEX idx_user_username ON sys_user(username) WHERE delete_time IS NULL;
CREATE UNIQUE INDEX idx_user_email ON sys_user(email) WHERE email IS NOT NULL AND delete_time IS NULL;

-- 2. 工作区表
CREATE TABLE sys_workspace (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  description varchar(512),
  icon varchar(512),
  slug varchar(50) NOT NULL, 
  custom_domain varchar(255),
  settings jsonb DEFAULT '{}'::jsonb,
  email_domains jsonb DEFAULT '{}'::jsonb,
  default_space_id uuid, 
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- CREATE UNIQUE INDEX idx_workspace_slug ON sys_workspace(slug) WHERE delete_time IS NULL;
-- CREATE UNIQUE INDEX idx_workspace_custom_domain ON sys_workspace(custom_domain)
-- WHERE custom_domain IS NOT NULL AND delete_time IS NULL;

-- 3. 工作区-用户关联表
CREATE TABLE sys_workspace_user (
  id uuid PRIMARY KEY, 
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'member', -- owner, admin, member, guest
  status smallint DEFAULT 1,
  is_default boolean DEFAULT false,
  last_access_time timestamptz,
  join_time timestamptz DEFAULT now(), -- 补齐逗号
  create_time timestamptz NOT NULL DEFAULT now(), -- 补齐逗号
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- 确保一个用户在同一个空间只有一条记录
CREATE UNIQUE INDEX idx_workspace_user_unique ON sys_workspace_user(workspace_id, user_id) WHERE delete_time IS NULL;
-- 优化用户查询空间列表
CREATE INDEX idx_workspace_user_uid ON sys_workspace_user(user_id) WHERE delete_time IS NULL;
-- 确保每个用户只有一个默认空间
CREATE UNIQUE INDEX idx_workspace_user_default ON sys_workspace_user(user_id) WHERE is_default = true AND delete_time IS NULL;



-- 4. 組/部門表 (支持自嵌套與外部組標記)
CREATE TABLE sys_group (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  description varchar(512),
  workspace_id uuid NOT NULL,
  parent_id uuid,             -- 支持自嵌套（部門樹）
  create_by uuid NOT NULL,    -- 誰創建了這個組
  update_by uuid NOT NULL,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- 5. 組-用戶關聯
CREATE TABLE sys_group_user (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role varchar(20) DEFAULT 'member', -- leader:組長, member:組員
  join_time timestamptz DEFAULT now(),
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);



-- 6. 知識庫表 (Space / Wiki)
CREATE TABLE sys_space (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name varchar(100) NOT NULL,
  description varchar(512),
  icon varchar(512),
  -- workspace:空間內全員可見(Guest除外), invite仅邀请 private:僅授權成員可見 default
  visibility varchar(20) DEFAULT 'workspace', 
  create_by uuid NOT NULL,
  update_by uuid,
  last_access_time timestamptz,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- 7. 頁面表 (Page)
CREATE TABLE sys_page (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL, -- 冗餘：核心隔離標識
  space_id uuid NOT NULL,     -- 物理所屬知識庫
  parent_id uuid,             -- 父頁面 ID (實現頁面嵌套)
  title text NOT NULL DEFAULT '未命名',
  content jsonb DEFAULT '[]'::jsonb, -- 產品用語：JSON 快照（檢索/預設）；與協同對齊見 collaborate-server reader §0.0
  ydoc_state bytea, -- 產品用語：協同歸檔（Y 折疊後的 encodeStateAsUpdate 全文 bytea）；細粒度增量在 Redis Stream
  content_text text,
  -- workspace:空間全員可見, private:私密(僅限創建者或授權)
  version integer NOT NULL DEFAULT 1,
  visibility varchar(20) DEFAULT 'workspace',
  inherit_config boolean NOT NULL DEFAULT true,
  share_enabled boolean DEFAULT false, -- 外部鏈接分享
  share_token varchar(64),             -- 分享 Token
  sort_order DOUBLE PRECISION DEFAULT 0,
  create_by uuid NOT NULL,
  update_by uuid NOT NULL,
  last_access_time timestamptz,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

CREATE INDEX idx_page_space_sort_time
    ON sys_page (space_id, sort_order ASC, create_time DESC)
    WHERE delete_time IS NULL;

-- 已有庫遷移：協作 Y 快照列（若已存在可跳過）
ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS ydoc_state bytea;
ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS content_text text;
ALTER TABLE sys_page ADD COLUMN IF NOT EXISTS page_type varchar(32) NOT NULL DEFAULT 'document';

-- 7b. 頁面內容歷史（快照）：每次版本前進時寫入離開的那一版
CREATE TABLE sys_page_revision (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  space_id uuid NOT NULL,
  page_version integer NOT NULL,
  content jsonb NOT NULL,
  create_by uuid NOT NULL,
  create_time timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_revision_page_ver UNIQUE (page_id, page_version)
);

CREATE INDEX idx_page_revision_page_time
    ON sys_page_revision (page_id, page_version DESC);

CREATE INDEX idx_page_revision_workspace
    ON sys_page_revision (workspace_id);

-- 8. 知識庫(Space) 授權表
CREATE TABLE sys_space_access (
  id uuid PRIMARY KEY,
  space_id uuid NOT NULL,
  subject_type varchar(20) NOT NULL, -- user, group
  subject_id uuid NOT NULL,         -- UserID 或 GroupID(含外部組)
  role varchar(20) NOT NULL,        -- owner, admin, editor, viewer
  join_time timestamptz DEFAULT now(),
  expired_time timestamptz,           -- 支持臨時授權過期
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

CREATE UNIQUE INDEX idx_space_access_unique
  ON sys_space_access(space_id, subject_type, subject_id)
  WHERE delete_time IS NULL;

CREATE INDEX idx_space_access_subject
  ON sys_space_access(subject_type, subject_id)
  WHERE delete_time IS NULL;

CREATE UNIQUE INDEX idx_space_access_owner_unique
  ON sys_space_access(space_id)
  WHERE role = 'owner' AND subject_type = 'user' AND delete_time IS NULL;

-- 9. 頁面(Page) 授權表 (用於私有頁面特許或外部人授權)
CREATE TABLE sys_page_access (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL,
  subject_type varchar(20) NOT NULL, -- user, group
  subject_id uuid NOT NULL,         -- UserID 或 GroupID(含外部組)
  role varchar(20) NOT NULL,        -- manager, editor, viewer
  join_time timestamptz DEFAULT now(),
  expired_time timestamptz,           -- 支持臨時授權過期
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);


CREATE TABLE sys_file (
  id uuid PRIMARY KEY,
  workspace_id uuid,

-- 关联业务
  related_type varchar(20), -- 'page', 'space', 'user_avatar', 'workspace_logo'
  related_id uuid,          -- 对应的 page_id 或 space_id

-- 文件属性
  name varchar(255) NOT NULL,
  origin_name varchar(255) NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  mime_type varchar(100),
  type varchar(100),         -- MIME type 如 'image/png'
  hash varchar(64),          -- 文件唯一哈希，用于秒传优化
  path varchar(512) NOT NULL,
  description varchar(512),

-- 状态与权限
  visibility varchar(20) DEFAULT 'inherit', -- 'inherit', 'private', 'public'
  ref_count int8 NOT NULL DEFAULT 0,        -- 引用计数

  status int NOT NULL DEFAULT 0,
-- 审计
  create_by uuid NOT NULL,
  username varchar(50),                     -- 冗余上传者姓名
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

-- 索引建议
CREATE INDEX idx_file_workspace ON sys_file(workspace_id) WHERE delete_time IS NULL;
CREATE INDEX idx_file_related ON sys_file(related_id, related_type) WHERE delete_time IS NULL;
CREATE INDEX idx_file_hash ON sys_file(hash) WHERE delete_time IS NULL;

CREATE TABLE sys_workspace_quota (
 workspace_id uuid PRIMARY KEY,
 total_bytes bigint NOT NULL DEFAULT 5368709120, -- 默认总配额 5GB
 used_bytes bigint NOT NULL DEFAULT 0,          -- 已使用字节数
 update_time timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE sys_chat_message (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,      -- 工作區隔離標識
  room_id varchar(100) NOT NULL,   -- 對應 WS 的 RoomID (可以是 WorkspaceID 或 UserID)
  sender_id uuid NOT NULL,         -- 發送者 ID
  content text NOT NULL,           -- 消息內容
  msg_type varchar(20) DEFAULT 'text', -- 消息類型: text, image, file, system
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz          -- 軟刪除
);

-- 索引：優化分頁查詢歷史記錄 (WHERE room_id = ? ORDER BY create_time DESC)
CREATE INDEX idx_chat_room_time ON sys_chat_message (room_id, create_time DESC) WHERE delete_time IS NULL;
-- 索引：優化工作區數據清理
CREATE INDEX idx_chat_workspace ON sys_chat_message (workspace_id) WHERE delete_time IS NULL;


-- 消息主体表 (存储消息内容)
CREATE TABLE sys_notification (
  id uuid PRIMARY KEY,
  workspace_id uuid,               -- 所屬工作區 (全局消息可為 NULL)
  sender_id uuid,                  -- 發送者 (系統消息可為 NULL)
  title varchar(255) NOT NULL,
  content text,
  msg_type varchar(64) DEFAULT 'system', -- invite / join_request_result / friend_request_result 等
  priority smallint DEFAULT 1,     -- 優先級
  link_url varchar(512),           -- 點擊跳轉鏈接 (如邀請接受頁面)
  related_id uuid,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz          -- 軟刪除
);

-- 消息接收状态表 (已读/未读状态)
CREATE TABLE sys_notification_receiver (
   id uuid PRIMARY KEY,
   notification_id uuid NOT NULL,
   receiver_id uuid NOT NULL,
   is_delivered boolean DEFAULT false, -- 是否已送達 (Ack: delivered)
   is_read boolean DEFAULT false,      -- 是否已讀 (Ack: read)
   delivered_time timestamptz,
   read_time timestamptz,
   create_time timestamptz NOT NULL DEFAULT now(),
   update_time timestamptz NOT NULL DEFAULT now(),
   delete_time timestamptz             -- 用戶刪除通知
);

-- 索引：極速查詢用戶的未讀消息總數 (用於紅點計數)
CREATE INDEX idx_noti_unread_count ON sys_notification_receiver (receiver_id)
    WHERE is_read = false AND delete_time IS NULL;

-- 索引：優化消息主體關聯查詢
CREATE INDEX idx_noti_receiver_main ON sys_notification_receiver (notification_id);

-- 索引：优化未读消息统计
CREATE INDEX idx_noti_unread_stat ON sys_notification_receiver(receiver_id, is_read)
    WHERE delete_time IS NULL;




-- 12. 邀请记录表（多态：工作区 / 库）
CREATE TABLE sys_invite (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  scope_type varchar(20) NOT NULL DEFAULT 'workspace', -- workspace | space
  scope_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  email varchar(100),
  invitee_id uuid,
  token varchar(64) UNIQUE,
  status smallint DEFAULT 0,
  role varchar(20) DEFAULT 'member',
  expire_time timestamptz,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

CREATE INDEX idx_invite_scope ON sys_invite(scope_type, scope_id) WHERE delete_time IS NULL;
CREATE INDEX idx_invite_invitee ON sys_invite(invitee_id) WHERE status = 0 AND delete_time IS NULL;
CREATE UNIQUE INDEX idx_invite_pending_unique
  ON sys_invite(scope_type, scope_id, invitee_id)
  WHERE status = 0 AND delete_time IS NULL;
CREATE INDEX idx_invite_email ON sys_invite(email) WHERE status = 0;

-- 12b. 申请加入工作区 / 库（用户主动申请，space_id 为空表示申请整个工作区）
CREATE TABLE sys_join_request (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  space_id uuid,
  applicant_id uuid NOT NULL,
  message text,
  status smallint NOT NULL DEFAULT 0,
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now(),
  delete_time timestamptz
);

CREATE INDEX idx_join_request_applicant ON sys_join_request(applicant_id) WHERE delete_time IS NULL;
CREATE INDEX idx_join_request_workspace ON sys_join_request(workspace_id) WHERE delete_time IS NULL;
CREATE UNIQUE INDEX idx_join_request_ws_pending ON sys_join_request(applicant_id, workspace_id)
  WHERE space_id IS NULL AND status = 0 AND delete_time IS NULL;
CREATE UNIQUE INDEX idx_join_request_sp_pending ON sys_join_request(applicant_id, space_id)
  WHERE space_id IS NOT NULL AND status = 0 AND delete_time IS NULL;
















-- A. 资源/附件表 (sys_asset)用于管理页面中上传的图片、视频和文件。
CREATE TABLE sys_asset (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  page_id uuid, -- 可选，关联特定页面
  file_name varchar(255),
  file_path varchar(512),
  file_size bigint,
  mime_type varchar(100),
  create_by uuid NOT NULL,
  create_time timestamptz DEFAULT now(),
  delete_time timestamptz
);


-- B. 评论系统 (sys_comment)知识协作离不开评论。
CREATE TABLE sys_comment (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL,
  parent_id uuid, -- 评论支持嵌套回复
  content text NOT NULL,
  create_by uuid NOT NULL,
  create_time timestamptz DEFAULT now(),
  delete_time timestamptz
);


-- C. 操作日志/审计 (sys_audit_log)记录谁在什么时候修改了什么。
CREATE TABLE sys_audit_log (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  user_id uuid,
  action varchar(50), -- e.g., 'PAGE_CREATE', 'MEMBER_INVITE'
  resource_type varchar(50),
  resource_id uuid,
  payload jsonb, -- 变更详情
  ip_address inet,
  create_time timestamptz DEFAULT now()
);