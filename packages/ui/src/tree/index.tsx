import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VirtualScroll } from '../virtualScroll';
import { Checkbox } from '../checkbox';
import {
    createRecord,
    updateCheckStatus,
    getAllKeys,
    getAllParentKeys,
    flattenTree,
    filterTree,
    getParentKeysBySelected,
    mergeChildrenAtKey,
    mergeCheckedKeysAfterLoad,
    recalculateCheckStateAfterStructureChange,
    moveNode as moveNodeInTree,
    mergeFieldNames,
    getKey,
    getTitle,
    getChildren,
    type FieldNames,
    DEFAULT_FIELD_NAMES,
} from './utils';
import { CLASSNAME } from '../config';
import { AutoScroller } from '../dragDrop';
import './index.less';

/** 从节点行向上找到第一个纵向可滚动的祖先（虚拟列表或普通树容器） */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
    let cur: HTMLElement | null = el;
    while (cur) {
        const st = getComputedStyle(cur);
        const oy = st.overflowY;
        if (
            (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
            cur.scrollHeight > cur.clientHeight + 1
        ) {
            return cur;
        }
        cur = cur.parentElement;
    }
    return null;
}

/** 与 AutoScroller.update 配合：模拟指针周围命中区域（与 dragDrop 中 preview 语义一致） */
const TREE_DRAG_EDGE_HELPER_SIZE = 48;

export type { FieldNames };
export { DEFAULT_FIELD_NAMES, mergeFieldNames };

export type TreeNode = {
    key?: React.Key;
    title?: React.ReactNode;
    children?: TreeNode[];
    disabled?: boolean;
    isLeaf?: boolean;
    checkable?: boolean;
    disableCheckbox?: boolean;
    selectable?: boolean;
    icon?: React.ReactNode;
    [key: string]: any;
};

export type TreeCheckInfo = {
    checked: boolean;
    checkedNodes: TreeNode[];
    node: TreeNode;
    event: React.SyntheticEvent | React.MouseEvent | undefined;
    halfCheckedKeys: string[];
};

export type TreeProps = {
    className?: string;
    treeData?: TreeNode[];
    fieldNames?: Partial<FieldNames>;
    defaultSelectedKeys?: string[];
    selectedKeys?: string[];
    defaultExpandedKeys?: string[];
    expandedKeys?: string[];
    defaultCheckedKeys?: string[];
    checkedKeys?: string[];
    defaultHalfCheckedKeys?: string[];
    halfCheckedKeys?: string[];
    query?: string | null | undefined;
    switcherIcon?: React.ReactNode;
    checkable?: boolean;
    sortable?: boolean;
    showLine?: boolean;
    /** 是否启用虚拟滚动；也可传入旧版对象 `{ estimatedHeight?, buffer? }` 以兼容 */
    virtual?: boolean | { estimatedHeight?: number; buffer?: number } | null;
    virtualEstimatedHeight?: number;
    virtualBuffer?: number;
    /**
     * 虚拟列表可视区域高度。外层 flex 无固定高度时 `height:100%` 无效，须用 vh/min() 等。
     * 默认 `min(65vh, 720px)`，可按业务覆盖。
     */
    virtualScrollHeight?: React.CSSProperties['height'];
    /** 默认 `min(85vh, 960px)` */
    virtualScrollMaxHeight?: React.CSSProperties['maxHeight'];
    disabled?: boolean;
    loadData?: (node: TreeNode) => Promise<TreeNode[] | void>;
    onSelect?: (params: { key: string; node: TreeNode; event: React.MouseEvent }) => void;
    onChange?: (params: any) => void;
    onDragStart?: (params: any) => void;
    onDragMove?: (params: any) => void;
    onDragEnd?: (params: any) => void;
    onCheck?: (checkedKeys: React.Key[], info: TreeCheckInfo) => void;
    onExpand?: (params: any) => void;
    onLoad?: (
        loadedKeys: React.Key[],
        info: { event?: React.SyntheticEvent | React.MouseEvent; node: TreeNode }
    ) => void;
    onDoubleClick?: (event: React.MouseEvent, node: TreeNode) => void;
};

function resolveVirtual(
    virtual: TreeProps['virtual'],
    virtualEstimatedHeight: number | undefined,
    virtualBuffer: number | undefined
): { enabled: boolean; estimatedHeight: number; buffer: number } {
    if (virtual == null) {
        return {
            enabled: false,
            estimatedHeight: virtualEstimatedHeight ?? 42,
            buffer: virtualBuffer ?? 6,
        };
    }
    if (typeof virtual === 'object') {
        return {
            enabled: true,
            estimatedHeight: virtual.estimatedHeight ?? virtualEstimatedHeight ?? 42,
            buffer: virtual.buffer ?? virtualBuffer ?? 6,
        };
    }
    return {
        enabled: Boolean(virtual),
        estimatedHeight: virtualEstimatedHeight ?? 42,
        buffer: virtualBuffer ?? 6,
    };
}

export const Tree: React.FC<TreeProps> = props => {
    const {
        className,
        treeData = [],
        fieldNames: fieldNamesProp,
        checkable,
        sortable,
        virtual: virtualProp,
        virtualEstimatedHeight,
        virtualBuffer,
        virtualScrollHeight,
        virtualScrollMaxHeight,
        showLine,
        switcherIcon,
        disabled: treeDisabled,
        loadData,
        onDragStart,
        onDragMove,
        onDragEnd,
        onSelect,
        onCheck,
        onExpand,
        onLoad,
        onDoubleClick,
    } = props;

    const fn = useMemo(() => mergeFieldNames(fieldNamesProp), [fieldNamesProp]);

    const virtualCfg = useMemo(
        () => resolveVirtual(virtualProp, virtualEstimatedHeight, virtualBuffer),
        [virtualProp, virtualEstimatedHeight, virtualBuffer]
    );

    const [mergedTreeData, setMergedTreeData] = useState<TreeNode[]>(treeData);
    const [selectedKeys, setSelectedKeys] = useState<string[]>(
        props.selectedKeys || props.defaultSelectedKeys || []
    );
    const [expandedKeys, setExpandedKeys] = useState<string[]>(
        props.expandedKeys || props.defaultExpandedKeys || []
    );
    const [checkedKeys, setCheckedKeys] = useState<string[]>(
        props.checkedKeys || props.defaultCheckedKeys || []
    );
    const [halfCheckedKeys, setHalfCheckedKeys] = useState<string[]>(
        props.halfCheckedKeys || props.defaultHalfCheckedKeys || []
    );
    const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
    const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
    const [query, setQuery] = useState(props.query);
    const [dragInfo, setDragInfo] = useState<any>(null);
    const [dropTarget, setDropTarget] = useState<any>(null);

    const dragDataRef = useRef<any>(null);
    const dropTargetRef = useRef<any>(null);
    const nodeRefs = useRef(new Map<string, HTMLElement>());
    const checkEventRef = useRef<React.SyntheticEvent | React.MouseEvent | undefined>(undefined);
    const checkedKeysRef = useRef(checkedKeys);
    const halfCheckedKeysRef = useRef(halfCheckedKeys);
    checkedKeysRef.current = checkedKeys;
    halfCheckedKeysRef.current = halfCheckedKeys;

    useEffect(() => {
        setMergedTreeData(treeData);
    }, [treeData]);

    const nodeMap = useMemo(() => createRecord(mergedTreeData, fn), [mergedTreeData, fn]);

    const filteredData = useMemo(() => {
        return filterTree(mergedTreeData, query, fn);
    }, [mergedTreeData, query, fn]);

    const flatData = useMemo(() => {
        return flattenTree(filteredData, expandedKeys, fn);
    }, [filteredData, expandedKeys, fn]);

    const getNodeKey = useCallback((node: TreeNode) => getKey(node, fn), [fn]);

    const isNodeDisabled = useCallback(
        (node: TreeNode) => Boolean(treeDisabled || node.disabled),
        [treeDisabled]
    );

    const handleCheck = (node: TreeNode) => {
        if (treeDisabled || isNodeDisabled(node)) return;
        const key = getNodeKey(node);
        const { nextCheckedKeys, nextHalfCheckedKeys } = updateCheckStatus(
            key,
            nodeMap,
            checkedKeys,
            halfCheckedKeys,
            fn
        );
        setHalfCheckedKeys(nextHalfCheckedKeys);
        if (!('checkedKeys' in props)) {
            setCheckedKeys(nextCheckedKeys);
        }
        const checked = nextCheckedKeys.includes(key);
        const checkedNodes = nextCheckedKeys
            .map(k => nodeMap.get(String(k)))
            .filter(Boolean) as TreeNode[];
        const ev = checkEventRef.current;
        onCheck?.(nextCheckedKeys, {
            checked,
            checkedNodes,
            node,
            event: ev,
            halfCheckedKeys: nextHalfCheckedKeys,
        });
    };

    const handleExpand = async (node: TreeNode, e?: React.MouseEvent) => {
        if (treeDisabled || isNodeDisabled(node)) return;
        const k = getNodeKey(node);
        const isExpanded = expandedKeys.includes(k);
        let newExpandedKeys: string[];

        if (isExpanded) {
            newExpandedKeys = expandedKeys.filter(x => x !== k);
            if (!('expandedKeys' in props)) {
                setExpandedKeys(newExpandedKeys);
            }
            onExpand?.({ node, expandedKeys: newExpandedKeys });
            return;
        }

        const children = getChildren(node, fn) || [];
        const needsLoad =
            Boolean(loadData) &&
            children.length === 0 &&
            node.isLeaf === false &&
            !loadedKeys.includes(k);

        newExpandedKeys = [...expandedKeys, k];
        if (!('expandedKeys' in props)) {
            setExpandedKeys(newExpandedKeys);
        }

        if (needsLoad) {
            setLoadingKeys(prev => (prev.includes(k) ? prev : [...prev, k]));
            try {
                const result = await loadData!(node);
                if (Array.isArray(result)) {
                    let nextTreeSnapshot: TreeNode[] = [];
                    setMergedTreeData(prev => {
                        nextTreeSnapshot = mergeChildrenAtKey(prev, k, result, fn);
                        return nextTreeSnapshot;
                    });

                    const baseChecked = (
                        'checkedKeys' in props ? props.checkedKeys ?? [] : checkedKeysRef.current
                    ).map(String);
                    const baseHalf = halfCheckedKeysRef.current;
                    const cascaded = mergeCheckedKeysAfterLoad(k, result, baseChecked, baseHalf, fn);
                    if (cascaded) {
                        if (!('checkedKeys' in props)) {
                            setCheckedKeys(cascaded.nextChecked);
                            setHalfCheckedKeys(cascaded.nextHalf);
                        }
                        const nm = createRecord(nextTreeSnapshot, fn);
                        const checkedNodes = cascaded.nextChecked
                            .map(key => nm.get(String(key)))
                            .filter(Boolean) as TreeNode[];
                        onCheck?.(cascaded.nextChecked, {
                            checked: cascaded.nextChecked.includes(k),
                            checkedNodes,
                            node,
                            event: undefined,
                            halfCheckedKeys: cascaded.nextHalf,
                        });
                    }
                }
                setLoadedKeys(prev => (prev.includes(k) ? prev : [...prev, k]));
                onLoad?.([k], { node, event: e });
            } finally {
                setLoadingKeys(prev => prev.filter(x => x !== k));
            }
        }

        onExpand?.({ node, expandedKeys: newExpandedKeys });
    };

    useEffect(() => {
        setQuery(props.query);
    }, [props.query]);

    useEffect(() => {
        if ('selectedKeys' in props) {
            const newSelectedKeys = (props.selectedKeys || []).map(String);
            setSelectedKeys(newSelectedKeys);
            const parentKeys = getParentKeysBySelected(mergedTreeData, newSelectedKeys, fn);
            const nextExpandedKeys = Array.from(new Set([...expandedKeys, ...parentKeys]));

            if (!('expandedKeys' in props)) {
                setExpandedKeys(nextExpandedKeys);
            }

            onExpand?.({
                node: null,
                expandedKeys: nextExpandedKeys,
                trigger: 'select',
            });
        }
    }, [props.selectedKeys, mergedTreeData, fn]);

    useEffect(() => {
        if ('expandedKeys' in props) {
            setExpandedKeys((props.expandedKeys || []).map(String));
        }
    }, [props.expandedKeys]);

    useEffect(() => {
        if ('checkedKeys' in props) {
            setCheckedKeys((props.checkedKeys || []).map(String));
        }
    }, [props.checkedKeys]);

    /**
     * 受控 checkedKeys 且未受控 halfCheckedKeys 时：父组件往往只同步 checkedKeys（如侧栏仅 setCheckedKeys）。
     * 若不在此根据当前树重算半选，handleCheck 里写入的 halfCheckedKeys 会在清空勾选后残留，出现「子未勾父半选」。
     */
    useEffect(() => {
        if (!('checkedKeys' in props) || 'halfCheckedKeys' in props) return;
        const ck = (props.checkedKeys || []).map(String);
        const synced = recalculateCheckStateAfterStructureChange(mergedTreeData, ck, [], fn);
        setHalfCheckedKeys(synced.nextHalf);
    }, [props.checkedKeys, mergedTreeData, fn]);

    useEffect(() => {
        if ('halfCheckedKeys' in props) {
            setHalfCheckedKeys((props.halfCheckedKeys || []).map(String));
        }
    }, [props.halfCheckedKeys]);

    useEffect(() => {
        if (query) {
            const keysToExpand = getAllParentKeys(filteredData, fn);
            setExpandedKeys(prev => Array.from(new Set([...prev, ...keysToExpand])));
        }
    }, [query, filteredData, fn]);

    const handlePointerDown = (e: any, node: TreeNode) => {
        if (treeDisabled || isNodeDisabled(node)) return;
        if (!sortable || (e.button !== 0 && e.type === 'mousedown')) return;

        const originEl = e.currentTarget as HTMLElement;
        const startX = e.clientX || e.touches[0].clientX;
        const startY = e.clientY || e.touches[0].clientY;
        let hasMoved = false;
        let scrollRootEl: HTMLElement | null = null;
        let autoScroller: AutoScroller | null = null;

        dragDataRef.current = node;

        const onPointerMove = (moveEvent: any) => {
            const currentX = moveEvent.clientX || moveEvent.touches?.[0].clientX;
            const currentY = moveEvent.clientY || moveEvent.touches?.[0].clientY;
            if (!hasMoved && Math.abs(currentX - startX) < 5 && Math.abs(currentY - startY) < 5) {
                return;
            }
            if (!hasMoved) {
                scrollRootEl = findScrollableAncestor(originEl);
                if (scrollRootEl) {
                    autoScroller = new AutoScroller(scrollRootEl);
                    autoScroller.start();
                }
            }
            hasMoved = true;

            if (moveEvent.cancelable) {
                moveEvent.preventDefault();
            }

            if (scrollRootEl && autoScroller) {
                const h = TREE_DRAG_EDGE_HELPER_SIZE;
                const dh = h / 2;
                autoScroller.start();
                autoScroller.update(
                    {
                        left: currentX - dh,
                        top: currentY - dh,
                        width: h,
                        height: h,
                    },
                    scrollRootEl.getBoundingClientRect()
                );
            }

            setDragInfo({ node, currentX, currentY });

            let foundTarget: { key: string; pos: string; valid: boolean } | null = null;
            const nk = getNodeKey(node);
            const subtreeKeys = getAllKeys(node, fn);
            nodeRefs.current.forEach((el, key) => {
                const rect = el.getBoundingClientRect();
                if (currentY >= rect.top && currentY <= rect.bottom) {
                    const relativeY = currentY - rect.top;
                    let pos: 'before' | 'after' | 'inner' = 'inner';
                    if (relativeY < rect.height * 0.3) pos = 'before';
                    else if (relativeY > rect.height * 0.7) pos = 'after';
                    /** 不能拖入自身（key===拖动节点）及子孙子树 */
                    const invalid = subtreeKeys.includes(key);
                    foundTarget = { key, pos, valid: !invalid };
                }
            });
            setDropTarget(foundTarget);
            dropTargetRef.current = foundTarget;
            onDragMove?.({
                event: moveEvent,
                dragNode: node,
                target: foundTarget,
            });
        };

        const onPointerUp = () => {
            if (autoScroller) {
                autoScroller.clear();
                autoScroller = null;
            }
            const dragNode = dragDataRef.current;
            const currentTarget = dropTargetRef.current;
            if (hasMoved && dragNode && currentTarget && currentTarget.valid) {
                const dk = getNodeKey(dragNode);
                if (!getAllKeys(dragNode, fn).includes(currentTarget.key)) {
                    const newData = moveNodeInTree(
                        mergedTreeData,
                        dk,
                        currentTarget.key,
                        currentTarget.pos,
                        fn
                    );
                    const baseChecked = (
                        'checkedKeys' in props ? props.checkedKeys ?? [] : checkedKeysRef.current
                    ).map(String);
                    const baseHalf = (
                        'halfCheckedKeys' in props ? props.halfCheckedKeys ?? [] : halfCheckedKeysRef.current
                    ).map(String);
                    const synced = recalculateCheckStateAfterStructureChange(
                        newData,
                        baseChecked,
                        baseHalf,
                        fn
                    );
                    if (!('checkedKeys' in props)) {
                        setCheckedKeys(synced.nextChecked);
                        setHalfCheckedKeys(synced.nextHalf);
                    }
                    const nm = createRecord(newData, fn);
                    const checkedNodes = synced.nextChecked
                        .map(key => nm.get(String(key)))
                        .filter(Boolean) as TreeNode[];
                    onCheck?.(synced.nextChecked, {
                        checked: synced.nextChecked.includes(dk),
                        checkedNodes,
                        node: dragNode,
                        event: undefined,
                        halfCheckedKeys: synced.nextHalf,
                    });
                    setMergedTreeData(newData);
                    if (
                        currentTarget.pos === 'inner' &&
                        !('expandedKeys' in props) &&
                        !expandedKeys.includes(currentTarget.key)
                    ) {
                        setExpandedKeys(prev => [...new Set([...prev, currentTarget.key])]);
                    }
                    onDragEnd?.({
                        dragNode,
                        target: currentTarget,
                        treeData: newData,
                    });
                }
            }
            setDragInfo(null);
            setDropTarget(null);
            dragDataRef.current = null;
            dropTargetRef.current = null;
            hasMoved = false;
            scrollRootEl = null;
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('mouseup', onPointerUp);
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('touchend', onPointerUp);
            document.removeEventListener('touchcancel', onPointerUp);
        };

        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
        document.addEventListener('touchcancel', onPointerUp);
        onDragStart?.({
            event: e,
            dragNode: node,
        });
    };

    const renderTitle = (title: React.ReactNode, q: string | null | undefined) => {
        if (!q || typeof title !== 'string') return title;

        const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = title.split(new RegExp(`(${safeQuery})`, 'gi'));

        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === q.toLowerCase() ? (
                        <span key={i} style={{ backgroundColor: '#ffc069', color: '#000' }}>
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    const renderTreeNodeRow = (
        node: TreeNode & { level: number },
        opts: { measureRef?: (el: HTMLElement | null) => void; reactKey?: string }
    ) => {
        const { measureRef, reactKey } = opts;
        const nk = getNodeKey(node);
        const isTarget = dropTarget?.key === nk;
        const nodeCls = [`${CLASSNAME}-tree-node`];
        if (isTarget && dropTarget) {
            const dropCls = dropTarget.valid
                ? `${CLASSNAME}-tree-drop-${dropTarget.pos}`
                : `${CLASSNAME}-tree-drop-invalid-${dropTarget.pos}`;
            nodeCls.push(dropCls);
        }
        if (showLine) {
            nodeCls.push(`${CLASSNAME}-tree-node-line`);
        }
        if (treeDisabled || isNodeDisabled(node)) {
            nodeCls.push(`${CLASSNAME}-tree-node-disabled`);
        }
        const isSelected = selectedKeys.includes(nk);
        if (isSelected) {
            nodeCls.push(`${CLASSNAME}-tree-node-selected`);
        }
        if (
            sortable &&
            dragInfo?.node &&
            getNodeKey(dragInfo.node as TreeNode) === nk &&
            !(isTarget && dropTarget)
        ) {
            nodeCls.push(`${CLASSNAME}-tree-node-drag-source`);
        }

        const childrenList = getChildren(node, fn) || [];
        const hasChildren = childrenList.length > 0;
        const isAsyncParent = Boolean(loadData && node.isLeaf === false);
        const showLeaf = node.isLeaf === true;
        const showSwitcher = !showLeaf && (hasChildren || isAsyncParent);
        const isLoading = loadingKeys.includes(nk);

        let expanded: React.ReactNode = (
            <span className={`${CLASSNAME}-tree-switcher ${CLASSNAME}-tree-node-leaf`} />
        );
        if (showSwitcher) {
            expanded = (
                <span
                    onClick={e => {
                        e.stopPropagation();
                        handleExpand(node, e);
                    }}
                    className={`${CLASSNAME}-tree-switcher ${
                        expandedKeys.includes(nk)
                            ? `${CLASSNAME}-tree-switcher-open`
                            : `${CLASSNAME}-tree-switcher-close`
                    }`}
                >
                    <span className={`${CLASSNAME}-tree-switcher-inner`}>
                        {isLoading ? (
                            <span style={{ fontSize: 10 }}>...</span>
                        ) : switcherIcon ? (
                            switcherIcon
                        ) : (
                            <svg
                                viewBox="0 0 1024 1024"
                                focusable="false"
                                width="1em"
                                height="1em"
                                fill="currentColor"
                            >
                                <path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z" />
                            </svg>
                        )}
                    </span>
                </span>
            );
        }

        const rowCheckable = checkable && node.checkable !== false;
        const titleVal = getTitle(node, fn);

        return (
            <div
                key={reactKey}
                ref={el => {
                    measureRef?.(el);
                    if (el) nodeRefs.current.set(nk, el);
                    else nodeRefs.current.delete(nk);
                }}
                className={nodeCls.join(' ')}
                onMouseDown={sortable ? e => handlePointerDown(e, node) : undefined}
                onTouchStart={sortable ? e => handlePointerDown(e, node) : undefined}
            >
                <span className={`${CLASSNAME}-tree-indent`}>
                    {Array.from({ length: node.level }).map((_, i) => (
                        <span key={i} className={`${CLASSNAME}-tree-indent-unit`} />
                    ))}
                </span>
                {expanded}
                {rowCheckable && (
                    <span
                        className={`${CLASSNAME}-tree-checkbox`}
                        onMouseDown={e => {
                            checkEventRef.current = e;
                        }}
                    >
                        <Checkbox
                            checked={checkedKeys.includes(nk)}
                            indeterminate={halfCheckedKeys.includes(nk)}
                            disabled={node.disableCheckbox || treeDisabled || isNodeDisabled(node)}
                            onChange={() => handleCheck(node)}
                        />
                    </span>
                )}
                <span
                    className={`${CLASSNAME}-tree-title`}
                    onClick={e => {
                        if (treeDisabled || isNodeDisabled(node)) return;
                        if (node.selectable === false) return;
                        setSelectedKeys([nk]);
                        onSelect?.({ key: nk, node, event: e });
                    }}
                    onDoubleClick={e => {
                        if (treeDisabled || isNodeDisabled(node)) return;
                        onDoubleClick?.(e, node);
                    }}
                >
                    {node.icon && <span className={`${CLASSNAME}-tree-icon`}>{node.icon}</span>}
                    <span className={`${CLASSNAME}-tree-text`}>{renderTitle(titleVal, query)}</span>
                </span>
            </div>
        );
    };

    const cls = [`${CLASSNAME}-tree-container`];
    if (className) cls.push(className);
    if (dragInfo) cls.push(`${CLASSNAME}-tree-dragging`);
    if (treeDisabled) cls.push(`${CLASSNAME}-tree-disabled`);
    if (virtualCfg.enabled) cls.push(`${CLASSNAME}-tree-virtual`);

    const listBody =
        flatData.length === 0 ? null : virtualCfg.enabled ? (
            <VirtualScroll
                className={`${CLASSNAME}-tree-virtual-scroll`}
                items={flatData as Record<string, unknown>[]}
                itemKey={fn.key as 'key'}
                estimatedHeight={virtualCfg.estimatedHeight}
                buffer={virtualCfg.buffer}
                style={{
                    flex: '1 1 auto',
                    flexShrink: 1,
                    minHeight: 0,
                    width: '100%',
                    overflow: 'auto',
                    position: 'relative',
                    // 无固定高度父级时 100% 无效；用视口比例保证 ResizeObserver 能测到高度
                    height: virtualScrollHeight ?? 'min(65vh, 720px)',
                    maxHeight: virtualScrollMaxHeight ?? 'min(85vh, 960px)',
                }}
            >
                {(item, measureRef) =>
                    renderTreeNodeRow(item as TreeNode & { level: number }, { measureRef })
                }
            </VirtualScroll>
        ) : (
            flatData.map((node: TreeNode & { level: number }) =>
                renderTreeNodeRow(node, { reactKey: getNodeKey(node) })
            )
        );

    const dragTitle = dragInfo?.node ? getTitle(dragInfo.node, fn) : '';

    return (
        <div
            className={cls.join(' ')}
            aria-disabled={treeDisabled || undefined}
            style={
                virtualCfg.enabled
                    ? {
                          flex: 1,
                          minHeight: 0,
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                      }
                    : undefined
            }
        >
            {listBody}

            {dragInfo && (
                <div
                    style={{
                        position: 'fixed',
                        left: dragInfo.currentX + 15,
                        top: dragInfo.currentY + 15,
                        pointerEvents: 'none',
                        zIndex: 1000,
                        opacity: 0.8,
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                    }}
                >
                    {dragTitle}
                </div>
            )}
        </div>
    );
};
