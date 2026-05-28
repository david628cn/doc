import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { CLASSNAME } from '../../config';
import './index.less';


export class BookmarkView {
    dom: HTMLElement;
    content: HTMLElement;
    bookmark: HTMLDivElement;
    node: Node;
    view: EditorView;
    getPos: () => number;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        this.dom = document.createElement('div');
        this.dom.className = `${CLASSNAME}-bookmark-view`;

        // 关键样式：确保它像一个字符一样排列，而不是一个死盒子
        // this.dom.style.position = 'relative';
        this.dom.style.display = 'inline-block';
        this.dom.style.overflow = 'auto';
        this.dom.contentEditable = 'false';
        this.content = document.createElement('div');
        this.content.className = `${CLASSNAME}-bookmark-view-content`;
        this.content.style.position = 'relative';
        this.content.style.display = 'flex';
        this.content.contentEditable = 'false';
        this.bookmark = document.createElement('div');
        this.updateStatus();

        this.content.appendChild(this.bookmark);
        this.dom.appendChild(this.content);
    }
    updateStatus() {
        if (!this.bookmark || !this.node) {
            return;
        }
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        // 当文档属性变化时（如撤销/重做），同步 DOM
        this.node = node;
        this.updateStatus();
        return true;
    }
    destroy() {
    }
}