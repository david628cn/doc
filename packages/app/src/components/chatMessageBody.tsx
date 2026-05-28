import React, { useMemo } from 'react';
import { Text } from '@carvy/ui';
import { contextPath } from '@/api/context';

/** 展示用绝对 / 同源 URL（附件多为 /uploads/public/chat/...） */
export function resolveChatMediaUrl(pathOrUrl: string): string {
	const u = (pathOrUrl ?? '').trim();
	if (!u) return '';
	if (/^https?:\/\//i.test(u)) return u;
	if (/^data:image\//i.test(u)) return u;
	const base = contextPath || '';
	return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

export type RichPayload = {
	msg_type: string;
	text?: string;
	url?: string;
};

export function parseChatDisplay(content: string): { mode: 'plain'; text: string } | { mode: 'rich'; data: RichPayload } {
	const raw = content ?? '';
	const t = raw.trim();
	if (!t) return { mode: 'plain', text: '' };
	if (t[0] !== '{') return { mode: 'plain', text: raw };
	try {
		const j = JSON.parse(t) as RichPayload;
		if (j && typeof j.msg_type === 'string') return { mode: 'rich', data: j };
	} catch {
		/* ignore */
	}
	return { mode: 'plain', text: raw };
}

/**
 * 解析纯文本或 JSON 富文本（msg_type: text | image | video），用于气泡内展示。
 */
export const ChatMessageBody: React.FC<{ content: string }> = ({ content }) => {
	const parsed = useMemo(() => parseChatDisplay(content), [content]);

	if (parsed.mode === 'plain') {
		return (
			<Text fontSize={14} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
				{parsed.text}
			</Text>
		);
	}

	const d = parsed.data;
	switch (d.msg_type) {
		case 'text':
			return (
				<Text fontSize={14} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
					{d.text ?? ''}
				</Text>
			);
		case 'image': {
			const src = resolveChatMediaUrl(d.url ?? '');
			if (!src) {
				return (
					<Text fontSize={13} color="rgba(0,0,0,0.45)" style={{ margin: 0 }}>
						[图片无效]
					</Text>
				);
			}
			return (
				<img
					src={src}
					alt=""
					style={{
						display: 'block',
						maxWidth: 'min(100%, 280px)',
						maxHeight: 280,
						borderRadius: 8,
						verticalAlign: 'middle',
					}}
				/>
			);
		}
		case 'video': {
			const src = resolveChatMediaUrl(d.url ?? '');
			if (!src) {
				return (
					<Text fontSize={13} color="rgba(0,0,0,0.45)" style={{ margin: 0 }}>
						[视频无效]
					</Text>
				);
			}
			return (
				<video
					src={src}
					controls
					style={{
						display: 'block',
						maxWidth: 'min(100%, 360px)',
						maxHeight: 320,
						borderRadius: 8,
					}}
				/>
			);
		}
		default:
			return (
				<Text fontSize={14} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
					{content}
				</Text>
			);
	}
};
