import React, { useCallback, useMemo, useState } from 'react';
import {
	AssistantRuntimeProvider,
	useLocalRuntime,
	CompositeAttachmentAdapter,
	SimpleImageAttachmentAdapter,
	SimpleTextAttachmentAdapter,
	useThreadRuntime,
	type ChatModelAdapter,
	type ThreadMessage,
} from '@assistant-ui/react';
import { Flex, Menu, Popuover, View, Text } from '@carvy/ui';
import { CarveAssistantThread } from '@/components/assistant-ui/thread';
import { SimpleFallbackFileAttachmentAdapter } from '@/components/assistant-ui/fallbackFileAttachmentAdapter';
import { ImagePreviewProvider } from '@/components/assistant-ui/imagePreviewContext';
import { CLASSNAME } from '@/config';
import './index.less';

const NS = `${CLASSNAME}-ai`;

const PLACEHOLDER = '收集并分析互联网上关于某产品的讨论';

function formatThreadText(msg: ThreadMessage): string {
	return msg.content
		.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
		.map((p) => p.text)
		.join('\n');
}

function lastUserPlainText(messages: readonly ThreadMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i]!;
		if (m.role !== 'user') continue;
		const t = formatThreadText(m).trim();
		if (t) return t;
	}
	return '';
}

const QUICK_ROW_A: { key: string; label: string }[] = [
	{ key: 'partner', label: '你的 AI 搭档' },
	{ key: 'slides', label: '生成幻灯片' },
	{ key: 'doc', label: '撰写文档' },
	{ key: 'design', label: '生成设计' },
	{ key: 'video', label: '生成视频' },
];

const QUICK_ROW_B: { key: string; label: string }[] = [
	{ key: 'story', label: '创建故事绘本' },
	{ key: 'research', label: '批量调研' },
	{ key: 'data', label: '分析数据' },
	{ key: 'chart', label: '绘制图表' },
];

const MORE_ITEMS: { key: string; label: string }[] = [
	{ key: 'fin', label: '全融投研' },
	{ key: 'table', label: '生成表格' },
	{ key: 'web', label: '创建网页' },
	{ key: 'pdf', label: '翻译 PDF' },
	{ key: 'video_sum', label: '总结视频' },
	{ key: 'audio', label: '转写音频' },
];

const TEMPLATE_TABS = [
	{ key: 'all', label: '全部模板' },
	{ key: 'creative', label: '创意与设计' },
	{ key: 'general', label: '通用' },
	{ key: 'growth', label: '营销增长' },
	{ key: 'research', label: '产品调研' },
];

const TEMPLATE_CARDS = [
	{ id: '1', title: '上传 PPTX 文件作为模板', meta: 'Slides', uses: null as number | null, emoji: '📊' },
	{ id: '2', title: '创建空白文档', meta: '文档', uses: null, emoji: '➕' },
	{ id: '3', title: 'Soft Editorial Deck', meta: 'Slides', uses: 87 },
	{ id: '4', title: 'Promotion Review Report', meta: 'Slides', uses: 575 },
	{ id: '5', title: 'Archival Stencil Deck', meta: 'Slides', uses: 72 },
];

const STREAM_TICK_MS = 28;
/** 每步增加的字符数（中英混排按码元切片，仅用于演示节奏） */
const STREAM_CHARS_PER_TICK = 2;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		if (signal.aborted) {
			resolve();
			return;
		}
		const t = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(t);
				resolve();
			},
			{ once: true },
		);
	});
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}

/**
 * 无后端时的前端假流式：`ChatModelAdapter.run` 返回 AsyncGenerator，
 * 每步 yield 当前完整文本，LocalRuntime 会更新 assistant 气泡（见 @assistant-ui/core 测试用例）。
 */
const demoChatModel: ChatModelAdapter = {
	async *run({ messages, abortSignal }) {
		const text = lastUserPlainText(messages);
		if (!text) {
			yield { content: [{ type: 'text', text: '（未识别到有效输入）' }], status: { type: 'complete', reason: 'stop' } };
			return;
		}
		await sleep(180, abortSignal);
		throwIfAborted(abortSignal);
		const body = `（演示流式）真实模型接入后将在此返回结果。\n\n已收到：${text.slice(0, 480)}${text.length > 480 ? '…' : ''}`;
		let pos = 0;
		while (pos < body.length) {
			if (abortSignal.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}
			pos = Math.min(body.length, pos + STREAM_CHARS_PER_TICK);
			yield { content: [{ type: 'text', text: body.slice(0, pos) }] };
			if (pos < body.length) {
				await sleep(STREAM_TICK_MS, abortSignal);
				throwIfAborted(abortSignal);
			}
		}
		yield { content: [{ type: 'text', text: body }], status: { type: 'complete', reason: 'stop' } };
	},
};

const AiQuickPills: React.FC = () => {
	const thread = useThreadRuntime();
	const appendPromptLine = useCallback(
		(line: string) => {
			const prev = thread.composer.getState().text;
			thread.composer.setText(prev ? `${prev}\n${line}` : line);
		},
		[thread],
	);

	return (
		<>
			<Flex className={`${NS}-pills`} justify="center" wrap="wrap">
				{QUICK_ROW_A.map((p) => (
					<button key={p.key} type="button" className={`${NS}-pill`} onClick={() => appendPromptLine(p.label)}>
						{p.label}
					</button>
				))}
			</Flex>
			<Flex className={`${NS}-pills ${NS}-pills--row2`} justify="center" wrap="wrap">
				{QUICK_ROW_B.map((p) => (
					<button key={p.key} type="button" className={`${NS}-pill`} onClick={() => appendPromptLine(p.label)}>
						{p.label}
					</button>
				))}
				<Popuover
					trigger={['click']}
					pos="bl-tl?"
					items={
						<Menu
							items={MORE_ITEMS.map((it) => ({
								key: it.key,
								label: it.label,
							}))}
							onSelect={(params: { key: string }) => {
								const item = MORE_ITEMS.find((x) => x.key === params.key);
								if (item) appendPromptLine(item.label);
							}}
						/>
					}
				>
					<button type="button" className={`${NS}-pill ${NS}-pill-more`}>
						更多 &gt;
					</button>
				</Popuover>
			</Flex>
		</>
	);
};

const AiTemplates: React.FC = () => {
	const thread = useThreadRuntime();
	const [tab, setTab] = useState('all');
	const setPromptText = useCallback(
		(text: string) => {
			thread.composer.setText(text);
		},
		[thread],
	);

	return (
		<View className={`${NS}-templates`}>
			<Flex className={`${NS}-template-tabs`} gap={16} wrap="wrap">
				{TEMPLATE_TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						className={`${NS}-template-tab${tab === t.key ? ` ${NS}-template-tab--active` : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
					</button>
				))}
			</Flex>

			<View className={`${NS}-template-grid`}>
				{TEMPLATE_CARDS.map((c) => (
					<button
						key={c.id}
						type="button"
						className={`${NS}-template-card`}
						onClick={() => setPromptText(`使用模板：${c.title}`)}
					>
						<View className={`${NS}-card-icon`}>{c.emoji}</View>
						<View className={`${NS}-template-card-title`}>{c.title}</View>
						<View className={`${NS}-template-card-meta`}>
							{c.meta}
							{c.uses != null ? ` · ${c.uses} 次使用` : ''}
						</View>
					</button>
				))}
			</View>
		</View>
	);
};

const AiPageBody: React.FC = () => {
	return (
		<View className={`${NS}-page`}>
			<View className={`${NS}-page-inner`}>
				<h1 className={`${NS}-hero-title`}>今天可以帮你做什么？</h1>

				<CarveAssistantThread
					ns={NS}
					placeholder={PLACEHOLDER}
					welcomeText="在下方输入问题并发送，对话将显示在这里。"
				/>

				<AiQuickPills />
				<AiTemplates />
			</View>
		</View>
	);
};

const AiPage: React.FC = () => {
	const chatModel = useMemo(() => demoChatModel, []);
	const attachmentAdapter = useMemo(
		() =>
			new CompositeAttachmentAdapter([
				new SimpleImageAttachmentAdapter(),
				new SimpleTextAttachmentAdapter(),
				new SimpleFallbackFileAttachmentAdapter(),
			]),
		[],
	);
	const runtime = useLocalRuntime(chatModel, {
		adapters: { attachments: attachmentAdapter },
	});

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<ImagePreviewProvider ns={NS}>
				<AiPageBody />
			</ImagePreviewProvider>
		</AssistantRuntimeProvider>
	);
};

export default AiPage;
