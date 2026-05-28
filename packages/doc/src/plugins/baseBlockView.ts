// src/editor/base-block-view.ts
import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { createDragHandle } from './nativeDragBridge';
import { CLASSNAME } from '../config';

export type BaseBlockViewProps = {
    node: Node;
    view: EditorView;
    getPos: () => number;
}

export class BaseBlockView {
    dom: HTMLElement;
    contentDOM: HTMLElement | null | undefined;
    node: Node ;
    view: EditorView;
    getPos: () => number;
    dragHandle: any;
    constructor(props: BaseBlockViewProps) {
        this.node = props.node;
        this.view = props.view;
        this.getPos = props.getPos;
        this.dom = this.createDom();
        this.renderAttributes();
        // this.createHandle();
        // 绑定外部事件：监听中央下发的可编辑状态切换通知
        // this.view.dom.addEventListener('editableChanged', this.handleEditableChanged);
    }
    createDom(): HTMLElement {
        const dom = document.createElement('div');
        dom.className = `${CLASSNAME}-block-wrapper ${CLASSNAME}-block-type-${this.node.type.name}`;
        dom.setAttribute('data-block-type', this.node.type.name);
        return dom;
    }
    createHandle(params: any = {}) {
        // if (!this.dragHandle) {
        //     this.dragHandle = createDragHandle({
        //         container: this.dom as HTMLElement,
        //         view: this.view,
        //         getPos: this.getPos,
        //         dom: this.dom,
        //         contentDOM: this.contentDOM,
        //         ...params
        //         // onClick: () => {
        //         //     // 1. 实时获取当前块在整个文档中的绝对起始位置
        //         //     const pos = this.getPos(); 
                    
        //         //     // 2. 获取当前编辑器的状态和派发器
        //         //     const { state, dispatch } = this.view;

        //         //     // 3. 基于当前位置，创建选中整个节点的 NodeSelection
        //         //     const selection = NodeSelection.create(state.doc, pos);

        //         //     // 4. 生成新的事务并应用
        //         //     const transaction = state.tr.setSelection(selection);
        //         //     dispatch(transaction);

        //         //     // 5. 让编辑器重新获得焦点（确保高亮选区可见）
        //         //     this.view.focus();
        //         // }
        //     });
        // }
        
    }
    renderAttributes() {
        const id = this.node.attrs.dataBlockId;
        if (id) {
            // 如果你把 id 挂在最外层 div
            this.dom?.setAttribute('data-block-id', id);
            // 如果你想挂在内部的 p 标签，则用 this.contentDOM.setAttribute(...)
        } else {
            this.dom?.removeAttribute('data-block-id');
        }
    }
    handleEditableChanged = (e: any) => {
        if (e.type === 'editableChanged') {
            e.detail ? this.dragHandle.show() : this.dragHandle.hide();
        }
        this.onChange?.(e);
    }
    onChange(e: any) {}
    update(node: Node): boolean {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        this.renderAttributes();
        return this.onUpdate?.();
    }
    onUpdate() {
        return true;
    }
    destroy() {
        if (this.dom && this.dom.parentNode) {
            this.dom.remove?.(); // 强行把自定义的 div 外壳、操作柄整体在老地方灰飞烟灭
        }
        if (this.dragHandle) {
            this.dragHandle.destroy?.();
        }
        if (this.view && this.view.dom) {
            this.view.dom.removeEventListener('editableChanged', this.handleEditableChanged);
        }
        this.onDestroy?.();
    }
    onDestroy() {}
}
