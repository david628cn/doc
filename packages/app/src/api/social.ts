import request from './request';
import { contextPath } from './context';

const base = `${contextPath}/api/social`;

export interface UserBrief {
	id: string;
	username: string;
	real_name?: string;
	head_sculpture?: string;
}

export interface PeerChatSummary {
	room_id: string;
	last_message_preview?: string;
	last_message_at?: string;
	unread_count: number;
}

export interface FollowListRow {
	user: UserBrief;
	created_at: string;
	chat?: PeerChatSummary;
}

export interface FriendRequestRow {
	id: string;
	user_id: string;
	friend_id: string;
	status: number;
	apply_message?: string;
	/** 我对好友的备注（原文） */
	remark?: string;
	/** 列表展示：有备注时为「备注（用户名）」，否则为用户名 */
	display_label?: string;
	create_time: string;
	peer: UserBrief;
	chat?: PeerChatSummary;
}

export interface PageResult<T> {
	list: T[];
	total: number;
}

export type FollowPage = PageResult<FollowListRow>;
export type FriendPage = PageResult<FriendRequestRow>;

export const socialFollow = async (followee_id: string) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/follows`,
		data: JSON.stringify({ followee_id }),
	});

export const socialUnfollow = async (userId: string) =>
	request.del({
		url: `${base}/follows/${encodeURIComponent(userId)}`,
	});

export const socialFollowingList = async (params?: { page?: number; page_size?: number; workspace_id?: string }) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/follows/following`,
		data: {
			page: String(params?.page ?? 1),
			page_size: String(params?.page_size ?? 20),
			...(params?.workspace_id ? { workspace_id: params.workspace_id } : {}),
		},
	});

export const socialFollowersList = async (params?: { page?: number; page_size?: number; workspace_id?: string }) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/follows/followers`,
		data: {
			page: String(params?.page ?? 1),
			page_size: String(params?.page_size ?? 20),
			...(params?.workspace_id ? { workspace_id: params.workspace_id } : {}),
		},
	});

export const socialFriendApply = async (body: { user_id: string; message?: string }) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/apply`,
		data: JSON.stringify(body),
	});

export const socialFriendList = async (params?: { page?: number; page_size?: number; workspace_id?: string }) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends`,
		data: {
			page: String(params?.page ?? 1),
			page_size: String(params?.page_size ?? 20),
			...(params?.workspace_id ? { workspace_id: params.workspace_id } : {}),
		},
	});

export const socialFriendIncoming = async (params?: { page?: number; page_size?: number }) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/requests/incoming`,
		data: {
			page: String(params?.page ?? 1),
			page_size: String(params?.page_size ?? 20),
		},
	});

export const socialFriendOutgoing = async (params?: { page?: number; page_size?: number }) =>
	request.get({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/requests/outgoing`,
		data: {
			page: String(params?.page ?? 1),
			page_size: String(params?.page_size ?? 20),
		},
	});

export const socialFriendAccept = async (id: string) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/${encodeURIComponent(id)}/accept`,
		data: JSON.stringify({}),
	});

export const socialFriendReject = async (id: string) =>
	request.post({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/${encodeURIComponent(id)}/reject`,
		data: JSON.stringify({}),
	});

export const socialFriendRemove = async (id: string) =>
	request.del({
		url: `${base}/friends/${encodeURIComponent(id)}`,
	});

/** PATCH …/friends/remark — 设置我对好友的备注 */
export const socialFriendUpdateRemark = async (body: { peer_id: string; remark: string }) =>
	request.patch({
		headers: { 'Content-type': 'application/json' },
		url: `${base}/friends/remark`,
		data: JSON.stringify(body),
	});
