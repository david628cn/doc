import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flex, Title, Text, View, Skeleton, Alert, Input, Favorite } from '@carvy/ui';
import { listMyStarredPages, setPageStar, type UserPageLibraryItem } from '@/api/page';
import { useCurrentWorkspace } from '@/hooks';
import history from '@/utils/history';
import { pageDocPath } from '@/utils/appPaths';
import { pageTypeLabel } from '@/constants/pageType';
import { matchesTextSearch } from '@/utils/textSearch';
import { CLASSNAME } from '@/config';
import './index.less';

const G = `${CLASSNAME}-group-starred`;

function formatListTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

/** 列表项：服务端均为已收藏；本地可标记取消收藏，便于当场再次收藏 */
type StarRow = UserPageLibraryItem & { isStarred: boolean };

const GroupStarred: React.FC = () => {
	const { workspaceId } = useCurrentWorkspace();
	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<StarRow[]>([]);
	const [searchQ, setSearchQ] = useState('');

	const load = useCallback(async () => {
		if (!workspaceId?.trim()) {
			setRows([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res: any = await listMyStarredPages(50, workspaceId);
			if (res?.code === 200 && Array.isArray(res.data)) {
				setRows(
					res.data.map((r: UserPageLibraryItem) => ({
						...r,
						isStarred: true,
					})),
				);
			} else {
				setRows([]);
			}
		} finally {
			setLoading(false);
		}
	}, [workspaceId]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSetStar = useCallback(
		async (pageId: string, starred: boolean) => {
			if (!workspaceId?.trim()) return false;
			const res: any = await setPageStar(pageId, starred, workspaceId);
			if (res?.code === 200) {
				setRows((prev) =>
					prev.map((r) => (r.page_id === pageId ? { ...r, isStarred: starred } : r)),
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

	const visibleRows = useMemo(
		() =>
			rows.filter((r) =>
				matchesTextSearch(searchQ, r.title, pageTypeLabel(r.page_type)),
			),
		[rows, searchQ],
	);

	return (
		<View className={G} style={{ padding: '24px 32px', maxWidth: 720 }}>
			<Title level={3} m={0} mb={16}>
				我的收藏
			</Title>
			<Input
				value={searchQ}
				onChange={(v: string) => setSearchQ(v)}
				placeholder="搜索标题或类型…"
				style={{ marginBottom: 16, maxWidth: 360 }}
			/>
			{loading ? (
				<Skeleton w="100%" h={200} />
			) : rows.length === 0 ? (
				<Text color="rgba(0,0,0,0.45)">暂无收藏，在文档页点击「收藏」即可加入</Text>
			) : visibleRows.length === 0 ? (
				<Text color="rgba(0,0,0,0.45)">无匹配结果</Text>
			) : (
				<Flex direction="column" gap={0}>
					{visibleRows.map((r) => (
						<Flex
							key={r.page_id}
							align="center"
							gap={10}
							className={`${G}__row`}
							style={{ justifyContent: 'space-between' }}
						>
							<button
								type="button"
								className={`${G}__row-main`}
								onClick={() => history.push(pageDocPath(r.page_id))}
							>
								<Flex align="center" gap={8} style={{ minWidth: 0 }}>
									<Text fontSize={12} color="rgba(0,0,0,0.38)" style={{ flexShrink: 0 }}>
										{pageTypeLabel(r.page_type)}
									</Text>
									<Text fontWeight={500} ellipsis style={{ flex: 1, minWidth: 0 }}>
										{r.title || '未命名'}
									</Text>
								</Flex>
								<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ display: 'block', marginTop: 4 }}>
									{formatListTime(r.sort_time)}
								</Text>
							</button>
							<Flex
								shrink={0}
								onClick={(e) => e.stopPropagation()}
								onPointerDown={(e) => e.stopPropagation()}
							>
								<Favorite
									compact
									initialIsStarred={r.isStarred}
									onToggle={(starred) => handleSetStar(r.page_id, starred)}
								/>
							</Flex>
						</Flex>
					))}
				</Flex>
			)}
		</View>
	);
};

export default GroupStarred;
