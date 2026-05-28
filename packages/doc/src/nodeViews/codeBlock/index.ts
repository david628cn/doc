import { type EditorView, NodeView } from 'prosemirror-view';
import { Selection } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { exitCode } from 'prosemirror-commands';
import { EditorView as CMView, keymap } from '@codemirror/view';
import { EditorState as CMState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { indentUnit, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { CLASSNAME } from '../../config';
import './index.less';

export class CodeBlock implements NodeView {
    dom: any;
    cm: CMView;
    updating: boolean = false;
    node: any;
    contentDOM: any;
    getPos: any;
    view: any;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        // 1. 创建容器
        this.dom = document.createElement('div');
        this.dom.className = `${CLASSNAME}-cm-node-view`;

        // 2. 初始化 CodeMirror 状态
        const startState = CMState.create({
            doc: node.textContent,
            extensions: [
                basicSetup,
                javascript(), // 动态语言加载建议放在 shared 中定义映射
                // syntaxHighlighting(defaultHighlightStyle), 
                CMView.lineWrapping,
                indentUnit.of('    '),
                keymap.of([
                    ...defaultKeymap,
                    indentWithTab,
                    { key: "ArrowUp", run: () => this.maybeEscape("up") },
                    { key: "ArrowDown", run: () => this.maybeEscape("down") },
                    {
                        key: "Ctrl-Enter", run: () => {
                            if (exitCode(view.state, view.dispatch)) view.focus();
                            return true;
                        }
                    }
                ]),
                CMView.updateListener.of(update => {
                    if (update.docChanged && !this.updating) {
                        this.syncToProseMirror(update.state.doc.toString());
                    }
                }),
                oneDark
            ]
        });

        this.cm = new CMView({ state: startState, parent: this.dom });
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        this.contentDOM.innerHTML = '';
        // super.update(node);
        return true;
    }
    destroy() {
        // 清理资源
    }
    syncToProseMirror(content: string) {
        /**
        * 将 CodeMirror 内部的变更同步到 ProseMirror 文档
        */
        const { state, dispatch } = this.view;
        const pos = this.getPos();

        if (typeof pos !== 'number') return; // 确保节点还在文档中

        // 计算代码块内部文本的范围
        // pos 是 code_block 节点的起点，+1 进入内容区
        // nodeSize - 1 是 code_block 节点的终点
        const start = pos + 1;
        const end = start + this.node.content.size;

        // 使用 replaceWith 而不是 insertText 效率更高，
        // 且能保持 Yjs 对整个文本块的原子性处理。
        const tr = state.tr.replaceWith(
            start,
            end,
            state.schema.text(content)
        );

        // 关键：标记该事务为“来自 NodeView”，防止 update 钩子再次反向触发 CodeMirror 更新
        tr.setMeta("addToHistory", false); // 可选：避免产生冗余的撤销记录
        tr.setMeta("fromNodeView", true);

        dispatch(tr);
    }
    maybeEscape(dir: "up" | "down"): boolean {
        /**
        * 判断光标是否在第一行（向上逃逸）或最后一行（向下逃逸）
        * @param dir 逃逸方向
        * @returns boolean 如果返回 true，则表示交给 ProseMirror 处理，CM 停止拦截
        */
        const { state } = this.cm;
        const { main } = state.selection; // 获取 CM 当前的主选区

        // 仅在单光标且非选择状态下触发逃逸
        if (!main.empty) return false;

        const pos = main.from;
        const line = state.doc.lineAt(pos);

        if (dir === "up") {
            // 判断是否在第一行
            if (line.number === 1) {
                // 这里的逻辑：如果已经在第一行按上键，手动聚焦到 ProseMirror
                // 并将光标置于代码块之前
                const pmPos = this.getPos();
                this.view.focus();
                const tr = this.view.state.tr.setSelection(
                    Selection.near(this.view.state.doc.resolve(pmPos))
                );
                this.view.dispatch(tr);
                return true;
            }
        } else if (dir === "down") {
            // 判断是否在最后一行
            if (line.number === state.doc.lines) {
                const pmPos = this.getPos() + this.node.nodeSize;
                this.view.focus();
                const tr = this.view.state.tr.setSelection(
                    Selection.near(this.view.state.doc.resolve(pmPos))
                );
                this.view.dispatch(tr);
                return true;
            }
        }

        return false;
    }
}