/** 应用内路径约定：pageId / workspaceId / spaceId 均为服务端全局唯一 id */

/** 从 pathname 解析当前工作区 id（`/workspace/:id` 与 `/workspace/:id/library` 等子路径） */
export const parseWorkspaceIdFromPathname = (pathname: string): string => {
    const m = pathname.match(/^\/workspace\/([^/]+)/);
    return m?.[1] ?? '';
};

export const workspaceHubPath = (workspaceId: string) => `/workspace/${workspaceId}`;

/** 当前工作区下 spaces 列表（文档库），不绑定某一个 spaceId */
export const workspaceLibraryPath = (workspaceId: string) => `/workspace/${workspaceId}/library`;

export const pageDocPath = (pageId: string) => `/page/${pageId}`;

/** 应用首页（文档入口） */
export const homePath = () => '/home';
