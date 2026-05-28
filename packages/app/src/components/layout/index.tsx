import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Header } from './header';
import { Sider } from './sider';
import { Flex, View, notification } from '@carvy/ui';
import { getNotificationUnreadCount, me, pageTree, accessWorkspace } from '@/api';
import { WorkspaceRole } from '@/constants';
import { useCurrentWorkspace } from '@/hooks';
import { setUnreadCount } from '@/store/features/notification';
import { addWorkspace, setMe, type UserWorkspaceRow } from '@/store/features/workspaceSlice';
import type { AppDispatch } from '@/store';
import history from '@/utils/history';
import {
    parseWorkspaceIdFromPathname,
    homePath,
    workspaceHubPath,
    workspaceLibraryPath,
} from '@/utils/appPaths';

export interface LayoutProps {
    // title?: string;
    location?: any;
    user?: any;
    children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = props => {
    const dispatch = useDispatch<AppDispatch>();
    const location = useLocation();
    const { currentWorkspace, workspaces, workspaceId } = useCurrentWorkspace();
    const [pageTreeData, setPageTreeData] = useState([]);
    const [defaultSpaceId, setDefaultSpaceId] = useState<string | undefined>();
    const bootstrappedRef = useRef(false);
    const prevWorkspaceSegRef = useRef<string | undefined>(undefined);
    /** 根路径 `/` 经 me 纠到 `/workspace/:id` 后，跳过一次 pathname effect，避免连打两次 me */
    const skipNextWorkspacePathEffectRef = useRef(false);

    /** me() 的 current_workspace 为准：若地址栏 /workspace/:id 与后端不一致则纠到后端当前工作区 */
    const alignUrlWithServerWorkspace = (serverWorkspaceId?: string) => {
        if (!serverWorkspaceId) return;
        const { pathname, search } = history.location;
        const q = search || '';
        if (!/^\/workspace\/[^/]+/.test(pathname)) return;
        const urlId = parseWorkspaceIdFromPathname(pathname);
        if (!urlId || urlId === serverWorkspaceId) return;
        if (/^\/workspace\/[^/]+\/library\/?$/.test(pathname)) {
            history.replace(workspaceLibraryPath(serverWorkspaceId) + q);
        } else if (/^\/workspace\/[^/]+\/?$/.test(pathname)) {
            history.replace(workspaceHubPath(serverWorkspaceId) + q);
        }
    };

    /** 登录等场景默认进 `/`，在拿到 me 后落到 canonical `/workspace/:id` */
    const normalizeUrlAfterMe = (serverWorkspaceId?: string) => {
        if (!serverWorkspaceId) return;
        const { pathname, search } = history.location;
        const q = search || '';
        if (pathname === '/') {
            history.replace(homePath() + q);
            skipNextWorkspacePathEffectRef.current = true;
            return;
        }
        alignUrlWithServerWorkspace(serverWorkspaceId);
    };

    const refreshPageTree = useCallback(async () => {
        if (!defaultSpaceId) return;
        const rs: any = await pageTree({ space_id: defaultSpaceId });
        if (rs?.code === 200 && rs.data != null) {
            setPageTreeData(rs.data);
        }
    }, [defaultSpaceId]);

    const reqMe = useCallback(async () => {
        const { data = {} }: any = await me();
        dispatch(
            setMe({
                current_workspace: data.current_workspace ?? null,
                workspaces: data.workspaces ?? [],
            }),
        );
        normalizeUrlAfterMe(data.current_workspace?.workspace_id);
        if (data.spaces && data.spaces.length > 0) {
            setDefaultSpaceId(data.spaces[0].id);
            const rs = await pageTree({
                space_id: data.spaces[0].id
            });
            setPageTreeData(rs.data ?? []);
        } else {
            setDefaultSpaceId(undefined);
            setPageTreeData([]);
        }
    }, [dispatch]);

    useEffect(() => {
        notification.config({ mode: 'stack' });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        dispatch({ type: 'socket/connect', payload: { token } });
        return () => {
            dispatch({ type: 'socket/disconnect' });
        };
    }, [dispatch]);

    /** 与后端同步未读通知数，供消息头像角标使用 */
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        void (async () => {
            const rs = await getNotificationUnreadCount();
            if (rs.code === 200 && typeof rs.data?.unread_count === 'number') {
                dispatch(setUnreadCount(rs.data.unread_count));
            }
        })();
    }, [dispatch]);

    /** 仅在首屏或地址栏「工作区段」变化时拉 me；同段内 /workspace/a 与 /workspace/a/library 不重复请求 */
    useEffect(() => {
        const seg = parseWorkspaceIdFromPathname(location.pathname);

        if (skipNextWorkspacePathEffectRef.current) {
            skipNextWorkspacePathEffectRef.current = false;
            prevWorkspaceSegRef.current = seg;
            return;
        }

        if (!bootstrappedRef.current) {
            bootstrappedRef.current = true;
            prevWorkspaceSegRef.current = seg;
            reqMe();
            return;
        }

        if (seg === prevWorkspaceSegRef.current) return;
        prevWorkspaceSegRef.current = seg;
        reqMe();
    }, [location.pathname, reqMe]);

    // 提供一个只更新列表的方法
    const handleUpdateWorkspaces = (newWs: any) => {
        // 将后端返回的新工作区对象格式化为符合 UserWorkspaceData 的结构
        const formattedWs: UserWorkspaceRow = {
            workspace_id: newWs.id,
            name: newWs.name,
            icon: newWs.icon,
            role: WorkspaceRole.Owner, // 新创建者默认为 owner
            is_default: false,
        };
        dispatch(addWorkspace(formattedWs));
    };

    const handleSwitch = async (nextWorkspaceId: string) => {
        try {
            const res = await accessWorkspace(nextWorkspaceId);

            if (res.code === 200) {
                const { pathname, search } = history.location;
                const q = search || '';
                let target: string;
                if (/^\/home\/?$/.test(pathname) || pathname === '/') {
                    target = homePath() + q;
                } else if (/^\/profile\/?$/.test(pathname) || pathname.startsWith('/profile/')) {
                    target = `/profile${q}`;
                } else if (/^\/ai(\/|$)/.test(pathname)) {
                    target = `/ai${q}`;
                } else if (/^\/contacts(\/|$)/.test(pathname)) {
                    target = `/contacts${q}`;
                } else if (/^\/workspace\/[^/]+\/library\/?$/.test(pathname)) {
                    target = workspaceLibraryPath(nextWorkspaceId) + q;
                } else if (/^\/workspace\/[^/]+\/?$/.test(pathname)) {
                    target = workspaceHubPath(nextWorkspaceId) + q;
                } else {
                    target = workspaceHubPath(nextWorkspaceId);
                }
                if (pathname + q !== target) {
                    history.replace(target);
                } else {
                    await reqMe();
                }
                /** URL 变化时由 pathname effect 拉 me；已落在目标路径时在此补一次 */
            }
        } catch (error) {
            console.error('切换工作区失败', error);
        }
    }

    return (
        // <DocumentTitle title={title}>
        <Flex direction="column" w="100vw" h="100vh">
            <Flex direction="row" flex={1} w="100%" h="100%">
                <Sider
                    currentWorkspace={currentWorkspace || ({} as any)}
                    workspaces={workspaces}
                    pages={pageTreeData}
                    defaultSpaceId={defaultSpaceId}
                    refreshPageTree={refreshPageTree}
                    onWorkspaceCreated={handleUpdateWorkspaces}
                    onSelectWorkspace={handleSwitch}
                />
                <Flex direction="column" flex={1}>
                    <Header />
                    <View
                        as="main"
                        id="app-layout-main-scroll"
                        key={workspaceId || 'no-workspace'}
                        // px={20}
                        overflow="auto"
                        flex={1}
                    >
                        {props.children}
                    </View>
                </Flex>
            </Flex>
            {/* <div className="layout-footer"></div> */}
        </Flex>
        // </DocumentTitle>
    );
}