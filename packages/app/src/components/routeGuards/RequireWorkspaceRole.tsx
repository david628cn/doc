import React from 'react';
import { Redirect } from 'react-router-dom';
import { View, Text } from '@carvy/ui';
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
import { gteWorkspaceRole } from '@/permissions';

export type RequireWorkspaceRoleProps = {
    /** 当前工作区角色须不低于该等级（与后端权重一致：数值越大权限越高） */
    minimum: WorkspaceRole;
    redirectTo?: string;
    /** workspace 尚未从 me() 写入 Redux 时展示 */
    fallback?: React.ReactNode;
    children: React.ReactNode;
};

/**
 * 路由级工作区角色守卫：依赖 Layout 已 dispatch(setMe)，即 `workspace.initialized`。
 */
export const RequireWorkspaceRole: React.FC<RequireWorkspaceRoleProps> = ({
    minimum,
    redirectTo = '/403',
    fallback,
    children,
}) => {
    const { role, initialized } = useCurrentWorkspace();

    if (!initialized) {
        return (
            <>
                {fallback ?? (
                    <View p={24}>
                        {/* <Text color="gray">加载中…</Text> */}
                    </View>
                )}
            </>
        );
    }

    if (!gteWorkspaceRole(role, minimum)) {
        return <Redirect to={redirectTo} />;
    }

    return <>{children}</>;
};
