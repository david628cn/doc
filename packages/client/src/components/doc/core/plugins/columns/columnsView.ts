import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

export class ColumnView {
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
    node: Node;
    view: EditorView;
    getPos: () => number;

    resizers: HTMLDivElement[];
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        // 2. 创建内容挂载点
        // this.contentDOM = document.createElement('div');
        // this.dom.appendChild(this.contentDOM);

        // 3. 初始化拖动柄
        this.resizers = [];
        this.renderColumns();
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        this.renderColumns();
        return true;
    }
    renderColumns() {
        console.log('this.node.childCount', this.node.childCount);
    }
}