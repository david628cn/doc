import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
// import { Slice, Fragment } from 'prosemirror-model';
// import type { EditorView } from 'prosemirror-view';
import { v4 as uuidv4 } from 'uuid';

export const uniqueIDPluginKey = new PluginKey('uniqueID');

export const uniqueID = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: uniqueIDPluginKey,
        appendTransaction: (transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) => {
            // 1. 检查文档是否发生变化
            const hasDocChanges = transactions.some(transaction => transaction.docChanged) && !oldState.doc.eq(newState.doc);
            if (!hasDocChanges) {
                return;
            }

            const { tr }: any = newState;

            // 2. 遍历文档节点
            newState.doc.descendants((node, pos) => {
                // 3. 如果是需要 ID 的节点且 ID 缺失或重复，则分配新 ID
                // if (node.type.name === 'paragraph' && !node.attrs.dataBlockId) {
                if (node.type.name !== 'text' && !node.attrs.dataBlockId) {
                    tr.setNodeMarkup(pos, null, { 
                        ...node.attrs, 
                        dataBlockId: uuidv4() 
                    });
                }
            });

            // tr.setMeta('addToHistory', false);
            // view.dispatch(tr);

            return tr;
        },
        props: {

        }
    });
    return plugin;
}