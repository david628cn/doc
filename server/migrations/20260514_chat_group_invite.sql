-- 群邀请 / 入群申请（待审批）
CREATE TABLE IF NOT EXISTS sys_chat_group_invite (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL,
  kind varchar(16) NOT NULL,
  actor_id uuid NOT NULL,
  invitee_id uuid,
  status smallint NOT NULL DEFAULT 0,
  message varchar(512) NOT NULL DEFAULT '',
  create_time timestamptz NOT NULL DEFAULT now(),
  update_time timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_group_invite_group_pending
  ON sys_chat_group_invite (group_id) WHERE status = 0;
CREATE INDEX IF NOT EXISTS idx_chat_group_invite_invitee_pending
  ON sys_chat_group_invite (invitee_id) WHERE status = 0 AND invitee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_group_invite_actor
  ON sys_chat_group_invite (actor_id);
