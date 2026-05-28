import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Flex, Title, Text, View, Skeleton, Input } from '@carvy/ui';
import { listMyRecentPages, type UserPageLibraryItem } from '@/api/page';
import history from '@/utils/history';
import { pageDocPath } from '@/utils/appPaths';
import { pageTypeLabel } from '@/constants/pageType';
import { matchesTextSearch } from '@/utils/textSearch';
import { CLASSNAME } from '@/config';
import './index.less';

const W = `${CLASSNAME}-workspace-hub`;

function formatListTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

const WorkspaceHub: React.FC = () => {
	const { workspaceId } = useParams<{ workspaceId: string }>();
	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<UserPageLibraryItem[]>([]);
	const [searchQ, setSearchQ] = useState('');

	const load = useCallback(async () => {
		if (!workspaceId?.trim()) {
			setRows([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res: any = await listMyRecentPages(50, workspaceId);
			if (res?.code === 200 && Array.isArray(res.data)) {
				setRows(res.data);
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

	const visibleRows = useMemo(
		() =>
			rows.filter((r) =>
				matchesTextSearch(searchQ, r.title, pageTypeLabel(r.page_type)),
			),
		[rows, searchQ],
	);

	return (
		<View className={W} style={{ padding: '24px 32px', maxWidth: 720 }}>
			<Title level={3} m={0} mb={16}>
				最近打开
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
				<Text color="rgba(0,0,0,0.45)">暂无记录，打开文档后会出现在这里</Text>
			) : visibleRows.length === 0 ? (
				<Text color="rgba(0,0,0,0.45)">无匹配结果</Text>
			) : (
				<Flex direction="column" gap={0}>
					{visibleRows.map((r) => (
						<button
							key={r.page_id}
							type="button"
							className={`${W}__row`}
							onClick={() => history.push(pageDocPath(r.page_id))}
						>
							<Text fontWeight={500}>{r.title || '未命名'}</Text>
							<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ display: 'block', marginTop: 4 }}>
								{pageTypeLabel(r.page_type)} · {formatListTime(r.sort_time)}
							</Text>
						</button>
					))}
				</Flex>
			)}
		</View>
	);
};

export default WorkspaceHub;
