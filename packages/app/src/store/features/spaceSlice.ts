import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { logout, logoutAsync } from './authSlice';

export type SpaceSessionStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SpaceSession {
    status: SpaceSessionStatus;
    detail?: unknown;
    error?: string;
}

export interface SpaceState {
    byId: Record<string, SpaceSession>;
}

const initialState: SpaceState = { byId: {} };

const spaceSlice = createSlice({
    name: 'space',
    initialState,
    reducers: {
        spaceDetailLoading: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            state.byId[id] = {
                ...state.byId[id],
                status: 'loading',
                error: undefined,
            };
        },
        spaceDetailLoaded: (state, action: PayloadAction<{ spaceId: string; detail: unknown }>) => {
            const { spaceId, detail } = action.payload;
            state.byId[spaceId] = {
                status: 'loaded',
                detail,
                error: undefined,
            };
        },
        spaceDetailFailed: (state, action: PayloadAction<{ spaceId: string; msg: string }>) => {
            const { spaceId, msg } = action.payload;
            state.byId[spaceId] = {
                status: 'error',
                error: msg,
            };
        },
        invalidateSpace: (state, action: PayloadAction<string>) => {
            delete state.byId[action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(logout, () => initialState)
            .addCase(logoutAsync.fulfilled, () => initialState)
            .addCase(logoutAsync.rejected, () => initialState);
    },
});

export const { spaceDetailLoading, spaceDetailLoaded, spaceDetailFailed, invalidateSpace } =
    spaceSlice.actions;
export default spaceSlice.reducer;
