-- 好友备注（双向）：发起方备注 / 接收方备注；群内别名（成员自拟）
ALTER TABLE sys_friend ADD COLUMN IF NOT EXISTS remark_user varchar(200);
ALTER TABLE sys_friend ADD COLUMN IF NOT EXISTS remark_friend varchar(200);
UPDATE sys_friend SET remark_user = remark WHERE remark IS NOT NULL AND TRIM(remark) <> '' AND (remark_user IS NULL OR TRIM(COALESCE(remark_user,'')) = '');

ALTER TABLE sys_chat_group_member ADD COLUMN IF NOT EXISTS group_alias varchar(64) NOT NULL DEFAULT '';
