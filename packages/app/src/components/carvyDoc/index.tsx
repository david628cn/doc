import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Doc } from '@carvy/doc';
// import type { CollaborationOptions, CollaborationPresenceInfo } from '@carvy/doc';
import type { RootState } from '@/store';
import { getCollabToken, getCollabWebSocketUrl } from '@/utils/collabClient';
import { resolveCollaborationAvatarFields } from '@/utils/resolveHeadSculpture';
import './index.less';

export type CarvyDocViewMode = 'edit' | 'read';

export type CarvyDocProps = {
	/** 与 DB `sys_page.id`、collab room 名一致 */
	pageId: string;
	/**
	 * `read`：仅浏览（不可编辑），但仍连接 Hocuspocus，参与 Awareness **在线人数**。
	 * `edit`：可编辑协同。
	 */
	viewMode?: CarvyDocViewMode;
	/** 首屏种子（与协同 Load 对齐）；访客预览时为唯一正文来源 */
	previewContent?: unknown;
	/** 工作区访客：断开协同，仅用详情快照预览 */
	workspaceReadOnly?: boolean;
	className?: string;
	/** 协同在线人数与 Awareness 成员（用于页眉头像组等） */
	onCollaborationPresence?: (info: any) => void;
};

/**
 * 封装 `@carvy/doc` 的 `<Doc />`：访客走离线快照；登录用户即使「阅读」也保持协同连接（只读），以便计入在线人数。
 */
export const CarvyDoc: React.FC<CarvyDocProps> = ({
	pageId,
	viewMode = 'edit',
	previewContent,
	workspaceReadOnly = false,
	className,
	onCollaborationPresence,
}) => {
	const authUser = useSelector((s: RootState) => s.auth.user);

	const collaborationOptions: any = useMemo(() => {
		const raw = import.meta.env.VITE_COLLAB_FORCE_SYNC_MS as string | undefined;
		const parsed =
			typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : undefined;
		const forceSyncInterval =
			parsed != null && parsed > 0 ? parsed : undefined;
		const displayName =
			authUser?.username && String(authUser.username).trim() !== ''
				? String(authUser.username).trim()
				: '访客';
		const av = resolveCollaborationAvatarFields(authUser?.head_sculpture);
		return {
			wsUrl: getCollabWebSocketUrl(),
			documentName: pageId,
			token: getCollabToken(),
			awarenessUser: {
				name: displayName,
				...(authUser?.id != null ? { id: String(authUser.id) } : {}),
				...(av.avatarUrl ? { avatarUrl: av.avatarUrl } : {}),
				...(av.avatarIcon ? { avatarIcon: av.avatarIcon } : {}),
			},
			sessionReadOnly: viewMode === 'read',
			...(forceSyncInterval != null ? { forceSyncInterval } : {}),
		};
	}, [pageId, authUser?.head_sculpture, authUser?.id, authUser?.username, viewMode]);

	const snapshot = previewContent ?? '';

	/** 访客：无协同 */
	if (workspaceReadOnly) {
		return (
			<Doc
				className={`carvy-doc carvy-doc--preview ${className ?? ''}`}
				// collaboration={false}
				// collaborationTrustServer={false}
				content={snapshot}
				editable={false}
			/>
		);
	}

	const collabReadOnly = viewMode === 'read';

	return (
		<div className={`carvy-doc carvy-doc--collab ${className ?? ''}`}>
			{/**
			 * 协同下必须为「信任服务端 / Yjs」：constructor 若用 `content` 做整篇种子，又与 Hocuspocus
			 * 载入的 Y.Doc 同步同一文档，会出现正文重复（新用户加入时尤其明显）。
			 * `content` 仍可传入供非协同路径或占位；协同初始正文仅来自协作房间。
			 */}
			<Doc
				// collaboration
				// collaborationTrustServer
				content={snapshot}
				// collaborationOptions={collaborationOptions}
				// onCollaborationPresence={onCollaborationPresence}
				editable={!collabReadOnly}
			/>
		</div>
	);
};

export default CarvyDoc;
