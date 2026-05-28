import React from 'react';
import { ThreadPrimitive, AuiIf } from '@assistant-ui/react';
import type { MessageState, ThreadMessage, ThreadUserMessagePart } from '@assistant-ui/react';
import { View, Text } from '@carvy/ui';
import { CarveAssistantComposer } from './composer';
import { useImagePreviewOpen } from './imagePreviewContext';

function formatThreadText(msg: ThreadMessage): string {
	return msg.content
		.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
		.map((p) => p.text)
		.join('\n');
}

function UserMessageParts({ ns, message }: { ns: string; message: MessageState }) {
	const openPreview = useImagePreviewOpen();
	if (message.role !== 'user') return null;
	const parts = message.content as readonly ThreadUserMessagePart[];
	const fromAttachments =
		message.role === 'user' &&
		'attachments' in message &&
		message.attachments &&
		message.attachments.length > 0
			? message.attachments.flatMap(
					(att) => att.content as readonly ThreadUserMessagePart[],
				)
			: [];
	const merged = [...parts, ...fromAttachments];
	return (
		<div className={`${ns}-msg-user-parts`}>
			{merged.map((part, i) => {
				if (part.type === 'text') {
					return (
						<div key={i} className={`${ns}-msg-user-text`}>
							{part.text}
						</div>
					);
				}
				if (part.type === 'image') {
					return (
						<button
							key={i}
							type="button"
							className={`${ns}-msg-inline-img-btn`}
							onClick={() => openPreview(part.image)}
							aria-label="查看大图"
							title="查看大图"
						>
							<img className={`${ns}-msg-inline-img`} src={part.image} alt="" loading="lazy" draggable={false} />
						</button>
					);
				}
				if (part.type === 'file') {
					return (
						<a
							key={i}
							className={`${ns}-msg-file-link`}
							href={part.data}
							download={part.filename ?? 'attachment'}
						>
							{part.filename ?? '附件'}
						</a>
					);
				}
				return null;
			})}
		</div>
	);
}

/**
 * 对齐官方文档中的 Thread 解剖结构（Viewport → AuiIf 空态 / Messages → ViewportFooter → ScrollToBottom + Composer）。
 * @see https://www.assistant-ui.com/docs/ui/thread
 */
export type CarveAssistantThreadProps = {
	ns: string;
	placeholder: string;
	/** 无消息时的提示（替代已弃用的 ThreadPrimitive.Empty） */
	welcomeText: string;
};

export function CarveAssistantThread({ ns, placeholder, welcomeText }: CarveAssistantThreadProps) {
	return (
		<ThreadPrimitive.Root className={`${ns}-thread`}>
			<ThreadPrimitive.Viewport className={`${ns}-thread-viewport`} autoScroll>
				<div className={`${ns}-thread-viewport-messages`}>
					<AuiIf condition={(s) => s.thread.isEmpty}>
						<View className={`${ns}-thread-empty`}>
							<Text color="rgba(0,0,0,0.38)" fontSize={14}>
								{welcomeText}
							</Text>
						</View>
					</AuiIf>
					<ThreadPrimitive.Messages>
						{({ message }: { message: MessageState }) => {
							const text = formatThreadText(message);
							if (message.role === 'user') {
								const attLen =
									'attachments' in message && message.attachments
										? message.attachments.length
										: 0;
								const hasParts = message.content.length > 0 || attLen > 0;
								const userPlain = formatThreadText(message);
								return (
									<div className={`${ns}-msg ${ns}-msg-user`}>
										<div className={`${ns}-msg-bubble`}>
											{hasParts ? (
												<UserMessageParts ns={ns} message={message} />
											) : (
												userPlain || '（空）'
											)}
										</div>
									</div>
								);
							}
							if (message.role === 'assistant') {
								const running = message.status?.type === 'running';
								const body = text || (running ? '…' : '');
								return (
									<div className={`${ns}-msg ${ns}-msg-assistant`}>
										<div className={`${ns}-msg-bubble`}>{body}</div>
									</div>
								);
							}
							return null;
						}}
					</ThreadPrimitive.Messages>
				</div>

				<ThreadPrimitive.ViewportFooter className={`${ns}-thread-footer`}>
					<ThreadPrimitive.ScrollToBottom className={`${ns}-scroll-bottom`} type="button">
						到底部
					</ThreadPrimitive.ScrollToBottom>
					<CarveAssistantComposer ns={ns} placeholder={placeholder} />
				</ThreadPrimitive.ViewportFooter>
			</ThreadPrimitive.Viewport>
		</ThreadPrimitive.Root>
	);
}
