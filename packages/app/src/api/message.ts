import request from './request';
import { contextPath, wsContextPath } from './context';

export const listNotification = async (params?: any) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/notification/list`,
        data: params
    });
};

/** 我发出的通知（邀请、加入申请等），与收件列表同一数据结构 */
export const listSentNotifications = async (params?: { pageNum?: number; pageSize?: number }) => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/notification/sent`,
        data: params ?? {},
    });
};

/** 未读通知数量（与 Redux notification.unreadCount 对齐） */
export const getNotificationUnreadCount = async () => {
    return await request.get({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/notification/unread-count`,
        data: {},
    });
};

/** 单条标记已读（notification id） */
export const markNotificationRead = async (id: string) => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/notification/read`,
        data: JSON.stringify({ id }),
    });
};

/** 全部标记已读 */
export const markAllNotificationsRead = async () => {
    return await request.post({
        headers: {
            'Content-type': 'application/json',
        },
        url: `${contextPath}/api/notification/read-all`,
        data: JSON.stringify({}),
    });
};


// 1. 定义连接函数
// export const connectWS = (token: string) => {
//     // 原生 WebSocket 连接
//     const socket = new WebSocket(`${wsContextPath}/api/ws?token=${token}`);

//     socket.onopen = () => console.log("连接已建立");

//     socket.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         // 逻辑分发
//         if (data.type === 'notification') {
//             console.log("收到通知:", data.payload);
//         }
//     };

//     // 发送消息
//     const sendMessage = (msg: any) => {
//         socket.send(JSON.stringify(msg));
//     };

//     return { socket, sendMessage };
// };