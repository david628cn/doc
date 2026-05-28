import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
	View,
	Flex,
	Text,
	Button,
	TextArea,
	message,
	Input,
	Dialog,
	Confirm,
	Alert,
	Avatar,
	Popuover,
	Emoji,
} from '@carvy/ui';
import { wsContextPath } from '@/api';
import {
	chatHistory,
	socialChatMarkRead,
	socialChatGroupDetail,
	socialChatUpdateGroup,
	socialChatInviteMembers,
	socialChatLeaveGroup,
	socialChatTransferGroupOwner,
	socialChatUpdateMyGroupAlias,
	socialChatRemoveGroupMember,
	socialChatUploadAttachment,
	type ChatMessageDTO,
	type GroupDetailDTO,
} from '@/api/chat';
import { useEffectiveWorkspaceId } from '@/hooks/useEffectiveWorkspaceId';
import history from '@/utils/history';
import { getCurrentUserId, getCurrentUserLoginName, getCurrentUserHeadSculpture } from '@/utils/currentUser';
import { resolveCollaborationAvatarFields } from '@/utils/resolveHeadSculpture';
import {
	isPlatformChatRoom,
	isSocialPrivateRoom,
	parseLegacyPrivateRoomWorkspaceId,
	parseGroupIdFromRoom,
	parseSocialPrivatePeerUserId,
} from '@/utils/chatUi';
import { MemberList } from '@/components/memberList';
import { GroupCompositeAvatar } from '@/components/groupCompositeAvatar';
import { AvatarPicker } from '@/components/avatarPicker';
import { socialFriendList, type FriendRequestRow } from '@/api/social';
import { ChatMessageBody } from '@/components/chatMessageBody';

function parseQuery(search: string) {
	const q = new URLSearchParams(search);
	return {
		roomId: q.get('room_id') || '',
		title: q.get('title') || '聊天',
	};
}

function notifyContactsChatSync() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('doc-space-social-chat-sync', { detail: {} }));
}

const ChatPage: React.FC = () => {
	const loc = useLocation();
	const effectiveStoreWs = useEffectiveWorkspaceId();
	const { roomId, title } = useMemo(() => parseQuery(loc.search), [loc.search]);
	const workspaceForApi = useMemo(() => {
		if (isPlatformChatRoom(roomId)) return '';
		return parseLegacyPrivateRoomWorkspaceId(roomId) ?? effectiveStoreWs;
	}, [roomId, effectiveStoreWs]);
	const me = getCurrentUserId();
	const groupIdParsed = useMemo(() => parseGroupIdFromRoom(roomId), [roomId]);
	const peerUserIdPriv = useMemo(() => {
		if (!me || !roomId || !isSocialPrivateRoom(roomId)) return undefined;
		return parseSocialPrivatePeerUserId(roomId, me);
	}, [roomId, me]);
	const [lines, setLines] = useState<ChatMessageDTO[]>([]);
	const [input, setInput] = useState('');
	const socket = useRef<WebSocket | null>(null);
	const imageFileRef = useRef<HTMLInputElement>(null);
	const videoFileRef = useRef<HTMLInputElement>(null);
	const [titleOverride, setTitleOverride] = useState<string | null>(null);
	const [groupPanelOpen, setGroupPanelOpen] = useState(false);
	const [groupDetail, setGroupDetail] = useState<GroupDetailDTO | null>(null);
	const [groupNameEdit, setGroupNameEdit] = useState('');
	const [addMemberIds, setAddMemberIds] = useState('');
	const [transferOwnerId, setTransferOwnerId] = useState('');
	const [myGroupAliasInput, setMyGroupAliasInput] = useState('');
	const [groupLoading, setGroupLoading] = useState(false);
	const [groupAnnouncementEdit, setGroupAnnouncementEdit] = useState('');
	const [groupAvatarEdit, setGroupAvatarEdit] = useState('');
	/** 私聊对方在好友列表中的行（含 display_label = 备注（用户名）或仅用户名） */
	const [privatePeerFriend, setPrivatePeerFriend] = useState<FriendRequestRow | null>(null);

	useEffect(() => {
		setTitleOverride(null);
	}, [roomId]);

	useEffect(() => {
		setGroupDetail(null);
	}, [groupIdParsed]);

	useEffect(() => {
		if (!groupDetail || !me) return;
		const mine = groupDetail.members.find((m) => normalizeUuid(m.user_id) === normalizeUuid(me));
		setMyGroupAliasInput(mine?.group_alias ?? '');
	}, [groupDetail, me]);

	const loadGroupDetail = useCallback(async () => {
		if (!groupIdParsed) return;
		setGroupLoading(true);
		const rs: any = await socialChatGroupDetail(groupIdParsed);
		setGroupLoading(false);
		if (rs?.code === 200 && rs.data) {
			const d = rs.data as GroupDetailDTO;
			setGroupDetail(d);
			setGroupNameEdit(d.name || '');
			setGroupAnnouncementEdit(d.announcement ?? '');
			setGroupAvatarEdit(d.head_sculpture ?? d.avatar ?? '');
			setTitleOverride(d.name);
		} else if (rs?.message) Alert.error({ message: rs.message });
	}, [groupIdParsed]);

	const openGroupPanel = () => {
		setGroupPanelOpen(true);
		void loadGroupDetail();
	};

	const saveGroupName = async () => {
		if (!groupIdParsed) return;
		const name = groupNameEdit.trim();
		if (!name) {
			Alert.warning({ message: '群名称不能为空' });
			return;
		}
		const rs: any = await socialChatUpdateGroup(groupIdParsed, { name });
		if (rs?.code === 200) {
			message.success('已保存');
			setTitleOverride(name);
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const saveGroupAnnouncement = async () => {
		if (!groupIdParsed) return;
		const rs: any = await socialChatUpdateGroup(groupIdParsed, {
			announcement: groupAnnouncementEdit.trim(),
		});
		if (rs?.code === 200) {
			message.success('公告已保存');
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const saveGroupAvatar = async () => {
		if (!groupIdParsed) return;
		const rs: any = await socialChatUpdateGroup(groupIdParsed, {
			head_sculpture: groupAvatarEdit.trim(),
		});
		if (rs?.code === 200) {
			message.success('群头像已保存');
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const clearGroupAvatar = async () => {
		if (!groupIdParsed) return;
		const rs: any = await socialChatUpdateGroup(groupIdParsed, { head_sculpture: '' });
		if (rs?.code === 200) {
			message.success('已恢复为成员拼图头像');
			setGroupAvatarEdit('');
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const submitAddMembers = async () => {
		if (!groupIdParsed) return;
		const parts = addMemberIds
			.split(/[,，\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		if (!parts.length) {
			Alert.warning({ message: '请填写要添加的用户 ID' });
			return;
		}
		const rs: any = await socialChatInviteMembers(groupIdParsed, { member_ids: parts });
		if (rs?.code === 200) {
			message.success(rs.message || '邀请已发送，对方同意后即可入群');
			setAddMemberIds('');
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const confirmLeaveGroup = () => {
		if (!groupIdParsed) return;
		Confirm({
			title: '退出群聊',
			content: '确定退出该群吗？若为群主，将自动转让群主给其他成员；仅剩您一人时群将解散。',
			onOk: async () => {
				const rs: any = await socialChatLeaveGroup(groupIdParsed);
				if (rs?.code === 200) {
					message.success(rs.message || '已退出');
					setGroupPanelOpen(false);
					notifyContactsChatSync();
					history.goBack();
				} else if (rs?.message) Alert.error({ message: rs.message });
			},
		});
	};

	const groupMemberListData = useMemo(() => {
		if (!groupDetail) return [];
		return groupDetail.members.map((m) => ({
			id: m.user_id,
			group_role: m.user_id === groupDetail.owner_id ? 'owner' : 'member',
			name: m.real_name || m.username,
			label: (
				<Flex gap={6} align="center" wrap="wrap">
					<Text fontWeight={600}>{m.display_label || m.real_name || m.username}</Text>
					{m.user_id === groupDetail.owner_id ? (
						<Flex
							align="center"
							justify="center"
							px={6}
							py={2}
							borderRadius={6}
							fontSize={11}
							fontWeight={600}
							bg="#e8f0fe"
							color="#1a73e8"
						>
							群主
						</Flex>
					) : (
						<Flex
							align="center"
							justify="center"
							px={6}
							py={2}
							borderRadius={6}
							fontSize={11}
							bg="#f4f4f5"
							color="rgba(0,0,0,0.55)"
						>
							成员
						</Flex>
					)}
					{me && normalizeUuid(m.user_id) === normalizeUuid(me) ? (
						<Flex
							align="center"
							justify="center"
							px={6}
							py={2}
							borderRadius={6}
							fontSize={12}
							fontWeight={500}
							bg="#e8f0fe"
							color="#333"
						>
							我
						</Flex>
					) : null}
				</Flex>
			),
			desc: `@${m.username}`,
			keywords: [m.username, m.real_name || '', m.group_alias || '', m.user_id],
		}));
	}, [groupDetail, me]);

	const saveMyGroupAlias = async () => {
		if (!groupIdParsed) return;
		const rs: any = await socialChatUpdateMyGroupAlias(groupIdParsed, {
			alias: myGroupAliasInput.trim(),
		});
		if (rs?.code === 200) {
			message.success(rs.message || '已保存');
			await loadGroupDetail();
			notifyContactsChatSync();
		} else if (rs?.message) Alert.error({ message: rs.message });
	};

	const confirmTransferOwnership = () => {
		if (!groupIdParsed || !groupDetail?.i_am_owner) return;
		const uid = transferOwnerId.trim();
		if (!uid) {
			Alert.warning({ message: '请填写新群主的用户 UUID' });
			return;
		}
		if (me && normalizeUuid(uid) === normalizeUuid(me)) {
			Alert.warning({ message: '请选择群内其他成员作为新群主' });
			return;
		}
		Confirm({
			title: '转让群主',
			content:
				'转让后您将不再是群主，对方将获得群主权限（修改群名、审批入群申请等）。确定吗？',
			onOk: async () => {
				const rs: any = await socialChatTransferGroupOwner(groupIdParsed, { new_owner_id: uid });
				if (rs?.code === 200) {
					message.success('转让成功');
					setTransferOwnerId('');
					await loadGroupDetail();
					notifyContactsChatSync();
					if (typeof window !== 'undefined') {
						window.dispatchEvent(
							new CustomEvent('doc-space-social-group-invite-sync', { detail: {} }),
						);
					}
				} else if (rs?.message) Alert.error({ message: rs.message });
			},
		});
	};

	const confirmKickMember = (item: { id: string; name?: string; group_role?: string }) => {
		if (!groupIdParsed || !groupDetail?.i_am_owner) return;
		if (item.group_role === 'owner') return;
		if (me && normalizeUuid(item.id) === normalizeUuid(me)) return;
		const label = item.name || item.id;
		Confirm({
			title: '移出群聊',
			content: `确定将「${label}」移出该群吗？`,
			onOk: async () => {
				const rs: any = await socialChatRemoveGroupMember(groupIdParsed, item.id);
				if (rs?.code === 200) {
					message.success(rs.message || '已移出');
					await loadGroupDetail();
					notifyContactsChatSync();
					if (typeof window !== 'undefined') {
						window.dispatchEvent(
							new CustomEvent('doc-space-social-group-invite-sync', { detail: {} }),
						);
					}
				} else if (rs?.message) Alert.error({ message: rs.message });
			},
		});
	};

	/** 顶栏标题：群聊用接口群名；私聊与气泡旁名称一致（备注（用户名）/ 仅用户名） */
	const headerTitle = useMemo(() => {
		if (titleOverride != null) return titleOverride;
		if (peerUserIdPriv) {
			if (privatePeerFriend) {
				const lab = (privatePeerFriend.display_label ?? '').trim();
				if (lab) return lab;
				return (
					(privatePeerFriend.peer.username ?? '').trim() ||
					decodeURIComponent(title || '').trim() ||
					'聊天'
				);
			}
			return decodeURIComponent(title || '').trim() || '聊天';
		}
		return decodeURIComponent(title || '');
	}, [titleOverride, peerUserIdPriv, privatePeerFriend, title]);

	const loadHistory = useCallback(async () => {
		if (!roomId) return;
		const rs: any = await chatHistory({
			room_id: roomId,
			...(workspaceForApi ? { workspace_id: workspaceForApi } : {}),
		});
		if (rs.code === 200 && Array.isArray(rs.data)) {
			const asc = [...rs.data].reverse();
			setLines(asc);
			const last = asc[asc.length - 1];
			await socialChatMarkRead({
				room_id: roomId,
				...(last?.create_time ? { read_at: last.create_time } : {}),
			});
			notifyContactsChatSync();
		}
	}, [roomId, workspaceForApi]);

	useEffect(() => {
		void loadHistory();
	}, [loadHistory]);

	/** 进入群聊页预拉成员信息，便于头像与展示名 */
	useEffect(() => {
		if (groupIdParsed) void loadGroupDetail();
	}, [groupIdParsed, loadGroupDetail]);

	/** 私聊：拉好友列表以拿到对方的备注展示 display_label */
	useEffect(() => {
		if (!peerUserIdPriv || !me) {
			setPrivatePeerFriend(null);
			return;
		}
		let cancelled = false;
		(async () => {
			const rs: any = await socialFriendList({ page: 1, page_size: 100 });
			if (cancelled || rs?.code !== 200 || !Array.isArray(rs.data?.list)) {
				if (!cancelled) setPrivatePeerFriend(null);
				return;
			}
			const row = (rs.data.list as FriendRequestRow[]).find(
				(r) => normalizeUuid(r.peer.id) === normalizeUuid(peerUserIdPriv),
			);
			if (!cancelled) setPrivatePeerFriend(row ?? null);
		})();
		return () => {
			cancelled = true;
		};
	}, [peerUserIdPriv, me]);

	const senderDisplayLine = useCallback(
		(senderId: string): string => {
			const sid = normalizeUuid(senderId);
			const myN = me ? normalizeUuid(me) : '';
			const myLogin = getCurrentUserLoginName();

			if (groupDetail?.members?.length) {
				const mem = groupDetail.members.find((m) => normalizeUuid(m.user_id) === sid);
				if (mem) {
					const lab = (mem.display_label ?? '').trim();
					if (lab) return lab;
					return (mem.username ?? '').trim() || '?';
				}
			}

			if (peerUserIdPriv && sid === normalizeUuid(peerUserIdPriv)) {
				if (privatePeerFriend) {
					const lab = (privatePeerFriend.display_label ?? '').trim();
					if (lab) return lab;
					return (privatePeerFriend.peer.username ?? '').trim() || '?';
				}
				return decodeURIComponent(title || '').trim() || '?';
			}

			if (myN && sid === myN) {
				return myLogin || '?';
			}

			return '?';
		},
		[groupDetail, me, peerUserIdPriv, privatePeerFriend, title],
	);

	const avatarImageUrlForSender = useCallback(
		(senderId: string): string | null => {
			const sid = normalizeUuid(senderId);
			const myN = me ? normalizeUuid(me) : '';
			const myHeadSculpture = getCurrentUserHeadSculpture();

			if (groupDetail?.members?.length) {
				const mem = groupDetail.members.find((m) => normalizeUuid(m.user_id) === sid);
				if (mem?.head_sculpture) return mem.head_sculpture;
			}

			if (myN && sid === myN) {
				if (myHeadSculpture) return myHeadSculpture;
				return null;
			}

			if (peerUserIdPriv && sid === normalizeUuid(peerUserIdPriv)) {
				if (privatePeerFriend?.peer?.head_sculpture) return privatePeerFriend.peer.head_sculpture;
				return null;
			}

			return null;
		},
		[groupDetail, me, peerUserIdPriv, privatePeerFriend],
	);

	useEffect(() => {
		if (!roomId || !me) return;
		const token = localStorage.getItem('token') || '';
		const ws = new WebSocket(`${wsContextPath}/api/ws?token=${token}`);
		socket.current = ws;
		ws.onmessage = (ev) => {
			try {
				const raw = JSON.parse(ev.data as string);
				if (raw.type !== 'chat_message') return;
				let payload = raw.payload;
				if (typeof payload === 'string') {
					payload = JSON.parse(payload);
				}
				if (payload?.room_id !== roomId) return;
				setLines((prev) => {
					if (prev.some((p) => p.id === payload.id)) return prev;
					return [
						...prev,
						{
							id: payload.id,
							sender_id: payload.sender_id,
							content: payload.content,
							msg_type: payload.msg_type,
							create_time: payload.create_time,
						},
					];
				});
				if (payload?.create_time) {
					void socialChatMarkRead({ room_id: roomId, read_at: payload.create_time });
				}
			} catch {
				/* ignore */
			}
		};
		return () => {
			ws.close();
			socket.current = null;
		};
	}, [roomId, me]);

	const ensureChatWs = useCallback((): WebSocket | null => {
		if (!isPlatformChatRoom(roomId) && !workspaceForApi) {
			message.warning('无法解析会话工作区，请从通讯录重新进入或加入工作区后再试');
			return null;
		}
		const ws = socket.current;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			message.error('连接未就绪，请稍后重试');
			return null;
		}
		return ws;
	}, [roomId, workspaceForApi]);

	/** payload 为纯文本字符串或 JSON 对象（msg_type: text | image | video） */
	const sendChatPayload = useCallback(
		(payload: string | Record<string, unknown>) => {
			const ws = ensureChatWs();
			if (!ws) return;
			const envelope: Record<string, unknown> = {
				type: 'chat',
				room_id: roomId,
				payload,
			};
			if (!isPlatformChatRoom(roomId)) {
				envelope.workspace_id = workspaceForApi;
			}
			ws.send(JSON.stringify(envelope));
			notifyContactsChatSync();
			window.setTimeout(() => void loadHistory(), 500);
		},
		[ensureChatWs, roomId, workspaceForApi],
	);

	const send = () => {
		const t = input.trim();
		if (!t) return;
		sendChatPayload(t);
		setInput('');
	};

	const uploadChatFileAndSend = async (file: File, msgType: 'image' | 'video') => {
		try {
			const rs: any = await socialChatUploadAttachment(file);
			if (rs?.code !== 200 || !rs.data?.path) {
				Alert.error({ message: rs?.message || '上传失败' });
				return;
			}
			const path = rs.data.path as string;
			sendChatPayload({ msg_type: msgType, url: path });
		} catch {
			Alert.error({ message: '上传失败' });
		}
	};

	if (!roomId) {
		return (
			<View p={24}>
				<Text>缺少 room_id 参数</Text>
				<View style={{ marginTop: 12 }}>
					<Button variant="soft" onClick={() => history.goBack()}>
						返回
					</Button>
				</View>
			</View>
		);
	}

	return (
		<View w="100%" p={16} style={{ boxSizing: 'border-box', maxWidth: 720, margin: '0 auto' }}>
			<Flex justify="space-between" align="center" mb={12} gap={12}>
				<Flex align="center" gap={10} style={{ minWidth: 0, flex: 1 }}>
					{groupIdParsed ? (
						<GroupCompositeAvatar
							groupAvatar={groupDetail?.head_sculpture ?? groupDetail?.avatar}
							members={
								groupDetail?.members?.map((m) => ({
									head_sculpture: m.head_sculpture,
									username: m.username,
									display_label: m.display_label,
								})) ?? []
							}
							size={44}
							loading={groupLoading && !groupDetail}
							fallbackGlyph={headerTitle}
						/>
					) : null}
					<Text
						fontWeight={700}
						fontSize={18}
						m={0}
						ellipsis
						style={{ flex: 1, minWidth: 0 }}
					>
						{headerTitle}
					</Text>
				</Flex>
				<Flex gap={8} align="center" style={{ flexShrink: 0 }}>
					{groupIdParsed ? (
						<Button variant="soft" onClick={() => openGroupPanel()}>
							群设置
						</Button>
					) : null}
					<Button variant="soft" onClick={() => history.goBack()}>
						返回
					</Button>
				</Flex>
			</Flex>
			{groupIdParsed && (groupDetail?.announcement ?? '').trim() ? (
				<View
					mb={12}
					px={12}
					py={10}
					style={{
						background: 'rgba(0,0,0,0.04)',
						borderRadius: 8,
						borderLeft: '3px solid rgba(124, 58, 237, 0.45)',
					}}
				>
					<Text fontSize={12} color="rgba(0,0,0,0.5)" style={{ marginBottom: 6 }}>
						群公告
					</Text>
					<Text
						fontSize={13}
						style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
					>
						{groupDetail!.announcement}
					</Text>
				</View>
			) : null}
			<View
				style={{
					border: '1px solid var(--border-color)',
					borderRadius: 8,
					padding: 12,
					minHeight: 360,
					maxHeight: '56vh',
					overflowY: 'auto',
				}}
			>
				{lines.map((m) => {
					const mine = !!(me && normalizeUuid(m.sender_id) === normalizeUuid(me));
					const avatarUrl = avatarImageUrlForSender(m.sender_id);
					const nameLine = senderDisplayLine(m.sender_id);
					const { avatarUrl: resolvedAvatarSrc } = resolveCollaborationAvatarFields(
						(avatarUrl ?? '').trim(),
					);
					const useAvatarImg = !!resolvedAvatarSrc;
					const avatarIcon = useAvatarImg ? (
						<img src={resolvedAvatarSrc} alt="" />
					) : (
						<span
							style={{
								fontSize: 11,
								lineHeight: 1.15,
								padding: '0 4px',
								textAlign: 'center',
								maxWidth: '100%',
								minWidth: 0,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								fontWeight: 500,
							}}
						>
							{nameLine}
						</span>
					);
					return (
						<Flex
							key={m.id}
							justify={mine ? 'flex-end' : 'flex-start'}
							align="flex-start"
							gap={8}
							mb={10}
						>
							{!mine ? (
								<Avatar
									size={36}
									radius="full"
									bg="rgba(0,0,0,0.08)"
									color="rgba(0,0,0,0.78)"
									icon={avatarIcon}
								/>
							) : null}
							<Flex
								direction="column"
								align={mine ? 'flex-end' : 'flex-start'}
								style={{ maxWidth: 'calc(78% - 44px)', minWidth: 0 }}
							>
								<Text
									fontSize={12}
									color="rgba(0,0,0,0.55)"
									style={{
										marginBottom: 4,
										wordBreak: 'break-word',
										textAlign: mine ? 'right' : 'left',
										alignSelf: mine ? 'flex-end' : 'flex-start',
									}}
								>
									{nameLine}
								</Text>
								<View
									px={12}
									py={8}
									style={{
										width: '100%',
										maxWidth: '100%',
										borderRadius: 12,
										background: mine ? 'rgba(124, 58, 237, 0.12)' : 'rgba(0,0,0,0.06)',
									}}
								>
									<ChatMessageBody content={m.content} />
									<Text fontSize={11} color="rgba(0,0,0,0.45)" style={{ marginTop: 4 }}>
										{formatMsgTime(m.create_time)}
									</Text>
								</View>
							</Flex>
							{mine ? (
								<Avatar
									size={36}
									radius="full"
									bg="rgba(124, 58, 237, 0.22)"
									color="#5b21b6"
									icon={avatarIcon}
								/>
							) : null}
						</Flex>
					);
				})}
			</View>
			<input
				ref={imageFileRef}
				type="file"
				accept="image/jpeg,image/png,image/gif,image/webp"
				style={{ display: 'none' }}
				onChange={(e) => {
					const f = e.target.files?.[0];
					e.target.value = '';
					if (f) void uploadChatFileAndSend(f, 'image');
				}}
			/>
			<input
				ref={videoFileRef}
				type="file"
				accept="video/mp4,video/quicktime,video/webm"
				style={{ display: 'none' }}
				onChange={(e) => {
					const f = e.target.files?.[0];
					e.target.value = '';
					if (f) void uploadChatFileAndSend(f, 'video');
				}}
			/>
			<Flex gap={8} mt={12} align="flex-end" wrap="wrap">
				<Flex gap={6} align="center" style={{ flexShrink: 0 }}>
					<Popuover
						items={<Emoji onChange={(p: { value?: string }) => setInput((prev) => prev + (p?.value ?? ''))} />}
						style={{ width: 380 }}
					>
						<Button variant="soft" type="button">
							表情
						</Button>
					</Popuover>
					<Button variant="soft" type="button" onClick={() => imageFileRef.current?.click()}>
						图片
					</Button>
					<Button variant="soft" type="button" onClick={() => videoFileRef.current?.click()}>
						视频
					</Button>
				</Flex>
				<TextArea
					rows={2}
					value={input}
					onChange={(v: string) => setInput(v)}
					placeholder="输入消息"
					style={{ flex: 1, minWidth: `200px`, resize: 'vertical' }}
				/>
				<Button color="black" onClick={() => send()}>
					发送
				</Button>
			</Flex>

			{groupIdParsed ? (
				<Dialog
					open={groupPanelOpen}
					title="群设置"
					center
					onCancel={() => setGroupPanelOpen(false)}
					style={{
						width: '620px'
					}}
				>
					<View>
						{groupLoading ? (
							<View style={{ paddingLeft: 20, paddingRight: 20 }}>
								<Text color="rgba(0,0,0,0.45)">加载中…</Text>
							</View>
						) : groupDetail ? (
							<Flex direction="column" gap={12}>
								<Flex justify="center" py={8}>
									<GroupCompositeAvatar
										groupAvatar={groupAvatarEdit}
										members={groupDetail.members.map((m) => ({
											head_sculpture: m.head_sculpture,
											username: m.username,
											display_label: m.display_label,
										}))}
										size={56}
										fallbackGlyph={groupDetail.name}
									/>
								</Flex>
								<View style={{ paddingLeft: 20, paddingRight: 20 }}>
									<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 8 }}>
										群头像{groupDetail.i_am_owner ? '' : '（仅群主可更换）'}
									</Text>
									{groupDetail.i_am_owner ? (
										<Flex gap={16} align="flex-start" wrap="wrap">
											<AvatarPicker
												size={72}
												value={groupAvatarEdit}
												onChange={(v: string) => setGroupAvatarEdit(v)}
												label={groupDetail.name}
											/>
											<Flex direction="column" gap={8}>
												<Button color="black" onClick={() => void saveGroupAvatar()}>
													保存群头像
												</Button>
												<Button variant="soft" onClick={() => void clearGroupAvatar()}>
													恢复为成员拼图
												</Button>
											</Flex>
										</Flex>
									) : (
										<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ margin: 0 }}>
											群主设置自定义头像后将覆盖上方成员拼图。
										</Text>
									)}
								</View>
								<View style={{ paddingLeft: 20, paddingRight: 20 }}>
									<Flex direction="column" gap={16}>
										<View>
											<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 6 }}>
												群公告{groupDetail.i_am_owner ? '' : '（仅群主可编辑）'}
											</Text>
											<TextArea
												rows={5}
												value={groupAnnouncementEdit}
												onChange={(v: string) => setGroupAnnouncementEdit(v)}
												disabled={!groupDetail.i_am_owner}
												placeholder={
													groupDetail.i_am_owner
														? '填写群公告，全员可见'
														: groupAnnouncementEdit.trim()
															? ''
															: '暂无群公告'
												}
												style={{ resize: 'vertical' }}
											/>
											{groupDetail.i_am_owner ? (
												<Button
													color="black"
													style={{ marginTop: 10 }}
													onClick={() => void saveGroupAnnouncement()}
												>
													保存公告
												</Button>
											) : null}
										</View>
										<View>
											<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 6 }}>
												群名称{groupDetail.i_am_owner ? '' : '（仅群主可修改）'}
											</Text>
											<Input
												value={groupNameEdit}
												onChange={(v: string) => setGroupNameEdit(v)}
												disabled={!groupDetail.i_am_owner}
												placeholder="群名称"
											/>
											{groupDetail.i_am_owner ? (
												<Button
													color="black"
													style={{ marginTop: 10 }}
													onClick={() => void saveGroupName()}
												>
													保存名称
												</Button>
											) : null}
										</View>
										<View>
											<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 6 }}>
												我在本群的显示名称（有别名时展示为「别名（用户名）」，留空则只显示用户名）
											</Text>
											<Input
												value={myGroupAliasInput}
												onChange={(v: string) => setMyGroupAliasInput(v)}
												placeholder="可选"
											/>
											<Button
												variant="soft"
												style={{ marginTop: 8 }}
												onClick={() => void saveMyGroupAlias()}
											>
												保存我的显示名称
											</Button>
										</View>
										<View>
											<Text fontWeight={600} style={{ marginBottom: 10 }}>
												成员（{groupDetail.members.length}）
											</Text>
											<View
												style={{
													border: '1px solid var(--border-color)',
													borderRadius: 8,
													overflow: 'hidden',
													background: '#fafafa',
												}}
											>
												<MemberList
													searchPlaceholder="搜索成员..."
													data={groupMemberListData as any[]}
													selectedKeys={[]}
													onChange={() => { }}
													order={{ key: 'group_role', value: ['owner', 'member'] }}
													renderGroup={(v) => (
														<Flex
															px={10}
															py={6}
															fontSize={12}
															color="gray"
															fontWeight="bold"
															bg="#f9f8f7"
															style={{
																position: 'sticky',
																top: 0,
																zIndex: 10,
																borderBottom: '1px solid var(--border-color)',
															}}
														>
															<Text style={{ margin: 0 }}>
																{v.group === 'owner' ? '群主' : '成员'}
															</Text>
															<Text pl={10} style={{ margin: 0 }}>
																{v.items.length} 人
															</Text>
														</Flex>
													)}
													renderItem={(item: any) => {
														if (!groupDetail.i_am_owner) return null;
														if (item.group_role === 'owner') return null;
														if (me && normalizeUuid(item.id) === normalizeUuid(me)) return null;
														return (
															<Flex py={10} gap={6}>
																<Button
																	color="red"
																	variant="outline"
																	style={{ fontSize: 12 }}
																	onClick={(e: React.MouseEvent) => {
																		e.preventDefault();
																		e.stopPropagation();
																		confirmKickMember(item);
																	}}
																>
																	移除
																</Button>
															</Flex>
														);
													}}
													style={{ maxHeight: 300 }}
													contentStyle={{ maxHeight: 240, overflowY: 'auto' }}
												/>
											</View>
										</View>
										{groupDetail.i_am_owner ? (
											<View>
												<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 6 }}>
													转让群主（填写群内其他成员的 UUID）
												</Text>
												<Input
													value={transferOwnerId}
													onChange={(v: string) => setTransferOwnerId(v)}
													placeholder="新群主用户 UUID"
												/>
												<Button
													variant="soft"
													style={{ marginTop: 8 }}
													onClick={() => confirmTransferOwnership()}
												>
													转让群主
												</Button>
											</View>
										) : null}
										<View>
											<Text fontSize={12} color="rgba(0,0,0,0.45)" style={{ marginBottom: 6 }}>
												邀请成员（用户 UUID，多个逗号或空格分隔）
											</Text>
											<TextArea
												rows={2}
												value={addMemberIds}
												onChange={(v: string) => setAddMemberIds(v)}
												placeholder="例如：uuid1, uuid2"
												style={{ resize: 'vertical' }}
											/>
											<Button style={{ marginTop: 8 }} onClick={() => void submitAddMembers()}>
												发送邀请
											</Button>
										</View>
									</Flex>
								</View>
								<Flex justify="center" w="100%">
									<Button variant="soft" onClick={() => confirmLeaveGroup()}>
										退出群聊
									</Button>
								</Flex>
							</Flex>
						) : (
							<View style={{ paddingLeft: 20, paddingRight: 20 }}>
								<Text color="rgba(0,0,0,0.45)">无法加载群信息</Text>
							</View>
						)}
					</View>
				</Dialog>
			) : null}
		</View>
	);
};

function formatMsgTime(iso: string) {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function normalizeUuid(v: string) {
	return String(v).replace(/-/g, '').toLowerCase();
}

export default ChatPage;
