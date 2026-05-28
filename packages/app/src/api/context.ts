// 构建时设 VITE_CONTEXT_PATH=（空串）→ 相对路径，配合 Nginx 同域反代；未设置则默认本地 Gin
const raw = import.meta.env.VITE_CONTEXT_PATH as string | undefined;
const trim = (s: string) => s.replace(/\/$/, '');
// const HOST = '101.37.100.161'; // 'http://127.0.0.1:9000'; //'http://101.37.100.161:9000'
const HOST = '127.0.0.1';
export const contextPath = raw === '' ? '' : raw !== undefined ? trim(raw) : `http://${HOST}:9000`;
export const imageBasePath = contextPath === '' ? '' : contextPath;
export const wsContextPath = contextPath.replace(/^http(s)?/, 'ws$1');
export const collabContextPath = `ws://${HOST}:1234`;