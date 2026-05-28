import React, { createContext, useContext, useEffect, useState } from 'react';
import { wsContextPath } from '@/api';
const SocketContext = createContext<any>(null);

export const SocketProvider = ({ children, token }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        if (!token) return;

        // 1. 初始化连接 (注意 Vite 环境下用 import.meta.env 获取环境变量)
        const socket = new WebSocket(`${wsContextPath}/api/ws?token=${token}`);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // 假设后端推送的格式是 { event: "notification", payload: {...} }
            if (data.event === 'notification') {
                setLastMessage(data.payload);
                setUnreadCount(prev => prev + 1);

                // 可选：触发浏览器级别的 Notification
                new Notification(data.payload.title, { body: data.payload.content });
            }
        };

        return () => socket.close();
    }, [token]);

    return (
        <SocketContext.Provider value={{ unreadCount, setUnreadCount, lastMessage }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);