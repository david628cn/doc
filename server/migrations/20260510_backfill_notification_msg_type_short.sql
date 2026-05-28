-- 若库内已有超长 msg_type 字符串的历史行，可与新版常量对齐（可选）
UPDATE sys_notification SET msg_type = 'join_req_result' WHERE msg_type = 'join_request_result';
UPDATE sys_notification SET msg_type = 'fr_req_result' WHERE msg_type = 'friend_request_result';
