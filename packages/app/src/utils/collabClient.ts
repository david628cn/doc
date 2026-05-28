import { collabContextPath } from '@/api/context';
/**
 * 浏览器端协同 WebSocket / Token，与 `@carvy/doc` 的 {@link CollaborationOptions} 对齐。
 *
 * **认证链路**：`getCollabToken()` → Hocuspocus `token` → `editor/collab-server` **`onAuthenticate`**
 * → Gin **`POST /internal/collab/verify`**（Header `X-Collab-Internal-Secret`）校验 JWT 与页面权限。
 * 因此须使用 **与 REST API 相同的登录 JWT**（`localStorage.token`）。
 *
 * 本地未登录演示：collab-server 可设 **`COLLAB_ALLOW_VALID_TOKEN=1`**，此时占位 **`valid-token`** 可通过鉴权。
 *
 * collab-server 默认端口见部署；可用 **`VITE_COLLAB_WS_URL`** 覆盖 WebSocket 根地址。
 */

const viteEnv =
	typeof import.meta !== 'undefined'
		? (import.meta as ImportMeta & { env?: Record<string, string> }).env
		: undefined;

/** 与 Gin 签发 JWT 一致；优先登录态 `token`，其次构建期 `VITE_COLLAB_TOKEN`，最后演示占位 `valid-token` */
export function getCollabToken(): string {
	const login = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
	if (login && login.trim() !== '') {
		return login.trim();
	}
	const t = viteEnv?.VITE_COLLAB_TOKEN;
	if (typeof t === 'string' && t.trim() !== '') {
		return t.trim();
	}
	return 'valid-token';
}

/**
 * WebSocket URL：显式 env → 按当前页协议选 ws/wss + hostname:1234 → 127.0.0.1:1234。
 *
 * **Safari / HTTPS**：页面为 `https:` 时必须使用 `wss:`，否则浏览器会阻止 WebSocket（协同静音失败：
 * 本地仍能打字，但变更不会到达 Hocuspocus，其它浏览器看不到）。生产请在网关为协同端口或路径配置 TLS，
 * 并设置 **`VITE_COLLAB_WS_URL`**（例如 `wss://your.host/collab`）。
 */
export function getCollabWebSocketUrl(): string {
	// const explicit = viteEnv?.VITE_COLLAB_WS_URL;
	// if (typeof explicit === 'string' && explicit.trim() !== '') {
	// 	return explicit.trim();
	// }
	// if (typeof window !== 'undefined' && window.location?.hostname) {
	// 	const secure = window.location.protocol === 'https:';
	// 	const scheme = secure ? 'wss' : 'ws';
	// 	return `${scheme}://${window.location.hostname}:1234`;
	// }
	return collabContextPath;
	// return 'ws://101.37.100.161:1234';
	// return 'ws://127.0.0.1:1234';
}
