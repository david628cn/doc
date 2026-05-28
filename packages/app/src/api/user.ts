import request from './request';
import { contextPath } from './context';

/** GET /api/social/users/search — 仅 JWT，与通讯录同属 /social（后端仍保留 /api/user/search） */
export const searchUsers = async (keyword: string) => {
	return await request.get({
		headers: {
			'Content-type': 'application/json',
		},
		url: `${contextPath}/api/social/users/search`,
		data: { keyword },
	});
};

export const me = async () => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/me`
        // data: params
    });
};

/** 对应后端 POST /api/user/profile，字段均为可选，仅提交需要更新的项 */
export const updateUserProfile = async (body: Record<string, unknown>) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/user/profile`,
        data: JSON.stringify(body),
    });
};

export const changePassword = async (params: { old_password: string; new_password: string }) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/user/password`,
        data: JSON.stringify(params),
    });
};