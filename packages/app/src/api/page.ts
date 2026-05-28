import request from './request';
import { contextPath } from './context';
import { getWorkspaceIdForRequest } from '@/utils/getWorkspaceIdForRequest';

function workspaceHeaders(workspaceId?: string): Record<string, string> {
    const wid = workspaceId || getWorkspaceIdForRequest();
    return wid ? { 'X-Workspace-Id': wid } : {};
}

export const deletePage = async (id: string) => {
    return await request.del({
        url: `${contextPath}/api/workspace/page/delete?id=${encodeURIComponent(id)}`
    });
}

export type CreatePageBody = {
    space_id: string;
    parent_id?: string | null;
    title?: string;
    /** 默认 document；可选 ppt 等 */
    page_type?: string;
};

export const createPage = async (body: CreatePageBody) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/create`,
        data: JSON.stringify(body),
    });
};

export type UpdatePageMetaBody = {
    id: string;
    title?: string;
    visibility?: string;
    inherit_config?: boolean;
};

export const updatePageMeta = async (body: UpdatePageMetaBody) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/updateMeta`,
        data: JSON.stringify(body),
    });
};

export type MovePageBody = {
    page_id: string;
    space_id: string;
    new_parent_id?: string;
    prev_page_id?: string;
    next_page_id?: string;
};

export const movePage = async (body: MovePageBody) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/move`,
        data: JSON.stringify(body),
    });
};

export const savePageContent = async (id: string, content: any, version: number) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/save`,
        data: JSON.stringify({ id, content, version })
    });
}

export const getPageDetail = async (id: string) => {
    /** GET 查询串由 {@link request/index.ts doRequest} 从 `data` 序列化，不能用 `params` */
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/detail`,
        data: { id },
    });
};

export const pageTree = async (params: any) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/page/tree`,
        data: params
    });
};

/** 最近打开 / 收藏列表项 */
export type UserPageLibraryItem = {
    page_id: string;
    title: string;
    space_id: string;
    /** document / ppt；旧接口可能缺省，按文档展示 */
    page_type?: string;
    sort_time: string;
};

/** 记录最近打开（传入详情返回的 workspace_id 可避免 Redux 未同步时请求失败） */
export const touchPageRecent = async (pageId: string, workspaceId?: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
            ...workspaceHeaders(workspaceId),
        },
        url: `${contextPath}/api/workspace/page/touchRecent`,
        data: JSON.stringify({ page_id: pageId }),
    });
};

export const setPageStar = async (pageId: string, starred: boolean, workspaceId?: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
            ...workspaceHeaders(workspaceId),
        },
        url: `${contextPath}/api/workspace/page/star`,
        data: JSON.stringify({ page_id: pageId, starred }),
    });
};

export const listMyRecentPages = async (limit = 50, workspaceId?: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
            ...workspaceHeaders(workspaceId),
        },
        url: `${contextPath}/api/workspace/page/myRecent`,
        data: { limit: String(limit) },
    });
};

export const listMyStarredPages = async (limit = 50, workspaceId?: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
            ...workspaceHeaders(workspaceId),
        },
        url: `${contextPath}/api/workspace/page/myStarred`,
        data: { limit: String(limit) },
    });
};