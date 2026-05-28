import { store } from '@/store';
import { parseWorkspaceIdFromPathname } from '@/utils/appPaths';

/**
 * 供非 React 的 fetch 层使用：当前工作区 id 以 Redux 为唯一数据源；
 * me() 尚未写入前，在浏览器内可用地址栏 /workspace/:id 作兜底（与路由一致）。
 */
export function getWorkspaceIdForRequest(): string {
    const fromStore = store.getState().workspace.workspaceId;
    if (fromStore) return fromStore;
    if (typeof window !== 'undefined') {
        const fromUrl = parseWorkspaceIdFromPathname(window.location.pathname);
        if (fromUrl) return fromUrl;
    }
    return '';
}
