import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Avatar,
    Flex,
    View,
    Text,
    Button,
    message,
} from '@carvy/ui';
import {
    listNotification,
    acceptInvite,
    rejectInvite,
    getNotificationUnreadCount,
    markNotificationRead,
    approveJoinRequest,
    rejectJoinRequest,
    socialFriendAccept,
    socialFriendReject,
} from '@/api';
import { InviteStatus } from '@/constants';
import { CLASSNAME } from '@/config';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import { setUnreadCount } from '@/store/features/notification';
import type { AppDispatch, RootState } from '@/store';
import './index.less';

type ReceivedMsgListProps = {
    menus?: Array<any>;
    collapsed?: boolean;
    isMobile?: boolean;
    pathname?: string;
    params?: any;
}

const LIST_QUERY = { offset: 0, limit: 20 };

export const ReceivedMsgList: React.FC<ReceivedMsgListProps> = props => {
    const dispatch = useDispatch<AppDispatch>();
    /** WebSocket 推送写入 Redux，长度增加表示收到新全局消息 */
    const inboundListLen = useSelector((s: RootState) => s.notification.list.length);
    const prevInboundLenRef = useRef<number | null>(null);
    const [data = [], setData] = useState<any[]>([]);
    const [acceptLoading, setAcceptLoading] = useState(false);
    const [rejectLoading, setRejectLoading] = useState(false);
    const [joinApproveLoading, setJoinApproveLoading] = useState(false);
    const [joinRejectLoading, setJoinRejectLoading] = useState(false);
    const [friendAcceptLoading, setFriendAcceptLoading] = useState(false);
    const [friendRejectLoading, setFriendRejectLoading] = useState(false);

    const syncUnreadFromServer = useCallback(async () => {
        const rs = await getNotificationUnreadCount();
        if (rs.code === 200 && typeof rs.data?.unread_count === 'number') {
            dispatch(setUnreadCount(rs.data.unread_count));
        }
    }, [dispatch]);

    const reqListNotification = useCallback(async (params?: any) => {
        const rs = await listNotification(params ?? LIST_QUERY);
        if (rs.code === 200) {
            setData(rs.data.list || []);
            void syncUnreadFromServer();
        } else {
            setData([]);
        }
    }, [syncUnreadFromServer]);

    useEffect(() => {
        reqListNotification(LIST_QUERY);
    }, [reqListNotification]);

    /** 收到 WS 推送的新通知时自动拉取列表，与全局状态对齐 */
    useEffect(() => {
        const prev = prevInboundLenRef.current;
        prevInboundLenRef.current = inboundListLen;
        if (prev !== null && inboundListLen > prev) {
            void reqListNotification(LIST_QUERY);
        }
    }, [inboundListLen, reqListNotification]);

    const notificationId = (item: any) => String(item?.id ?? item?.key ?? '');

    const handleMarkRowRead = async (item: any) => {
        if (item.is_read) return;
        const id = notificationId(item);
        if (!id) return;
        const rs = await markNotificationRead(id);
        if (rs.code === 200) {
            setData((prev) =>
                prev.map((row: any) =>
                    notificationId(row) === id ? { ...row, is_read: true } : row,
                ),
            );
            void syncUnreadFromServer();
        }
    };

    const reqAcceptInvite = async (params?: any) => {
        setAcceptLoading(true);
        const rs = await acceptInvite(params);
        setAcceptLoading(false);
        if (rs.code === 200) {
            message.success('已同意邀请');
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    }

    const reqRejectInvite = async (params?: any) => {
        setRejectLoading(true);
        const rs = await rejectInvite(params);
        setRejectLoading(false);
        if (rs.code === 200) {
            message.success('已拒绝邀请');
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    };

    const reqApproveJoin = async (joinRequestId: string) => {
        setJoinApproveLoading(true);
        const rs = await approveJoinRequest(joinRequestId);
        setJoinApproveLoading(false);
        if (rs.code === 200) {
            if (rs.message) {
                message.success(rs.message);
            }
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    };

    const reqRejectJoin = async (joinRequestId: string) => {
        setJoinRejectLoading(true);
        const rs = await rejectJoinRequest(joinRequestId);
        setJoinRejectLoading(false);
        if (rs.code === 200) {
            if (rs.message) {
                message.success(rs.message);
            }
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    };

    const reqFriendAcceptRow = async (friendRelationId: string) => {
        setFriendAcceptLoading(true);
        const rs: any = await socialFriendAccept(friendRelationId);
        setFriendAcceptLoading(false);
        if (rs.code === 200) {
            if (rs.message) message.success(rs.message);
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    };

    const reqFriendRejectRow = async (friendRelationId: string) => {
        setFriendRejectLoading(true);
        const rs: any = await socialFriendReject(friendRelationId);
        setFriendRejectLoading(false);
        if (rs.code === 200) {
            if (rs.message) message.success(rs.message);
            reqListNotification();
        } else {
            message.error(rs.message || '操作失败');
        }
    };

    const renderItemActions = (msg: any) => {
        const msgType = msg.msg_type || msg.type;
        if (msgType === 'friend_request') {
            const st = msg.friend_request_status;
            const fid = msg.related_id != null ? String(msg.related_id) : '';
            if (st === null || st === undefined) {
                return (
                    <Text as="span" fontSize={12} bg="#f0f5ff" px={10} py={6} borderRadius={6} type="secondary">
                        已处理
                    </Text>
                );
            }
            if (st === 1) {
                return (
                    <Text as="span" fontSize={12} bg="#f0f5ff" px={10} py={6} borderRadius={6} type="success">
                        已同意
                    </Text>
                );
            }
            if (st === 2) {
                return (
                    <Text as="span" fontSize={12} bg="#f0f5ff" px={10} py={6} borderRadius={6} type="danger">
                        已拒绝
                    </Text>
                );
            }
            if (st === 3) {
                return (
                    <Text as="span" fontSize={12} bg="#f0f5ff" px={10} py={6} borderRadius={6} type="secondary">
                        已撤回
                    </Text>
                );
            }
            if (st !== 0 || !fid) return null;
            return (
                <>
                    <Button
                        color="black"
                        variant="outline"
                        loading={friendAcceptLoading}
                        onClick={(e) => {
                            e.stopPropagation();
                            void reqFriendAcceptRow(fid);
                        }}
                    >
                        同意
                    </Button>
                    <Button
                        color="red"
                        variant="outline"
                        loading={friendRejectLoading}
                        onClick={(e) => {
                            e.stopPropagation();
                            void reqFriendRejectRow(fid);
                        }}
                    >
                        拒绝
                    </Button>
                </>
            );
        }
        if (msgType === 'join_request') {
            if (msg.is_read) {
                return <Text
                            as="span"
                            fontSize={12}
                            bg="#f0f5ff"
                            px={10}
                            py={6}
                            borderRadius={6}
                            type="secondary"
                        >
                            已处理
                        </Text>;
            }
            const jid = msg.related_id != null ? String(msg.related_id) : '';
            if (!jid) return null;
            return (
                <>
                    <Button
                        color="black"
                        variant="outline"
                        loading={joinApproveLoading}
                        onClick={() => reqApproveJoin(jid)}
                    >
                        通过
                    </Button>
                    <Button
                        color="red"
                        variant="outline"
                        loading={joinRejectLoading}
                        onClick={() => reqRejectJoin(jid)}
                    >
                        拒绝
                    </Button>
                </>
            );
        }
        // 工作区邀请 invite、库邀请 space_invite：均需同意/拒绝（后端 InviteService.Accept 按 sys_invite.scope_type 分支）
        const isInviteLike =
            msgType === 'invite' || msgType === 'space_invite';
        if (!isInviteLike) return null;

        // 2. 根据 invite_status 判定状态
        switch (msg.invite_status) {
            case InviteStatus.Pending:
                return (
                    <>
                        <Button color="black" variant="outline" loading={acceptLoading} onClick={() => reqAcceptInvite({ invite_id: msg.related_id })}>
                            同意
                        </Button>
                        <Button color="red" variant="outline" loading={rejectLoading} onClick={() => reqRejectInvite({ invite_id: msg.related_id })}>
                            拒绝
                        </Button>
                    </>
                );

            case InviteStatus.Accepted:
                return <Text
                            as="span"
                            fontSize={12}
                            bg="#f0f5ff"
                            px={10}
                            py={6}
                            borderRadius={6}
                            type="success"
                        >
                            已同意
                        </Text>;

            case InviteStatus.Rejected:
                return <Text
                            as="span"
                            fontSize={12}
                            bg="#f0f5ff"
                            px={10}
                            py={6}
                            borderRadius={6}
                            type="danger"
                        >
                            已拒绝
                        </Text>;

            case InviteStatus.Expired:
                return <Text
                            as="span"
                            fontSize={12}
                            bg="#f0f5ff"
                            px={10}
                            py={6}
                            borderRadius={6}
                            type="secondary"
                        >
                            邀请已过期
                        </Text>;

            default:
                return null;
        }
    };

    return (
        <div className={`${CLASSNAME}-received-msg-list`}>
            <div className={`${CLASSNAME}-received-msg-list-header`}>
                <Text as="div" fontSize={15} fontWeight={600} color="rgba(0,0,0,0.88)">
                    我的接收消息
                </Text>
            </div>
            <div className={`${CLASSNAME}-received-msg-list-center`}>
                <ul className={`${CLASSNAME}-received-msg-list-items`}>
                    {
                        data.map(item => {
                            const unread = !item.is_read;
                            const rowKey = notificationId(item);
                            return (
                                <li
                                    key={rowKey || item.title}
                                    // className={`${CLASSNAME}-received-msg-list-item${unread ? ` ${CLASSNAME}-received-msg-list-item--unread` : ''}`}
                                    className={`${CLASSNAME}-received-msg-list-item`}
                                    onClick={() => handleMarkRowRead(item)}
                                >
                                    <Flex align="center" gap={4} mb={4} justify="space-between">
                                        <Flex gap={3} flex={1}>
                                            <Avatar
                                                size={32}
                                                radius="full"
                                                number={unread}
                                                numberSize="small"
                                                title={item?.sender_name}
                                                icon={(() => {
                                                    const src = resolveMediaSrcForImg(item?.sender_avatar);
                                                    return src ? <img src={src} alt="" /> : item?.sender_avatar;
                                                })()}
                                            />
                                            <View px={6} flex={1} style={{ minWidth: 0 }}>
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Text as="div" fontSize={14} fontWeight="bold">
                                                        {item?.title}
                                                    </Text>
                                                </Flex>
                                                <Text as="div" fontSize={14} color="gray">
                                                    {item.content}
                                                </Text>
                                            </View>
                                        </Flex>
                                        <Flex
                                            align="center"
                                            gap={4}
                                            w={150}
                                            justify="flex-end"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            { renderItemActions(item) }
                                        </Flex>
                                    </Flex>
                                </li>
                            )
                        })
                    }
                </ul>

            </div>
            {/* <div className={`${CLASSNAME}-received-msg-list-footer`}>查看更多</div> */}
        </div>
    );
}