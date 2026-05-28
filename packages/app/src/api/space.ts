import request from './request';
import { contextPath } from './context';

/**
 * 獲取知識庫列表
 * 配合 SpaceQueryParam 結構
 */
export const listSpace = async (params?: {
    search?: string;
    page?: number;
    page_size?: number;
    with_members?: boolean
}) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/list`,
        data: params // request.get 會自動處理為 Query String
    });
}

/**
 * 創建知識庫 (Space)
 * 這裡將之前的 CreateSpaceForm 提交的數據與後端對齊
 */
export const createSpace = async (params: {
    name: string;
    description?: string;
    visibility: string;  // public, invite, private
    icon?: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/create`, // 確保路徑與路由對齊
        data: JSON.stringify(params)
    });
}


export const deleteSpace = async (id: string) => {
    return await request.del({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/${id}`,
        // data: JSON.stringify({
        //     space_id: id
        // })
    });
}

/**
 * 获取指定库 (Space) 的详情及当前用户权限
 * @param id Space 的 UUID
 */
export const getSpaceDetail = async (id: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/${id}`,
        // data: { id } // request.get 会自动将其处理为 ?id=xxx
    });
}

/**
 * 更新知識庫
 */
export const updateSpace = async (params: {
    id: string;
    name?: string;
    icon?: string;
    description?: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/update`,
        data: JSON.stringify(params)
    });
}

/**
 * 獲取空間成員管理列表
 */
export const getSpaceMembers = async (spaceId: string, search?: string) => {
    return await request.get({
        url: `${contextPath}/api/workspace/space/members`,
        data: { space_id: spaceId, search }
    });
}

// export const searchForSpaceInvite = async (keyword: string, spaceId: string) => {
//     return await request.get({
//         headers: {
//             'Content-type': 'application/json',
//         },
//         url: `${contextPath}/api/workspace/searchForSpaceInvite`,
//         data: {
//             keyword,
//             spaceId
//         }
//     });
// }

/**
 * 搜索该工作区中未加入某知识库(Space)的用户列表
 * @param keyword 搜索关键字
 * @param spaceId 库 ID
 */
export const searchForSpaceInvite = async (keyword: string, spaceId: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/searchForSpaceInvite`,
        data: {
            keyword,
            space_id: spaceId
        }
    });
}

export const inviteSpaceMember = async (params: { 
    invitee_id: string;
    space_id: string;
    role: string;
}) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/invite`,
        data: JSON.stringify(params)
    });
}

export const removeSpaceMember = async (spaceId: string, targetUserId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/removeMember`,
        data: JSON.stringify({
            space_id: spaceId,
            target_user_id: targetUserId
        })
    });
}

export const updateSpaceRole = async (spaceId: string, targetUserId: string, new_role: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/updateRole`,
        data: JSON.stringify({
            space_id: spaceId,
            new_role: new_role,
            target_user_id: targetUserId
        })
    });
}

export const leaveSpace = async (spaceId: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/workspace/space/leave`,
        data: JSON.stringify({
            space_id: spaceId
        })
    });
}