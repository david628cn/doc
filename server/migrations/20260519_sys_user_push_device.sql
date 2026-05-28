-- 移动端推送 device token（FCM/APNs 上报），PostgreSQL
CREATE TABLE IF NOT EXISTS sys_user_push_device (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  platform varchar(16) NOT NULL,
  token text NOT NULL,
  update_time timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uk_sys_user_push_device_pair UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_sys_user_push_device_uid ON sys_user_push_device (user_id);

-- 若 sys_user 存在则挂外键（按实际库表名调整）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sys_user'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_sys_user_push_device_user'
    ) THEN
      ALTER TABLE sys_user_push_device
        ADD CONSTRAINT fk_sys_user_push_device_user
        FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
