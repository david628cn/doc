import React, { useCallback, useEffect, useState } from 'react';

/** Layout `main` 滚动容器（见 components/layout） */
const LAYOUT_MAIN_SCROLL_ID = 'app-layout-main-scroll';

function getLayoutScrollEl(): HTMLElement | null {
	return document.getElementById(LAYOUT_MAIN_SCROLL_ID);
}
import type { RouteComponentProps } from 'react-router-dom';
import { Avatar, AvatarGroup, Flex, Title, Text, Button, View, Skeleton, Favorite } from '@carvy/ui';
import { Doc } from '@carvy/doc';
// import { pickPmContentFromPageDetail } from '../../../../_doc/src';
// import type { CollaborationPresenceInfo } from '../../../../_doc/src';
// import { CarvyDoc } from '@/components/carvyDoc';
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
import { getPageDetail, setPageStar, touchPageRecent } from '@/api/page';
import history from '@/utils/history';

type Props = RouteComponentProps<{ pageId: string }>;

const PageDoc: React.FC<Props> = ({ match }) => {
	const pageId = match.params.pageId;
	const { role } = useCurrentWorkspace();
	const workspaceGuest = role === WorkspaceRole.Guest;

	const [loading, setLoading] = useState(true);
	const [pageTitle, setPageTitle] = useState('');
	const [previewPm, setPreviewPm] = useState<unknown>();
	/** 详情接口 {@link getPageDetail} 返回的 `can_edit`；缺省按可编辑（兼容旧后端） */
	const [pageCanEdit, setPageCanEdit] = useState<boolean | undefined>(undefined);
	const [viewMode, setViewMode] = useState<'edit' | 'read'>('edit');
	const [collabPresence, setCollabPresence] = useState({
		onlineCount: 0,
		members: [],
	});
	const [showBackTop, setShowBackTop] = useState(false);
	const [pageWorkspaceId, setPageWorkspaceId] = useState('');
	const [isStarred, setIsStarred] = useState(false);

	useEffect(() => {
		const el = getLayoutScrollEl();
		if (!el) return;
		const onScroll = () => {
			setShowBackTop(el.scrollTop > 200);
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => el.removeEventListener('scroll', onScroll);
	}, []);

	const scrollToTop = useCallback(() => {
		getLayoutScrollEl()?.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	const load = useCallback(async () => {
		if (!pageId?.trim()) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res: any = await getPageDetail(pageId);
			if (res.code === 403) {
				history.replace('/403');
				return;
			}
			if (res.code !== 200 || res.data == null) {
				setPageTitle('');
				setPreviewPm(undefined);
				setPageCanEdit(false);
				setPageWorkspaceId('');
				setIsStarred(false);
				return;
			}
			setPageTitle(typeof res.data.title === 'string' ? res.data.title : '');
			// setPreviewPm(pickPmContentFromPageDetail(res));
			setPageCanEdit(res.data.can_edit !== false);
			const wid = typeof res.data.workspace_id === 'string' ? res.data.workspace_id : '';
			setPageWorkspaceId(wid);
			setIsStarred(res.data.is_starred === true);
			void touchPageRecent(pageId, wid);
		} finally {
			setLoading(false);
		}
	}, [pageId]);

	useEffect(() => {
		void load();
	}, [load]);

	const guestPreviewOnly = workspaceGuest;

	useEffect(() => {
		if (workspaceGuest) {
			setCollabPresence({ onlineCount: 0, members: [] });
		}
	}, [workspaceGuest]);

	const handleCollaborationPresence = useCallback((info) => {
		setCollabPresence(info);
	}, []);

	const handleFavoriteToggle = useCallback(
		async (next: boolean) => {
			if (!pageWorkspaceId?.trim()) return false;
			const res: any = await setPageStar(pageId, next, pageWorkspaceId);
			if (res?.code === 200) {
				setIsStarred(next);
				return;
			}
			return false;
		},
		[pageId, pageWorkspaceId],
	);

	/** 工作区访客始终离线预览；登录用户以详情 `can_edit` 为准（仅读者无编辑入口） */
	const canUseCollaborativeEdit = !workspaceGuest && pageCanEdit !== false;
	const docViewMode = workspaceGuest ? 'read' : canUseCollaborativeEdit ? viewMode : 'read';

	return (
		<Flex direction="column" flex={1} style={{ minHeight: '100%', width: '100%' }}>
			<View
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 4,
					flexShrink: 0,
					marginBottom: 12,
					paddingBottom: 8,
					background: '#fff',
					borderBottom: '1px solid rgba(0,0,0,0.06)',
				}}
			>
			<Flex  px={20} align="center" justify="space-between" gap={12}>
				<Flex align="center" gap={12} style={{ minWidth: 0 }}>
					<Title py={20} level={3} m={0} ellipsis>
						{loading ? <Skeleton w={160} h={24} /> : pageTitle || '文档'}
					</Title>
					{!loading && pageWorkspaceId ? (
						<Favorite
							compact
							initialIsStarred={isStarred}
							onToggle={(next) => handleFavoriteToggle(next)}
						/>
					) : null}
					<Text fontSize={12} color="rgba(0,0,0,0.45)">
						{workspaceGuest
							? '访客仅可预览'
							: !canUseCollaborativeEdit
								? '仅可阅读（在线协同）'
								: viewMode === 'read'
									? '阅读模式（仅浏览，仍在线协同）'
									: '协同编辑'}
					</Text>
				</Flex>
				{!workspaceGuest && (
					<Flex align="center" gap={12} style={{ flexShrink: 0 }}>
						<Flex align="center" gap={10}>
							<Text fontSize={12} color="rgba(0,0,0,0.55)" style={{ whiteSpace: 'nowrap' }}>
								在线 {collabPresence.onlineCount} 人
							</Text>
							{collabPresence.members.length > 0 && (
								<AvatarGroup maxCount={4} size={28} radius="full" borderColor="#fff">
									{collabPresence.members.map((m) => (
										<Avatar
											key={m.clientId}
											title={m.name}
											bg={m.color}
											borderColor="#fff"
											size={28}
											radius="full"
											style={{ color: '#fff' }}
											icon={
												m.avatarUrl ? (
													<img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" />
												) : m.avatarIcon ? (
													m.avatarIcon
												) : undefined
											}
										/>
									))}
								</AvatarGroup>
							)}
						</Flex>
						{!loading && canUseCollaborativeEdit && (
							<Flex gap={8}>
								<Button variant={viewMode === 'read' ? 'solid' : 'soft'} onClick={() => setViewMode('read')}>
									阅读
								</Button>
								<Button variant={viewMode === 'edit' ? 'solid' : 'soft'} onClick={() => setViewMode('edit')}>
									编辑
								</Button>
							</Flex>
						)}
					</Flex>
				)}
			</Flex>
			</View>

			<View flex={1} style={{ minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
				{/* {loading ? (
					<Skeleton w="100%" h={320} />
				) : (
					<CarvyDoc
						key={guestPreviewOnly ? `${pageId}-guest` : `${pageId}-collab`}
						pageId={pageId}
						viewMode={docViewMode}
						previewContent={previewPm}
						workspaceReadOnly={workspaceGuest}
						onCollaborationPresence={guestPreviewOnly ? undefined : handleCollaborationPresence}
					/>
				)} */}
				<Doc/>
			</View>

			{showBackTop && (
				<button
					type="button"
					aria-label="回到顶部"
					title="回到顶部"
					onClick={scrollToTop}
					style={{
						position: 'fixed',
						right: 24,
						bottom: 24,
						zIndex: 50,
						width: 44,
						height: 44,
						padding: 0,
						borderRadius: '50%',
						border: '1px solid rgba(0, 0, 0, 0.08)',
						background: '#fff',
						boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'rgba(0, 0, 0, 0.75)',
					}}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
						<path
							d="M12 19V6M8 11l4-4 4 4"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			)}
		</Flex>
	);
};

export default PageDoc;
