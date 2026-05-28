import type { TreeNode } from '@carvy/ui';
import { pageTypeLabel } from '@/constants/pageType';

/** 按标题、类型标签过滤页面树；命中子节点时保留父链 */
export function filterPageTreeBySearch(nodes: TreeNode[], query: string): TreeNode[] {
	const q = query.trim().toLowerCase();
	if (!q) return nodes;

	const walk = (list: TreeNode[]): TreeNode[] => {
		const out: TreeNode[] = [];
		for (const n of list) {
			const raw = (n as TreeNode & { raw?: { title?: string; page_type?: string } }).raw;
			const title =
				typeof n.title === 'string' ? n.title : String(raw?.title ?? '');
			const typeStr = raw?.page_type ? pageTypeLabel(raw.page_type) : '';
			const matchSelf =
				title.toLowerCase().includes(q) || (typeStr && typeStr.toLowerCase().includes(q));
			const children = n.children ? walk(n.children) : [];
			const matchChildren = children.length > 0;
			if (matchSelf || matchChildren) {
				out.push({
					...n,
					children: matchChildren ? children : n.children,
				});
			}
		}
		return out;
	};
	return walk(nodes);
}
