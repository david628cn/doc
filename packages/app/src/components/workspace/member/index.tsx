import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Flex,
    View,
    Button,
    Text,
    message,
    Dialog
} from '@carvy/ui';
import { MemberList } from '@/components/memberList';
import { SortedWorkspaceRoles, WorkspaceAccessRenderConfig, WorkspaceRole } from '@/constants';
import { MemberRenderHelper } from '@/components/member/memberRenderHelper';

import { 
    getWorkspaceMembers,
    updateWorkspaceRole,
    removeWorkspaceMember
} from '@/api';
import { useCurrentWorkspace, useCurrentUser } from '@/hooks';
import {
    canAssignWorkspaceMemberRole,
    canChangeWorkspaceMemberRole,
    canManageWorkspaceMembers,
    isWorkspaceRole,
} from '@/permissions';

export type WorkspaceMemberProps = {
    header?: React.ReactNode;
    autoFocus?: boolean;
}

export const WorkspaceMember: React.FC<WorkspaceMemberProps> = props => {
    const {
        header,
        autoFocus
    } = props;
    const { role: operatorRole } = useCurrentWorkspace();
    const { userId } = useCurrentUser();
    const [btnLoading, setBtnLoading] = useState({
        admin: false,
        member: false,
        guest: false,
        remove: false
    });
    const [removeOpen, setRemoveOpen] = useState(false);
    const [data, setData] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const userRef = useRef<any>(null);

    const reqWorkspaceMembers = useCallback(async () => {
        const rs = await getWorkspaceMembers();
        if (rs.code === 200) {
            let dataList = rs.data || [];
            dataList = dataList.map((item: any) => {
                return {
                    ...item,
                    name: item.username,
                    label: (
                        <Flex gap={5}>
                            {MemberRenderHelper.renderWorkspaceAccessTag(item.role)}
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
                    keywords: [item.username, item.email]
                };
            });
            setData(dataList);
        } else {
            setData([]);
        }
    }, []);

    useEffect(() => {
        reqWorkspaceMembers();
    }, [reqWorkspaceMembers]);

    const setLoadingKey = (key: keyof typeof btnLoading, v: boolean) => {
        setBtnLoading((prev) => ({ ...prev, [key]: v }));
    };

    const reqUpdateWorkspaceRole = async (userId: string, role: WorkspaceRole) => {
        const key =
            role === WorkspaceRole.Admin ? 'admin' :
            role === WorkspaceRole.Member ? 'member' :
            'guest';
        setLoadingKey(key, true);
        const res = await updateWorkspaceRole(userId, role);
        setLoadingKey(key, false);
        if (res.code === 200) {
            message.success('操作成功');
            reqWorkspaceMembers();
        } else {
            message.error(res.message || '操作失败');
        }
    };

    const reqRemoveWorkspaceMember = async (userId: string) => {
        setLoadingKey('remove', true);
        const res = await removeWorkspaceMember(userId);
        setLoadingKey('remove', false);
        if (res.code === 200) {
            message.success('操作成功');
            reqWorkspaceMembers();
        } else {
            message.error(res.message || '操作失败');
        }
    };

    const handleUpdateRole = (userId: string, role: WorkspaceRole) => {
        return (e: any) => {
            e.preventDefault();
            reqUpdateWorkspaceRole(userId, role);
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
            reqRemoveWorkspaceMember(userRef.current.id);
        }
    };

    const canManage = canManageWorkspaceMembers(operatorRole);

    return (
        <View w="100%" h="100%">
            <MemberList
                data={data}
                selectedKeys={selectedKeys}
                header={header}
                onChange={e => setSelectedKeys(e)}
                autoFocus={autoFocus}
                order = {{
                    key: 'role',
                    value: SortedWorkspaceRoles
                }}
                renderGroup={(v) => {
                    return (
                        <Flex px={10} py={5} fontSize={12} color="gray" fontWeight="bold" bg="#f9f8f7" style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <Text>{WorkspaceAccessRenderConfig[v.group]?.label}</Text>
                            <Text pl={10}>{v.items.length}人</Text>
                        </Flex>
                    );
                }}
                renderItem={(item: any) => {
                    if (!canManage) return null;

                    const itemRole = isWorkspaceRole(item.role) ? item.role : undefined;
                    if (!itemRole || itemRole === WorkspaceRole.Owner) return null;

                    const canChange = canChangeWorkspaceMemberRole(operatorRole, itemRole);

                    return (
                        <Flex py={10} gap={6}>
                            { 
                                itemRole !== WorkspaceRole.Admin && canAssignWorkspaceMemberRole(operatorRole, itemRole, WorkspaceRole.Admin) ? (
                                    <Button color="black" variant="outline" loading={btnLoading['admin']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, WorkspaceRole.Admin)}>管理员</Button>
                                ) : null
                            }
                            { 
                                itemRole !== WorkspaceRole.Member && canAssignWorkspaceMemberRole(operatorRole, itemRole, WorkspaceRole.Member) ? (
                                    <Button color="green" variant="outline" loading={btnLoading['member']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, WorkspaceRole.Member)}>普通用户</Button>
                                ) : null
                            }
                            {
                                itemRole !== WorkspaceRole.Guest && canAssignWorkspaceMemberRole(operatorRole, itemRole, WorkspaceRole.Guest) ? (
                                    <Button color="orange" variant="outline" loading={btnLoading['guest']} style={{ fontSize: '12px' }} onClick={handleUpdateRole(item.id, WorkspaceRole.Guest)}>访客</Button>
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
