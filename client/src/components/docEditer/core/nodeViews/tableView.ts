import { type EditorView, NodeView } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';


class TableView implements NodeView {
    node: any;
    dom: any;
    contentDOM: any;
    constructor(node: Node, view: EditorView, getPos: number) {
        this.dom = document.createElement('div');
        this.dom.className = 'custom-table';
        this.contentDOM = document.createElement('img');
        this.dom.appendChild(this.contentDOM);
    }
    update(node: Node) {
        if (node.type != this.node.type) {
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
}

export default TableView;