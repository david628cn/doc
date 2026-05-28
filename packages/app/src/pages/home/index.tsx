import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	Flex,
	Title,
	Text,
	Tab,
	IconWrapper,
	message,
	Favorite,
	Alert,
} from '@carvy/ui';
import { SpaceList } from '@/components/space/list';
import { useCurrentWorkspace } from '@/hooks';
import { listMyRecentPages, listMyStarredPages, setPageStar, type UserPageLibraryItem } from '@/api/page';
import history from '@/utils/history';
import { pageDocPath, workspaceLibraryPath } from '@/utils/appPaths';
import { pageTypeLabel } from '@/constants/pageType';
import { CLASSNAME } from '@/config';
import './index.less';

const H = `${CLASSNAME}-home-page`;

const ICON_TEAM = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor">
		<path d="M555 597.014H213q-44 0-83 17-39 16-68 45t-45 68q-17 39-17 84v85q0 19 11.5 31t31.5 12q19 0 30.5-12t11.5-31v-85q0-55 37-91.5t91-36.5h342q54 0 91 36.5t37 91.5v85q0 19 11.5 31t30.5 12q20 0 31.5-12t11.5-31v-85q0-45-17-84-16-39-45-68t-68-45q-39-17-83-17m-171-85q45 0 84-17 39-16 67.5-45t45.5-68q16-39 16-83 0-45-16-84-17-39-45.5-68t-67.5-45q-39-17-84-17t-84 17q-39 16-67.5 45t-45.5 68q-16 39-16 84 0 44 16 83 17 39 45.5 68t67.5 45q39 17 84 17m0-341q54 0 91 36.5t37 91.5q0 54-37 91t-91 37-91-37-37-91q0-55 37-91.5t91-36.5m478 435q-16-3-32 5.5t-19 24.5q-4 16 5 32t25 19q41 10 67 44.5t26 79.5v85q0 19 12 31t31 12 31-12 12-31v-85q3-74-41-131.5t-117-73.5m-171-512q-16-7-30.5 2t-20.5 28q-3 16 5.5 32t24.5 19q51 13 79 58t15 100q-10 35-34.5 59.5t-59.5 34.5q-16 3-26 19t-4 32q3 16 15 25t28 9h8q58-16 99.5-56t54.5-98q11-44 5-88-7-43-27.5-79t-54.5-62-77-35" />
	</svg>
);

const ICON_CLOCK = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor">
		<path d="M512 43.014q-98 0-183 36-86 37-149.5 100.5T79 329.014q-36 85-36 183t36 183q37 86 100.5 149.5t149.5 100.5q85 36 183 36t183-36q86-37 149.5-100.5t100.5-149.5q36-85 36-183t-36-183q-37-86-100.5-149.5T695 79.014q-85-36-183-36m0 853q-80 0-150-30t-122-82-82-122-30-150 30-150 82-122 122-82 150-30 150 30 122 82 82 122 30 150-30 150-82 122-122 82-150 30m188-337-145-73v-230q0-19-12-31t-31-12-31 12-12 31v256q0 13 6.5 22.5t19.5 15.5l171 86q3 3 6.5 3.5t10.5.5q12 0 22-6.5t16-19.5q6-12 .5-28.5t-21.5-26.5" />
	</svg>
);

const ICON_SHARE = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor">
		<path d="M750 583q-37 0-71 16.5T622 645l-213-98q15-47 0-94l213-98q26 31 62 46.5t75.5 13T834 392t56-53 25.5-72.5-9-77-43-64.5-67-38-77-3.5-71 31.5-49 59.5T583 250q0 15 3 30L366 381q-32-32-75-43t-86 .5-74.5 43.5-43 75 0 86 43 75 74.5 43.5 86 .5 75-43l220 101q-3 15-3 30 0 45 22.5 83.5t61 61T750 917t83.5-22.5 61-61T917 750t-22.5-83.5-61-61T750 583m0-416q34 0 58.5 24.5T833 250t-24.5 58.5T750 333t-58.5-24.5T667 250t24.5-58.5T750 167M250 583q-34 0-58.5-24.5T167 500t24.5-58.5T250 417t58.5 24.5T333 500t-24.5 58.5T250 583m500 250q-34 0-58.5-24.5T667 750t24.5-58.5T750 667t58.5 24.5T833 750t-24.5 58.5T750 833" />
	</svg>
);

const ICON_LOCK = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor">
		<path d="M500 542q-17 0-29.5 12T458 583v125q0 17 12.5 29.5T500 750t29.5-12.5T542 708V583q0-17-12.5-29T500 542m208-167v-83q0-57-28-104.5T604.5 112 500 84t-104.5 28-75.5 75.5T292 292v83q-34 0-62.5 17T184 437.5 167 500v292q0 34 17 62.5t45.5 45.5 62.5 17h416q34 0 62.5-17t45.5-45.5 17-62.5V500q0-34-17-62.5T770.5 392 708 375m-333-83q0-34 17-62.5t45.5-45.5 62.5-17 62.5 17 45.5 45.5 17 62.5v83H375zm375 500q0 17-12.5 29T708 833H292q-17 0-29.5-12T250 792V500q0-17 12.5-29.5T292 458h416q17 0 29.5 12.5T750 500z" />
	</svg>
);

const ICON_STAR = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor">
		<path d="M917 403q-4-12-14-19.5t-22-8.5l-237-35-106-215q-5-11-15.5-17t-22-6-22 6-15.5 17L356 340l-237 35q-12 2-21 9.5T85.5 403t-.5 22.5T96 445l172 167-42 236q-2 12 2.5 23.5t14 18.5 21.5 8 23-5l213-111 212 111q9 5 20 5 13 0 23.5-7.5t15-18.5 2.5-23l-42-237 172-167q9-8 13-19t1-23M660 570q-15 15-12 36l30 175-156-83q-20-10-40 0l-156 83 30-175q3-21-12-36L219 445l175-26q10-1 18.5-7.5T426 396l74-159 78 160q5 9 13.5 15.5T610 420l175 25z" />
	</svg>
);

const ICON_PLUS = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
	</svg>
);

const ICON_UPLOAD = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
	</svg>
);

const ICON_TEMPLATE = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M4 4h7l2 2h7v14H4V4zm2 2v12h12V8h-5.17L12 6H6zm3 3h6v2H9V9zm0 4h6v2H9v-2z" />
	</svg>
);

function formatTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function shortSpaceId(id: string): string {
	if (!id) return '—';
	return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

type StarRow = UserPageLibraryItem & { isStarred: boolean };

const StarredHomeTable: React.FC<{
	loading: boolean;
	rows: StarRow[];
	emptyHint: string;
	onStarChange: (pageId: string, starred: boolean) => Promise<boolean | void>;
}> = ({ loading, rows, emptyHint, onStarChange }) => {
	if (loading) {
		return (
			<Text color="rgba(0,0,0,0.45)" py={16}>
				加载中…
			</Text>
		);
	}
	if (rows.length === 0) {
		return (
			<Text color="rgba(0,0,0,0.45)" py={16}>
				{emptyHint}
			</Text>
		);
	}
	return (
		<View>
			<div className={`${H}__table-head`}>
				<div className={`${H}__col-title`}>标题</div>
				<div className={`${H}__col-meta`}>位置</div>
				<div className={`${H}__col-meta`}>类型</div>
				<div className={`${H}__col-meta`}>所有者</div>
				<div className={`${H}__col-time`}>最近访问</div>
				<div className={`${H}__col-fav`} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>
					收藏
				</div>
			</div>
			{rows.map((r) => (
				<div key={r.page_id} className={`${H}__table-row ${H}__table-row--fav`}>
					<button
						type="button"
						className={`${H}__table-row-main`}
						onClick={() => history.push(pageDocPath(r.page_id))}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								history.push(pageDocPath(r.page_id));
							}
						}}
					>
						<div className={`${H}__col-title`}>
							<Text fontWeight={500} ellipsis style={{ margin: 0 }}>
								{r.title || '未命名'}
							</Text>
						</div>
						<div className={`${H}__col-meta`}>{shortSpaceId(r.space_id)}</div>
						<div className={`${H}__col-meta`}>{pageTypeLabel(r.page_type)}</div>
						<div className={`${H}__col-meta`}>—</div>
						<div className={`${H}__col-time`}>{formatTime(r.sort_time)}</div>
					</button>
					<div className={`${H}__col-fav`}>
						<Flex
							shrink={0}
							onClick={(e) => e.stopPropagation()}
							onPointerDown={(e) => e.stopPropagation()}
						>
							<Favorite
								compact
								initialIsStarred={r.isStarred}
								onToggle={(starred) => onStarChange(r.page_id, starred)}
							/>
						</Flex>
					</div>
				</div>
			))}
		</View>
	);
};

const DocTableBlock: React.FC<{
	loading: boolean;
	rows: UserPageLibraryItem[];
	emptyHint: string;
}> = ({ loading, rows, emptyHint }) => {
	if (loading) {
		return (
			<Text color="rgba(0,0,0,0.45)" py={16}>
				加载中…
			</Text>
		);
	}
	if (rows.length === 0) {
		return (
			<Text color="rgba(0,0,0,0.45)" py={16}>
				{emptyHint}
			</Text>
		);
	}
	return (
		<View>
			<div className={`${H}__table-head`}>
				<div className={`${H}__col-title`}>标题</div>
				<div className={`${H}__col-meta`}>位置</div>
				<div className={`${H}__col-meta`}>类型</div>
				<div className={`${H}__col-meta`}>所有者</div>
				<div className={`${H}__col-time`}>最近访问</div>
			</div>
			{rows.map((r) => (
				<div
					key={r.page_id}
					className={`${H}__table-row`}
					role="button"
					tabIndex={0}
					onClick={() => history.push(pageDocPath(r.page_id))}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							history.push(pageDocPath(r.page_id));
						}
					}}
				>
					<div className={`${H}__col-title`}>
						<Text fontWeight={500} ellipsis style={{ margin: 0 }}>
							{r.title || '未命名'}
						</Text>
					</div>
					<div className={`${H}__col-meta`}>{shortSpaceId(r.space_id)}</div>
					<div className={`${H}__col-meta`}>{pageTypeLabel(r.page_type)}</div>
					<div className={`${H}__col-meta`}>—</div>
					<div className={`${H}__col-time`}>{formatTime(r.sort_time)}</div>
				</div>
			))}
		</View>
	);
};

const Home: React.FC = () => {
	const { workspaceId } = useCurrentWorkspace();
	const [recentRows, setRecentRows] = useState<UserPageLibraryItem[]>([]);
	const [starRows, setStarRows] = useState<StarRow[]>([]);
	const [recentLoading, setRecentLoading] = useState(false);
	const [starLoading, setStarLoading] = useState(false);

	const loadRecent = useCallback(async () => {
		if (!workspaceId?.trim()) {
			setRecentRows([]);
			return;
		}
		setRecentLoading(true);
		try {
			const res: any = await listMyRecentPages(80, workspaceId);
			if (res?.code === 200 && Array.isArray(res.data)) setRecentRows(res.data);
			else setRecentRows([]);
		} finally {
			setRecentLoading(false);
		}
	}, [workspaceId]);

	const loadStarred = useCallback(async () => {
		if (!workspaceId?.trim()) {
			setStarRows([]);
			return;
		}
		setStarLoading(true);
		try {
			const res: any = await listMyStarredPages(80, workspaceId);
			if (res?.code === 200 && Array.isArray(res.data)) {
				setStarRows(
					res.data.map((row: UserPageLibraryItem) => ({
						...row,
						isStarred: true,
					})),
				);
			} else {
				setStarRows([]);
			}
		} finally {
			setStarLoading(false);
		}
	}, [workspaceId]);

	useEffect(() => {
		void loadRecent();
		void loadStarred();
	}, [loadRecent, loadStarred]);

	const goLibrary = useCallback(() => {
		if (!workspaceId?.trim()) {
			message.warning('暂无工作区');
			return;
		}
		history.push(workspaceLibraryPath(workspaceId));
	}, [workspaceId]);

	const handleHomeStarToggle = useCallback(
		async (pageId: string, starred: boolean) => {
			if (!workspaceId?.trim()) return false;
			const res: any = await setPageStar(pageId, starred, workspaceId);
			if (res?.code === 200) {
				setStarRows((prev) =>
					prev.map((row) => (row.page_id === pageId ? { ...row, isStarred: starred } : row)),
				);
				return;
			}
			if (res?.message) {
				Alert.error({ message: res.message });
			}
			return false;
		},
		[workspaceId],
	);

	const tabItems = useMemo(
		() => [
			{
				key: 'recent',
				label: (
					<Flex align="center" gap={6}>
						<IconWrapper>{ICON_CLOCK}</IconWrapper>
						<Text>最近访问</Text>
					</Flex>
				),
				children: (
					<View py={16}>
						<DocTableBlock
							loading={recentLoading}
							rows={recentRows}
							emptyHint="暂无最近访问，打开文档后会出现在这里。"
						/>
					</View>
				),
			},
			{
				key: 'my-library',
				label: (
					<Flex align="center" gap={6}>
						<IconWrapper>{ICON_TEAM}</IconWrapper>
						<Text>我的库</Text>
					</Flex>
				),
				children: (
					<View py={16}>
						<SpaceList />
					</View>
				),
			},
			{
				key: 'shared',
				label: (
					<Flex align="center" gap={6}>
						<IconWrapper>{ICON_SHARE}</IconWrapper>
						<Text>已共享</Text>
					</Flex>
				),
				children: (
					<View py={24}>
						<Text color="rgba(0,0,0,0.55)" style={{ lineHeight: 1.7 }}>
							「与我共享」文档列表即将接入；当前可在侧栏「库」中查看各知识库协作内容。
						</Text>
					</View>
				),
			},
			{
				key: 'personal',
				label: (
					<Flex align="center" gap={6}>
						<IconWrapper>{ICON_LOCK}</IconWrapper>
						<Text>个人</Text>
					</Flex>
				),
				children: (
					<View py={16}>
						<SpaceList />
					</View>
				),
			},
			{
				key: 'favorites',
				label: (
					<Flex align="center" gap={6}>
						<IconWrapper>{ICON_STAR}</IconWrapper>
						<Text>我的收藏</Text>
					</Flex>
				),
				children: (
					<View py={16}>
						{workspaceId?.trim() ? (
							<StarredHomeTable
								loading={starLoading}
								rows={starRows}
								emptyHint="暂无收藏，在文档页点击「收藏」即可加入。"
								onStarChange={handleHomeStarToggle}
							/>
						) : (
							<Text color="rgba(0,0,0,0.45)" py={16}>
								暂无工作区
							</Text>
						)}
					</View>
				),
			},
		],
		[recentLoading, recentRows, starLoading, starRows, workspaceId, handleHomeStarToggle],
	);

	return (
		<View className={H} w="100%">
			<Title level={2} m={0} mb={8}>
				主页
			</Title>
			<Text fontSize={14} color="rgba(0,0,0,0.45)" mb={24} style={{ display: 'block' }}>
				新建、浏览库与最近文档；共享与模板能力将持续完善。
			</Text>

			<div className={`${H}__actions`}>
				<button type="button" className={`${H}__action-card`} onClick={() => void goLibrary()}>
					<IconWrapper iconSize="18px">{ICON_PLUS}</IconWrapper>
					<Text fontWeight={500}>新建</Text>
					<Text fontSize={12} color="rgba(0,0,0,0.35)">
						▼
					</Text>
				</button>
				<button
					type="button"
					className={`${H}__action-card`}
					onClick={() => message.info('上传功能开发中')}
				>
					<IconWrapper iconSize="18px">{ICON_UPLOAD}</IconWrapper>
					<Text fontWeight={500}>上传</Text>
					<Text fontSize={12} color="rgba(0,0,0,0.35)">
						▼
					</Text>
				</button>
				<button
					type="button"
					className={`${H}__action-card`}
					onClick={() => message.info('模板库开发中')}
				>
					<IconWrapper iconSize="18px">{ICON_TEMPLATE}</IconWrapper>
					<Text fontWeight={500}>模板库</Text>
				</button>
			</div>

			<Tab defaultActiveKey="recent" items={tabItems as any} />
		</View>
	);
};

export default Home;
