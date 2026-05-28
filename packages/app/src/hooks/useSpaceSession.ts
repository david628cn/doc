import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSpaceDetail } from '@/api';
import { SpaceRole, SpaceRolePriority } from '@/constants';
import {
    invalidateSpace,
    spaceDetailFailed,
    spaceDetailLoaded,
    spaceDetailLoading,
} from '@/store/features/spaceSlice';
import type { AppDispatch, RootState } from '@/store';

/** 接口/缓存可能出现大小写或首尾空格，与 SpaceRole 枚举对齐 */
export const parseSpaceRole = (raw: unknown): SpaceRole | undefined => {
    if (typeof raw !== 'string') return undefined;
    const n = raw.trim().toLowerCase();
    return n && n in SpaceRolePriority ? (n as SpaceRole) : undefined;
};

/**
 * @param spaceId 库 id
 * @param fallbackRole 列表/卡片等场景已带的当前用户空间角色，在详情未返回或解析失败时兜底，避免按钮权限闪烁/错误
 */
export const useSpaceSession = (spaceId?: string, fallbackRole?: unknown) => {
    const dispatch = useDispatch<AppDispatch>();
    const session = useSelector((s: RootState) => (spaceId ? s.space.byId[spaceId] : undefined));

    useEffect(() => {
        if (!spaceId) return;
        if (session?.status === 'loading' || session?.status === 'loaded') return;
        if (session?.status === 'error') return;

        dispatch(spaceDetailLoading(spaceId));
        getSpaceDetail(spaceId)
            .then((rs) => {
                if (rs.code === 200) {
                    dispatch(spaceDetailLoaded({ spaceId, detail: rs.data }));
                } else {
                    dispatch(spaceDetailFailed({ spaceId, msg: rs.message || 'load failed' }));
                }
            })
            .catch(() => {
                dispatch(spaceDetailFailed({ spaceId, msg: 'network error' }));
            });
    }, [spaceId, session?.status, dispatch]);

    const detail = session?.detail as { role?: string } | undefined;
    const role = useMemo(
        () => parseSpaceRole(detail?.role) ?? parseSpaceRole(fallbackRole),
        [detail?.role, fallbackRole],
    );

    const refresh = useCallback(() => {
        if (spaceId) dispatch(invalidateSpace(spaceId));
    }, [dispatch, spaceId]);

    return {
        detail: session?.detail,
        role,
        loading: session?.status === 'loading',
        error: session?.error,
        refresh,
    };
};
