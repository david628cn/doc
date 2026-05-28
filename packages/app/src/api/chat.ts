import request from './request';
import { contextPath } from './context';

const socialBase = `${contextPath}/api/social`;

export interface ChatMessageDTO {
	id: string;
	sender_id: string;
	content: string;
	msg_type?: string;
	create_time: string;
}

export interface GroupChatRow {
	group_id: string;
	room_id: string;
	name: string;
	/** 自定义群头像（与后端 head_sculpture） */
	head_sculpture?: string;
	/** @deprecated 兼容旧字段 */
	avatar?: string;
	member_count: number;
	/** 前 9 人头像路径，与 member_usernames / member_display_labels 同序 */
	member_avatar_urls?: string[];
	/** 无头像占位：登录名首字 */
	member_usernames?: string[];
	member_display_labels?: string[];
	last_message_preview?: string;
	last_message_at?: string;
	unread_count: number;
}

export interface GroupMemberBrief {
	user_id: string;
	username: string;
	real_name?: string;
	head_sculpture?: string;
	/** 该成员在本群的自拟别名 */
	group_alias?: string;
	/** 展示：别名（用户名）或用户名 */
	display_label?: string;
}

export interface GroupDetailDTO {
	group_id: string;
	room_id: string;
	name: string;
	announcement?: string;
	/** 自定义群头像；为空则用成员拼图 */
	head_sculpture?: string;
	/** @deprecated */
	avatar?: string;
	owner_id: string;
	i_am_owner: boolean;
	members: GroupMemberBrief[];
}

/** GET /chat/group-invites/pending */
export interface GroupInvitePendingRow {
	id: string;
	group_id: string;
	group_name: string;
	room_id: string;
	kind: string;
	actor_id: string;
	actor_name: string;
	invitee_id?: string;
	invitee_name?: string;
	message?: string;
	create_time: string;
}

export interface PendingGroupInvitesOut {
	invite_to_me: GroupInvitePendingRow[];
	apply_to_my_groups: GroupInvitePendingRow[];
	my_invites_sent: GroupInvitePendingRow[];
	my_applies: GroupInvitePendingRow[];
}

/** GET /api/social/chat/history — 平台私聊/群聊仅按 room_id；旧版私聊可带 workspace_id */
export const chatHistory = async (params: {
	room_id: string;
	workspace_id?: string;
	last_time?: string;
	page_size?: string;
}) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/history`,
		data: {
			room_id: params.room_id,
			...(params.workspace_id ? { workspace_id: params.workspace_id } : {}),
			...(params.last_time ? { last_time: params.last_time } : {}),
			...(params.page_size ? { page_size: params.page_size } : {}),
		},
	});

/** POST multipart `file` → `{ path: "/uploads/public/chat/..." }` */
export const socialChatUploadAttachment = async (file: File) => {
	const fd = new FormData();
	fd.append('file', file);
	return request.post({
		url: `${socialBase}/chat/upload`,
		data: fd,
	});
};

export const socialChatMarkRead = async (body: { workspace_id?: string; room_id: string; read_at?: string }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/read`,
		data: JSON.stringify(body),
	});

export const socialChatGroups = async () =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups`,
	});

export const socialChatCreateGroup = async (body: {
	workspace_id?: string;
	name: string;
	member_ids: string[];
}) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups`,
		data: JSON.stringify(body),
	});

export const socialChatGroupDetail = async (groupId: string) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}`,
	});

export const socialChatUpdateGroup = async (
	groupId: string,
	body: { name?: string; announcement?: string; head_sculpture?: string },
) =>
	request.patch({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}`,
		data: JSON.stringify(body),
	});

/** POST …/transfer-owner — 群主将权限转让给群内其他成员 */
export const socialChatTransferGroupOwner = async (groupId: string, body: { new_owner_id: string }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/transfer-owner`,
		data: JSON.stringify(body),
	});

/** PATCH …/my-alias — 本人在群内的显示别名 */
export const socialChatUpdateMyGroupAlias = async (groupId: string, body: { alias: string }) =>
	request.patch({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/my-alias`,
		data: JSON.stringify(body),
	});

/** DELETE …/members/:userId — 群主将成员移出群聊 */
export const socialChatRemoveGroupMember = async (groupId: string, userId: string) =>
	request.del({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
	});

/** POST …/invites — 邀请入群（待对方同意） */
export const socialChatInviteMembers = async (groupId: string, body: { member_ids: string[] }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/invites`,
		data: JSON.stringify(body),
	});

/** POST …/apply — 申请入群（群主审批） */
export const socialChatApplyJoinGroup = async (groupId: string, body?: { message?: string }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/apply`,
		data: JSON.stringify(body ?? {}),
	});

/** POST …/group-invites/:id/respond */
export const socialChatRespondGroupInvite = async (inviteId: string, body: { accept: boolean }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/group-invites/${encodeURIComponent(inviteId)}/respond`,
		data: JSON.stringify(body),
	});

export const socialChatPendingGroupInvites = async () =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/group-invites/pending`,
	});

export const socialChatLeaveGroup = async (groupId: string) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${socialBase}/chat/groups/${encodeURIComponent(groupId)}/leave`,
		data: JSON.stringify({}),
	});
