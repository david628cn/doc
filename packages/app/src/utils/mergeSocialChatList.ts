import type { FollowListRow, FriendRequestRow, PeerChatSummary, UserBrief } from '@/api/social';
import type { GroupChatRow } from '@/api/chat';

export type MergedSocialPeer = {
	user: UserBrief;
	chat?: PeerChatSummary;
	following?: FollowListRow;
	follower?: FollowListRow;
	friend?: FriendRequestRow;
};

function pickNewerChat(a?: PeerChatSummary, b?: PeerChatSummary): PeerChatSummary | undefined {
	if (!a) return b;
	if (!b) return a;
	const ta = new Date(a.last_message_at || 0).getTime();
	const tb = new Date(b.last_message_at || 0).getTime();
	return tb >= ta ? b : a;
}

/** 合并关注 / 粉丝 / 好友为「单人维度」，会话摘要取较新的一条 */
export function mergeSocialPeers(
	following: FollowListRow[],
	followers: FollowListRow[],
	friends: FriendRequestRow[],
): Map<string, MergedSocialPeer> {
	const map = new Map<string, MergedSocialPeer>();

	for (const row of following) {
		const id = row.user.id;
		const prev = map.get(id);
		map.set(id, {
			user: row.user,
			chat: pickNewerChat(prev?.chat, row.chat),
			following: row,
			follower: prev?.follower,
			friend: prev?.friend,
		});
	}
	for (const row of followers) {
		const id = row.user.id;
		const prev = map.get(id);
		map.set(id, {
			user: row.user,
			chat: pickNewerChat(prev?.chat, row.chat),
			following: prev?.following,
			follower: row,
			friend: prev?.friend,
		});
	}
	for (const row of friends) {
		const id = row.peer.id;
		const prev = map.get(id);
		map.set(id, {
			user: row.peer,
			chat: pickNewerChat(prev?.chat, row.chat),
			following: prev?.following,
			follower: prev?.follower,
			friend: row,
		});
	}
	return map;
}

export type UnifiedChatRow =
	| { kind: 'peer'; peer: MergedSocialPeer }
	| { kind: 'group'; group: GroupChatRow };

function rowLastMessageTs(row: UnifiedChatRow): number {
	if (row.kind === 'peer') {
		const t = row.peer.chat?.last_message_at;
		return t ? new Date(t).getTime() : 0;
	}
	const t = row.group.last_message_at;
	return t ? new Date(t).getTime() : 0;
}

/** 单人会话 + 群聊统一列表，按最后消息时间倒序（无消息时间的排在后面） */
export function buildUnifiedChatRows(peers: Map<string, MergedSocialPeer>, groups: GroupChatRow[]): UnifiedChatRow[] {
	const rows: UnifiedChatRow[] = [];
	peers.forEach((peer) => rows.push({ kind: 'peer', peer }));
	for (const g of groups) rows.push({ kind: 'group', group: g });
	rows.sort((a, b) => rowLastMessageTs(b) - rowLastMessageTs(a));
	return rows;
}
