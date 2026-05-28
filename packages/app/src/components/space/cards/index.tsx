import { useMemo, useState } from 'react';
import {
    Flex,
    View,
    Text,
    Card,
    Popuover, 
    type PopuoverChangeEventProps,
    Menu, 
    IconWrapper,
    AvatarGroup,
    Avatar,
    Dialog,
    Confirm,
    message
} from '@carvy/ui';
import { SpaceSettings } from '../setting';
import { formatDateTime } from '@/utils/common';
import { deleteSpace, leaveSpace } from '@/api';
import { SpaceJoinRequestDialog } from '@/components/joinSpaceDialog';
import { SpaceAccessRenderConfig } from '@/constants';
import { canDeleteSpace, isSpaceRole } from '@/permissions';
import { CLASSNAME } from '@/config';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import './index.less';

export type spaceCardProps = {
    data?: any;
    onSuccess?: () => void;
};

export const SpaceCard: React.FC<spaceCardProps> = (props) => {
    const [popuoverOpen, setPopuoverOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const { 
        data = {}, 
        onSuccess 
    } = props;

    const spaceIconSrc = resolveMediaSrcForImg(data.icon);
    const canRequestJoin = !!(data?.invite_shell_only || data?.role === 'none');
    const spaceRoleForDelete = isSpaceRole(data?.role) ? data.role : undefined;
    const showDeleteSpace = canDeleteSpace(spaceRoleForDelete);

    const menuItems = useMemo(() => {
        const items: any[] = [];
        if (canRequestJoin) {
            items.push({
                key: 'requestJoin',
                icon: (
                    <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                ),
                label: '申请加入',
            });
            items.push({ type: 'line' });
        }
        items.push(
            {
                key: 'spaceSetting',
                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M512 341.014q-70 0-120.5 50.5t-50.5 120.5 50.5 120.5 120.5 50.5 120.5-50.5 50.5-120.5-50.5-120.5-120.5-50.5m0 256q-35 0-60-25t-25-60 25-60 60-25 60 25 25 60-25 60-60 25m354 60q3-6 10-11.5t20-5.5q54 0 91-37t37-91-37-91-91-37h-9q-6 0-12-3t-9-10q0-3-.5-4t-3.5-4q-3-7-2-16t10-18q39-39 39-91.5t-39-88.5q-19-19-41.5-28.5t-47.5-9.5q-26 0-50.5 9.5t-43.5 28.5q-6 7-15 7.5t-15-2.5q-6 0-11.5-8t-5.5-18q0-54-37-91t-91-37-91 37-37 91v9q0 6-3 12t-10 9q-3 0-4 .5t-4 3.5q-7 3-16 .5t-18-8.5q-39-39-91.5-39t-88.5 39q-38 38-37.5 91.5t42.5 91.5q6 6 6.5 15.5t-2.5 18.5q-3 7-11.5 12t-18.5 5q-54 0-91 37t-37 91q0 55 37 91.5t91 36.5h9q9 0 15.5 5.5t9.5 11.5q3 7 2 16t-10 18q-20 20-29.5 42t-9.5 48 9.5 48 29.5 42q38 38 91.5 37.5t91.5-42.5q6-6 15.5-6.5t18.5 2.5q10 3 13.5 10t3.5 20q0 54 37 91t91 37q55 0 91.5-37t36.5-91v-9q0-9 5.5-15.5t11.5-9.5q7-3 16-2t18 10q39 39 91.5 39t88.5-39q38-38 37.5-91.5t-42.5-91.5q-3-6-5-15t1-15m-77-34q-12 32-6 65.5t32 62.5q6 6 9.5 13t3.5 17q0 9-3.5 16t-9.5 14q-6 6-13 9t-17 3-17-3.5-17-13.5q-26-25-59-31t-65 10q-32 13-50 41.5t-18 60.5v9q0 19-12 31t-31 12-30.5-12-11.5-31v-4q0-35-20.5-62.5t-52.5-40.5q-10-6-22-7t-25-1q-22 0-43.5 9t-37.5 25q-13 13-30 13t-30-13q-6-6-9-13t-3-17 3.5-17 13.5-17q25-26 31-59t-10-65q-13-32-41.5-50t-60.5-18h-9q-19 0-31-12t-12-31 12-30.5 31-11.5h4q35 0 62.5-20.5t40.5-52.5q12-32 6-65.5t-32-62.5q-13-13-13-30t13-30q13-12 30.5-11.5t33.5 16.5q22 22 54 28.5t61-3.5q3 0 6.5-.5t6.5-3.5q32-13 50-41.5t18-60.5v-9q0-19 12-31t31-12 31 12.5 12 34.5q0 35 18 62.5t50 40.5q32 12 65.5 6t62.5-32q6-6 13-9.5t17-3.5q9 0 16 3.5t14 9.5q12 13 11.5 30.5t-16.5 33.5q-22 22-28.5 54t3.5 61q0 3 .5 6.5t3.5 6.5q13 32 41.5 50t60.5 18h9q19 0 31 12t12 31-12.5 31-34.5 12q-32 0-61 18t-42 50"/></svg>,
                label: '文档库设置',
            },
            {
                key: 'leaveSpace',
                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M384 853.014H213q-19 0-30.5-11.5t-11.5-30.5v-598q0-19 11.5-30.5t30.5-11.5h171q19 0 31-12t12-31-12-31-31-12H213q-54 0-91 37t-37 91v598q0 54 37 91t91 37h171q19 0 31-12t12-31-12-31-31-12m550-324q4-6 4-15t-4-19q-3-3-4-6.5t-4-6.5l-213-213q-13-13-30-13t-30 13-13 30 13 30l141 140H384q-19 0-31 12t-12 31 12 31 31 12h410l-141 140q-13 13-13 30t13 30q6 7 14.5 10t15.5 3q6 0 14.5-3t15.5-10l213-213q3-3 5.5-6.5t2.5-6.5" /></svg>,
                label: '退出文档库',
            },
        );
        if (showDeleteSpace) {
            items.push({
                key: 'delSpace',
                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="#e56458"><path d="M896 213.014H725v-42q0-55-36.5-91.5t-91.5-36.5H427q-55 0-91.5 36.5t-36.5 91.5v42H128q-19 0-31 12t-12 31 12 31 31 12h43v554q0 55 36.5 91.5t91.5 36.5h426q55 0 91.5-36.5t36.5-91.5v-554h43q19 0 31-12t12-31-12-31-31-12m-512-42q0-20 11.5-31.5t31.5-11.5h170q20 0 31.5 11.5t11.5 31.5v42H384zm384 682q0 20-11.5 31.5t-31.5 11.5H299q-20 0-31.5-11.5t-11.5-31.5v-554h512zm-341-426q-20 0-31.5 11.5t-11.5 30.5v256q0 20 11.5 31.5t31.5 11.5q19 0 30.5-11.5t11.5-31.5v-256q0-19-11.5-30.5t-30.5-11.5m170 0q-19 0-30.5 11.5t-11.5 30.5v256q0 20 11.5 31.5t30.5 11.5q20 0 31.5-11.5t11.5-31.5v-256q0-19-11.5-30.5t-31.5-11.5"/></svg>,
                label: <Text color="#e56458">删除文档库</Text>,
            });
        }
        return items;
    }, [canRequestJoin, showDeleteSpace]);

    return (
        <Card p={0} overflow="hidden" h={280}>
            <Flex align="center" justify="center" bg="#e8f0fe" py={20}>
                <Avatar
                    icon={spaceIconSrc ? <img src={spaceIconSrc} alt=""/> : data.icon}
                    title={data.name}
                    size={90}
                    fontSize={16}
                    radius="full"
                    // bg={'rgb(160, 137, 255)'}
                    // color={'#fff'}
                    // borderColor="transparent"
                ></Avatar>
            </Flex>
            <View px={12}>
                <Flex align="center" gap={6} mt={10} wrap="wrap">
                    <Text as="div" fontSize={16} fontWeight={500} ellipsis>{data?.name}</Text>
                    {data?.invite_shell_only ? (
                        <Text as="span" fontSize={11} fontWeight={600} color="#b45309" bg="#fffbeb" px={6} py={2} borderRadius={6}>
                            待申请
                        </Text>
                    ) : null}
                </Flex>
                {!data?.invite_shell_only ? (
                    <Text as="div" fontSize={12} color="#737373" mt={5} h={35} overflow="hidden">{data?.description}</Text>
                ) : (
                    <Text as="div" fontSize={12} color="#737373" mt={5} h={35} overflow="hidden">
                        需由管理员审批或邀请后方可访问内容
                    </Text>
                )}
            </View>
            <Flex
                bg="#e8f0fe"
                color="#1a73e8"
                align="center"
                style={{
                    position: 'absolute',
                    left: '5px',
                    top: '5px',
                    borderRadius: '6px',
                    padding: '0 6px 0 2px'
                }}
            >
                <IconWrapper>
                    <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M1020 495.014q-3-6-38-65-35-58-99.5-125t-157.5-122-213-55-213 55-157.5 122-99.5 125q-35 59-38 65-3 10-3 19.5t3 18.5q3 5 38 62 35 58 99.5 124.5t157.5 121.5 213 55 213-55 157.5-122 99.5-125q35-59 38-65t3-17-3-17m-508 316q-86 0-157-37t-124.5-87-89.5-100q-35-49-51-75 14-26 49-75 36-50 90-100t125-87q72-37 158-37t157 37 124.5 87 89.5 100q35 49 51 75-16 26-51 75-36 50-89.5 100t-124.5 87-157 37m0-470q-70 0-120.5 50.5t-50.5 120.5 50.5 120.5 120.5 50.5 120.5-50.5 50.5-120.5-50.5-120.5-120.5-50.5m0 256q-35 0-60-25t-25-60 25-60 60-25 60 25 25 60-25 60-60 25" /></svg>
                </IconWrapper>
                <Text fontSize={12} fontWeight={600}>{data?.access_type && SpaceAccessRenderConfig[data.access_type] && SpaceAccessRenderConfig[data.access_type].label}</Text>
            </Flex>
            <Popuover
                pos="tl-bl?"
                trigger="click"
                open={popuoverOpen}
                onChange={(p: PopuoverChangeEventProps) => {
                    setPopuoverOpen(p.open);
                }}
                items={
                    <Menu 
                        items={menuItems}
                        onSelect={(p: any) => {
                            const key = p.key;
                            if (key === 'spaceSetting') {
                                setModalOpen(true);
                            } else if (key === 'requestJoin') {
                                setJoinDialogOpen(true);
                            } else if (key === 'leaveSpace') {
                                Confirm({
                                    title: "移除成员",
                                    content: <View>是否确定退出<Text
                                            as="span"
                                            py={2}
                                            px={7}
                                            // borderRadius={6} 
                                            // bg="#377dff"
                                            // color="#fff" 
                                            fontWeight={600}
                                            fontSize={16}
                                        >{data?.name}</Text>库？</View>,
                                    onOk: async () => {
                                        const rs = await leaveSpace(data.id);
                                        if (rs.code === 200) {
                                            message.success('退出成功');
                                            onSuccess?.();
                                        } else {
                                            message.error(rs.message || '退出失败');    
                                        }
                                    }
                                });
                            } else if (key === 'delSpace') {
                                Confirm({
                                    title: "删除库",
                                    content: <View>是否确定删除<Text
                                            as="span"
                                            py={2}
                                            px={7}
                                            // borderRadius={6} 
                                            // bg="#377dff"
                                            // color="#fff" 
                                            fontWeight={600}
                                            fontSize={16}
                                        >{data?.name}</Text>库？</View>,
                                    onOk: async () => {
                                        const rs = await deleteSpace(data.id);
                                        if (rs.code === 200) {
                                            message.success('删除成功');
                                            onSuccess?.();
                                        } else {
                                            message.error(rs.message || '删除失败');
                                        }
                                    }
                                });
                            }
                            setPopuoverOpen(false);
                        }}
                    />
                }
            >
                <View className={`${CLASSNAME}-space-card-tools`}>
                    <IconWrapper iconSize={21}>
                        <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M597 512.014q0 35-25 60t-60 25-60-25-25-60 25-60 60-25 60 25 25 60m0-299q0 36-25 61t-60 25-60-25-25-61q0-35 25-60t60-25 60 25 25 60m0 598q0 35-25 60t-60 25-60-25-25-60q0-36 25-61t60-25 60 25 25 61"/></svg>
                    </IconWrapper>
                </View>
            </Popuover>
            <Flex gap={3} align="start" p={12}>
                <AvatarGroup size={24} radius="full" maxCount={3} pt={3}>
                    {(data?.recent_members || []).map((item: any, index: number) => {
                        const commonProps = {
                            bg: "rgb(160 137 255)",
                            color: "#fff"
                        };
                        return <Avatar 
                            key={index} 
                            {...commonProps} 
                            icon={(() => {
                                const src = resolveMediaSrcForImg(item?.head_sculpture);
                                return src ? <img src={src} alt="" /> : item?.head_sculpture;
                            })()} 
                            title={item.username}
                        />;
                    })}
                </AvatarGroup>

                <View px={6}>
                    <Flex>
                        <IconWrapper>
                            <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M555 597.014H213q-44 0-83 17-39 16-68 45t-45 68q-17 39-17 84v85q0 19 11.5 31t31.5 12q19 0 30.5-12t11.5-31v-85q0-55 37-91.5t91-36.5h342q54 0 91 36.5t37 91.5v85q0 19 11.5 31t30.5 12q20 0 31.5-12t11.5-31v-85q0-45-17-84-16-39-45-68t-68-45q-39-17-83-17m-171-85q45 0 84-17 39-16 67.5-45t45.5-68q16-39 16-83 0-45-16-84-17-39-45.5-68t-67.5-45q-39-17-84-17t-84 17q-39 16-67.5 45t-45.5 68q-16 39-16 84 0 44 16 83 17 39 45.5 68t67.5 45q39 17 84 17m0-341q54 0 91 36.5t37 91.5q0 54-37 91t-91 37-91-37-37-91q0-55 37-91.5t91-36.5m478 435q-16-3-32 5.5t-19 24.5q-4 16 5 32t25 19q41 10 67 44.5t26 79.5v85q0 19 12 31t31 12 31-12 12-31v-85q3-74-41-131.5t-117-73.5m-171-512q-16-7-30.5 2t-20.5 28q-3 16 5.5 32t24.5 19q51 13 79 58t15 100q-10 35-34.5 59.5t-59.5 34.5q-16 3-26 19t-4 32q3 16 15 25t28 9h8q58-16 99.5-56t54.5-98q11-44 5-88-7-43-27.5-79t-54.5-62-77-35" /></svg>
                        </IconWrapper>
                        <Text fontSize={14} fontWeight={500}>成员: {data?.member_count || 0}</Text>
                    </Flex>
                    <Text as="div" fontSize={12} color="#737373">创建时间: {formatDateTime(new Date(data?.create_time), 'yyyy-MM-dd hh:mm:ss')}</Text>
                </View>
            </Flex>
            <Dialog
                open={modalOpen}
                // width={480}
                // transitionName="ant-fade"
                onCancel={() => setModalOpen(false)}
                onPopuoverDown={() => setModalOpen(false)}
                footer={null}
                style={{
                    width: '630px'
                }}
            >
                <SpaceSettings 
                    params={data}
                    onSuccess={values => {
                        setModalOpen(false);
                        onSuccess?.();
                    }}
                />
            </Dialog>
            <SpaceJoinRequestDialog
                open={joinDialogOpen}
                onClose={() => setJoinDialogOpen(false)}
                spaceId={data?.id != null ? String(data.id) : ''}
                spaceName={data?.name}
                onSuccess={() => {
                    onSuccess?.();
                }}
            />
        </Card>
    );
}

export interface SpaceCardsProps {
    data?: any[];
    onSuccess?: () => void;
};

export const SpaceCards: React.FC<SpaceCardsProps> = (props) => {
    const { 
        data = [],
        onSuccess
    } = props;
    return (
        <View style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px'
        }}>
            {
                data.map((item: any) => <SpaceCard key={item.id} data={item} onSuccess={onSuccess}/>)
            }
        </View>
    );
}