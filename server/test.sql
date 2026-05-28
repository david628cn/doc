-- =============================================================================
-- 本地/空库验证用种子数据（PostgreSQL）
-- 注意：uuid 类型仅接受 0-9 与 a-f（每段 8-4-4-4-12），勿用 s/p/i 等非十六进制字母作前缀。
-- 用法：清空或重建库后执行本文件（可与 sql.sql 结构脚本配合）。
-- 登录（所有测试账号同一密码）：
--   用户名 owner_u   / admin_u   / member_u   / guest_u
--   密码   Test123456
-- 工作区 slug: demo-ws   （请求头 X-Workspace-ID 用下面 WORKSPACE_ID）
--
-- 【SQLSTATE 25P02】若提示 current transaction is aborted：说明本连接里上一次事务已失败但未结束。
--   请先单独执行一行：  ROLLBACK;
--   再重新执行本文件全文（不要只执行后半段）。
-- 本脚本不使用 BEGIN…COMMIT 整包事务，每条语句自动提交，避免一条失败后整段被锁死。
-- =============================================================================

-- bcrypt("Test123456") cost=12，与 golang.org/x/crypto/bcrypt 校验兼容

-- 子表 → 主表顺序 TRUNCATE（无 FK 定义时亦保持习惯顺序）
TRUNCATE TABLE
  sys_notification_receiver,
  sys_notification,
  sys_invite,
  sys_page_access,
  sys_page_revision,
  sys_page,
  sys_space_access,
  sys_space,
  sys_group_user,
  sys_group,
  sys_workspace_user,
  sys_workspace,
  sys_audit_log,
  sys_comment,
  sys_asset,
  sys_chat_message,
  sys_file,
  sys_user
RESTART IDENTITY CASCADE;

-- ----- 用户（4 个） -----
INSERT INTO sys_user (id, username, password, pwd_version, real_name, email, mobile, status, head_sculpture, create_time, update_time)
VALUES
  ('b0000001-0001-4001-8001-000000000001', 'owner_u', '$2b$12$GQDUnwP4idd2xSWs05SQR.pe4f0UA06uRN0TV1DHnddEkBnPU2spq', 1, '工作区所有者', 'owner@test.local', '13000000001', 1, 'OU', now(), now()),
  ('b0000002-0002-4002-8002-000000000002', 'admin_u', '$2b$12$GQDUnwP4idd2xSWs05SQR.pe4f0UA06uRN0TV1DHnddEkBnPU2spq', 1, '工作区管理员', 'admin@test.local', '13000000002', 1, 'AU', now(), now()),
  ('b0000003-0003-4003-8003-000000000003', 'member_u', '$2b$12$GQDUnwP4idd2xSWs05SQR.pe4f0UA06uRN0TV1DHnddEkBnPU2spq', 1, '内部成员', 'member@company.com', '13000000003', 1, 'MU', now(), now()),
  ('b0000004-0004-4004-8004-000000000004', 'guest_u', '$2b$12$GQDUnwP4idd2xSWs05SQR.pe4f0UA06uRN0TV1DHnddEkBnPU2spq', 1, '外部访客', 'guest@partner.com', '13000000004', 1, 'GU', now(), now());

-- ----- 工作区 -----
INSERT INTO sys_workspace (id, name, description, icon, slug, settings, email_domains, default_space_id, create_time, update_time)
VALUES (
  'a0000001-0000-4000-8000-000000000001',
  '演示工作区 Demo',
  '用于验证 workspace / invite / private、成员与页面权限',
  '📁',
  'demo-ws',
  '{}'::jsonb,
  '["company.com"]'::jsonb,
  NULL,
  now(),
  now()
);

-- 全局唯一：每用户至多一条 is_default = true（此处仅 owner 默认进本区）
INSERT INTO sys_workspace_user (id, workspace_id, user_id, role, status, is_default, join_time, create_time, update_time)
VALUES
  ('e1000001-0001-4001-8001-000000000001', 'a0000001-0000-4000-8000-000000000001', 'b0000001-0001-4001-8001-000000000001', 'owner', 1, true, now(), now(), now()),
  ('e1000002-0002-4002-8002-000000000002', 'a0000001-0000-4000-8000-000000000001', 'b0000002-0002-4002-8002-000000000002', 'admin', 1, false, now(), now(), now()),
  ('e1000003-0003-4003-8003-000000000003', 'a0000001-0000-4000-8000-000000000001', 'b0000003-0003-4003-8003-000000000003', 'member', 1, false, now(), now(), now()),
  ('e1000004-0004-4004-8004-000000000004', 'a0000001-0000-4000-8000-000000000001', 'b0000004-0004-4004-8004-000000000004', 'guest', 1, false, now(), now(), now());

-- ----- 组：后端组，成员 member_u 在组内 -----
INSERT INTO sys_group (id, name, description, workspace_id, parent_id, create_by, update_by, create_time, update_time)
VALUES (
  'c0000001-0001-4001-8001-000000000001',
  '后端组',
  '用于组授权展开',
  'a0000001-0000-4000-8000-000000000001',
  NULL,
  'b0000002-0002-4002-8002-000000000002',
  'b0000002-0002-4002-8002-000000000002',
  now(),
  now()
);

INSERT INTO sys_group_user (id, group_id, user_id, role, join_time, create_time, update_time)
VALUES (
  'f1000001-0001-4001-8001-000000000001',
  'c0000001-0001-4001-8001-000000000001',
  'b0000003-0003-4003-8003-000000000003',
  'member',
  now(),
  now(),
  now()
);

-- ----- 库 -----
-- 1) 公开库：全员可见，owner ACL owner（删除库等）
INSERT INTO sys_space (id, workspace_id, name, description, icon, visibility, create_by, update_by, create_time, update_time)
VALUES (
  'd0000001-0001-4001-8001-000000000001',
  'a0000001-0000-4000-8000-000000000001',
  '公开库 Public',
  'visibility=workspace，member 默认 viewer 底权',
  '📖',
  'workspace',
  'b0000001-0001-4001-8001-000000000001',
  'b0000001-0001-4001-8001-000000000001',
  now(),
  now()
);

-- 2) 仅邀请壳：create_by=admin，仅 admin 为 owner；member 无 ACL → 列表见壳、不可进内容
INSERT INTO sys_space (id, workspace_id, name, description, icon, visibility, create_by, update_by, create_time, update_time)
VALUES (
  'd0000002-0002-4002-8002-000000000002',
  'a0000001-0000-4000-8000-000000000001',
  '仅邀请 Invite Shell',
  'member 可见壳 invite_shell_only；guest 不可见',
  '🔒',
  'invite',
  'b0000002-0002-4002-8002-000000000002',
  'b0000002-0002-4002-8002-000000000002',
  now(),
  now()
);

-- 3) 私密库：仅 ACL
INSERT INTO sys_space (id, workspace_id, name, description, icon, visibility, create_by, update_by, create_time, update_time)
VALUES (
  'd0000003-0003-4003-8003-000000000003',
  'a0000001-0000-4000-8000-000000000001',
  '私密库 Private',
  '仅 owner + member(editor)',
  '⛔',
  'private',
  'b0000001-0001-4001-8001-000000000001',
  'b0000001-0001-4001-8001-000000000001',
  now(),
  now()
);

-- 4) 私密库给 guest：guest 有一条 viewer，便于验证「访客被拉进库」
INSERT INTO sys_space (id, workspace_id, name, description, icon, visibility, create_by, update_by, create_time, update_time)
VALUES (
  'd0000004-0004-4004-8004-000000000004',
  'a0000001-0000-4000-8000-000000000001',
  '访客可见私有库 Guest Private',
  '仅 guest ACL',
  '👤',
  'private',
  'b0000001-0001-4001-8001-000000000001',
  'b0000001-0001-4001-8001-000000000001',
  now(),
  now()
);

-- ----- sys_space_access（每库须有一条 user owner，满足部分唯一索引） -----
INSERT INTO sys_space_access (id, space_id, subject_type, subject_id, role, join_time, create_time, update_time)
VALUES
  ('da000001-0001-4001-8001-000000000001', 'd0000001-0001-4001-8001-000000000001', 'user', 'b0000001-0001-4001-8001-000000000001', 'owner', now(), now(), now()),
  -- 公开库：组 viewer（member_u 在组内 → 通过组继承 viewer）
  ('da000002-0002-4002-8002-000000000002', 'd0000001-0001-4001-8001-000000000001', 'group', 'c0000001-0001-4001-8001-000000000001', 'viewer', now(), now(), now()),
  ('da000003-0003-4003-8003-000000000003', 'd0000002-0002-4002-8002-000000000002', 'user', 'b0000002-0002-4002-8002-000000000002', 'owner', now(), now(), now()),
  ('da000004-0004-4004-8004-000000000004', 'd0000003-0003-4003-8003-000000000003', 'user', 'b0000001-0001-4001-8001-000000000001', 'owner', now(), now(), now()),
  ('da000005-0005-4005-8005-000000000005', 'd0000003-0003-4003-8003-000000000003', 'user', 'b0000003-0003-4003-8003-000000000003', 'editor', now(), now(), now()),
  ('da000006-0006-4006-8006-000000000006', 'd0000004-0004-4004-8004-000000000004', 'user', 'b0000001-0001-4001-8001-000000000001', 'owner', now(), now(), now()),
  ('da000007-0007-4007-8007-000000000007', 'd0000004-0004-4004-8004-000000000004', 'user', 'b0000004-0004-4004-8004-000000000004', 'viewer', now(), now(), now());

-- ----- 页面（公开库下根页 + 一条 inherit_config=false 私密子页用于权限链） -----
INSERT INTO sys_page (
  id, workspace_id, space_id, parent_id, title, content, version, visibility, inherit_config,
  share_enabled, sort_order, create_by, update_by, create_time, update_time
)
VALUES
  (
    'f0000001-0001-4001-8001-000000000001',
    'a0000001-0000-4000-8000-000000000001',
    'd0000001-0001-4001-8001-000000000001',
    NULL,
    '欢迎页',
    '[]'::jsonb,
    1,
    'workspace',
    true,
    false,
    1024,
    'b0000003-0003-4003-8003-000000000003',
    'b0000003-0003-4003-8003-000000000003',
    now(),
    now()
  ),
  (
    'f0000002-0002-4002-8002-000000000002',
    'a0000001-0000-4000-8000-000000000001',
    'd0000001-0001-4001-8001-000000000001',
    'f0000001-0001-4001-8001-000000000001',
    '独立 ACL 子页（不继承）',
    '[]'::jsonb,
    1,
    'private',
    false,
    false,
    2048,
    'b0000003-0003-4003-8003-000000000003',
    'b0000003-0003-4003-8003-000000000003',
    now(),
    now()
  );

-- 子页仅 member_u 有 editor（其它人仅靠继承则可能被 inherit_config=false 挡住）
INSERT INTO sys_page_access (id, page_id, subject_type, subject_id, role, join_time, create_time, update_time)
VALUES (
  'fe000002-0002-4002-8002-000000000001',
  'f0000002-0002-4002-8002-000000000002',
  'user',
  'b0000003-0003-4003-8003-000000000003',
  'editor',
  now(),
  now(),
  now()
);

-- ----- 一条待处理库邀请（member_u 受邀 editor）-----
INSERT INTO sys_invite (
  id, workspace_id, scope_type, scope_id, inviter_id, invitee_id, token, status, role, expire_time, create_time, update_time
)
VALUES (
  'ab000001-0001-4001-8001-000000000001',
  'a0000001-0000-4000-8000-000000000001',
  'space',
  'd0000002-0002-4002-8002-000000000002',
  'b0000002-0002-4002-8002-000000000002',
  'b0000003-0003-4003-8003-000000000003',
  'test-invite-token-member-to-invite-space',
  0,
  'editor',
  now() + interval '30 days',
  now(),
  now()
);

-- 默认库（可指向公开库）
UPDATE sys_workspace
SET default_space_id = 'd0000001-0001-4001-8001-000000000001'
WHERE id = 'a0000001-0000-4000-8000-000000000001';

-- =============================================================================
-- 快速对照（复制到 Postman / 前端）
-- X-Workspace-ID: a0000001-0000-4000-8000-000000000001
--
-- 空间 ID：
--   公开   d0000001-0001-4001-8001-000000000001
--   邀请壳 d0000002-0002-4002-8002-000000000002  （member_u 无 ACL，guest_u 列表不可见）
--   私密   d0000003-0003-4003-8003-000000000003
--   访客私 d0000004-0004-4004-8004-000000000004
--
-- 页面 ID（UUID 须为十六进制 0-9a-f）：
--   根页   f0000001-0001-4001-8001-000000000001
--   子页   f0000002-0002-4002-8002-000000000002  inherit_config=false + page_access
--
-- 邀请 ID：ab000001-0001-4001-8001-000000000001
-- =============================================================================
