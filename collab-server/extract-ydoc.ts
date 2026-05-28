/**
 * 从 Yjs 协作文档字节提取 ProseMirror JSON 与纯文本（供 Gin 同步 content / content_text）。
 */
import * as Y from 'yjs';
import { yXmlFragmentToProsemirrorJSON } from 'y-prosemirror';

function pmNodeToPlainText(node: unknown): string {
	if (node == null || typeof node !== 'object') {
		return '';
	}
	const n = node as Record<string, unknown>;
	if (typeof n.text === 'string') {
		return n.text;
	}
	const content = n.content;
	if (Array.isArray(content)) {
		return content.map(pmNodeToPlainText).join('');
	}
	return '';
}

/** 合并空白，便于检索 */
export function normalizeSearchText(s: string): string {
	return s.replace(/\s+/gu, ' ').trim();
}

export type ExtractYdocResult = {
	pmDoc: Record<string, unknown>;
	contentText: string;
};

/** 对 encodeStateAsUpdate 得到的完整 Yjs 快照字节解码后提取 */
export function extractPmAndTextFromYdocBytes(buf: Uint8Array): ExtractYdocResult {
	const doc = new Y.Doc();
	Y.applyUpdate(doc, buf);
	const pmDoc = yXmlFragmentToProsemirrorJSON(doc.getXmlFragment('prosemirror')) as Record<string, unknown>;
	const rawText = pmNodeToPlainText(pmDoc);
	return {
		pmDoc,
		contentText: normalizeSearchText(rawText),
	};
}
