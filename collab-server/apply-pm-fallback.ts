/**
 * 在无 ydoc_state 时，将 Gin 返回的 ProseMirror JSON 写入 Y.XmlFragment('prosemirror')。
 * Schema 与 packages/doc 保持一致（同一套 nodes/marks）。
 */
import * as Y from 'yjs';
import { Schema } from 'prosemirror-model';
import { prosemirrorJSONToYXmlFragment } from 'y-prosemirror';
// import schemaSpec from '../packages/_doc/src/doc/schema.ts';
import schemaSpec from './schema';

const schema = new Schema(schemaSpec as any);

export function applyPmJsonToYDoc(yDocument: Y.Doc, docJson: unknown) {
	const fragment = yDocument.getXmlFragment('prosemirror');
	prosemirrorJSONToYXmlFragment(schema, docJson as any, fragment);
}
