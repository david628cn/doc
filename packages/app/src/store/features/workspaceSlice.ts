import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { WorkspaceRole, WorkspaceRolePriority } from '@/constants';
import { logout, logoutAsync } from './authSlice';

export type UserWorkspaceRow = {
    workspace_id: string;
    name: string;
    icon?: string;
    slug?: string;
    role: WorkspaceRole;
    is_default?: boolean;
};

/** me() 原始数据；在 reducer 中落入强类型 state */
export type SetMePayload = {
    current_workspace?: any;
    workspaces?: any[];
};

export interface WorkspaceState {
    workspaceId: string;
    role?: WorkspaceRole;
    workspaces: UserWorkspaceRow[];
    currentWorkspace: UserWorkspaceRow | null;
    initialized: boolean;
}

const initialState: WorkspaceState = {
    workspaceId: '',
    role: undefined,
    workspaces: [],
    currentWorkspace: null,
    initialized: false,
};

const clearWorkspaceInState = (state: WorkspaceState) => {
    state.workspaceId = '';
    state.role = undefined;
    state.workspaces = [];
    state.currentWorkspace = null;
    state.initialized = false;
};

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        /** 以 me() 的 current_workspace 为当前工作区权威（唯一数据源，供 X-Workspace-Id 经 store 读取） */
        setMe: (state, action: PayloadAction<SetMePayload>) => {
            const { current_workspace, workspaces = [] } = action.payload;
            state.workspaces = (workspaces || []) as UserWorkspaceRow[];
            if (current_workspace) {
                state.workspaceId = current_workspace.workspace_id;
                state.role = isWorkspaceRowRole(current_workspace.role)
                    ? current_workspace.role
                    : undefined;
                state.currentWorkspace = current_workspace as UserWorkspaceRow;
            } else {
                state.workspaceId = '';
                state.role = undefined;
                state.currentWorkspace = null;
            }
            state.initialized = true;
        },
        /** 显式切换等场景（如 accessWorkspace 后本地先行对齐）；日常以 setMe 为准 */
        setWorkspaceId: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            state.workspaceId = id;
            const row = state.workspaces.find((w) => w.workspace_id === id);
            if (row) {
                state.role = isWorkspaceRowRole(row.role) ? row.role : state.role;
                state.currentWorkspace = row;
            } else if (id) {
                state.role = undefined;
                state.currentWorkspace = null;
            } else {
                state.role = undefined;
                state.currentWorkspace = null;
            }
        },
        addWorkspace: (state, action: PayloadAction<UserWorkspaceRow>) => {
            state.workspaces = [...state.workspaces, action.payload];
        },
        /** 修改工作区资料（名称、图标等）后合并进当前工作区与 workspaces 列表 */
        patchWorkspaceInfo: (
            state,
            action: PayloadAction<{
                workspace_id: string;
                name?: string;
                icon?: string;
                slug?: string;
            }>,
        ) => {
            const { workspace_id, ...patch } = action.payload;
            if (!workspace_id) return;
            if (state.currentWorkspace?.workspace_id === workspace_id) {
                state.currentWorkspace = { ...state.currentWorkspace, ...patch };
            }
            const idx = state.workspaces.findIndex((w) => w.workspace_id === workspace_id);
            if (idx >= 0) {
                state.workspaces[idx] = { ...state.workspaces[idx], ...patch };
            }
        },
        clearWorkspace: (state) => {
            clearWorkspaceInState(state);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(logout, (state) => {
                clearWorkspaceInState(state);
            })
            .addCase(logoutAsync.fulfilled, (state) => {
                clearWorkspaceInState(state);
            })
            .addCase(logoutAsync.rejected, (state) => {
                clearWorkspaceInState(state);
            });
    },
});

function isWorkspaceRowRole(r: unknown): r is WorkspaceRole {
    return typeof r === 'string' && r in WorkspaceRolePriority;
}

export const { setMe, setWorkspaceId, addWorkspace, patchWorkspaceInfo, clearWorkspace } =
    workspaceSlice.actions;
export default workspaceSlice.reducer;
