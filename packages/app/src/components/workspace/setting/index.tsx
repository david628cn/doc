import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Flex, Text, Tab, Avatar } from '@carvy/ui';
import { WorkspaceBasicForm } from '../basicForm';
// import { WorkspaceSecurity } from './workspaceSecurity';
import { WorkspaceMemberManger } from '../memberManger';
import { getWorkspaceDetail } from '@/api';
import { useCurrentWorkspace } from '@/hooks';
import { canEditWorkspaceSettings, canViewWorkspaceMembers } from '@/permissions';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';

export type WorkspaceSettingsProps = {
    params?: any;
    defaultActiveKey?: string;
    onSuccess?: (values?: any) => void | Promise<void>;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
    params,
    defaultActiveKey = 'general',
    onSuccess
}) => {

    const { workspaceId, role: workspaceRole } = useCurrentWorkspace();
    const [workspaceGeneralFormData, setWorkspaceGeneralFormData] = useState(params || {});

    const reqGetSpaceDetail = useCallback(async () => {
        if (!workspaceId) return;
        const res = await getWorkspaceDetail(workspaceId);
        if (res.code === 200) {
            setWorkspaceGeneralFormData(res.data || {});
        } else {
            setWorkspaceGeneralFormData(null);
        }
    }, [workspaceId]);

    useEffect(() => {
        void reqGetSpaceDetail();
    }, [reqGetSpaceDetail]);

    useEffect(() => {
        setWorkspaceGeneralFormData(params || {});
    }, [params]);

    /** 基本信息保存成功后：刷新设置弹窗展示数据，并与 Redux / 侧栏一致 */
    const handleWorkspaceBasicSaved = useCallback(() => {
        void reqGetSpaceDetail();
        onSuccess?.();
    }, [reqGetSpaceDetail, onSuccess]);

    const tabItems = useMemo(() => {
        const items: any[] = [
            {
                key: 'general',
                label: '基本信息',
                children: (
                    <WorkspaceBasicForm
                        type={canEditWorkspaceSettings(workspaceRole) ? 'editor' : 'viwer'}
                        data={workspaceGeneralFormData}
                        onSuccess={handleWorkspaceBasicSaved}
                    />
                ),
            },
        ];
        if (canViewWorkspaceMembers(workspaceRole)) {
            items.push({
                key: 'members',
                label: '成员管理',
                children: (
                    <View h={400}>
                        <WorkspaceMemberManger autoFocus/>
                    </View>
                ),
            });
        }
        return items;
    }, [workspaceGeneralFormData, workspaceRole, handleWorkspaceBasicSaved]);

    return (
        <View>
            <View 
                px={20} 
                pt={20} 
                bg="#f9f8f7"
            >
                <Flex justify="space-between" align="center">
                    <Flex gap={12} align="center">
                        <Avatar
                            size={50}
                            // radius="full"
                            icon={(() => {
                                const src = resolveMediaSrcForImg(workspaceGeneralFormData?.icon);
                                return src ? <img src={src} alt="" /> : workspaceGeneralFormData?.icon;
                            })()}
                            title={workspaceGeneralFormData?.name}
                        >
                        </Avatar>
                        <Flex direction="column" gap={4}>
                            <Text as="div" fontSize={20} fontWeight={700} color="rgba(0,0,0,0.88)">
                                {workspaceGeneralFormData?.name}
                            </Text>
                            <Text as="div" fontSize={13} color="rgba(0,0,0,0.45)">
                                {workspaceGeneralFormData?.member_count} 成员
                            </Text>
                        </Flex>
                    </Flex>
                    {params?.joined && (
                        <View
                            px={12}
                            py={6}
                            style={{
                                borderRadius: 999,
                                background: 'rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.06)',
                            }}
                        >
                            <Text fontSize={13} color="rgba(0,0,0,0.45)">
                                ✓ 已加入
                            </Text>
                        </View>
                    )}
                </Flex>
            </View>
            <View>
                <Tab
                    defaultActiveKey={
                        !canViewWorkspaceMembers(workspaceRole) && defaultActiveKey === 'members'
                            ? 'general'
                            : defaultActiveKey
                    }
                    items={tabItems}
                    navStyle={{
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        borderBottom: '1px solid #eae8e6',
                        background: '#f9f8f7'
                    }}
                    contentStyle={{
                        padding: '20px',
                        maxHeight: '510px',
                        // overflow: 'auto'
                    }}
                />
            </View>
        </View>
    );
};
