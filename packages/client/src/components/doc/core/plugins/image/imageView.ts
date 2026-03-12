import { type Node } from 'prosemirror-model';
import { EditorView, type ViewMutationRecord } from 'prosemirror-view';
import { Resizable } from '@/components/resizable';
import { CLASSNAME } from '@/global';
import './index.less';

export class ImageView {
    dom: HTMLElement;
    contentDOM: HTMLDivElement;
    node: Node;
    view: EditorView;
    getPos: () => number;
    ctrolPanel: HTMLDivElement;
    resizable: Resizable;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        this.dom = document.createElement('span');
        this.dom.className = `${CLASSNAME}-image-view`;

        // 关键样式：确保它像一个字符一样排列，而不是一个死盒子
        this.dom.style.position = 'relative';
        this.dom.style.whiteSpace = 'nowrap';
        this.dom.style.display = 'flex';
        // this.dom.style.verticalAlign = 'bottom';
        // this.dom.style.lineHeight = '0'; // 消除图片下方的空隙
        // // 如果是 Block 模式，确保设置 contenteditable="false"
        // this.dom.contentEditable = 'false'; 

        // 2. 创建真正的图片元素 (作为 ResizableNodeView 的 target)
        const img = document.createElement('img');
        img.src = node.attrs.src;
        // 禁止原生拖拽，防止干扰缩放
        img.draggable = false;
        img.contentEditable = 'false'; 
        this.contentDOM = img;
        this.dom.appendChild(this.contentDOM);

        this.ctrolPanel = document.createElement('div');
        this.ctrolPanel.className = `${CLASSNAME}-image-view-ctrol-panel`;
        this.ctrolPanel.contentEditable = 'false';
        this.dom.appendChild(this.ctrolPanel);

        this.resizable = new Resizable({
            el: this.ctrolPanel,
            handles: 'all',
            preserveRatio: true,
            onMove: (e: any, resizeable: Resizable) => {
                this.dom.style.width = `${resizeable.endBox.width}px`;
                this.dom.style.height = `${resizeable.endBox.height}px`;
            },
            onEnd: () => {
                const rect = this.ctrolPanel.getBoundingClientRect();
                this.commitSize(rect.width, rect.height);
            }
        });
    }
    commitSize(width: number, height: number) {
        const { tr } = this.view.state;
        const pos = this.getPos();
        if (typeof pos !== 'number') {
            return;
        }

        // 派发事务更新节点属性
        this.view.dispatch(
            tr.setNodeMarkup(pos, undefined, {
                ...this.node.attrs,
                width: Math.round(width),
                height: Math.round(height),
            })
        );
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        // 当文档属性变化时（如撤销/重做），同步 DOM
        // const { width, height } = node.attrs;
        // if (width) {
        //     this.contentDOM.style.width = `${width}px`;
        // }
        // if (height) {
        //     this.contentDOM.style.height = `auto`;
        // }
        return true;
    }
    destroy() {
        if (this.resizable) {
            this.resizable.destroy();
            this.resizable = null;
        }
    }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    // ignoreMutation(record: ViewMutationRecord): boolean {
    //     if (this.dom.contains(record.target)) {
    //         return true;
    //     }
    //     return false;
    // }
    ignoreMutation(mutation: ViewMutationRecord): boolean {
        // // 1. 如果是选择（Selection）相关的变动，不要忽略（交给 PM 处理）
        if (mutation.type === 'selection') {
            return false;
        }
        // // 2. 只要变动发生在当前 NodeView 的 DOM 树内，全部忽略
        // // 这样你的 Resizable 修改 style 时，PM 就不会跳出来捣乱
        return this.dom.contains(mutation.target);

        // // 1. 忽略所有属性变化（比如你改的 style.width）
        // if (mutation.type === 'attributes') {
        //     return true;
        // }
        
        // // 2. 忽略所有子节点变动（比如 Resizable 动态增删 handle）
        // if (mutation.type === 'childList') {
        //     return true;
        // }
        
        // // 3. 默认安全：只要在当前 DOM 树内，都忽略
        // return this.dom.contains(mutation.target);
    }
}