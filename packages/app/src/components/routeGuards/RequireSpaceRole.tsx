import React from 'react';
import { Redirect } from 'react-router-dom';
import { View, Text } from '@carvy/ui';
import { SpaceRole } from '@/constants';
import { useSpaceSession } from '@/hooks';
import { gteSpaceRole } from '@/permissions';

export type RequireSpaceRoleProps = {
    spaceId?: string;
    minimum: SpaceRole;
    redirectTo?: string;
    /** 拉取空间详情失败时是否跳转 403，默认 true */
    redirectOnError?: boolean;
    children: React.ReactNode;
};

/**
 * 空间级路由守卫：依赖 `getSpaceDetail` 写入 Redux（useSpaceSession）。
 * 未传 `spaceId` 时不拦截，仅渲染子节点（便于父级动态再给 id）。
 */
export const RequireSpaceRole: React.FC<RequireSpaceRoleProps> = ({
    spaceId,
    minimum,
    redirectTo = '/403',
    redirectOnError = true,
    children,
}) => {
    const { role, loading, error } = useSpaceSession(spaceId);

    if (!spaceId) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <View p={24}>
                <Text color="gray">加载权限…</Text>
            </View>
        );
    }

    if (error && redirectOnError) {
        return <Redirect to={redirectTo} />;
    }

    if (!gteSpaceRole(role, minimum)) {
        return <Redirect to={redirectTo} />;
    }

    return <>{children}</>;
};
