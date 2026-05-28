import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { login, loginOut } from '@/api';

// 定义空间详情接口
// type WorkspaceDetail = {
//     workspace_id: string;
//     name: string;
//     role: 'owner' | 'admin' | 'member' | 'guest';
//     slug: string;
// }

export type UserInfo = {
    id: string | number;
    username: string;
    email: string;
    head_sculpture?: string;
    real_name?: string;
    mobile?: string;
    address?: string;
    sex?: number;
    birthday?: string;
    identity_card?: string;
}

interface AuthState {
    token: string;
    user: UserInfo | null;
    // current_workspace: WorkspaceDetail | null;
    // workspaces: WorkspaceDetail[] | null;
    // workspaceId: string;
    loading: boolean;
}

// 异步 Action：切换空间
// export const switchWorkspaceAsync = createAsyncThunk(
//     'auth/switchWorkspace',
//     async (workspaceId: string, { rejectWithValue }) => {
//         try {
//             // 1. 调用接口获取该空间下的用户详情/权限
//             // 对应后端查询 sys_workspace_user 关联 sys_workspace 的数据
//             const response = await request.get(`/api/workspace/${workspaceId}/context`);

//             // 2. 更新本地持久化，确保刷新页面还在这个空间
//             localStorage.setItem('workspaceId', workspaceId);

//             return response.data; // 返回 WorkspaceDetail
//         } catch (error: any) {
//             return rejectWithValue(error.message);
//         }
//     }
// );

// 登录：处理 Token 和 LocalStorage
export const loginAsync = createAsyncThunk(
    'auth/loginAsync',
    async (params: any, { rejectWithValue }) => {
        try {
            const response = await login(params);
            const { code, data, message } = response;
            if (code === 200) {
                const token = `${data.tokenHead || ''}${data.token}`;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(data.user));
                // localStorage.setItem('workspaceId', data.workspaceId);
                // localStorage.setItem('current_workspace', JSON.stringify(data.current_workspace));
                // localStorage.setItem('workspaces', JSON.stringify(data.workspaces));
                return {
                    user: data.user,
                    token: data.token,
                    // workspaceId: data.workspaceId
                    // current_workspace: data.current_workspace,
                    // workspaces: data.workspaces
                };
            }
            return rejectWithValue(message || '登录失败');
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// 注销：调用接口并清理本地存储
export const logoutAsync = createAsyncThunk(
    'auth/logoutAsync',
    async (params: any = {}, { rejectWithValue }) => {
        try {
            const result = await loginOut(params);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('workspace_id');
            // localStorage.removeItem('workspaceId');
            // localStorage.removeItem('current_workspace');
            // localStorage.removeItem('workspaces');
            return result;
        } catch (error: any) {
            // 兜底清理
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('workspace_id');
            // localStorage.removeItem('workspaceId');
            // localStorage.removeItem('current_workspace');
            // localStorage.removeItem('workspaces');
            return rejectWithValue(error.message);
        }
    }
);

const initialState: AuthState = {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || '',
    // workspaceId: localStorage.getItem('workspaceId') || '',
    // current_workspace: JSON.parse(localStorage.getItem('current_workspace') || 'null'),
    // workspaces: JSON.parse(localStorage.getItem('workspaces') || 'null'),
    loading: false
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /** 合并更新当前登录用户信息（如资料保存后与 localStorage 同步） */
        setUser: (state, action: PayloadAction<Partial<UserInfo>>) => {
            if (!state.user) {
                state.user = action.payload as UserInfo;
            } else {
                state.user = { ...state.user, ...action.payload };
            }
            localStorage.setItem('user', JSON.stringify(state.user));
        },
        // 同步退出（用于拦截器中 401 时强制清理）
        logout: (state) => {
            state.user = null;
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('workspace_id');
            // localStorage.removeItem('workspaceId');
            // localStorage.removeItem('current_workspace');
            // localStorage.removeItem('workspaces');
        }
    },
    extraReducers: (builder) => {
        builder
            // 登录处理
            .addCase(loginAsync.pending, (state) => {
                state.loading = true;
            })
            .addCase(loginAsync.fulfilled, (state, action) => {
                state.loading = false;
                // 修正：应该只取 data 中的 user 部分赋值给 state.user
                // 这样 state.user 的结构才符合 UserInfo 类型，且与 initialState 读取的逻辑一致
                state.user = action.payload.user;
                state.token = action.payload.token;
                // state.workspaceId = action.payload.workspaceId;
                // state.current_workspace = action.payload.current_workspace;
                // state.workspaces = action.payload.workspaces;
            })
            .addCase(loginAsync.rejected, (state) => {
                state.loading = false;
            })
            // 注销处理：成功或失败都清空用户信息
            .addCase(logoutAsync.pending, (state) => {
                state.loading = true;
            })
            .addCase(logoutAsync.fulfilled, (state) => {
                state.loading = false;
                state.user = null;
                state.token = '';
                // state.workspaceId = '';
                // state.current_workspace = null;
                // state.workspaces = null;
            })
            .addCase(logoutAsync.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.token = '';
                // state.workspaceId = '';
                // state.current_workspace = null;
                // state.workspaces = null;
            })
            // .addCase(switchWorkspaceAsync.pending, (state) => {
            //     state.loading = true;
            // })
            // .addCase(switchWorkspaceAsync.fulfilled, (state, action) => {
            //     state.loading = false;
            //     // 更新当前空间上下文（包含角色权限）
            //     state.currentWorkspace = action.payload;
            // })
            // .addCase(switchWorkspaceAsync.rejected, (state) => {
            //     state.loading = false;
            // });
    }
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;