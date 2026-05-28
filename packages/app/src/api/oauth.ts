import request from './request';
import { contextPath } from './context';

export const login = async (params: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/login`,
        data: JSON.stringify(params)
    });
}

export const loginOut = async (params?: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/logout`,
        data: JSON.stringify(params)
    });
}

export const register = async (params?: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/register`,
        data: JSON.stringify(params)
    });
}

export const checkUsername = async (username: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/checkUsername`,
        data: {
            username
        }
    });
}

export const checkMobile = async (mobile: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/checkMobile`,
        data: {
            mobile
        }
    });
}

export const checkEmail = async (email: string) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/oauth/checkEmail`,
        data: {
            email
        }
    });
}