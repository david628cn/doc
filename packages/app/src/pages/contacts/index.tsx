import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	Flex,
	Text,
	Tab,
	Avatar,
	Button,
	TextArea,
	Alert,
	message,
	Input,
	Dialog,
} from '@carvy/ui';
import { searchUsers } from '@/api/user';
import { UserSearchSelect } from '@/components/userSearchSelect';
import { GroupCompositeAvatar } from '@/components/groupCompositeAvatar';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import type { FollowListRow, FriendRequestRow, PeerChatSummary, UserBrief } from '@/api/social';
import {
	socialChatApplyJoinGroup,
	socialChatCreateGroup,
	socialChatGroups,
	socialChatPendingGroupInvites,
	socialChatRespondGroupInvite,
	type GroupChatRow,
	type PendingGroupInvitesOut,
} from '@/api/chat';
import { useEffectiveWorkspaceId } from '@/hooks/useEffectiveWorkspaceId';
import history from '@/utils/history';
import { getCurrentUserId } from '@/utils/currentUser';
import {
	formatChatListPreview,
	formatChatListTime,
	formatUnreadBadge,
	socialPrivateRoomId,
} from '@/utils/chatUi';
import {
	socialFollow,
	socialFollowersList,
	socialFollowingList,
	socialFriendAccept,
	socialFriendIncoming,
	socialFriendList,
	socialFriendOutgoing,
	socialFriendApply,
	socialFriendReject,
	socialFriendRemove,
	socialFriendUpdateRemark,
	socialUnfollow,
} from '@/api/social';

function sumPeerUnread(rows: { chat?: PeerChatSummary }[]): number {
	return rows.reduce((acc, r) => acc + (r.chat?.unread_count ?? 0), 0);
}

function sumGroupUnread(gs: GroupChatRow[]): number {
	return gs.reduce((acc, g) => acc + (g.unread_count ?? 0), 0);
}

/** Tab 标题：名称 + 成员/条数；气泡为会话未读或好友申请待处理（status=0） */
const ContactsTabLabel: React.FC<{
	title: string;
	count: number;
	bubbleCount?: number;
	loading?: boolean;
}> = ({ title, count, bubbleCount = 0, loading }) => (
	<Flex align="center" gap={6} style={{ flexWrap: 'nowrap' }}>
		<Text as="span" fontSize={14} style={{ margin: 0, whiteSpace: 'nowrap' }}>
			{title}（{count}）{loading ? '…' : ''}
		</Text>
		{bubbleCount > 0 ? (
			<Text
				as="span"
				fontSize={11}
				fontWeight={600}
				style={{
					minWidth: `18px`,
					height: `18px`,
					lineHeight: '18px',
					textAlign: 'center',
					padding: bubbleCount > 9 ? '0 5px' : '0',
					borderRadius: `999px`,
					background: '#ff4d4f',
					color: '#fff',
					boxSizing: 'border-box',
				}}
			>
				{bubbleCount > 99 ? '99+' : bubbleCount}
			</Text>
		) : null}
	</Flex>
);

/** 通知同页通讯录、聊天列表等刷新会话摘要 */
function notifyContactsChatSync() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('doc-space-social-chat-sync', { detail: {} }));
}

/** 与后端 sys_friend.status：0 待处理 1 已同意 2 已拒绝 3 已撤回 */
function friendRequestStatusLabel(status: number, tab: 'incoming' | 'outgoing'): string {
	switch (status) {
		case 0:
			return '待处理';
		case 1:
			return '已同意';
		case 2:
			return '已拒绝';
		case 3:
			return tab === 'outgoing' ? '已撤回' : '对方已撤回';
		default:
			return '';
	}
}

const UserLine: React.FC<{
	brief: UserBrief;
	/** 覆盖主标题（如有备注展示「备注（用户名）」） */
	displayTitle?: string;
	sub?: React.ReactNode;
	actions?: React.ReactNode;
	chatSummary?: PeerChatSummary;
	onRowClick?: () => void;
}> = ({ brief, displayTitle, sub, actions, chatSummary, onRowClick }) => {
	const url = resolveMediaSrcForImg(brief.head_sculpture);
	const badge = chatSummary ? formatUnreadBadge(chatSummary.unread_count) : '';
	const titleMain = displayTitle ?? brief.real_name ?? brief.username;
	return (
	<Flex
		align="flex-start"
		gap={12}
		py={10}
		style={{
			borderBottom: '1px solid var(--border-color)',
			minWidth: 0,
			cursor: onRowClick ? 'pointer' : undefined,
		}}
		onClick={onRowClick}
	>
		<Avatar
			size={40}
			radius="full"
			title={titleMain}
			icon={url ? <img src={url} alt="" /> : brief.username?.charAt(0) ?? '?'}
		/>
		<Flex direction="column" flex={1} style={{ minWidth: 0 }} gap={4}>
			<Text fontWeight={600} ellipsis style={{ margin: 0 }}>
				{titleMain}
			</Text>
			<Text fontSize={12} color="rgba(0,0,0,0.45)" ellipsis style={{ margin: 0 }}>
				@{brief.username}
			</Text>
			{chatSummary?.last_message_preview ? (
				<Text fontSize={12} color="rgba(0,0,0,0.55)" ellipsis style={{ margin: 0 }}>
					{formatChatListPreview(chatSummary.last_message_preview)}
				</Text>
			) : null}
			{sub}
		</Flex>
		<Flex direction="column" align="flex-end" gap={6} style={{ flexShrink: 0 }}>
			{chatSummary?.last_message_at ? (
				<Text fontSize={11} color="rgba(0,0,0,0.38)" style={{ whiteSpace: 'nowrap' }}>
					{formatChatListTime(chatSummary.last_message_at)}
				</Text>
			) : null}
			{badge ? (
				<Text
					as="span"
					fontSize={11}
					fontWeight={600}
					style={{
						minWidth: `22px`,
						textAlign: 'center',
						padding: '2px 8px',
						borderRadius: `999px`,
						background: 'rgba(124, 58, 237, 0.85)',
						color: '#fff',
					}}
				>
					{badge}
				</Text>
			) : null}
			{actions ? (
				<Flex onClick={(e) => e.stopPropagation()}>{actions}</Flex>
			) : null}
		</Flex>
	</Flex>
	);
};

const Contacts: React.FC = () => {
	const workspaceId = useEffectiveWorkspaceId();
	const [applySelectedKeys, setApplySelectedKeys] = useState<string[]>([]);
	const [applyMessage, setApplyMessage] = useState('');
	const [following, setFollowing] = useState<FollowListRow[]>([]);
	const [followers, setFollowers] = useState<FollowListRow[]>([]);
	const [friends, setFriends] = useState<FriendRequestRow[]>([]);
	const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
	const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
	const [groups, setGroups] = useState<GroupChatRow[]>([]);
	const [newGroupName, setNewGroupName] = useState('');
	const [newGroupMembers, setNewGroupMembers] = useState('');
	const [loadingKey, setLoadingKey] = useState<string | null>(null);
	const [pendingInvites, setPendingInvites] = useState<PendingGroupInvitesOut>(() => ({
		invite_to_me: [],
		apply_to_my_groups: [],
		my_invites_sent: [],
		my_applies: [],
	}));
	const [applyGroupId, setApplyGroupId] = useState('');
	const [applyGroupMsg, setApplyGroupMsg] = useState('');
	const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
	const [remarkDraft, setRemarkDraft] = useState('');
	const [remarkTarget, setRemarkTarget] = useState<FriendRequestRow | null>(null);

	const openPeerChat = (peer: UserBrief, chat?: PeerChatSummary) => {
		const me = getCurrentUserId();
		if (!me) return;
		const room = chat?.room_id ?? socialPrivateRoomId(me, peer.id);
		const title = encodeURIComponent(peer.real_name || peer.username);
		history.push(`/chat?room_id=${encodeURIComponent(room)}&title=${title}`);
	};

	const openGroupChat = (g: GroupChatRow) => {
		const t = encodeURIComponent(g.name);
		history.push(`/chat?room_id=${encodeURIComponent(g.room_id)}&title=${t}`);
	};

	const loadFollowing = useCallback(async () => {
		setLoadingKey('following');
		const rs: any = await socialFollowingList({
			page: 1,
			page_size: 50,
			...(workspaceId ? { workspace_id: workspaceId } : {}),
		});
		setLoadingKey(null);
		if (rs?.code === 200 && rs.data?.list) setFollowing(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, [workspaceId]);

	const loadFollowers = useCallback(async () => {
		setLoadingKey('followers');
		const rs: any = await socialFollowersList({
			page: 1,
			page_size: 50,
			...(workspaceId ? { workspace_id: workspaceId } : {}),
		});
		setLoadingKey(null);
		if (rs?.code === 200 && rs.data?.list) setFollowers(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, [workspaceId]);

	const loadFriends = useCallback(async () => {
		setLoadingKey('friends');
		const rs: any = await socialFriendList({
			page: 1,
			page_size: 50,
			...(workspaceId ? { workspace_id: workspaceId } : {}),
		});
		setLoadingKey(null);
		if (rs?.code === 200 && rs.data?.list) setFriends(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, [workspaceId]);

	const loadGroups = useCallback(async () => {
		setLoadingKey('groups');
		const rs: any = await socialChatGroups();
		setLoadingKey(null);
		if (rs?.code === 200 && Array.isArray(rs.data?.list)) setGroups(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, []);

	const loadPendingGroupInvites = useCallback(async () => {
		const rs: any = await socialChatPendingGroupInvites();
		if (rs?.code === 200 && rs.data) {
			setPendingInvites(rs.data as PendingGroupInvitesOut);
		}
	}, []);

	const loadIncoming = useCallback(async () => {
		setLoadingKey('incoming');
		const rs: any = await socialFriendIncoming({ page: 1, page_size: 50 });
		setLoadingKey(null);
		if (rs?.code === 200 && rs.data?.list) setIncoming(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, []);

	const loadOutgoing = useCallback(async () => {
		setLoadingKey('outgoing');
		const rs: any = await socialFriendOutgoing({ page: 1, page_size: 50 });
		setLoadingKey(null);
		if (rs?.code === 200 && rs.data?.list) setOutgoing(rs.data.list);
		else if (rs?.message) Alert.error({ message: rs.message });
	}, []);

	useEffect(() => {
		void loadFollowing();
		void loadFollowers();
		void loadFriends();
		void loadIncoming();
		void loadOutgoing();
		void loadGroups();
		void loadPendingGroupInvites();
	}, [loadFollowing, loadFollowers, loadFriends, loadIncoming, loadOutgoing, loadGroups, loadPendingGroupInvites]);

	const refreshFriendTabs = useCallback(() => {
		void loadIncoming();
		void loadOutgoing();
		void loadFriends();
	}, [loadIncoming, loadOutgoing, loadFriends]);

	useEffect(() => {
		const onSocialSync = () => {
			void refreshFriendTabs();
		};
		window.addEventListener('doc-space-social-friend-sync', onSocialSync);
		return () => window.removeEventListener('doc-space-social-friend-sync', onSocialSync);
	}, [refreshFriendTabs]);

	const refreshChatSummaries = useCallback(() => {
		void loadFollowing();
		void loadFollowers();
		void loadFriends();
		void loadGroups();
	}, [loadFollowing, loadFollowers, loadFriends, loadGroups]);

	useEffect(() => {
		const onChatSync = () => {
			void refreshChatSummaries();
		};
		window.addEventListener('doc-space-social-chat-sync', onChatSync);
		return () => window.removeEventListener('doc-space-social-chat-sync', onChatSync);
	}, [refreshChatSummaries]);

	useEffect(() => {
		const onGroupInviteSync = () => {
			void loadPendingGroupInvites();
			void loadGroups();
		};
		window.addEventListener('doc-space-social-group-invite-sync', onGroupInviteSync);
		return () => window.removeEventListener('doc-space-social-group-invite-sync', onGroupInviteSync);
	}, [loadPendingGroupInvites, loadGroups]);

	useEffect(() => {
		const onVis = () => {
			if (document.visibilityState === 'visible') void refreshChatSummaries();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	}, [refreshChatSummaries]);

	const unreadFollowing = useMemo(() => sumPeerUnread(following), [following]);
	const unreadFollowers = useMemo(() => sumPeerUnread(followers), [followers]);
	const unreadFriends = useMemo(() => sumPeerUnread(friends), [friends]);
	const unreadGroups = useMemo(() => sumGroupUnread(groups), [groups]);
	/** 待处理的好友申请（未读/待办）：status 0 */
	const pendingIncomingCount = useMemo(
		() => incoming.filter((r) => r.status === 0).length,
		[incoming],
	);
	const pendingOutgoingCount = useMemo(
		() => outgoing.filter((r) => r.status === 0).length,
		[outgoing],
	);
	const pendingGroupTodoCount = useMemo(
		() => pendingInvites.invite_to_me.length + pendingInvites.apply_to_my_groups.length,
		[pendingInvites],
	);

	const fetchUsersForFriend = async (keyword: string) => {
		const rs: any = await searchUsers(keyword);
		if (rs?.code === 200 && Array.isArray(rs.data)) {
			return rs.data;
		}
		return [];
	};

	const submitApply = async () => {
		const uid = applySelectedKeys[0];
		if (!uid) {
			Alert.warning({ message: '请先搜索并选择用户' });
			return;
		}
		const rs: any = await socialFriendApply({ user_id: uid, message: applyMessage.trim() });
		if (rs?.code === 200) {
			message.success(rs.message || '已发送');
			setApplyMessage('');
			setApplySelectedKeys([]);
			void loadOutgoing();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const openFriendRemarkDialog = (row: FriendRequestRow) => {
		setRemarkTarget(row);
		setRemarkDraft(row.remark ?? '');
		setRemarkDialogOpen(true);
	};

	const submitFriendRemark = async () => {
		if (!remarkTarget) return;
		const rs: any = await socialFriendUpdateRemark({
			peer_id: remarkTarget.peer.id,
			remark: remarkDraft.trim(),
		});
		if (rs?.code === 200) {
			message.success(rs.message || '已保存备注');
			setRemarkDialogOpen(false);
			setRemarkTarget(null);
			void loadFriends();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const submitApplyJoinGroup = async () => {
		const gid = applyGroupId.trim();
		if (!gid) {
			Alert.warning({ message: '请填写群 ID（UUID）' });
			return;
		}
		const rs: any = await socialChatApplyJoinGroup(gid, { message: applyGroupMsg.trim() });
		if (rs?.code === 200) {
			message.success(rs.message || '申请已提交');
			setApplyGroupMsg('');
			void loadPendingGroupInvites();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const submitCreateGroup = async () => {
		const name = newGroupName.trim();
		if (!name) {
			Alert.warning({ message: '请填写群名称' });
			return;
		}
		const parts = newGroupMembers
			.split(/[,，\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		const rs: any = await socialChatCreateGroup({
			name,
			member_ids: parts,
		});
		if (rs?.code === 200) {
			message.success(rs.message || '已创建');
			setNewGroupName('');
			setNewGroupMembers('');
			void loadGroups();
			const rid = rs.data?.room_id as string | undefined;
			if (rid) {
				history.push(`/chat?room_id=${encodeURIComponent(rid)}&title=${encodeURIComponent(name)}`);
			}
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	return (
		<View w="100%" p={24} style={{ boxSizing: 'border-box', maxWidth: 960 }}>
			<Flex direction="column" gap={4} mb={20}>
				<Text as="h1" fontSize={22} fontWeight={700} color="rgba(0,0,0,0.88)" m={0}>
					通讯录
				</Text>
				<Text fontSize={14} color="rgba(0,0,0,0.45)" m={0}>
					关注、粉丝、好友与群聊；会话摘要与未读随列表刷新（收到消息或回到本页时会更新）。点击行进入聊天。
				</Text>
			</Flex>

			<View mb={24} p={16} style={{ border: '1px solid var(--border-color)', borderRadius: 8 }}>
				<Text fontWeight={600} mb={12} style={{ display: 'block' }}>
					添加好友
				</Text>
				<Flex direction="column" gap={14}>
					<UserSearchSelect
						fetchUsers={fetchUsersForFriend}
						selectedKeys={applySelectedKeys}
						onChange={(keys) => setApplySelectedKeys(keys)}
						showRelationTags
						showFollowActions
					/>
					<View>
						<Text fontSize={14} fontWeight={600} mb={8} style={{ display: 'block' }}>
							申请附言（可选）
						</Text>
						<TextArea
							rows={3}
							value={applyMessage}
							onChange={(v: string) => setApplyMessage(v)}
							placeholder="输入打招呼内容"
							style={{ resize: 'vertical' }}
						/>
					</View>
					<Flex>
						<Button color="black" onClick={() => void submitApply()}>
							发送申请
						</Button>
					</Flex>
				</Flex>
			</View>

			<View mb={24} p={16} style={{ border: '1px solid var(--border-color)', borderRadius: 8 }}>
				<Text fontWeight={600} mb={12} style={{ display: 'block' }}>
					群邀请与入群审批
				</Text>
				<Text fontSize={13} color="rgba(0,0,0,0.55)" mb={12} style={{ display: 'block', marginTop: 0 }}>
					收到邀请或群主的入群审批后，将实时推送通知；此处可同意或拒绝。
				</Text>
				{pendingInvites.invite_to_me.length > 0 ? (
					<View mb={14}>
						<Text fontWeight={600} fontSize={13} mb={8} style={{ display: 'block' }}>
							收到的群邀请
						</Text>
						{pendingInvites.invite_to_me.map((row) => (
							<Flex
								key={row.id}
								align="flex-start"
								justify="space-between"
								gap={12}
								py={10}
								style={{ borderBottom: '1px solid var(--border-color)' }}
							>
								<View style={{ minWidth: 0 }}>
									<Text fontSize={14} style={{ margin: 0 }}>
										「{row.group_name}」
									</Text>
									<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ margin: '4px 0 0' }}>
										邀请人：{row.actor_name}
									</Text>
								</View>
								<Flex gap={8} style={{ flexShrink: 0 }}>
									<Button
										color="black"
										onClick={async () => {
											const rs: any = await socialChatRespondGroupInvite(row.id, { accept: true });
											if (rs?.code === 200) {
												message.success('已同意');
												void loadPendingGroupInvites();
												void loadGroups();
												notifyContactsChatSync();
											} else if (rs?.message) Alert.error({ message: rs.message });
										}}
									>
										同意
									</Button>
									<Button
										variant="soft"
										onClick={async () => {
											const rs: any = await socialChatRespondGroupInvite(row.id, { accept: false });
											if (rs?.code === 200) {
												message.success('已拒绝');
												void loadPendingGroupInvites();
											} else if (rs?.message) Alert.error({ message: rs.message });
										}}
									>
										拒绝
									</Button>
								</Flex>
							</Flex>
						))}
					</View>
				) : null}
				{pendingInvites.apply_to_my_groups.length > 0 ? (
					<View mb={14}>
						<Text fontWeight={600} fontSize={13} mb={8} style={{ display: 'block' }}>
							待审批的入群申请（群主）
						</Text>
						{pendingInvites.apply_to_my_groups.map((row) => (
							<Flex
								key={row.id}
								align="flex-start"
								justify="space-between"
								gap={12}
								py={10}
								style={{ borderBottom: '1px solid var(--border-color)' }}
							>
								<View style={{ minWidth: 0 }}>
									<Text fontSize={14} style={{ margin: 0 }}>
										「{row.group_name}」— {row.actor_name}
									</Text>
									{row.message ? (
										<Text fontSize={12} color="rgba(0,0,0,0.55)" style={{ margin: '4px 0 0' }}>
											附言：{row.message}
										</Text>
									) : null}
								</View>
								<Flex gap={8} style={{ flexShrink: 0 }}>
									<Button
										color="black"
										onClick={async () => {
											const rs: any = await socialChatRespondGroupInvite(row.id, { accept: true });
											if (rs?.code === 200) {
												message.success('已同意入群');
												void loadPendingGroupInvites();
												void loadGroups();
												notifyContactsChatSync();
											} else if (rs?.message) Alert.error({ message: rs.message });
										}}
									>
										同意
									</Button>
									<Button
										variant="soft"
										onClick={async () => {
											const rs: any = await socialChatRespondGroupInvite(row.id, { accept: false });
											if (rs?.code === 200) {
												message.success('已拒绝');
												void loadPendingGroupInvites();
											} else if (rs?.message) Alert.error({ message: rs.message });
										}}
									>
										拒绝
									</Button>
								</Flex>
							</Flex>
						))}
					</View>
				) : null}
				{pendingInvites.my_applies.length > 0 ? (
					<View mb={10}>
						<Text fontWeight={600} fontSize={13} mb={8} style={{ display: 'block' }}>
							我的入群申请（待审批）
						</Text>
						{pendingInvites.my_applies.map((row) => (
							<Text key={row.id} fontSize={13} color="rgba(0,0,0,0.65)" style={{ margin: '6px 0' }}>
								「{row.group_name}」— 等待群主处理
							</Text>
						))}
					</View>
				) : null}
				{pendingInvites.my_invites_sent.length > 0 ? (
					<View>
						<Text fontWeight={600} fontSize={13} mb={8} style={{ display: 'block' }}>
							已发出的邀请（待对方确认）
						</Text>
						{pendingInvites.my_invites_sent.map((row) => (
							<Text key={row.id} fontSize={13} color="rgba(0,0,0,0.65)" style={{ margin: '6px 0' }}>
								「{row.group_name}」→ {row.invitee_name ?? row.invitee_id}
							</Text>
						))}
					</View>
				) : null}
				{pendingInvites.invite_to_me.length === 0 &&
				pendingInvites.apply_to_my_groups.length === 0 &&
				pendingInvites.my_applies.length === 0 &&
				pendingInvites.my_invites_sent.length === 0 ? (
					<Text fontSize={13} color="rgba(0,0,0,0.38)">
						暂无待处理的群邀请或入群申请。
					</Text>
				) : null}
			</View>

			<Tab
				items={[
					{
						key: 'following',
						label: (
							<ContactsTabLabel
								title="关注"
								count={following.length}
								bubbleCount={unreadFollowing}
								loading={loadingKey === 'following'}
							/>
						),
						children: (
							<View py={12}>
								{following.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无关注</Text>
								) : (
									following.map((row) => (
										<UserLine
											key={row.user.id}
											brief={row.user}
											chatSummary={row.chat}
											onRowClick={() => openPeerChat(row.user, row.chat)}
											sub={
												<Text fontSize={11} color="rgba(0,0,0,0.35)" style={{ margin: 0 }}>
													关注于 {row.created_at}
												</Text>
											}
											actions={
												<Button
													variant="soft"
													onClick={async () => {
														const rs: any = await socialUnfollow(row.user.id);
														if (rs?.code === 200) {
															message.success(rs.message || '已取消关注');
															void loadFollowing();
														} else if (rs?.message) Alert.error({ message: rs.message });
													}}
												>
													取消关注
												</Button>
											}
										/>
									))
								)}
							</View>
						),
					},
					{
						key: 'followers',
						label: (
							<ContactsTabLabel
								title="粉丝"
								count={followers.length}
								bubbleCount={unreadFollowers}
								loading={loadingKey === 'followers'}
							/>
						),
						children: (
							<View py={12}>
								{followers.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无粉丝</Text>
								) : (
									followers.map((row) => (
										<UserLine
											key={row.user.id}
											brief={row.user}
											chatSummary={row.chat}
											onRowClick={() => openPeerChat(row.user, row.chat)}
											sub={
												<Text fontSize={11} color="rgba(0,0,0,0.35)" style={{ margin: 0 }}>
													关注你于 {row.created_at}
												</Text>
											}
											actions={
												<Button
													variant="soft"
													onClick={async () => {
														const rs: any = await socialFollow(row.user.id);
														if (rs?.code === 200) {
															message.success(rs.message || '已关注');
															void loadFollowing();
														} else if (rs?.message) Alert.error({ message: rs.message });
													}}
												>
													回关
												</Button>
											}
										/>
									))
								)}
							</View>
						),
					},
					{
						key: 'friends',
						label: (
							<ContactsTabLabel
								title="好友"
								count={friends.length}
								bubbleCount={unreadFriends}
								loading={loadingKey === 'friends'}
							/>
						),
						children: (
							<View py={12}>
								{friends.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无好友</Text>
								) : (
									friends.map((row) => (
										<UserLine
											key={row.id}
											brief={row.peer}
											displayTitle={
												row.display_label ||
												row.peer.real_name ||
												row.peer.username
											}
											chatSummary={row.chat}
											onRowClick={() => openPeerChat(row.peer, row.chat)}
											actions={
												<Flex gap={8}>
													<Button
														variant="soft"
														onClick={() => openFriendRemarkDialog(row)}
													>
														备注
													</Button>
													<Button
														variant="soft"
														onClick={async () => {
															const rs: any = await socialFriendRemove(row.id);
															if (rs?.code === 200) {
																message.success(rs.message || '已删除');
																void loadFriends();
															} else if (rs?.message) Alert.error({ message: rs.message });
														}}
													>
														删除好友
													</Button>
												</Flex>
											}
										/>
									))
								)}
							</View>
						),
					},
					{
						key: 'groups',
						label: (
							<ContactsTabLabel
								title="群聊"
								count={groups.length}
								bubbleCount={unreadGroups + pendingGroupTodoCount}
								loading={loadingKey === 'groups'}
							/>
						),
						children: (
							<View py={12}>
								<View mb={16} p={14} style={{ border: '1px solid var(--border-color)', borderRadius: 8 }}>
									<Text fontWeight={600} mb={10} style={{ display: 'block' }}>
										创建群聊
									</Text>
									<Input
										value={newGroupName}
										onChange={(v: string) => setNewGroupName(v)}
										placeholder="群名称"
									/>
									<TextArea
										rows={2}
										value={newGroupMembers}
										onChange={(v: string) => setNewGroupMembers(v)}
										placeholder="成员用户 ID，多个用逗号分隔（不含自己）"
										style={{ marginTop: 10, resize: 'vertical' }}
									/>
									<Flex mt={10}>
										<Button color="black" onClick={() => void submitCreateGroup()}>
											创建并进入
										</Button>
									</Flex>
								</View>
								<View mb={16} p={14} style={{ border: '1px solid var(--border-color)', borderRadius: 8 }}>
									<Text fontWeight={600} mb={10} style={{ display: 'block' }}>
										申请加入已有群
									</Text>
									<Input
										value={applyGroupId}
										onChange={(v: string) => setApplyGroupId(v)}
										placeholder="群 ID（UUID）"
									/>
									<TextArea
										rows={2}
										value={applyGroupMsg}
										onChange={(v: string) => setApplyGroupMsg(v)}
										placeholder="附言（可选）"
										style={{ marginTop: 10, resize: 'vertical' }}
									/>
									<Flex mt={10}>
										<Button onClick={() => void submitApplyJoinGroup()}>提交申请</Button>
									</Flex>
								</View>
								{groups.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无群聊</Text>
								) : (
									groups.map((g) => {
										const badge = formatUnreadBadge(g.unread_count);
										return (
											<Flex
												key={g.group_id}
												align="flex-start"
												gap={12}
												py={10}
												style={{
													borderBottom: '1px solid var(--border-color)',
													cursor: 'pointer',
												}}
												onClick={() => openGroupChat(g)}
											>
												<GroupCompositeAvatar
													groupAvatar={g.head_sculpture ?? g.avatar}
													members={(g.member_avatar_urls ?? []).map((u, i) => ({
														head_sculpture: u || undefined,
														username: g.member_usernames?.[i],
														display_label: g.member_display_labels?.[i],
													}))}
													size={40}
													fallbackGlyph={g.name}
												/>
												<Flex direction="column" flex={1} style={{ minWidth: 0 }} gap={4}>
													<Text fontWeight={600} ellipsis style={{ margin: 0 }}>
														{g.name}{' '}
														<Text as="span" fontSize={12} color="rgba(0,0,0,0.45)">
															{g.member_count} 人
														</Text>
													</Text>
													{g.last_message_preview ? (
														<Text fontSize={12} color="rgba(0,0,0,0.55)" ellipsis style={{ margin: 0 }}>
															{formatChatListPreview(g.last_message_preview)}
														</Text>
													) : null}
												</Flex>
												<Flex direction="column" align="flex-end" gap={6}>
													{g.last_message_at ? (
														<Text fontSize={11} color="rgba(0,0,0,0.38)">
															{formatChatListTime(g.last_message_at)}
														</Text>
													) : null}
													{badge ? (
														<Text
															as="span"
															fontSize={11}
															fontWeight={600}
															style={{
																minWidth: `22px`,
																textAlign: 'center',
																padding: '2px 8px',
																borderRadius: `999px`,
																background: 'rgba(124, 58, 237, 0.85)',
																color: '#fff',
															}}
														>
															{badge}
														</Text>
													) : null}
												</Flex>
											</Flex>
										);
									})
								)}
							</View>
						),
					},
					{
						key: 'incoming',
						label: (
							<ContactsTabLabel
								title="收到的申请"
								count={incoming.length}
								bubbleCount={pendingIncomingCount}
								loading={loadingKey === 'incoming'}
							/>
						),
						children: (
							<View py={12}>
								{incoming.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无申请记录</Text>
								) : (
									incoming.map((row) => (
										<UserLine
											key={row.id}
											brief={row.peer}
											sub={
												<Flex direction="column" gap={4} style={{ margin: 0 }}>
													{row.apply_message ? (
														<Text fontSize={12} color="rgba(0,0,0,0.65)" style={{ margin: 0 }}>
															附言：{row.apply_message}
														</Text>
													) : null}
													<Text fontSize={11} color="rgba(0,0,0,0.35)" style={{ margin: 0 }}>
														{row.create_time}
													</Text>
												</Flex>
											}
											actions={
												row.status === 0 ? (
													<Flex gap={8}>
														<Button
															color="black"
															onClick={async () => {
																const rs: any = await socialFriendAccept(row.id);
																if (rs?.code === 200) {
																	message.success(rs.message || '已同意');
																	void loadIncoming();
																	void loadFriends();
																} else if (rs?.message) Alert.error({ message: rs.message });
															}}
														>
															同意
														</Button>
														<Button
															variant="soft"
															onClick={async () => {
																const rs: any = await socialFriendReject(row.id);
																if (rs?.code === 200) {
																	message.success(rs.message || '已拒绝');
																	void loadIncoming();
																} else if (rs?.message) Alert.error({ message: rs.message });
															}}
														>
															拒绝
														</Button>
													</Flex>
												) : (
													<Text
														as="span"
														fontSize={12}
														style={{ whiteSpace: 'nowrap' }}
														color={
															row.status === 1
																? 'rgba(82,196,26,0.95)'
																: 'rgba(0,0,0,0.45)'
														}
													>
														{friendRequestStatusLabel(row.status, 'incoming')}
													</Text>
												)
											}
										/>
									))
								)}
							</View>
						),
					},
					{
						key: 'outgoing',
						label: (
							<ContactsTabLabel
								title="发出的申请"
								count={outgoing.length}
								bubbleCount={pendingOutgoingCount}
								loading={loadingKey === 'outgoing'}
							/>
						),
						children: (
							<View py={12}>
								{outgoing.length === 0 ? (
									<Text color="rgba(0,0,0,0.45)">暂无申请记录</Text>
								) : (
									outgoing.map((row) => (
										<UserLine
											key={row.id}
											brief={row.peer}
											sub={
												<Flex direction="column" gap={4} style={{ margin: 0 }}>
													{row.apply_message ? (
														<Text fontSize={12} color="rgba(0,0,0,0.65)" style={{ margin: 0 }}>
															附言：{row.apply_message}
														</Text>
													) : null}
													<Text fontSize={11} color="rgba(0,0,0,0.35)" style={{ margin: 0 }}>
														{row.create_time}
													</Text>
												</Flex>
											}
											actions={
												row.status === 0 ? (
													<Button
														variant="soft"
														onClick={async () => {
															const rs: any = await socialFriendReject(row.id);
															if (rs?.code === 200) {
																message.success(rs.message || '已撤回');
																void loadOutgoing();
															} else if (rs?.message) Alert.error({ message: rs.message });
														}}
													>
														撤回
													</Button>
												) : (
													<Text
														as="span"
														fontSize={12}
														style={{ whiteSpace: 'nowrap' }}
														color={
															row.status === 1
																? 'rgba(82,196,26,0.95)'
																: 'rgba(0,0,0,0.45)'
														}
													>
														{friendRequestStatusLabel(row.status, 'outgoing')}
													</Text>
												)
											}
										/>
									))
								)}
							</View>
						),
					},
				]}
			/>

			<Dialog
				open={remarkDialogOpen}
				title="好友备注"
				center
				onCancel={() => {
					setRemarkDialogOpen(false);
					setRemarkTarget(null);
				}}
			>
				<View style={{ minWidth: `280px`, padding: '0 4px 12px' }}>
					<Text fontSize={13} color="rgba(0,0,0,0.55)" style={{ marginBottom: 8 }}>
						有备注时列表显示为「备注（用户名）」；留空则只显示用户名。
					</Text>
					<Input
						value={remarkDraft}
						onChange={(v: string) => setRemarkDraft(v)}
						placeholder="备注名称"
					/>
					<Flex mt={12} gap={10} justify="flex-end">
						<Button variant="soft" onClick={() => setRemarkDialogOpen(false)}>
							取消
						</Button>
						<Button color="black" onClick={() => void submitFriendRemark()}>
							保存
						</Button>
					</Flex>
				</View>
			</Dialog>
		</View>
	);
};

export default Contacts;
