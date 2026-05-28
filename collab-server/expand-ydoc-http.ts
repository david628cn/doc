/**
 * Gin Worker / webhook 仅持有 ydoc 字节时反解 PM JSON；可与 Hocuspocus 共用 HTTP 端口（见 server.ts onRequest）。
 */
import type { IncomingMessage } from 'node:http';
import { extractPmAndTextFromYdocBytes } from './extract-ydoc.js';

export function readHttpBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

/** 处理 POST /internal/collab/expand-ydoc；成功并已 end 时返回 true（调用方需跳过默认响应） */
export async function tryHandleExpandYdocHttp(
	request: IncomingMessage,
	response: { statusCode: number; setHeader: (n: string, v: string) => void; end: (b?: string) => void },
	secret: string,
): Promise<boolean> {
	const path = request.url?.split('?')[0] ?? '';
	if (request.method !== 'POST' || path !== '/internal/collab/expand-ydoc') {
		return false;
	}
	const hdr = request.headers['x-collab-internal-secret'];
	if (!secret || hdr !== secret) {
		response.statusCode = 401;
		response.end('Unauthorized');
		return true;
	}
	let body: string;
	try {
		body = await readHttpBody(request);
	} catch {
		response.statusCode = 400;
		response.end('bad body');
		return true;
	}
	try {
		const j = JSON.parse(body) as { ydoc_base64?: string };
		const b64 = j.ydoc_base64?.trim();
		if (!b64) {
			response.statusCode = 400;
			response.end('missing ydoc_base64');
			return true;
		}
		const raw = Buffer.from(b64, 'base64');
		const { pmDoc, contentText } = extractPmAndTextFromYdocBytes(new Uint8Array(raw));
		response.setHeader('Content-Type', 'application/json; charset=utf-8');
		response.statusCode = 200;
		response.end(JSON.stringify({ doc: pmDoc, content_text: contentText }));
		return true;
	} catch (e) {
		response.statusCode = 500;
		response.end(e instanceof Error ? e.message : String(e));
		return true;
	}
}
