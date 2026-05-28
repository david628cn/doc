import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { View, Flex, Text, Tab, Avatar } from '@carvy/ui';
import { SpaceBasicForm } from '../basicForm';
import { SpaceMemberManger } from '../memberManger';
import { getSpaceDetail } from '@/api';
import { useSpaceSession } from '@/hooks';
import { invalidateSpace } from '@/store/features/spaceSlice';
import type { AppDispatch } from '@/store';
import { canEditSpaceSettings, canManageSpaceMembers } from '@/permissions';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';

export type SpaceSettingsProps = {
    params?: any;
    defaultActiveKey?: string;
    onSuccess?: (values: any) => void | Promise<void>;
}

export const SpaceSettings: React.FC<SpaceSettingsProps> = ({
    params,
    defaultActiveKey = 'general',
    onSuccess
}) => {

    const dispatch = useDispatch<AppDispatch>();
    const [spaceGeneralFormData, setSpaceGeneralFormData] = useState(() => params || {});
    const listRole = params?.role ?? spaceGeneralFormData?.role;
    const { role: spaceRole } = useSpaceSession(params?.id, listRole);

    // 在拉取详情前清缓存（layout 阶段），避免与 useSpaceSession 的被动 effect 竞态
    useLayoutEffect(() => {
        if (!params?.id) return;
        dispatch(invalidateSpace(params.id));
    }, [params?.id, dispatch]);

    useEffect(() => {
        if (!params?.id) return;
        setSpaceGeneralFormData({ ...(params || {}) });
        let cancelled = false;
        (async () => {
            const res = await getSpaceDetail(params.id);
            if (cancelled) return;
            if (res.code === 200 && res.data) {
                setSpaceGeneralFormData((base: any) => ({
                    ...base,
                    ...res.data,
                    id: res.data.id ?? params.id,
                }));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [params?.id]);

    const tabItems = useMemo(() => {
        const items = [
            {
                key: 'general',
                label: '基本信息',
                children: (
                    <SpaceBasicForm
                        type={canEditSpaceSettings(spaceRole) ? 'editor' : 'viwer'}
                        data={spaceGeneralFormData}
                        onSuccess={onSuccess}
                    />
                ),
            },
        ];
        // 与后端 GET .../space/members 一致：仅库 admin 及以上可查看成员列表
        if (canManageSpaceMembers(spaceRole)) {
            items.push({
                key: 'members',
                label: '成员管理',
                children: (
                    <View h={400}>
                        <SpaceMemberManger
                            params={{
                                ...(params || {}),
                                ...spaceGeneralFormData,
                                id: spaceGeneralFormData?.id ?? params?.id,
                            }}
                            autoFocus
                        />
                    </View>
                ),
            });
        }
        return items;
    }, [spaceGeneralFormData, spaceRole, onSuccess, params]);

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
                                const src = resolveMediaSrcForImg(spaceGeneralFormData.icon);
                                return src ? <img src={src} alt="" /> : spaceGeneralFormData.icon;
                            })()}
                            title={spaceGeneralFormData.name}
                        >
                        </Avatar>
                        <Flex direction="column" gap={4}>
                            <Text as="div" fontSize={20} fontWeight={700} color="rgba(0,0,0,0.88)">
                                {spaceGeneralFormData.name}
                            </Text>
                            <Text as="div" fontSize={13} color="rgba(0,0,0,0.45)">
                                {spaceGeneralFormData.member_count} 成员
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
                        !canManageSpaceMembers(spaceRole) && defaultActiveKey === 'members'
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