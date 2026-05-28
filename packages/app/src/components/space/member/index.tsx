import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
    Flex,
    View,
    Button,
    Text,
    message,
    Dialog
} from '@carvy/ui';
import { MemberList } from '@/components/memberList';
import {
    getSpaceMembers,
    updateSpaceRole,
    removeSpaceMember
} from '@/api';
import { SortedSpaceRoles, SpaceRole, SpaceRoleRenderConfig } from '@/constants';
import { MemberRenderHelper } from '@/components/member/memberRenderHelper';
import { useSpaceSession, useCurrentUser } from '@/hooks';
import {
    canAssignSpaceMemberRole,
    canChangeSpaceMemberRole,
    canManageSpaceMembers,
    isSpaceRole,
} from '@/permissions';
import { invalidateSpace } from '@/store/features/spaceSlice';
import type { AppDispatch } from '@/store';

export type SpaceMemberProps = {
    header?: React.ReactNode;
    params?: any;
    autoFocus?: boolean;
}

export const SpaceMember: React.FC<SpaceMemberProps> = props => {
    const {
        params,
        header,
        autoFocus
    } = props;
    const dispatch = useDispatch<AppDispatch>();
    const { role: operatorRole, detail: spaceDetail } = useSpaceSession(params?.id, params?.role);
    const detailFlags = spaceDetail as { can_manage_space_members?: boolean } | undefined;
    const { userId } = useCurrentUser();
    const [btnLoading, setBtnLoading] = useState({
        admin: false,
        editor: false,
        viewer: false,
        remove: false
    });
    const [removeOpen, setRemoveOpen] = useState(false);
    const [data, setData] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const userRef = useRef<any>(null);

    const reqSpaceMembers = useCallback(async () => {
        if (!params?.id) return;
        const rs = await getSpaceMembers(params.id, '');
        if (rs.code === 200) {
            let dataList = rs.data || [];
            dataList = dataList.map((item: any) => {
                return {
                    ...item,
                    name: item.username,
                    label: (
                        <Flex gap={5} align="center" style={{ flexWrap: 'wrap' }}>
                            {isSpaceRole(item.role) && item.role !== SpaceRole.None
                                ? MemberRenderHelper.renderSpaceAccessTag(item.role)
                                : null}
                            {item.is_original_creator
                                ? MemberRenderHelper.renderSpaceOriginalCreatorTag()
                                : null}
                            {item.member_source === 'group'
                                ? MemberRenderHelper.renderSpaceMemberGroupSourceTag()
                                : null}
                            <Text>{item.username}</Text>
                            {userId === item.id && <Flex 
                                align="center"
                                justify="center"
                                px={4}
                                // py={3}
                                borderRadius={6}
                                fontWeight="normal"
                                fontSize={12}
                                color="#333333"
                                bg="#e8f0fe"
                            >我</Flex>}
                        </Flex>
                    ),
                    desc: item.email,
                    icon: item.head_sculpture,
                    keywords: [item.username, item.email].filter(
                        (v): v is string => v != null && String(v).length > 0
                    )
                };
            });
            setData(dataList);
        } else {
            setData([]);
        }
    }, [params?.id]);

    useEffect(() => {
        reqSpaceMembers();
    }, [reqSpaceMembers]);

    const setLoadingKey = (key: keyof typeof btnLoading, v: boolean) => {
        setBtnLoading((prev) => ({ ...prev, [key]: v }));
    };

    const reqUpdateSpaceRole = async (userId: string, role: SpaceRole) => {
        const key = role === SpaceRole.Admin ? 'admin' : role === SpaceRole.Editor ? 'editor' : 'viewer';
        setLoadingKey(key, true);
        const res = await updateSpaceRole(params.id, userId, role);
        setLoadingKey(key, false);
        if (res.code === 200) {
            message.success('操作成功');
            dispatch(invalidateSpace(params.id));
            reqSpaceMembers();
        } else {
            message.error(res.message || '操作失败');
        }
    };

    const reqRemoveSpaceMember = async (userId: string) => {
        setLoadingKey('remove', true);
        const res = await removeSpaceMember(params.id, userId);
        setLoadingKey('remove', false);
        if (res.code === 200) {
            message.success('操作成功');
            dispatch(invalidateSpace(params.id));
            reqSpaceMembers();
        } else {
            message.error(res.message || '操作失败');
        }
    };

    const handleUpdateRole = (userId: string, role: SpaceRole) => {
        return (e: any) => {
            e.preventDefault();
            reqUpdateSpaceRole(userId, role);
        };
    };

    const handleRomve = (item: any) => {
        return (e: any) => {
            e.preventDefault();
            userRef.current = item;
            setRemoveOpen(true);
        };
    };

    const handleSubmitRomve = () => {
        if (userRef.current) {
            setRemoveOpen(false);
            reqRemoveSpaceMember(userRef.current.id);
        }
    };

    const canManage =
        typeof detailFlags?.can_manage_space_members === 'boolean'
            ? detailFlags.can_manage_space_members
            : canManageSpaceMembers(operatorRole);

    return (
        <View w="100%" h="100%">
            <MemberList
                data={data}
                selectedKeys={selectedKeys}
                header={header}
                autoFocus={autoFocus}
                onChange={e => setSelectedKeys(e)}
                order={{
                    key: 'role',
                    value: SortedSpaceRoles
                }}
                renderGroup={(v) => {
                    return (
                        <Flex px={10} py={5} fontSize={12} color="gray" fontWeight="bold" bg="#f9f8f7" style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <Text>{SpaceRoleRenderConfig[v.group]?.label}</Text>
                            <Text pl={10}>{v.items.length}人</Text>
                        </Flex>
                    );
                }}
                renderItem={(item: any) => {
                    if (!canManage) return null;

                    const itemRole = isSpaceRole(item.role) ? item.role : undefined;
                    if (!itemRole || itemRole === SpaceRole.Owner) return null;

                    const canChange = canChangeSpaceMemberRole(operatorRole, itemRole);

                    return (
                        <Flex py={10} gap={6}>
                            {
                                itemRole !== SpaceRole.Admin &&
                                canAssignSpaceMemberRole(operatorRole, itemRole, SpaceRole.Admin) ? (
                                    <Button color="black" variant="outline" loading={btnLoading['admin']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, SpaceRole.Admin)}>管理员</Button>
                                ) : null
                            }
                            {
                                itemRole !== SpaceRole.Editor &&
                                canAssignSpaceMemberRole(operatorRole, itemRole, SpaceRole.Editor) ? (
                                    <Button color="green" variant="outline" loading={btnLoading['editor']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, SpaceRole.Editor)}>编辑者</Button>
                                ) : null
                            }
                            {
                                itemRole !== SpaceRole.Viewer &&
                                canAssignSpaceMemberRole(operatorRole, itemRole, SpaceRole.Viewer) ? (
                                    <Button color="orange" variant="outline" loading={btnLoading['viewer']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, SpaceRole.Viewer)}>阅读者</Button>
                                ) : null
                            }
                            {
                                canChange ? (
                                    <Button color="red" variant="outline" loading={btnLoading['remove']} style={{ fontSize: '12px' }} onClick={handleRomve(item)}>移除</Button>
                                ) : null
                            }
                        </Flex>
                    );
                }}
            ></MemberList>
            <Dialog
                title="移除成员"
                open={removeOpen}
                center
                onCancel={() => setRemoveOpen(false)}
                onPopuoverDown={() => setRemoveOpen(false)}
            >
                <View mx={20} mb={20}>确定移除<Text
                    as="span"
                    py={2}
                    px={7}
                    fontWeight={600}
                    fontSize={16}
                >{userRef.current?.username}</Text>？
                </View>
                <Flex justify="end" gap={10} pb={20} px={20}>
                    <Button onClick={() => setRemoveOpen(false)}>取消</Button>
                    <Button color="black" onClick={handleSubmitRomve}>确定</Button>
                </Flex>
            </Dialog>
        </View>
    );
};
