import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import notificationReducer from './features/notification';
import workspaceReducer from './features/workspaceSlice';
import spaceReducer from './features/spaceSlice';
import { socketMiddleware } from './middleware/socketMiddleware';

export const store = configureStore({
    reducer: {
        notification: notificationReducer,
        auth: authReducer, // 对应之前的 login 节点，这里改名为 auth 更符合语义
        workspace: workspaceReducer,
        space: spaceReducer,
    },
    middleware: (getDefault) => 
    getDefault().concat(socketMiddleware()),
});

// 定义 RootState 类型给 useSelector 使用
export type RootState = ReturnType<typeof store.getState>;
// 定义 AppDispatch 类型给 useDispatch 使用
export type AppDispatch = typeof store.dispatch;