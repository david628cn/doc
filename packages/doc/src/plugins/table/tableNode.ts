import { EditorView, DecorationSet, type ViewMutationRecord } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    updateColumnsOnResize
} from 'prosemirror-tables';
import { BaseBlockView } from '../baseBlockView';
import { CLASSNAME } from '../../config';

export class TableNode extends BaseBlockView{
    inner: any;
    ctrolPanel: any;
    // colpanel: HTMLDivElement;
    // rowpanel: HTMLDivElement;
    // cellSelection: HTMLDivElement;
    table: any;
    colgroup: HTMLTableColElement;
    defaultCellMinWidth: number = 100;
    constructor(node: Node, defaultCellMinWidth: number, view: EditorView, decorations: DecorationSet) {
        super({
            node,
            view,
            getPos: () => {
                const { state } = this.view;
                
                // A. 利用当前把手容器的 DOM 矩形，抓取其屏幕上的绝对物理左上角坐标
                const rect = this.dom.getBoundingClientRect();
                
                // B. 强行调用坐标转换，将像素点反查为 ProseMirror 内部的 pos 索引 [INDEX]
                // 为了保证绝对能点中表格内部，向右下方微调 5px 像素偏移量
                const result = this.view.posAtCoords({ left: rect.left + 5, top: rect.top + 5 });
                if (!result) return 0;

                // C. 顺着反查出来的坐标点解析深度（depth），安全找到最外层名称叫 "table" 的节点起始索引
                const $pos = state.doc.resolve(result.pos);
                let tableAbsolutePos = $pos.before(1); // 默认最外层一级

                for (let d = $pos.depth; d > 0; d--) {
                    if ($pos.node(d).type.name === 'table') {
                        tableAbsolutePos = $pos.before(d); // 像素级精准锁定整张大表的起始绝对位置
                        break;
                    }
                }
                return tableAbsolutePos;
            }
        });

        this.dom.classList.add(`${CLASSNAME}-table-view`);

        this.table = document.createElement('table');
        this.table.style.setProperty(
            '--default-cell-min-width',
            `${this.defaultCellMinWidth}px`
        );

        const inner = document.createElement('div');
        inner.className = `${CLASSNAME}-table-view-inner`;
        inner.appendChild(this.table);
        this.dom.appendChild(inner);

        // this.dom.appendChild(this.table);
        this.colgroup = document.createElement('colgroup');
        this.table.appendChild(this.colgroup);
        updateColumnsOnResize(node, this.colgroup, this.table, this.defaultCellMinWidth);
        this.contentDOM = this.table.appendChild(document.createElement('tbody'));

        this.createCtrolpanel();
        this.createHandle({
            icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 4.25v15.5H4V4.25h15.5ZM4 2.25a2 2 0 0 0-2 2v15.5a2 2 0 0 0 2 2h15.5a2 2 0 0 0 2-2V4.25a2 2 0 0 0-2-2H4Z" fill="currentColor"></path><path d="M9.997 4.25v3.835H19.5v2H9.997v3.83H19.5v2H9.997v3.835h-2v-3.835H4v-2h3.997v-3.83H4v-2h3.997V4.25h2Z" fill="currentColor"></path></svg>'
        });
    }
    // onChange(e: any) {
    //     const { detail, type } = e;
    //     if (type === 'editableChanged') {
    //         const isEditable = detail;
    //         console.log('this.ctrolPanel', this.ctrolPanel);
    //         if (this.ctrolPanel) {
    //             this.ctrolPanel.style.pointerEvents = isEditable ? 'auto' : 'none';
    //             this.ctrolPanel.style.display = isEditable ? '' : 'none';
    //         }
            
    //         // 【补充可选控制】只读模式下同步禁用/隐藏拖拽手柄的外观和交互
    //         const dragHandleDom = this.dom.querySelector(`.${CLASSNAME}-drag-handle`) as HTMLElement || this.dragHandle?.dom;
    //         if (dragHandleDom) {
    //             dragHandleDom.style.pointerEvents = isEditable ? 'auto' : 'none';
    //             dragHandleDom.style.display = isEditable ? '' : 'none';
    //         }
    //     }
    // }
    onUpdate(): boolean {
        updateColumnsOnResize(this.node, this.colgroup, this.table, this.defaultCellMinWidth);
        // this.syncHandleCol(node, this.colpanel, this.colpanel, this.defaultCellMinWidth);
        // this.updateColToolbar();
        // this.updateRowToolbar();
        return true;
    }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    ignoreMutation(record: ViewMutationRecord): boolean {
        if (this.ctrolPanel.contains(record.target)) {
            return true;
        }
        return record.type == 'attributes' && (record.target == this.table || this.colgroup.contains(record.target));
    }
    // ignoreMutation(record: ViewMutationRecord): boolean {
    //     // 1. 如果变动发生在你自定义的 handle 或其子元素上，忽略它
    //     if (this.handle && (this.handle === record.target || this.handle.contains(record.target))) {
    //         return true;
    //     }

    //     // 2. 如果是属性变动（比如你手动改了 handle 的 style），忽略它
    //     if (record.type === 'attributes' && record.target === this.handle) {
    //         return true;
    //     }

    //     // 3. 其他所有变动（如用户在单元格内打字、删减内容）必须由 ProseMirror 处理
    //     return false;
    // }
    // stopEvent(event) {
    //     // 如果事件发生在你的自定义 DOM 上
    //     const isHandleClick = this.handle && this.handle.contains(event.target);
    //     if (isHandleClick) {
    //         // 阻止 ProseMirror 处理这个点击事件，防止光标乱跳
    //         return true;
    //     }
    //     return false;
    // }
    createCtrolpanel() {
        this.ctrolPanel = document.createElement('div');
        this.ctrolPanel.className = `${CLASSNAME}-table-view-ctrol-panel`;
        this.ctrolPanel.contentEditable = 'false';
        this.dom.appendChild(this.ctrolPanel); 
    }
}