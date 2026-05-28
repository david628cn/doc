import { contextPath } from '@/api/context';

/**
 * 将用户资料里的 `head_sculpture` 转为可直接用于 `<img src>` 的绝对地址。
 * 已为完整 URL 则原样返回；否则拼上 Gin 根路径（与 UserPopover 等一致）。
 */
export function resolveHeadSculptureUrl(raw?: string | null): string | undefined {
	if (raw == null) return undefined;
	const s = String(raw).trim();
	if (s === '') return undefined;
	if (/^https?:\/\//i.test(s)) return s;
	if (/^data:image\//i.test(s)) return s;
	const base = contextPath.replace(/\/$/, '');
	if (s.startsWith('/')) {
		if (base) return `${base}${s}`;
		if (typeof window !== 'undefined') {
			return `${window.location.origin}${s}`;
		}
		return s;
	}
	return base ? `${base}/${s}` : s;
}

/** 与 {@link UserPopover} 一致：仅 HTTP(S) 或明确的站内路径走 `<img src>`；emoji 等走 Avatar `icon={字符串}` */
export function resolveCollaborationAvatarFields(raw?: string | null): {
	avatarUrl?: string;
	avatarIcon?: string;
} {
	if (raw == null) return {};
	const s = String(raw).trim();
	if (s === '') return {};
	if (/^https?:\/\//i.test(s)) {
		return { avatarUrl: s };
	}
	if (/^data:image\//i.test(s)) {
		return { avatarUrl: s };
	}
	if (s.startsWith('/')) {
		const u = resolveHeadSculptureUrl(s);
		return u ? { avatarUrl: u } : {};
	}
	if (/\.(png|jpe?g|gif|webp|svg)(\?[^/]*)?$/i.test(s)) {
		const u = resolveHeadSculptureUrl(s);
		return u ? { avatarUrl: u } : {};
	}
	return { avatarIcon: s };
}

/**
 * 头像、工作区/文档库图标、通知里的 sender_avatar 等 API 字段：
 * 能作为图片加载时返回解析后的绝对 URL，否则 undefined（走首字 / emoji / 占位）。
 */
export function resolveMediaSrcForImg(raw?: string | null): string | undefined {
	return resolveCollaborationAvatarFields(raw).avatarUrl;
}
