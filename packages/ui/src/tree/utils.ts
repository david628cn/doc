export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
    let timer: any = null;
    return function (this: any, ...args: Parameters<T>) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
};

export type FieldNames = {
    title: string;
    key: string;
    children: string;
};

export const DEFAULT_FIELD_NAMES: FieldNames = {
    title: 'title',
    key: 'key',
    children: 'children',
};

export const mergeFieldNames = (partial?: Partial<FieldNames>): FieldNames => ({
    ...DEFAULT_FIELD_NAMES,
    ...partial,
});

export const getKey = (node: any, fn: FieldNames): string => String(node?.[fn.key] ?? '');
export const getTitle = (node: any, fn: FieldNames) => node?.[fn.title];
export const getChildren = (node: any, fn: FieldNames): any[] | undefined => {
    const c = node?.[fn.children];
    return Array.isArray(c) ? c : undefined;
};

export const setChildren = (node: any, fn: FieldNames, children: any[]): any => ({
    ...node,
    [fn.children]: children,
});

/**
 * 將樹形結構扁平化為列表，同時計算層級 (level)
 */
export const flattenTree = (
    nodes: any[],
    expandedKeys: string[],
    fieldNames: FieldNames,
    level = 0
): any[] => {
    const fn = fieldNames;
    const list = (nodes || []).filter(n => n != null);
    return list.reduce((acc, node) => {
        acc.push({ ...node, level });
        const key = getKey(node, fn);
        const isExpanded = expandedKeys.includes(key);
        const children = (getChildren(node, fn) || []).filter((c: any) => c != null);
        if (isExpanded && children.length > 0) {
            acc.push(...flattenTree(children, expandedKeys, fn, level + 1));
        }
        return acc;
    }, [] as any[]);
};

/**
 * 根據搜索詞過濾樹結構
 */
export const filterTree = (
    nodes: any = [],
    query: string | null | undefined,
    fieldNames: FieldNames
): any[] => {
    if (!query) {
        return nodes;
    }
    const fn = fieldNames;
    const lowerQuery = query.toLowerCase();

    return nodes
        .map((node: any) => {
            const titleVal = getTitle(node, fn);
            const isMatch =
                typeof titleVal === 'string' && titleVal.toLowerCase().includes(lowerQuery);
            const rawChildren = getChildren(node, fn);
            const filteredChildren = rawChildren ? filterTree(rawChildren, query, fn) : [];

            if (isMatch || filteredChildren.length > 0) {
                return {
                    ...node,
                    [fn.children]: filteredChildren,
                    isMatch,
                };
            }
            return null;
        })
        .filter(Boolean) as any[];
};

/**
 * 根據選中的 Keys 找出它們所有的父節點 Key
 */
export const getParentKeysBySelected = (
    nodes: any = [],
    targetKeys: string[],
    fieldNames: FieldNames
): string[] => {
    const fn = fieldNames;
    const parentKeys: string[] = [];

    const find = (list: any): boolean => {
        let hasSelectedChild = false;
        for (const node of list) {
            const nk = getKey(node, fn);
            let isCurrentSelected = targetKeys.includes(nk);
            let isChildSelected = false;
            const ch = getChildren(node, fn);
            if (ch && ch.length > 0) {
                isChildSelected = find(ch);
            }

            if (isCurrentSelected || isChildSelected) {
                if (isChildSelected) {
                    parentKeys.push(nk);
                }
                hasSelectedChild = true;
            }
        }
        return hasSelectedChild;
    };

    find(nodes);
    return parentKeys;
};

// 预处理：生成 key -> node 的快速映射，包含 parentKey 引用
export const createRecord = (
    data: any = [],
    fieldNames: FieldNames,
    parentKey: string | null = null,
    map = new Map()
) => {
    const fn = fieldNames;
    data.forEach((node: any) => {
        if (node == null) return;
        const k = getKey(node, fn);
        map.set(k, { ...node, parentKey });
        const ch = (getChildren(node, fn) || []).filter((c: any) => c != null);
        if (ch.length) createRecord(ch, fn, k, map);
    });
    return map;
};

// 向下遞歸：獲取所有子節點的 key
export const getAllKeys = (node: any, fieldNames: FieldNames, keys: string[] = []) => {
    const fn = fieldNames;
    keys.push(getKey(node, fn));
    const ch = getChildren(node, fn);
    if (ch) {
        ch.forEach((child: any) => getAllKeys(child, fn, keys));
    }
    return keys;
};

export const getAllParentKeys = (nodes: any = [], fieldNames: FieldNames): string[] => {
    const fn = fieldNames;
    let keys: string[] = [];
    nodes.forEach((node: any) => {
        const ch = getChildren(node, fn);
        if (ch && ch.length > 0) {
            keys.push(getKey(node, fn));
            keys = [...keys, ...getAllParentKeys(ch, fn)];
        }
    });
    return keys;
};

// 向上追溯：更新父節點狀態並返回新的 checked 和 halfChecked 數組
export const updateCheckStatus = (
    nodeKey: string,
    nodeMap: any,
    currentCheckedKeys: string[],
    currentHalfCheckedKeys: string[],
    fieldNames: FieldNames
) => {
    const fn = fieldNames;
    let nextCheckedKeys = [...currentCheckedKeys];
    let nextHalfCheckedKeys = [...currentHalfCheckedKeys];

    const node = nodeMap.get(nodeKey);
    if (!node) {
        return { nextCheckedKeys: currentCheckedKeys, nextHalfCheckedKeys: currentHalfCheckedKeys };
    }

    const isChecking = !nextCheckedKeys.includes(nodeKey);

    const childKeys = getAllKeys(node, fn);
    if (isChecking) {
        childKeys.forEach(k => {
            if (!nextCheckedKeys.includes(k)) nextCheckedKeys.push(k);
            nextHalfCheckedKeys = nextHalfCheckedKeys.filter(hk => hk !== k);
        });
    } else {
        nextCheckedKeys = nextCheckedKeys.filter(k => !childKeys.includes(k));
        nextHalfCheckedKeys = nextHalfCheckedKeys.filter(k => !childKeys.includes(k));
    }

    let parentKey: string | null | undefined = node.parentKey;
    while (parentKey) {
        const parent = nodeMap.get(parentKey);
        if (!parent) {
            break;
        }
        const children = (getChildren(parent, fn) || []).filter((c: any) => c != null);

        const checkedChildren = children.filter((c: any) =>
            nextCheckedKeys.includes(getKey(c, fn))
        );
        const halfChildren = children.filter((c: any) =>
            nextHalfCheckedKeys.includes(getKey(c, fn))
        );

        if (children.length > 0 && checkedChildren.length === children.length) {
            if (!nextCheckedKeys.includes(parentKey)) nextCheckedKeys.push(parentKey);
            nextHalfCheckedKeys = nextHalfCheckedKeys.filter(k => k !== parentKey);
        } else if (checkedChildren.length > 0 || halfChildren.length > 0) {
            nextCheckedKeys = nextCheckedKeys.filter(k => k !== parentKey);
            if (!nextHalfCheckedKeys.includes(parentKey)) nextHalfCheckedKeys.push(parentKey);
        } else {
            nextCheckedKeys = nextCheckedKeys.filter(k => k !== parentKey);
            nextHalfCheckedKeys = nextHalfCheckedKeys.filter(k => k !== parentKey);
        }

        parentKey = parent.parentKey;
    }

    return { nextCheckedKeys, nextHalfCheckedKeys };
};

/**
 * 樹結構變化後（如拖拽排序）：根據當前勾選意圖（僅認「已勾選的 key」）自下而上重算父子勾選與半選，使與新層級一致。
 */
export const recalculateCheckStateAfterStructureChange = (
    nodes: any[],
    checkedKeys: string[],
    halfCheckedKeys: string[],
    fieldNames: FieldNames
): { nextChecked: string[]; nextHalf: string[] } => {
    const fn = fieldNames;
    const map = createRecord(nodes, fn);
    const checkedSeed = new Set(checkedKeys.filter(k => map.has(k)));
    const halfSeed = new Set(halfCheckedKeys.filter(k => map.has(k)));

    const nextChecked = new Set<string>();
    const nextHalf = new Set<string>();

    const dfs = (node: any): 'all' | 'some' | 'none' => {
        if (node == null) {
            return 'none';
        }
        const k = getKey(node, fn);
        const ch = (getChildren(node, fn) || []).filter((c: any) => c != null);

        if (ch.length === 0) {
            if (checkedSeed.has(k)) {
                nextChecked.add(k);
                return 'all';
            }
            if (halfSeed.has(k)) {
                nextHalf.add(k);
                return 'some';
            }
            return 'none';
        }

        const modes = ch.map((c: any) => dfs(c));
        const allFull = modes.every(m => m === 'all');
        const some = modes.some(m => m !== 'none');

        if (allFull) {
            nextChecked.add(k);
            return 'all';
        }
        if (some) {
            nextHalf.add(k);
            return 'some';
        }
        return 'none';
    };

    (nodes || []).filter(n => n != null).forEach(n => dfs(n));

    return {
        nextChecked: [...nextChecked],
        nextHalf: [...nextHalf],
    };
};

/**
 * 異步加載子節點後：若父節點已在 checkedKeys 中，將新子樹所有 key 合入（勾選時尚無子節點導致未級聯的情況）
 */
export const mergeCheckedKeysAfterLoad = (
    parentKey: string,
    loadedChildren: any[],
    checkedKeys: string[],
    halfCheckedKeys: string[],
    fieldNames: FieldNames
): { nextChecked: string[]; nextHalf: string[] } | null => {
    if (!checkedKeys.includes(parentKey)) {
        return null;
    }
    const fn = fieldNames;
    const add = loadedChildren.flatMap((child: any) => getAllKeys(child, fn));
    if (add.length === 0) {
        return null;
    }
    const nextChecked = [...new Set([...checkedKeys, ...add])];
    const nextHalf = halfCheckedKeys.filter(h => h !== parentKey);
    return { nextChecked, nextHalf };
};

/**
 * 遞歸合併某節點的子節點（用於 loadData）
 */
export const mergeChildrenAtKey = (
    nodes: any[],
    targetKey: string,
    newChildren: any[],
    fieldNames: FieldNames
): any[] => {
    const fn = fieldNames;
    return nodes.map(node => {
        if (getKey(node, fn) === targetKey) {
            return setChildren(node, fn, newChildren);
        }
        const ch = getChildren(node, fn);
        if (ch && ch.length) {
            return setChildren(node, fn, mergeChildrenAtKey(ch, targetKey, newChildren, fn));
        }
        return node;
    });
};

/**
 * 複製樹結構供拖拽/插入等就地修改；逐層淺拷貝，保留 title 等 ReactNode（不可 JSON 序列化）。
 */
export const cloneTreeStructure = (nodes: any[] | undefined | null, fn: FieldNames): any[] => {
    if (!nodes?.length) return [];
    return nodes.map(node => {
        const ch = getChildren(node, fn)?.filter((c: any) => c != null);
        const nextChildren = ch?.length ? cloneTreeStructure(ch, fn) : undefined;
        return {
            ...node,
            [fn.children]: nextChildren,
        };
    });
};

/**
 * 拖拽：移動節點
 */
export const moveNode = (
    data: any[] = [],
    dragKey: string,
    dropKey: string,
    pos: string,
    fieldNames: FieldNames
) => {
    const fn = fieldNames;
    const tree = cloneTreeStructure(data, fn);
    let dragNode: any;

    const filter = (list: any[]): any[] => {
        return list.filter(node => {
            if (getKey(node, fn) === dragKey) {
                dragNode = node;
                return false;
            }
            const ch = getChildren(node, fn);
            if (ch && ch.length) {
                (node as any)[fn.children] = filter(ch);
            }
            return true;
        });
    };

    const newTree = filter(tree);

    if (dragNode == null) {
        return data;
    }

    const insert = (list: any[]): any[] => {
        return (list || []).filter((n: any) => n != null).reduce((acc: any[], node: any) => {
            if (getKey(node, fn) === dropKey) {
                if (pos === 'before') {
                    acc.push(dragNode, node);
                } else if (pos === 'after') {
                    acc.push(node, dragNode);
                } else if (pos === 'inner') {
                    const inner = [...(getChildren(node, fn) || []).filter((c: any) => c != null), dragNode];
                    acc.push(setChildren(node, fn, inner));
                } else {
                    acc.push(node);
                }
            } else {
                const ch = getChildren(node, fn);
                if (ch && ch.length) {
                    (node as any)[fn.children] = insert(ch.filter((c: any) => c != null));
                }
                acc.push(node);
            }
            return acc;
        }, []);
    };

    return insert(newTree);
};

/**
 * 从树中移除指定 key 的子树（深拷贝输入）
 */
export const removeNodeByKey = (
    data: any[] = [],
    removeKey: string,
    fieldNames: FieldNames
): { next: any[]; removed: any | null } => {
    const fn = fieldNames;
    const tree = cloneTreeStructure(data, fn);
    let removed: any = null;

    const filter = (list: any[]): any[] => {
        return list
            .filter((node): node is any => {
                if (getKey(node, fn) === removeKey) {
                    removed = node;
                    return false;
                }
                return true;
            })
            .map(node => {
                const ch = getChildren(node, fn);
                if (ch && ch.length) {
                    return setChildren(node, fn, filter(ch.filter((c: any) => c != null)));
                }
                return node;
            });
    };

    return { next: filter(tree), removed };
};

/**
 * 将新节点插入到 dropKey 对应位置（before / after / inner），不含「先移除」步骤，用于外部拖入或跨树插入
 */
export const insertNodeAt = (
    data: any[] = [],
    newNode: any,
    dropKey: string,
    pos: string,
    fieldNames: FieldNames
) => {
    const fn = fieldNames;
    const tree = cloneTreeStructure(data, fn);
    const insert = (list: any[]): any[] => {
        return (list || []).filter((n: any) => n != null).reduce((acc: any[], node: any) => {
            if (getKey(node, fn) === dropKey) {
                if (pos === 'before') {
                    acc.push(newNode, node);
                } else if (pos === 'after') {
                    acc.push(node, newNode);
                } else if (pos === 'inner') {
                    const inner = [...(getChildren(node, fn) || []).filter((c: any) => c != null), newNode];
                    acc.push(setChildren(node, fn, inner));
                } else {
                    acc.push(node);
                }
            } else {
                const ch = getChildren(node, fn);
                if (ch && ch.length) {
                    (node as any)[fn.children] = insert(ch.filter((c: any) => c != null));
                }
                acc.push(node);
            }
            return acc;
        }, []);
    };
    return insert(tree);
};
