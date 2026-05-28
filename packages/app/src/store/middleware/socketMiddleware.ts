import { Middleware } from 'redux';
import { notification } from '@carvy/ui';
import { wsContextPath } from '@/api';

function showIncomingNotificationToast(payload: any) {
    const title =
        typeof payload?.title === 'string' && payload.title.trim() !== ''
            ? payload.title
            : '新通知';
    const content = typeof payload?.content === 'string' ? payload.content : undefined;
    notification.open({
        type: 'info',
        message: title,
        description: content,
    });
}

export const socketMiddleware = (): Middleware => {
    let socket: WebSocket | null = null;

    const closeSocket = () => {
        if (socket) {
            try {
                socket.close();
            } catch {
                /* ignore */
            }
            socket = null;
        }
    };

    return (store) => (next) => (action: any) => {
        if (action.type === 'socket/connect') {
            const { token } = action.payload;
            closeSocket();
            socket = new WebSocket(`${wsContextPath}/api/ws?token=${token}`);

            socket.onmessage = (event) => {
                let data: any;
                try {
                    data = JSON.parse(event.data as string);
                } catch {
                    return;
                }
                const { type: eventName, payload } = data;

                // --- 核心：根據後端推播的 event 類型，分發到不同的 Redux Slice ---
                switch (eventName) {
                    case 'notification': // 系統通知/邀請
                        store.dispatch({ type: 'notification/addNotification', payload });
                        showIncomingNotificationToast(payload);
                        break;
                    /** 好友申请列表等多端同步：不写 Redux 未读、不弹 Toast */
                    case 'social_friend_sync':
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent('doc-space-social-friend-sync', { detail: payload }),
                            );
                        }
                        break;
                    case 'group_invite_sync':
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent('doc-space-social-group-invite-sync', { detail: payload }),
                            );
                        }
                        break;
                    case 'chat_message': // 即時聊天消息（通讯录会话摘要刷新；无 chat reducer）
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent('doc-space-social-chat-sync', { detail: payload }),
                            );
                        }
                        break;
                    case 'doc_update': // 文檔實時更新
                        store.dispatch({ type: 'doc/updatePageContent', payload });
                        break;
                }
            };

            socket.onclose = () => {
                socket = null;
            };
        }
        if (action.type === 'socket/disconnect') {
            closeSocket();
        }
        return next(action);
    };
};