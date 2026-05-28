import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Tree, type TreeNode } from './tree';
import { Emoji } from './emoji';
import { ImageUpload } from './imageUpload';
import { VirtualScroll, type VirtualScrollHandle } from './virtualScroll';
import { CropperView, type CropperViewHandle } from './crop';

/** 主树：含异步节点、各类节点字段演示 */
const mainTreeSeed: TreeNode[] = [
	{
		key: '1',
		title: '总公司',
		children: [
			{
				key: 'demo-async',
				title: '异步目录（展开后 loadData）',
				isLeaf: false,
				children: [],
			},
			{
				key: 'demo-nocheck',
				title: '无复选框 (checkable: false)',
				checkable: false,
				children: [],
			},
			{
				key: 'demo-noselect',
				title: '不可点选 (selectable: false)',
				selectable: false,
				children: [],
			},
			{
				key: 'demo-disable-cb',
				title: '禁用勾选 (disableCheckbox)',
				disableCheckbox: true,
				children: [],
			},
			{
				key: 'demo-disabled',
				title: '节点禁用 (disabled)',
				disabled: true,
				children: [],
			},
			{
				key: '2',
				title: '销售部',
				children: [
					{ key: '4', title: '国内销售组', children: [] },
					{
						key: '5',
						title: '国际销售组',
						children: [
							{
								key: '14',
								title: '财务对接组',
								children: [
									{ key: '15', title: '会计组', children: [] },
									{ key: '16', title: '审计组', children: [] },
								],
							},
						],
					},
					{ key: '6', title: '大客户组', children: [] },
				],
			},
			{
				key: '3',
				title: '技术部',
				children: [
					{ key: '7', title: '前端开发组', children: [] },
					{ key: '8', title: '后端开发组', children: [] },
					{ key: '9', title: '测试组', children: [] },
					{ key: '10', title: '运维组', children: [] },
				],
			},
			{
				key: '11',
				title: '人事部',
				children: [
					{ key: '12', title: '招聘组', children: [] },
					{ key: '13', title: '培训组', children: [] },
				],
			},
		],
	},
];

/** fieldNames 演示：自定义 id / label / items */
const customFieldTree: TreeNode[] = [
	{
		id: 'c-root',
		label: '自定义字段根',
		items: [
			{ id: 'c-a', label: '子项 A' },
			{
				id: 'c-b',
				label: '子项 B（可展开）',
				items: [{ id: 'c-b-1', label: '孙项' }],
			},
		],
	} as TreeNode,
];

function TreeDemo() {
	const [treeData, setTreeData] = useState<TreeNode[]>(mainTreeSeed);
	const [selectedKeys, setSelectedKeys] = useState<string[]>(['1']);
	const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
	const [halfCheckedKeys, setHalfCheckedKeys] = useState<string[]>([]);
	const [query, setQuery] = useState('');
	const [useVirtual, setUseVirtual] = useState(false);
	const [treeDisabled, setTreeDisabled] = useState(false);
	const [log, setLog] = useState<string[]>([]);

	const pushLog = useCallback((line: string) => {
		setLog(prev => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 20));
	}, []);

	const handleDragEnd = (params: { treeData: TreeNode[] }) => {
		setTreeData(params.treeData);
		pushLog('onDragEnd: treeData 已更新（若刚拖过节点，其上一条应为拖拽重算后的 onCheck）');
	};

	return (
		<div
			style={{
				maxWidth: 800,
				minHeight: 460,
				margin: '0 auto',
				padding: 16,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h1 style={{ margin: 0 }}>Tree 组件 Demo</h1>

			<section style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
				<label>
					搜索 query（过滤 + 高亮）：{' '}
					<input
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder="如：销售、异步"
						style={{ width: 160 }}
					/>
				</label>
				<label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<input type="checkbox" checked={useVirtual} onChange={e => setUseVirtual(e.target.checked)} />
					virtual（默认 min(65vh,720px) 可视高度，无固定高度 flex 也可用）
				</label>
				<label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<input type="checkbox" checked={treeDisabled} onChange={e => setTreeDisabled(e.target.checked)} />
					整树 disabled
				</label>
			</section>

			<p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.5 }}>
				未勾选 virtual 时树为<strong>全量 DOM</strong>（展开可见节点都会挂载）；勾选后为虚拟滚动，仅挂载可视区附近的行。
			</p>

			<p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
				<strong>拖拽 + 勾选：</strong>
				展开「总公司」后，勾选「销售部」或子节点，再拖动某一节点换位置；不可放入时（拖到<strong>自身行</strong>或自身子树内）为红色占位，合法为蓝色；禁用/禁选节点也可作为插入目标；下方「受控勾选快照」会随{' '}
				<code style={{ fontSize: 11 }}>onCheck</code> 更新（含半选 half），用于验证排序后勾选与父子关系一致。
			</p>

			<div
				style={{
					flex: 1,
					minHeight: 320,
					display: 'flex',
					flexDirection: 'column',
					background: '#f5f5f5',
					borderRadius: 8,
					padding: 12,
					border: '1px solid #e0e0e0',
				}}
			>
				<div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>主树（checkable、sortable、loadData）</div>
				<div
					style={{
						fontSize: 11,
						marginBottom: 8,
						padding: '6px 8px',
						background: '#fff',
						borderRadius: 4,
						border: '1px solid #ddd',
						fontFamily: 'ui-monospace, monospace',
					}}
				>
					<div>
						<strong>受控勾选快照</strong>（拖拽结束时会先触发带重算的 onCheck，再 onDragEnd）
					</div>
					<div style={{ marginTop: 4 }}>
						checkedKeys: {checkedKeys.length ? checkedKeys.join(', ') : '（空）'}
					</div>
					<div>
						halfCheckedKeys: {halfCheckedKeys.length ? halfCheckedKeys.join(', ') : '（空）'}
					</div>
				</div>
				<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
					<Tree
						checkable
						sortable
						showLine
						disabled={treeDisabled}
						query={query}
						virtual={useVirtual}
						virtualEstimatedHeight={40}
						selectedKeys={selectedKeys}
						treeData={treeData}
						checkedKeys={checkedKeys}
						halfCheckedKeys={halfCheckedKeys}
						onDragEnd={handleDragEnd}
						loadData={async node => {
							await new Promise<void>(r => setTimeout(r, 450));
							const k = String((node as TreeNode).key ?? '');
							if (k === 'demo-async') {
								return [
									{ key: 'demo-async-1', title: '异步子节点 A', isLeaf: true },
									{ key: 'demo-async-2', title: '异步子节点 B', isLeaf: true },
								];
							}
						}}
						onLoad={(keys, info) => {
							pushLog(`onLoad keys=[${keys.join(',')}] node=${String((info.node as TreeNode).key)}`);
						}}
						onCheck={(keys, info) => {
							setCheckedKeys(keys.map(k => String(k)));
							setHalfCheckedKeys(info.halfCheckedKeys.map(k => String(k)));
							pushLog(
								`onCheck checked=[${keys.join(',')}] half=[${info.halfCheckedKeys.join(',')}] opNode=${String(info.node?.key ?? '')}`
							);
						}}
						onSelect={({ key }) => {
							setSelectedKeys([key]);
							pushLog(`onSelect key=${key}`);
						}}
						onDoubleClick={(e, node) => {
							pushLog(`onDoubleClick key=${String(node.key)}`);
							e.preventDefault();
						}}
						onExpand={p => {
							if (p.trigger !== 'select') {
								pushLog(`onExpand expandedKeys=[${(p.expandedKeys || []).join(',')}]`);
							}
						}}
					/>
				</div>
			</div>

			<div
				style={{
					minHeight: 140,
					display: 'flex',
					flexDirection: 'column',
					background: '#f0f7ff',
					borderRadius: 8,
					padding: 12,
					border: '1px solid #b3d4fc',
				}}
			>
				<div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>fieldNames 演示（key=id, title=label, children=items）</div>
				<div style={{ flex: 1, minHeight: 100, maxHeight: 200 }}>
					<Tree
						checkable
						treeData={customFieldTree}
						fieldNames={{ key: 'id', title: 'label', children: 'items' }}
					/>
				</div>
			</div>

			<section>
				<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>事件日志</div>
				<pre
					style={{
						margin: 0,
						padding: 8,
						background: '#1e1e1e',
						color: '#d4d4d4',
						borderRadius: 6,
						fontSize: 11,
						maxHeight: 160,
						overflow: 'auto',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-all',
					}}
				>
					{log.length ? log.join('\n') : '勾选、展开异步目录、双击标题等以查看日志。'}
				</pre>
			</section>
		</div>
	);
}

function EmojiDemo() {
	const [log, setLog] = useState<string[]>([]);

	const pushLog = useCallback((line: string) => {
		setLog(prev => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 20));
	}, []);

	const formatValue = (v: any) => {
		if (v.type === 'unicode') return `${v.emoji.char}  ${v.emoji.name}  [${v.emoji.category}]`;
		return `custom  ${v.emoji.file.name ?? ''}`;
	};

	return (
		<div
			style={{
				maxWidth: 800,
				minHeight: 460,
				margin: '0 auto',
				padding: 16,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h1 style={{ margin: 0 }}>EmojiPicker 组件 Demo</h1>

			<p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
				验证点：搜索过滤、虚拟滚动、滚动联动底部类别高亮、点击类别跳转、上传裁剪后加入自定义并可选中。
			</p>

			<div
				style={{
					display: 'flex',
					gap: 12,
					alignItems: 'stretch',
					flexWrap: 'wrap',
				}}
			>
				<Emoji
					onChange={(v) => console.log(v)}
				/>
				<div style={{ flex: 1, minWidth: `320px` }}>
					<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>事件日志</div>
					<pre
						style={{
							margin: 0,
							padding: 8,
							background: '#1e1e1e',
							color: '#d4d4d4',
							borderRadius: 10,
							fontSize: 11,
							height: 520,
							overflow: 'auto',
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-all',
						}}
					>
						{log.length ? log.join('\n') : '点击表情、滚动分组、上传并裁剪图片以查看日志。'}
					</pre>
				</div>
			</div>
		</div>
	);
}

function EmojiSvgDemo() {
	const [log, setLog] = useState<string[]>([]);

	const pushLog = useCallback((line: string) => {
		setLog(prev => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 20));
	}, []);

	return (
		<div
			style={{
				maxWidth: 800,
				minHeight: 460,
				margin: '0 auto',
				padding: 16,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h1 style={{ margin: 0 }}>EmojiSvg 组件 Demo</h1>
			<p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
				验证点：搜索过滤、选择颜色、点击图标触发 onChange、最近 10 条记忆。
			</p>

			<div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
				<ImageUpload
					onChange={(v) => {
						// pushLog(`onChange id=${v?.id ?? 'null'} name=${item?.name ?? ''} color=${v?.color ?? ''}`);
					}}
					style={{width: '800px'}}
				/>
				<div style={{ flex: 1, minWidth: `320px` }}>
					<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>事件日志</div>
					<pre
						style={{
							margin: 0,
							padding: 8,
							background: '#1e1e1e',
							color: '#d4d4d4',
							borderRadius: 10,
							fontSize: 11,
							height: 520,
							overflow: 'auto',
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-all',
						}}
					>
						{log.length ? log.join('\n') : '筛选、换色、点击图标以查看日志。'}
					</pre>
				</div>
			</div>
		</div>
	);
}

type DemoRow = { id: string; title: string; detail: string };

function VirtualScrollDemo() {
	const total = 4000;
	const items: DemoRow[] = Array.from({ length: total }).map((_, i) => ({
		id: `row-${i}`,
		title: `Row ${i}`,
		detail:
			i % 7 === 0
				? 'Variable height row. This row has a longer description to force a taller height.'
				: i % 11 === 0
					? 'Another tall row: Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
					: 'Normal row.',
	}));

	const vsRef = React.useRef<VirtualScrollHandle>(null);
	const [scrollTop, setScrollTop] = useState(0);

	return (
		<div
			style={{
				maxWidth: 800,
				minHeight: 460,
				margin: '0 auto',
				padding: 16,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h1 style={{ margin: 0 }}>VirtualScroll 组件 Demo</h1>

			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
				<button type="button" onClick={() => vsRef.current?.scrollToIndex(0)}>
					scrollToIndex(0)
				</button>
				<button type="button" onClick={() => vsRef.current?.scrollToIndex(200, { align: 'center' })}>
					scrollToIndex(200, center)
				</button>
				<button type="button" onClick={() => vsRef.current?.scrollToIndex(1200)}>
					scrollToIndex(1200)
				</button>
				<button type="button" onClick={() => vsRef.current?.scrollToIndex(total - 1, { align: 'end' })}>
					scrollToIndex(end, end)
				</button>
				<span style={{ fontSize: 12, color: '#666' }}>scrollTop: {scrollTop.toFixed(0)}</span>
			</div>

			<div
				style={{
					height: 520,
					border: '1px solid #e0e0e0',
					borderRadius: 12,
					background: '#fff',
					overflow: 'hidden',
				}}
			>
				<VirtualScroll
					ref={vsRef}
					items={items}
					itemKey="id"
					estimatedHeight={44}
					overscan={10}
					onScroll={p => setScrollTop(p.scrollTop)}
				>
					{(item, measureRef) => {
						const r = item as DemoRow;
						return (
							<div
								ref={measureRef}
								style={{
									padding: '10px 12px',
									borderBottom: '1px solid #f0f0f0',
								}}
							>
								<div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>
								<div style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{r.detail}</div>
							</div>
						);
					}}
				</VirtualScroll>
			</div>
		</div>
	);
}

function CropDemo() {
	const cropRef = React.useRef<CropperViewHandle>(null);
	const [image, setImage] = useState<string>('');
	const [preview, setPreview] = useState<string>('');
	const [blobInfo, setBlobInfo] = useState<string>('');
	const [circular, setCircular] = useState(false);
	const [cropBoxMovable, setCropBoxMovable] = useState(false);
	const [cropBoxResizable, setCropBoxResizable] = useState(false);
	const [dragMode, setDragMode] = useState<'move' | 'crop'>('move');
	const [rotatable, setRotatable] = useState(true);

	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => setImage(String(reader.result ?? ''));
		reader.readAsDataURL(file);
	};

	return (
		<div
			style={{
				maxWidth: 800,
				minHeight: 460,
				margin: '0 auto',
				padding: 16,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h1 style={{ margin: 0 }}>Crop 组件 Demo</h1>

			<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
				<input type="file" accept="image/*" onChange={onPick} />
				<label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#555' }}>
					<input type="checkbox" checked={circular} onChange={e => setCircular(e.target.checked)} />
					circular
				</label>
				<label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#555' }}>
					<input
						type="checkbox"
						checked={cropBoxMovable}
						onChange={e => setCropBoxMovable(e.target.checked)}
						disabled={!image}
					/>
					cropBoxMovable
				</label>
				<label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#555' }}>
					<input
						type="checkbox"
						checked={cropBoxResizable}
						onChange={e => setCropBoxResizable(e.target.checked)}
						disabled={!image}
					/>
					cropBoxResizable
				</label>
				<label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#555' }}>
					<input type="checkbox" checked={rotatable} onChange={e => setRotatable(e.target.checked)} disabled={!image} />
					rotatable
				</label>
				<select
					value={dragMode}
					onChange={e => setDragMode(e.target.value as any)}
					disabled={!image}
					style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }}
				>
					<option value="move">dragMode: move(拖图片)</option>
					<option value="crop">dragMode: crop(拖裁剪框)</option>
				</select>
				<button type="button" onClick={() => cropRef.current?.rotate(90)} disabled={!image || !rotatable}>
					rotate +90
				</button>
				<button type="button" onClick={() => cropRef.current?.zoom(0.1)} disabled={!image}>
					zoom +
				</button>
				<button type="button" onClick={() => cropRef.current?.zoom(-0.1)} disabled={!image}>
					zoom -
				</button>
				<button type="button" onClick={() => cropRef.current?.reset()} disabled={!image}>
					reset
				</button>
				<button
					type="button"
					disabled={!image}
					onClick={async () => {
						const dataUrl = cropRef.current?.getDataUrl({ type: 'image/png' }) ?? '';
						setPreview(dataUrl);
						try {
							const blob = await cropRef.current!.getBlob({ type: 'image/png' });
							setBlobInfo(`${blob.type}  ${Math.round(blob.size / 1024)}KB`);
						} catch (e) {
							setBlobInfo(String(e));
						}
					}}
				>
					export
				</button>
				{blobInfo ? <span style={{ fontSize: 12, color: '#666' }}>{blobInfo}</span> : null}
			</div>

			<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
				<div
					style={{
						width: 420,
						height: 420,
						border: '1px solid #e0e0e0',
						borderRadius: 12,
						overflow: 'hidden',
						background: '#000',
					}}
				>
					{image ? (
						<CropperView
							ref={cropRef}
							image={image}
							// aspectRatio={1}
							circular={circular}
							dragMode={dragMode}
							cropBoxMovable={cropBoxMovable}
							cropBoxResizable={cropBoxResizable}
							rotatable={rotatable}
						/>
					) : null}
				</div>
				<div style={{ flex: 1, minWidth: `240px` }}>
					<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>预览</div>
					<div
						style={{
							height: 420,
							border: '1px solid #e0e0e0',
							borderRadius: 12,
							background: '#fff',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							overflow: 'hidden',
						}}
					>
						{preview ? <img src={preview} style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={{ fontSize: 12, color: '#666' }}>点击 export</span>}
					</div>
				</div>
			</div>
		</div>
	);
}

function App() {
	const [demo, setDemo] = useState<'tree' | 'emoji' | 'emojiSvg' | 'virtual' | 'crop'>('emoji');

	return (
		<div style={{ minHeight: '100vh', background: '#fafafa' }}>
			<div
				style={{
					maxWidth: 800,
					margin: '0 auto',
					padding: '12px 16px 0',
					display: 'flex',
					gap: 8,
					alignItems: 'center',
					fontFamily: 'system-ui, sans-serif',
				}}
			>
				<button
					type="button"
					onClick={() => setDemo('emoji')}
					style={{
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid #ddd',
						background: demo === 'emoji' ? '#fff' : 'transparent',
						cursor: 'pointer',
						fontSize: 13,
					}}
				>
					EmojiPicker
				</button>
				<button
					type="button"
					onClick={() => setDemo('emojiSvg')}
					style={{
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid #ddd',
						background: demo === 'emojiSvg' ? '#fff' : 'transparent',
						cursor: 'pointer',
						fontSize: 13,
					}}
				>
					EmojiSvg
				</button>
				<button
					type="button"
					onClick={() => setDemo('virtual')}
					style={{
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid #ddd',
						background: demo === 'virtual' ? '#fff' : 'transparent',
						cursor: 'pointer',
						fontSize: 13,
					}}
				>
					VirtualScroll
				</button>
				<button
					type="button"
					onClick={() => setDemo('crop')}
					style={{
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid #ddd',
						background: demo === 'crop' ? '#fff' : 'transparent',
						cursor: 'pointer',
						fontSize: 13,
					}}
				>
					Crop
				</button>
				<button
					type="button"
					onClick={() => setDemo('tree')}
					style={{
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid #ddd',
						background: demo === 'tree' ? '#fff' : 'transparent',
						cursor: 'pointer',
						fontSize: 13,
					}}
				>
					Tree
				</button>
			</div>
			{demo === 'emoji'
				? <EmojiDemo />
				: demo === 'emojiSvg'
					? <EmojiSvgDemo />
					: demo === 'virtual'
						? <VirtualScrollDemo />
						: demo === 'crop'
							? <CropDemo />
							: <TreeDemo />}
		</div>
	);
}

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}

export default App;
