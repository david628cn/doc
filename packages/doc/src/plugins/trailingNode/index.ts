import { Plugin, PluginKey, type Transaction, type EditorState } from "prosemirror-state";
import { type EditorView } from 'prosemirror-view';
// 锁死插件的唯一 Key
export const trailingNodeKey = new PluginKey("trailingNode");

/**
 * 工业级成熟方案：完全复刻 Tiptap 尾部永远留一个空文本块的保底插件
 */
export const trailingNode = () => {
    return new Plugin({
        key: trailingNodeKey,

        // 🌟 核心拦截：在所有数据变更准备落盘前进行数据树审计
        appendTransaction(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) {
            // 检查当前这一帧里有没有任何一个事务被注入了为真的阻断标记
            const hasDraggingMeta = transactions.some(tr => tr.getMeta("isDragging") === true);

            // 🌟 如果当前正处于拖拽的临界 Transaction 中，放行不插手
            if (hasDraggingMeta) {
                return null;
            }

            // 如果抓到的是刚才我们配好的、为 false 的解锁事务，或者用户普通的正常打字，强制启动全量数据树审计
            const { doc, schema } = newState;
            const lastChild = doc.lastChild;
            if (!lastChild) return null;

            // 刚性定义重型块
            const forbiddenLastNodeTypes = ["code_block", "table", "bullet_list", "ordered_list", "blockquote", "horizontal_rule", "image"];
            const isForbiddenType = forbiddenLastNodeTypes.includes(lastChild.type.name);

            if (isForbiddenType) {
                const tr = newState.tr;
                const paragraphType = schema.nodes.paragraph;
                if (paragraphType) {
                    const emptyParagraph = paragraphType.createAndFill();
                    if (emptyParagraph) {
                        // 在绝对最末尾灌入保底空行，自愈空心化
                        tr.insert(doc.content.size, emptyParagraph);
                        tr.setMeta("addToHistory", false); // 防 Ctrl+Z 闪烁卡死
                        return tr;
                    }
                }
            }
            return null;
        }
    });
};
