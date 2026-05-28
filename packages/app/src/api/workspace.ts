import request from './request';
import { contextPath } from './context';

/**
 * 创建工作区
 */
export const createWorkspace = async (params: { name: string; description?: string }) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/create`,
        data: JSON.stringify(params)
    });
}

export const deleteWorkspace = async (workspaceId?: string) => {
    return await request.del({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/${workspaceId}`
        // data: JSON.stringify({ workspace_id: workspaceId })
    });
}

export const leaveWorkspace = async (workspaceId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/leave`,
        data: JSON.stringify({ workspace_id: workspaceId })
    });
}

export const inviteWorkspaceMember = async (params: { 
    invitee_id: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/invite`,
        data: JSON.stringify(params)
    });
}

export const acceptInvite = async (params: { 
    invite_id: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/acceptInvite`,
        data: JSON.stringify(params)
    });
}

export const rejectInvite = async (params: { 
    invite_id: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/rejectInvite`,
        data: JSON.stringify(params)
    });
}

export const getWorkspaceMembers = async () => {
    return await request.get({
        url: `${contextPath}/api/workspace/members`
        // 不需要傳 workspace_id，後端會從 Header 裡拿
    });
}

export const removeWorkspaceMember = async (targetUserId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/removeMember`,
        data: JSON.stringify({
            // workspace_id: workspaceId,
            target_user_id: targetUserId
        })
    });
}

export const updateWorkspaceRole = async (targetUserId: string, new_role: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/updateRole`,
        data: JSON.stringify({
            new_role: new_role,
            target_user_id: targetUserId
        })
    });
}

/**
 * 獲取工作區詳情 (含成員頭像预览、實時統計及當前用戶權限)
 * @param workspaceId 工作區 ID
 */
export const getWorkspaceDetail = async (workspaceId: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/${workspaceId}`
    });
}

export const updateWorkspace = async (params: {
    id: string;
    name?: string;
    icon?: string;
    description?: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/update`,
        data: JSON.stringify(params)
    });
}

export const searchForWorkspaceInvite = async (keyword: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/searchForWorkspaceInvite`,
        data: {
            keyword
        }
    });
}

/**
 * 切换并记录最后访问的工作区
 * 后端会更新 last_access_time，确保刷新后该工作区排在第一位
 */
export const accessWorkspace = async (workspaceId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/access`,
        data: JSON.stringify({ workspace_id: workspaceId })
    });
}

export const switchDefaultWorkspace = async (workspaceId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/switch-default`,
        data: JSON.stringify({ workspace_id: workspaceId })
    });
}

/**
 * 获取我加入的工作区列表
 */
export const listMyWorkspaces = async () => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/mine`
    });
}


/**
 * 獲取我的工作區列表 (高性能版：含協作頭像牆及成員計數)
 * 對齊 WorkspaceQueryParam 結構
 */
// export const listMyWorkspaces = async (params?: {
//     search?: string;
//     page?: number;
//     page_size?: number;
//     with_members?: boolean
// }) => {
//     return await request.get({
//         headers: {
//             'Content-type': 'application/json',
//         },
//         url: `${contextPath}/api/workspaces/mine`,
//         data: params
//     });
// }

/**
 * 初始化数据：一次性获取工作区及其下的 Knowledge Spaces
 */
export const initWorkspaceData = async () => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspaces/init`
    });
}