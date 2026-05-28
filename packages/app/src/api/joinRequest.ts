import request from './request';
import { contextPath } from './context';

/** 我发出的加入申请（分页） */
export const listSentJoinRequests = async (params?: { pageNum?: number; pageSize?: number }) => {
    return await request.get({
        headers: { 'Content-type': 'application/json' },
        url: `${contextPath}/api/join-requests/sent`,
        data: params ?? {},
    });
};

/** 申请加入工作区（当前用户非该工作区成员时） */
export const requestJoinWorkspace = async (workspaceId: string, message?: string) => {
    return await request.post({
        headers: { 'Content-type': 'application/json' },
        url: `${contextPath}/api/workspaces/${workspaceId}/join-request`,
        data: JSON.stringify({ message: message ?? '' }),
    });
};

/** 申请加入库（需请求头 X-Workspace-ID；仅 private/invite 且当前库内角色低于编辑者） */
export const requestJoinSpace = async (spaceId: string, message?: string) => {
    return await request.post({
        headers: { 'Content-type': 'application/json' },
        url: `${contextPath}/api/workspace/space/join-request`,
        data: JSON.stringify({ space_id: spaceId, message: message ?? '' }),
    });
};

/** 管理员通过加入申请（body 无） */
export const approveJoinRequest = async (joinRequestId: string) => {
    return await request.post({
        headers: { 'Content-type': 'application/json' },
        url: `${contextPath}/api/join-requests/${joinRequestId}/approve`,
        data: JSON.stringify({}),
    });
};

/** 管理员拒绝加入申请 */
export const rejectJoinRequest = async (joinRequestId: string) => {
    return await request.post({
        headers: { 'Content-type': 'application/json' },
        url: `${contextPath}/api/join-requests/${joinRequestId}/reject`,
        data: JSON.stringify({}),
    });
};
