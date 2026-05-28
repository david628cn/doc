/** 未读角标：超过 99 显示 99+ */
export function formatUnreadBadge(count: number): string {
	if (!count || count <= 0) return '';
	if (count > 99) return '99+';
	return String(count);
}

/**
 * 会话列表最后一条摘要：富文本 JSON → [图片]、[视图]；text 展示原文（含表情）。
 */
export function formatChatListPreview(raw?: string | null): string {
	if (raw == null) return '';
	const t = String(raw).trim();
	if (!t) return '';
	if (t[0] !== '{') return t;
	try {
		const j = JSON.parse(t) as { msg_type?: string; text?: string };
		const mt = j?.msg_type;
		if (mt === 'image') return '[图片]';
		if (mt === 'video') return '[视图]';
		if (mt === 'text') return (j.text ?? '').trim() || '';
		return t;
	} catch {
		return t;
	}
}

/** 会话列表时间展示 */
export function formatChatListTime(iso?: string): string {
	if (!iso) return '';
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		const now = new Date();
		const sameDay =
			d.getFullYear() === now.getFullYear() &&
			d.getMonth() === now.getMonth() &&
			d.getDate() === now.getDate();
		if (sameDay) {
			return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		}
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		const ySame =
			d.getFullYear() === yesterday.getFullYear() &&
			d.getMonth() === yesterday.getMonth() &&
			d.getDate() === yesterday.getDate();
		if (ySame) return '昨天';
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	} catch {
		return iso;
	}
}

/** 平台私聊 room_id，与文档工作区无关：priv:{较小用户 id}:{较大用户 id} */
export function socialPrivateRoomId(selfId: string, peerId: string): string {
	const [a, b] = selfId < peerId ? [selfId, peerId] : [peerId, selfId];
	return `priv:${a}:${b}`;
}

/** 从 priv:{uuid}:{uuid} 与当前用户 id 解析对方用户 id */
/** 与后端 utils.SocialDisplayLabel 一致：有别名/备注时为「项（登录名）」，否则仅登录名 */
export function formatSocialDisplayLabel(remarkOrAlias: string | undefined, loginUsername: string): string {
	const r = (remarkOrAlias ?? '').trim();
	const u = (loginUsername ?? '').trim();
	const show = u || '用户';
	if (!r) return show;
	return `${r}（${show}）`;
}

export function parseSocialPrivatePeerUserId(roomId: string, selfUserId: string): string | undefined {
	if (!isSocialPrivateRoom(roomId)) return undefined;
	const rest = roomId.slice('priv:'.length);
	const parts = rest.split(':');
	if (parts.length !== 2) return undefined;
	const a = parts[0]?.trim();
	const b = parts[1]?.trim();
	if (!a || !b) return undefined;
	const nu = (v: string) => String(v).replace(/-/g, '').toLowerCase();
	const ns = nu(selfUserId);
	if (nu(a) === ns) return b;
	if (nu(b) === ns) return a;
	return undefined;
}

/** 新私聊格式（两段用户 UUID） */
export function isSocialPrivateRoom(roomId: string): boolean {
	if (!roomId.startsWith('priv:')) return false;
	const rest = roomId.slice('priv:'.length);
	return rest.split(':').length === 2;
}

export function isGroupRoom(roomId: string): boolean {
	return roomId.startsWith('grp:');
}

/** 从 grp:{uuid} 解析群 id */
export function parseGroupIdFromRoom(roomId: string): string | undefined {
	if (!isGroupRoom(roomId)) return undefined;
	const id = roomId.slice('grp:'.length).trim();
	return /^[0-9a-f-]{36}$/i.test(id) ? id : undefined;
}

/** 平台级会话：私聊（新格式）与群聊，均不按文档工作区隔离 */
export function isPlatformChatRoom(roomId: string): boolean {
	return isSocialPrivateRoom(roomId) || isGroupRoom(roomId);
}

/** 旧链接 priv:{workspace}:{user}:{user} 中取出工作区 id（兼容历史书签） */
export function parseLegacyPrivateRoomWorkspaceId(roomId: string): string | undefined {
	if (!roomId.startsWith('priv:') || isSocialPrivateRoom(roomId) || isGroupRoom(roomId))
		return undefined;
	const rest = roomId.slice('priv:'.length);
	const parts = rest.split(':');
	if (parts.length !== 3) return undefined;
	const ws = parts[0]?.trim();
	if (ws && /^[0-9a-f-]{36}$/i.test(ws)) return ws;
	return undefined;
}
