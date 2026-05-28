import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
    list: any[];
    unreadCount: number;
    isConnected: boolean;
}

const initialState: NotificationState = {
    list: [],
    unreadCount: 0,
    isConnected: false,
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        // 當收到 WS 消息時調用
        addNotification: (state, action: PayloadAction<any>) => {
            state.list.unshift(action.payload);
            state.unreadCount += 1;
        },
        // 更新連接狀態
        setWsStatus: (state, action: PayloadAction<boolean>) => {
            state.isConnected = action.payload;
        },
        // 清除未讀
        clearUnread: (state) => {
            state.unreadCount = 0;
        },
        /** 与服务端同步未读条数（登录后拉取、标记已读后刷新等） */
        setUnreadCount: (state, action: PayloadAction<number>) => {
            const n = action.payload;
            state.unreadCount = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
        },
    },
});

export const { addNotification, setWsStatus, clearUnread, setUnreadCount } =
    notificationSlice.actions;
export default notificationSlice.reducer;