import React, { useCallback, useEffect, useState } from 'react';
import { Avatar, Flex, View, Text } from '@carvy/ui';
import { listSentNotifications } from '@/api';
import { InviteStatus } from '@/constants';
import { CLASSNAME } from '@/config';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import './index.less';

const LIST_QUERY = { pageNum: 1, pageSize: 50 };

const notificationId = (item: any) => String(item?.id ?? item?.receiver_id ?? '');

/** 已发送列表右侧状态文案（与接收消息列表布局一致，无操作按钮） */
const sentStatusLabel = (item: any) => {
    if (item.msg_type === 'join_request' && typeof item.join_request_status === 'number') {
        if (item.join_request_status === 1) return <Text
            as="span"
            fontSize={12}
            bg="#f0f5ff"
            px={10}
            py={6}
            borderRadius={6}
            type="success"
        >已通过</Text>;
        if (item.join_request_status === 2) return <Text
            as="span"
            fontSize={12}
            bg="#f0f5ff"
            px={10}
            py={6}
            borderRadius={6}
            type="danger"
        >已拒绝</Text>;
        return '待处理';
    }
    if (item.msg_type === 'invite' || item.msg_type === 'space_invite') {
        switch (item.invite_status) {
            case InviteStatus.Accepted:
                return <Text
                    as="span"
                    fontSize={12}
                    bg="#f0f5ff"
                    px={10}
                    py={6}
                    borderRadius={6}
                    type="success"
                >对方已同意</Text>;
            case InviteStatus.Rejected:
                return <Text
                    as="span"
                    fontSize={12}
                    bg="#f0f5ff"
                    px={10}
                    py={6}
                    borderRadius={6}
                    type="danger"
                >对方已拒绝</Text>;
            case InviteStatus.Expired:
                return <Text
                    as="span"
                    fontSize={12}
                    bg="#f0f5ff"
                    px={10}
                    py={6}
                    borderRadius={6}
                    type="secondary"
                >已过期</Text>;
            case InviteStatus.Pending:
                return <Text
                    as="span"
                    fontSize={12}
                    bg="#f0f5ff"
                    px={10}
                    py={6}
                    borderRadius={6}
                    type="danger"
                >待对方处理</Text>;
            default:
        }
    }
    return <Text
        as="span"
        fontSize={12}
        bg="#f0f5ff"
        px={10}
        py={6}
        borderRadius={6}
        type="secondary"
    >已发送</Text>;
};

export const SentMsgList: React.FC = () => {
    const [data, setData] = useState<any[]>([]);

    const reqList = useCallback(async () => {
        const rs = await listSentNotifications(LIST_QUERY);
        if (rs.code === 200) {
            setData(rs.data?.list || []);
        } else {
            setData([]);
        }
    }, []);

    useEffect(() => {
        void reqList();
    }, [reqList]);

    return (
        <div className={`${CLASSNAME}-sent-msg-list`}>
            <div className={`${CLASSNAME}-sent-msg-list-header`}>
                <Text as="div" fontSize={15} fontWeight={600} color="rgba(0,0,0,0.88)">
                    我的已发送消息
                </Text>
            </div>
            <div className={`${CLASSNAME}-sent-msg-list-center`}>
                <ul className={`${CLASSNAME}-sent-msg-list-items`}>
                    {data.length === 0 ? (
                        <li className={`${CLASSNAME}-sent-msg-list-item`} style={{ cursor: 'default' }}>
                            <Text fontSize={14} color="gray">
                                暂无已发送记录
                            </Text>
                        </li>
                    ) : (
                        data.map((item) => {
                            const rowKey = notificationId(item);
                            return (
                                <li
                                    key={rowKey || item.title}
                                    className={`${CLASSNAME}-sent-msg-list-item`}
                                    style={{ cursor: 'default' }}
                                >
                                    <Flex align="center" gap={4} mb={4} justify="space-between">
                                        <Flex gap={3} flex={1}>
                                            <Avatar
                                                size={32}
                                                radius="full"
                                                // number={unread}
                                                // numberSize="small"
                                                title={item?.sender_name}
                                                icon={(() => {
                                                    const src = resolveMediaSrcForImg(item?.sender_avatar);
                                                    return src ? (
                                                        <img src={src} alt="" />
                                                    ) : (
                                                        item?.sender_avatar
                                                    );
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
                                        <Flex align="center" gap={4} w={150} justify="flex-end">
                                            {sentStatusLabel(item)}
                                        </Flex>
                                    </Flex>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>
        </div>
    );
};
