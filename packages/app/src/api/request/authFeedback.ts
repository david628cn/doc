import { Alert } from '@carvy/ui';
import history from '@/utils/history';
import { store } from '@/store';
import { logout } from '@/store/features/authSlice';

const DEBOUNCE_MS = 2000;

let last401At = 0;
let last403At = 0;

/** 业务 JSON 或 HTTP 401：清会话、提示、回登录（防抖避免并发请求刷屏） */
export function applyUnified401(serverMessage?: string) {
    const now = Date.now();
    if (now - last401At < DEBOUNCE_MS) return;
    last401At = now;

    store.dispatch(logout());
    Alert.warning({
        message: '登录状态已失效',
        description: (serverMessage && String(serverMessage).trim()) || '请重新登录后继续操作。',
    });
    if (history.location.pathname !== '/login') {
        history.replace({ pathname: '/login', state: { from: history.location } });
    }
}

/** 业务 JSON 或 HTTP 403：仅提示（防抖） */
export function applyUnified403(serverMessage?: string) {
    const now = Date.now();
    if (now - last403At < DEBOUNCE_MS) return;
    last403At = now;

    Alert.error({
        message: '没有权限',
        description: (serverMessage && String(serverMessage).trim()) || '当前账号无权执行此操作。',
    });
}
