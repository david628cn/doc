-- sys_notification.msg_type 原 varchar(20)，无法写入 join_request_result / friend_request_result（均为 21 字符）
ALTER TABLE sys_notification ALTER COLUMN msg_type TYPE varchar(64);
