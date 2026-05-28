import request from './request';
import { contextPath } from './context';

export const checkFile = async (params?: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/file/check`,
        data: JSON.stringify(params)
    });
}

export const uploadFile = async (params?: any, data?: any) => {
    const fd = new FormData();
    fd.append('file', params.chunk);
    fd.append('index', params.index.toString());
    fd.append('hash', params.hash);
    for (const key in data) {
        fd.append(key, data[key]);
    }
    return request.post({
        url: `${contextPath}/api/file/upload`,
        data: fd,
        signal: params.signal
    });
}

export const mergeFile = async (params?: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/file/merge`,
        data: JSON.stringify(params)
    });
}

export const listFiles = async (params?: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/file/list`,
        data: JSON.stringify(params)
    });
}

export const delFiles = async (params: any) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/file/delete`,
        data: JSON.stringify(params)
    });
}