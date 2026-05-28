import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

export type VirtualScrollProps<T extends Record<string, unknown>> = {
	items: T[];
	itemKey: keyof T & string;
	estimatedHeight?: number;
	/** overscan 行数（向上/向下额外渲染），旧名 buffer 兼容 */
	buffer?: number;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
	children: (item: T, measureRef: (el: HTMLElement | null) => void) => React.ReactNode;
	/** 初始滚动位置（仅首次生效） */
	initialScrollTop?: number;
	/** 滚动回调 */
	onScroll?: (p: { scrollTop: number }) => void;
	onVisibleRangeChange?: (p: {
		startIndex: number;
		endIndex: number;
		startItem?: T;
		scrollTop: number;
		viewportHeight: number;
		totalHeight: number;
		isAtTop: boolean;
		isAtBottom: boolean;
	}) => void;
};

type LayoutRow = Record<string, unknown> & {
	_top: number;
	_height: number;
	_bottom: number;
};

export type VirtualScrollHandle = {
	scrollToIndex: (index: number, opts?: { align?: 'start' | 'center' | 'end' }) => void;
	scrollToTop: (top: number) => void;
	getScrollTop: () => number;
};

/**
 * 虚拟滚动：仅挂载视口内 + buffer 行，总高度用占位撑开 scrollHeight。
 */
function VirtualScrollInner<T extends Record<string, unknown>>(
	{
		items,
		itemKey,
		estimatedHeight = 32,
		buffer = 6,
		overscan,
		className,
		style,
		children,
		initialScrollTop,
		onScroll,
		onVisibleRangeChange,
	}: VirtualScrollProps<T>,
	ref: React.ForwardedRef<VirtualScrollHandle>
) {
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(0);
	const measurementsRef = useRef<Map<string, number>>(new Map());
	const rafRef = useRef<number | null>(null);
	const pendingMeasureKeysRef = useRef<Set<string>>(new Set());
	const [, forceMeasureVersion] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRefCache = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());
	const didInitScrollRef = useRef(false);

	const overscanCount = overscan ?? buffer;

	const syncViewportFromEl = useCallback((el: HTMLDivElement | null) => {
		if (!el) return;
		const ch = el.clientHeight;
		if (ch > 0) {
			setViewportHeight(prev => (Math.abs(prev - ch) > 0.5 ? ch : prev));
		}
	}, []);

	const getMeasureRef = useCallback(
		(key: string) => {
			if (!measureRefCache.current.has(key)) {
				measureRefCache.current.set(key, (el: HTMLElement | null) => {
					if (!el) return;
					const h = el.getBoundingClientRect().height;
					if (h <= 0) return;
					const prev = measurementsRef.current.get(key) ?? 0;
					if (Math.abs(prev - h) <= 0.5) return;
					measurementsRef.current.set(key, h);
					pendingMeasureKeysRef.current.add(key);
					if (rafRef.current != null) return;
					rafRef.current = requestAnimationFrame(() => {
						rafRef.current = null;
						if (pendingMeasureKeysRef.current.size === 0) return;
						pendingMeasureKeysRef.current.clear();
						forceMeasureVersion(v => v + 1);
					});
				});
			}
			return measureRefCache.current.get(key)!;
		},
		[]
	);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			syncViewportFromEl(containerRef.current);
		});
		ro.observe(el);
		syncViewportFromEl(el);
		return () => ro.disconnect();
	}, [syncViewportFromEl]);

	useLayoutEffect(() => {
		syncViewportFromEl(containerRef.current);
		const id = requestAnimationFrame(() => syncViewportFromEl(containerRef.current));
		return () => cancelAnimationFrame(id);
	}, [items.length, syncViewportFromEl]);

	// items 变化时清理已不存在的 key 的测量缓存，避免旧行高影响新的布局（出现空白/跳动）
	useEffect(() => {
		const keys = new Set(items.filter(Boolean).map(it => String((it as any)[itemKey])));
		for (const k of Array.from(measurementsRef.current.keys())) {
			if (!keys.has(k)) measurementsRef.current.delete(k);
		}
		for (const k of Array.from(measureRefCache.current.keys())) {
			if (!keys.has(k)) measureRefCache.current.delete(k);
		}
		// 触发一次重新布局
		forceMeasureVersion(v => v + 1);
	}, [items, itemKey]);

	// Popuover / Tab 初次展示时，容器可能在若干帧内从 0 高度变为可见高度。
	// 如果只在 mount/ResizeObserver 里取 clientHeight，可能会错过首屏，造成“只渲染少量行 -> 下面一大块空白”。
	// 这里在 viewportHeight 仍为 0 时，做短暂 rAF 探测（最多 ~20 帧），拿到有效高度后立即停止。
	useEffect(() => {
		if (viewportHeight > 0) return;
		let cancelled = false;
		let frame = 0;
		let rafId: number | null = null;
		const tick = () => {
			if (cancelled) return;
			const el = containerRef.current;
			if (el) syncViewportFromEl(el);
			frame += 1;
			if ((containerRef.current?.clientHeight ?? 0) > 0) return;
			if (frame >= 20) return;
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => {
			cancelled = true;
			if (rafId != null) cancelAnimationFrame(rafId);
		};
	}, [syncViewportFromEl, viewportHeight]);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		if (didInitScrollRef.current) return;
		didInitScrollRef.current = true;
		if (typeof initialScrollTop === 'number' && initialScrollTop > 0) {
			el.scrollTop = initialScrollTop;
			setScrollTop(initialScrollTop);
		}
	}, [initialScrollTop]);

	const { layoutItems, totalHeight } = useMemo(() => {
		let currentTop = 0;
		const safeItems = items.filter((item): item is T => item != null);
		const layouts: LayoutRow[] = safeItems.map(item => {
			const key = String(item[itemKey]);
			const h = measurementsRef.current.get(key) || estimatedHeight;
			const row: LayoutRow = {
				...item,
				_top: currentTop,
				_height: h,
				_bottom: currentTop + h,
			};
			currentTop += h;
			return row;
		});
		return { layoutItems: layouts, totalHeight: currentTop };
	}, [items, itemKey, estimatedHeight]);

	// items/高度变化时，避免 scrollTop 落在“超出内容范围”的位置导致底部出现大块空白
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const maxTop = Math.max(0, totalHeight - viewportHeight);
		if (el.scrollTop > maxTop + 1) {
			el.scrollTop = maxTop;
			setScrollTop(maxTop);
		}
	}, [totalHeight, viewportHeight, items.length]);

	/** 第一个满足 _bottom > scrollTop 的行（与视口上沿相交的最早一行） */
	const startIndex = useMemo(() => {
		const n = layoutItems.length;
		if (n === 0) return 0;
		let low = 0;
		let high = n - 1;
		while (low <= high) {
			const mid = (low + high) >> 1;
			if (layoutItems[mid]._bottom > scrollTop) {
				if (mid === 0 || layoutItems[mid - 1]._bottom <= scrollTop) return mid;
				high = mid - 1;
			} else {
				low = mid + 1;
			}
		}
		return 0;
	}, [layoutItems, scrollTop]);

	/** 首个「行顶 >= scrollTop+clientHeight」的下标 lo；切片右端取 lo+buffer（含 overscan） */
	const endIndex = useMemo(() => {
		const n = layoutItems.length;
		if (n === 0) return 0;
		const targetTop = scrollTop + viewportHeight;
		if (targetTop <= 0) {
			return Math.min(n, Math.max(startIndex, 0) + overscanCount + 2);
		}
		let lo = 0;
		let hi = n;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if ((layoutItems[mid] as LayoutRow)._top >= targetTop) {
				hi = mid;
			} else {
				lo = mid + 1;
			}
		}
		return Math.min(n, lo + overscanCount);
	}, [layoutItems, scrollTop, viewportHeight, overscanCount, startIndex]);

	const { start, end, visibleData, offsetTop } = useMemo(() => {
		const n = layoutItems.length;
		const start = Math.max(0, startIndex - overscanCount);
		const end = Math.max(start + 1, Math.min(n, endIndex));
		const visibleData = layoutItems.slice(start, end);
		const offsetTop = layoutItems[start]?._top ?? 0;
		return { start, end, visibleData, offsetTop };
	}, [layoutItems, startIndex, endIndex, overscanCount]);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const t = e.currentTarget;
		setScrollTop(t.scrollTop);
		syncViewportFromEl(t);
		onScroll?.({ scrollTop: t.scrollTop });
	};

	useImperativeHandle(
		ref,
		() => ({
			scrollToIndex: (index: number, opts?: { align?: 'start' | 'center' | 'end' }) => {
				const el = containerRef.current;
				if (!el) return;
				const row = layoutItems[index];
				if (!row) return;
				const align = opts?.align ?? 'start';
				let top = row._top;
				if (align === 'center') {
					top = Math.max(0, row._top - (viewportHeight - row._height) / 2);
				} else if (align === 'end') {
					top = Math.max(0, row._bottom - viewportHeight);
				}
				el.scrollTop = top;
				setScrollTop(top);
			},
			scrollToTop: (top: number) => {
				const el = containerRef.current;
				if (!el) return;
				el.scrollTop = top;
				setScrollTop(top);
			},
			getScrollTop: () => containerRef.current?.scrollTop ?? 0,
		}),
		[layoutItems, viewportHeight]
	);

	useEffect(() => {
		if (!onVisibleRangeChange) return;
		const eps = 1; // 容忍浮点/像素误差
		const isAtTop = scrollTop <= eps;
		const isAtBottom = scrollTop + viewportHeight >= totalHeight - eps;
		onVisibleRangeChange({
			startIndex,
			endIndex,
			startItem: (layoutItems[startIndex] as T | undefined) ?? undefined,
			scrollTop,
			viewportHeight,
			totalHeight,
			isAtTop,
			isAtBottom,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onVisibleRangeChange, startIndex, endIndex, scrollTop, layoutItems]);

	return (
		<div
			ref={containerRef}
			className={className}
			onScroll={handleScroll}
			style={{
				width: '100%',
				overflowY: 'auto',
				overflowX: 'hidden',
				overflowAnchor: 'none',
				overscrollBehavior: 'contain',
				position: 'relative',
				WebkitOverflowScrolling: 'touch',
				minHeight: 0,
				// 更稳定地保留滚动条槽位（避免看起来“没有滚动条”）
				scrollbarGutter: 'stable',
				scrollbarWidth: 'thin',
				height: '100%',
				...style,
			}}
		>
			<div
				style={{
					height: totalHeight,
					width: '100%',
					position: 'relative',
					pointerEvents: 'none',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						transform: `translate3d(0, ${offsetTop}px, 0)`,
						willChange: 'transform',
						pointerEvents: 'auto',
					}}
				>
					{visibleData.map(item => {
						const k = String(item[itemKey]);
						return (
							<React.Fragment key={k}>
								{children(item as T, getMeasureRef(k))}
							</React.Fragment>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export const VirtualScroll = forwardRef(VirtualScrollInner) as <T extends Record<string, unknown>>(
	props: VirtualScrollProps<T> & { ref?: React.ForwardedRef<VirtualScrollHandle> }
) => React.ReactElement;
