import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * 侧栏「当前工作区」为空时，用列表里的默认项或第一项兜底。
 * 通讯录/聊天不依赖必须先打开文档工作区页。
 */
export function useEffectiveWorkspaceId(): string {
	return useSelector((s: RootState) => {
		const { workspaceId, workspaces } = s.workspace;
		if (workspaceId) return workspaceId;
		const def = workspaces.find((w) => w.is_default);
		if (def?.workspace_id) return def.workspace_id;
		return workspaces[0]?.workspace_id ?? '';
	});
}
