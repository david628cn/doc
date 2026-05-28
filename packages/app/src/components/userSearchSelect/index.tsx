import React, { useCallback, useRef, useState } from 'react';
import { Button, Flex, View, SearchInput, Text, message } from '@carvy/ui';
import { AvatarList, type AvatarListValue } from '@/components/avatarList';
import { socialFollow } from '@/api/social';

export type UserSocialBrief = {
	is_following?: boolean;
	is_followed_by?: boolean;
	is_mutual_follow?: boolean;
	is_friend?: boolean;
	/** 空串或 outgoing | incoming */
	friend_pending?: string;
};

/** 将后端 UserBrief（含可选 social）转为 AvatarList 条目 */
export function mapUserBriefToAvatarItem(item: {
	id?: string;
	username?: string;
	real_name?: string;
	head_sculpture?: string;
	email?: string;
	mobile?: string;
	social?: UserSocialBrief;
}): AvatarListValue {
	const label = (item.real_name || '').trim() || item.username || '';
	const desc =
		[item.email, item.mobile].filter(Boolean).join(' · ') ||
		item.username ||
		'';
	const row: AvatarListValue = {
		id: item.id,
		name: label,
		label,
		desc,
		icon: item.head_sculpture,
		keywords: [item.username, item.real_name, item.email, item.mobile].filter(Boolean) as string[],
	};
	if (item.social) {
		row.social = item.social;
	}
	return row;
}

const chipStyle = (tone: 'friend' | 'pending' | 'follow'): React.CSSProperties => {
	const c = {
		friend: { bg: '#f6ffed', bd: '#b7eb8f', fg: '#389e0d' },
		pending: { bg: '#fff7e6', bd: '#ffd591', fg: '#d46b08' },
		follow: { bg: 'rgba(0,0,0,0.04)', bd: 'rgba(0,0,0,0.12)', fg: 'rgba(0,0,0,0.65)' },
	}[tone];
	return {
		fontSize: 11,
		lineHeight: '18px',
		padding: '2px 8px',
		borderRadius: 4,
		border: `1px solid ${c.bd}`,
		background: c.bg,
		color: c.fg,
		whiteSpace: 'nowrap',
	};
};

export type SocialRelationTagsProps = {
	social?: AvatarListValue['social'];
	userId?: string;
	/** 通讯录：未关注显示「关注」、仅对方关注显示「回关」、互关显示文案「互关」 */
	interactiveFollow?: boolean;
	onFollowDone?: () => void;
};

/** 右侧：好友/申请状态标签 + 关注关系（或交互按钮） */
export function SocialRelationTags({
	social,
	userId,
	interactiveFollow = false,
	onFollowDone,
}: SocialRelationTagsProps) {
	const [followLoading, setFollowLoading] = useState(false);

	const handleFollowClick = async (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (!userId || followLoading) return;
		setFollowLoading(true);
		try {
			const rs: any = await socialFollow(userId);
			if (rs?.code === 200) {
				message.success(rs.message || '已关注');
				onFollowDone?.();
			} else if (rs?.message) {
				message.error(rs.message);
			}
		} finally {
			setFollowLoading(false);
		}
	};

	if (!social) return null;

	const relationTags: { text: string; tone: 'friend' | 'pending' | 'follow' }[] = [];
	if (social.is_friend) {
		relationTags.push({ text: '好友', tone: 'friend' });
	}
	if (social.friend_pending === 'outgoing') {
		relationTags.push({ text: '待对方通过', tone: 'pending' });
	}
	if (social.friend_pending === 'incoming') {
		relationTags.push({ text: '待你处理', tone: 'pending' });
	}

	let followExtra: React.ReactNode = null;
	if (interactiveFollow) {
		if (social.is_mutual_follow) {
			followExtra = (
				<Text as="span" style={chipStyle('follow')}>
					互关
				</Text>
			);
		} else if (!social.is_following && social.is_followed_by) {
			followExtra = (
				<Button
					color="black"
					variant="outline"
					loading={followLoading}
					onClick={handleFollowClick}
				>
					回关
				</Button>
			);
		} else if (!social.is_following && !social.is_followed_by) {
			followExtra = (
				<Button color="black" loading={followLoading} onClick={handleFollowClick}>
					关注
				</Button>
			);
		} else if (social.is_following && !social.is_mutual_follow) {
			followExtra = (
				<Text as="span" style={chipStyle('follow')}>
					已关注
				</Text>
			);
		}
	} else {
		if (social.is_mutual_follow) {
			relationTags.push({ text: '互关', tone: 'follow' });
		} else if (social.is_following) {
			relationTags.push({ text: '已关注', tone: 'follow' });
		} else if (social.is_followed_by) {
			relationTags.push({ text: '关注你', tone: 'follow' });
		}
	}

	const hasRelation = relationTags.length > 0 || followExtra != null;
	if (!hasRelation) return null;

	return (
		<Flex
			gap={8}
			shrink={0}
			align="center"
			wrap="wrap"
			style={{ justifyContent: 'flex-end', maxWidth: 280 }}
			onClick={(e) => e.stopPropagation()}
		>
			{relationTags.length > 0 ? (
				<Flex gap={6} align="center" wrap="wrap">
					{relationTags.map((t, i) => (
						<Text key={`${t.text}-${i}`} as="span" style={chipStyle(t.tone)}>
							{t.text}
						</Text>
					))}
				</Flex>
			) : null}
			{followExtra}
		</Flex>
	);
}

export type UserSearchSelectProps = {
	/** 根据关键字拉取用户数组（已解包业务失败为空数组即可） */
	fetchUsers: (keyword: string) => Promise<any[]>;
	selectedKeys: string[];
	autoFocus?: boolean;
	onChange: (keys: string[], item: AvatarListValue | null) => void;
	searchPlaceholder?: string;
	showListFilter?: boolean;
	toolbarRight?: React.ReactNode;
	/** 展示关注/互关/好友状态（依赖接口返回 social，如 GET /api/user/search） */
	showRelationTags?: boolean;
	/** 通讯录专用：关注 / 回关按钮，互关显示文案 */
	showFollowActions?: boolean;
	style?: React.CSSProperties;
};

/**
 * 关键字搜索 + 可选列表（与工作区「邀请成员」同一交互：SearchInput + AvatarList）
 */
export const UserSearchSelect: React.FC<UserSearchSelectProps> = (props) => {
	const {
		fetchUsers,
		selectedKeys,
		onChange,
		searchPlaceholder = '用户名 / 姓名 / 邮箱 / 手机 / 工号',
		showListFilter = false,
		toolbarRight,
		showRelationTags = false,
		showFollowActions = false,
		autoFocus,
		style,
	} = props;
	const [data, setData] = useState<AvatarListValue[]>([]);
	const lastKeywordRef = useRef('');

	const refetchLastSearch = useCallback(async () => {
		const kw = lastKeywordRef.current.trim();
		if (!kw) return;
		try {
			const rows = await fetchUsers(kw);
			setData((rows || []).map((item: any) => mapUserBriefToAvatarItem(item)));
		} catch {
			/* ignore */
		}
	}, [fetchUsers]);

	const handleSearch = async (value: string) => {
		const kw = value.trim();
		lastKeywordRef.current = kw;
		if (kw === '') {
			setData([]);
			onChange([], null);
			return;
		}
		try {
			const rows = await fetchUsers(kw);
			setData((rows || []).map((item: any) => mapUserBriefToAvatarItem(item)));
			onChange([], null);
		} catch {
			setData([]);
		}
	};

	return (
		<View w="100%" style={style}>
			<Flex pb={10} gap={10} align="center" justify="space-between">
				<Flex flex={1}>
					<SearchInput placeholder={searchPlaceholder} onSearch={handleSearch} autoFocus={autoFocus}/>
				</Flex>
				{toolbarRight ? (
					<Flex gap={10} shrink={0} align="center">
						{toolbarRight}
					</Flex>
				) : null}
			</Flex>
			<AvatarList
				selectedKeys={selectedKeys}
				searchShow={showListFilter}
				data={data}
				autoFocus={autoFocus}
				onChange={(keys, item) => onChange(keys, item)}
				renderItem={
					showRelationTags
						? (item) => (
								<SocialRelationTags
									social={item.social}
									userId={item.id}
									interactiveFollow={showFollowActions}
									onFollowDone={showFollowActions ? refetchLastSearch : undefined}
								/>
							)
						: undefined
				}
			/>
		</View>
	);
};
