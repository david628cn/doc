import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { BaseBlockView } from '../baseBlockView';


export class ParagraphView extends BaseBlockView {
    constructor(node: Node, view: EditorView, getPos: () => number) {
        super({
            node,
            view,
            getPos
        });
        this.contentDOM = document.createElement('p');
        this.syncTextAlign();
        this.dom.appendChild(this.contentDOM);
        this.createHandle({
            icon: `<svg
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V7C21 7.55228 20.5523 8 20 8C19.4477 8 19 7.55228 19 7V5H13V19H15C15.5523 19 16 19.4477 16 20C16 20.5523 15.5523 21 15 21H9C8.44772 21 8 20.5523 8 20C8 19.4477 8.44772 19 9 19H11V5H5V7C5 7.55228 4.55228 8 4 8C3.44772 8 3 7.55228 3 7V4Z"
                        fill="currentColor"
                    ></path>
                </svg>`
        });
    }
    onUpdate() {
        this.syncTextAlign();
        return true;
    }
    private syncTextAlign() {
        if (!this.contentDOM) return;
        const align = this.node.attrs.textAlign;
        if (align && align !== 'left') {
            // 设置对应的 text-align 样式
            this.contentDOM.style.textAlign = align;
        } else {
            // 如果是默认的 left 或者是 null，将其清除恢复原生对齐
            this.contentDOM.style.textAlign = '';
        }
    }
}