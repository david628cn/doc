import type { TreeNode } from '@carvy/ui';

/** 将 Gin `PageNodeDTO` 列表转为侧栏 `Tree` 的 `treeData` */
export function mapPageDtoToTreeNodes(nodes: any[] | undefined | null): TreeNode[] {
	if (!nodes?.length) return [];
	return nodes.map((n) => {
		const childList = Array.isArray(n.children) ? n.children : [];
		const mappedChildren = mapPageDtoToTreeNodes(childList);
		const hasBranch = mappedChildren.length > 0 || Boolean(n.has_children);
		return {
			key: String(n.id).toLowerCase(),
			title: n.title ?? '未命名',
			children: mappedChildren.length ? mappedChildren : undefined,
			isLeaf: !hasBranch,
			raw: n,
		};
	});
}

export function findSiblingContext(
	roots: TreeNode[],
	targetKey: string,
	parent: TreeNode | null = null,
): { parent: TreeNode | null; index: number; siblings: TreeNode[] } | null {
	const tk = String(targetKey).toLowerCase();
	for (let i = 0; i < roots.length; i++) {
		const n = roots[i];
		if (String(n.key).toLowerCase() === tk) {
			return { parent, index: i, siblings: roots };
		}
		const ch = n.children;
		if (ch?.length) {
			const hit = findSiblingContext(ch, tk, n);
			if (hit) return hit;
		}
	}
	return null;
}

/** 根据拖拽完成后的新树，构造 `POST /page/move` 请求体（与 {@link playload.MovePageReq} 对齐） */
export function buildMovePayloadFromTree(
	newTree: TreeNode[],
	draggedKey: string,
	spaceId: string,
): {
	page_id: string;
	space_id: string;
	new_parent_id?: string;
	prev_page_id?: string;
	next_page_id?: string;
} | null {
	const dk = String(draggedKey).toLowerCase();
	const ctx = findSiblingContext(newTree, dk);
	if (!ctx) return null;
	const { parent, index, siblings } = ctx;
	const prev = index > 0 ? String(siblings[index - 1].key).toLowerCase() : undefined;
	const next = index < siblings.length - 1 ? String(siblings[index + 1].key).toLowerCase() : undefined;
	return {
		page_id: dk,
		space_id: spaceId,
		...(parent?.key != null ? { new_parent_id: String(parent.key).toLowerCase() } : {}),
		...(prev ? { prev_page_id: prev } : {}),
		...(next ? { next_page_id: next } : {}),
	};
}
