import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * 当前登录用户（与 authSlice / 登录态一致；不要直接读 localStorage 的 user）
 */
export const useCurrentUser = () => {
    const user = useSelector((s: RootState) => s.auth.user);
    const loading = useSelector((s: RootState) => s.auth.loading);

    return useMemo(
        () => ({
            user,
            userId: user?.id,
            isAuthenticated: !!user,
            loading,
        }),
        [user, loading],
    );
};
