import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@hocuspocus/server';
import { Redis } from '@hocuspocus/extension-redis';
import { applyUpdate, encodeStateAsUpdate } from 'yjs';
import { applyPmJsonToYDoc } from './apply-pm-fallback';
import { extractPmAndTextFromYdocBytes } from './extract-ydoc.js';
import { tryHandleExpandYdocHttp } from './expand-ydoc-http.js';
import { applyHocuspocusSkipSelfEchoPatch } from './patch-hocuspocus-skip-self-echo';

applyHocuspocusSkipSelfEchoPatch();

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT ?? 1234);
const redisHost = process.env.REDIS_HOST ?? '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
/** Hocuspocus extension-redis 专用前缀；Gin 侧见配置 redis.key_prefix / GIN_REDIS_KEY_PREFIX，二者勿混用。 */
const redisPrefix = process.env.REDIS_PREFIX ?? 'hocuspocus';

function loadCollabFileConfig() {
	const cfgPath = join(__dirname, 'collab.config.json');
	if (!existsSync(cfgPath)) {
		return { ginBaseUrl: null, internalSecret: '' };
	}
	try {
		const j = JSON.parse(readFileSync(cfgPath, 'utf8'));
		return {
			ginBaseUrl: typeof j.ginBaseUrl === 'string' ? j.ginBaseUrl : null,
			internalSecret:
				(typeof j.internalSecret === 'string' && j.internalSecret) ||
				(typeof j.internal_secret === 'string' && j.internal_secret) ||
				'',
		};
	} catch (e) {
		console.warn('[collab-server] collab.config.json 解析失敗', e);
		return { ginBaseUrl: null, internalSecret: '' };
	}
}

const fileCfg = loadCollabFileConfig();
const ginBase = (
	process.env.GIN_BASE_URL ||
	fileCfg.ginBaseUrl ||
	'http://127.0.0.1:9000'
).replace(/\/$/, '');
const collabInternalSecret = (
	process.env.COLLAB_INTERNAL_SECRET ||
	fileCfg.internalSecret ||
	''
).trim();

/** 多副本 Hocuspocus 时必须启用（Yjs 跨实例同步）。单机开发不设 COLLAB_USE_REDIS 即可。 */
const extensions =
	process.env.COLLAB_USE_REDIS === '1'
		? [
			new Redis({
				host: redisHost,
				port: redisPort,
				prefix: redisPrefix,
			}),
		]
		: [];

type GinVerifySuccess = {
	code?: number;
	data?: { read_only?: boolean; user_id?: string };
	message?: string;
};

async function verifyWithGin(params: {
	token: string;
	documentName: string;
	connection: { readOnly: boolean };
	sessionReadOnly?: boolean;
}): Promise<void> {
	const { token, documentName, connection, sessionReadOnly } = params;
	if (!collabInternalSecret) {
		throw new Error('Collaboration misconfigured: set COLLAB_INTERNAL_SECRET (must match Gin)');
	}
	const url = `${ginBase}/internal/collab/verify`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Collab-Internal-Secret': collabInternalSecret,
		},
		body: JSON.stringify({
			token: token.trim(),
			document_name: documentName,
			...(sessionReadOnly ? { session_read_only: true } : {}),
		}),
	});
	const text = await res.text();
	let body: GinVerifySuccess;
	try {
		body = text ? (JSON.parse(text) as GinVerifySuccess) : {};
	} catch {
		throw new Error(`Gin verify: invalid JSON (${res.status})`);
	}
	if (!res.ok || body.code !== 200 || body.data == null) {
		const hint = body.message || text?.slice(0, 120) || res.statusText;
		throw new Error(hint || 'Unauthorized');
	}
	connection.readOnly = Boolean(body.data.read_only);
}

const server = Server.configure({
	port,
	debounce: Number(process.env.STORE_DEBOUNCE_MS ?? 5000),
	maxDebounce: Number(process.env.STORE_MAX_DEBOUNCE_MS ?? 30000),
	extensions,
	async onRequest({ request, response }) {
		const handled = await tryHandleExpandYdocHttp(request, response, collabInternalSecret);
		if (handled) {
			// 跳过 Hocuspocus 默认再 writeHead/end('OK')（见 Server.ts requestHandler）
			throw null;
		}
	},
	async onAuthenticate(data) {
		const { token, documentName, connection, requestParameters } = data as {
			token: string;
			documentName: string;
			connection: { readOnly: boolean };
			requestParameters?: URLSearchParams;
		};
		const sr = requestParameters?.get('session_read_only');
		const sessionReadOnly = sr === '1' || sr === 'true';
		/** 本地演示：未登录仍用占位 token 时可开启（勿用于生产） */
		const devBypass =
			process.env.COLLAB_ALLOW_VALID_TOKEN === '1' && token?.trim() === 'valid-token';
		if (devBypass) {
			connection.readOnly = sessionReadOnly;
			return;
		}
		if (!token?.trim()) {
			throw new Error('Unauthorized: missing token');
		}
		await verifyWithGin({ token, documentName, connection, sessionReadOnly });
	},
	async onLoadDocument({ document, documentName }) {
		if (!collabInternalSecret) {
			console.warn(
				'[onLoadDocument] 跳过：未配置 COLLAB_INTERNAL_SECRET / collab.config.json internalSecret，编辑器将一直是空文档',
			);
			return;
		}
		const url = `${ginBase}/internal/collab/ydoc/${encodeURIComponent(documentName)}`;
		const res = await fetch(url, {
			headers: { 'X-Collab-Internal-Secret': collabInternalSecret },
		});
		const ct = res.headers.get('content-type') || '';
		if (res.status === 404) {
			console.warn(`[onLoadDocument] Gin 404：页面不存在 ${documentName}（room 须等于 sys_page.id）`);
			return;
		}
		if (res.status === 204) {
			console.warn(
				`[onLoadDocument] Gin 204：无 ydoc_state 且无 content JSON，${documentName} 将以空文档打开`,
			);
			return;
		}
		if (!res.ok) {
			console.warn('[onLoadDocument] Gin 响应异常', res.status, await res.text());
			return;
		}
		if (ct.includes('application/json')) {
			let data: { kind?: string; doc?: unknown };
			try {
				data = (await res.json()) as { kind?: string; doc?: unknown };
			} catch (e) {
				console.warn('[onLoadDocument] JSON 解析失败', e);
				return;
			}
			if (data.kind === 'pm_json' && data.doc != null) {
				try {
					applyPmJsonToYDoc(document, data.doc);
					console.info(`[onLoadDocument] ${documentName} ← Gin pm_json（无 ydoc 快照时用 content 种子）`);
				} catch (e) {
					console.error('[onLoadDocument] PM JSON → Y 失败（schema 与正文是否匹配）', e);
				}
				return;
			}
			console.warn('[onLoadDocument] JSON 响应非 pm_json', data);
			return;
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		if (buf.byteLength === 0) {
			console.warn(`[onLoadDocument] ${documentName} 二进制体为空`);
			return;
		}
		try {
			applyUpdate(document, buf);
			console.info(`[onLoadDocument] ${documentName} ← ydoc 二进制 ${buf.byteLength} bytes`);
		} catch (e) {
			console.error('[onLoadDocument] applyUpdate 失败', e);
		}
	},
	async onStoreDocument({ document, documentName }) {
		if (!collabInternalSecret) {
			return;
		}
		const buf = encodeStateAsUpdate(document);
		if (buf.byteLength === 0) {
			return;
		}
		const ydocBase64 = Buffer.from(buf).toString('base64');
		let content: Record<string, unknown> | undefined;
		let content_text: string | undefined;
		try {
			const ex = extractPmAndTextFromYdocBytes(buf);
			content = ex.pmDoc;
			content_text = ex.contentText;
		} catch (e) {
			console.warn('[onStoreDocument] 提取 PM / content_text 失败（仍将写入 ydoc）', e);
		}
		const persistUrl = `${ginBase}/internal/collab/persist-ydoc`;
		const res = await fetch(persistUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Collab-Internal-Secret': collabInternalSecret,
			},
			body: JSON.stringify({
				document_name: documentName,
				ydoc_base64: ydocBase64,
				...(content != null ? { content } : {}),
				...(content_text != null && content_text !== '' ? { content_text } : {}),
			}),
		});
		if (!res.ok) {
			console.error('[onStoreDocument] persist-ydoc 失败', res.status, await res.text());
		}
	},
});

server.listen();

console.log(
	`✅ Hocuspocus 运行在 :${port}（Load/Persist → ${ginBase}；POST /internal/collab/expand-ydoc 同端口；密钥：${collabInternalSecret ? '已配置' : '未配置'}；Redis 同步：${process.env.COLLAB_USE_REDIS === '1' ? '开' : '关'}）`,
);
