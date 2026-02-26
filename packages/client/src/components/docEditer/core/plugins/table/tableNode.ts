import { EditorView, DecorationSet, type ViewMutationRecord } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    updateColumnsOnResize,
    TableMap
} from 'prosemirror-tables';
import { pluginKey } from './index';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';

export class TableNode {
    node: Node;
    view: EditorView;
    getPos: Function;
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
    inner: HTMLDivElement;
    ctrolPanel: HTMLDivElement;
    // colpanel: HTMLDivElement;
    // rowpanel: HTMLDivElement;
    // cellSelection: HTMLDivElement;
    table: any;
    colgroup: HTMLTableColElement;
    defaultCellMinWidth: number = 100;
    constructor(node: Node, defaultCellMinWidth: number, view: EditorView, decorations: DecorationSet) {
        this.node = node;
        this.view = view;
        // this.getPos = getPos;
        this.dom = document.createElement('div');
        this.dom.className = `${CLASSNAME}-table-view`;
        // this.dom.setAttribute('data-block-id', node.attrs.dataBlockId);

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
        // this.createCellSelection();
        // this.syncHandleCol(node, this.colpanel, this.colpanel, this.defaultCellMinWidth);

        // this.dom.appendChild(ctrolpanel);
        // this.dom.appendChild(cellSelection);
        // this.createColToolbar();
        // this.createRowToolbar();
        // this.table.__nodeView = this;
        // const observer = new ResizeObserver(() => {

        // });

        // this.dom.appendChild(this.toolbar);
        // this.updateToolbar(node);
    }
    // update(node: Node): boolean {
    //     console.log('pluginState >>>')
    //     const updated = super.update(node);
    //     if (updated) {
    //         this.updateToolbar(node);
    //     }

    //     return updated;
    // }
    update(node: Node, decorations: DecorationSet): boolean {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        updateColumnsOnResize(node, this.colgroup, this.table, this.defaultCellMinWidth);
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

        // this.colpanel = document.createElement('div');
        // this.colpanel.className = `${CLASSNAME}-table-view-colpanel`;
        // this.colpanel.innerHTML = `<div class="${CLASSNAME}-table-view-colpanel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        // this.ctrolPanel.appendChild(this.colpanel);

        // this.rowpanel = document.createElement('div');
        // this.rowpanel.className = `${CLASSNAME}-table-view-rowpanel`;
        // this.rowpanel.innerHTML = `<div class="${CLASSNAME}-table-view-rowpanel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        // this.ctrolPanel.appendChild(this.rowpanel);

        this.dom.appendChild(this.ctrolPanel);
    }
    // createCellSelection() {
    //     this.cellSelection = document.createElement('div');
    //     this.cellSelection.className = `${CLASSNAME}-table-view-cell-selection`;
    //     this.cellSelection.contentEditable = 'false';
    //     this.dom.appendChild(this.cellSelection);
    // }
    // syncHandleCol(
    //     node: Node,
    //     colgroup: HTMLDivElement,
    //     container: HTMLDivElement,
    //     defaultCellMinWidth: number,
    //     overrideCol?: number,
    //     overrideValue?: number
    // ) {
    //     let totalWidth = 0;
    //     let fixedWidth = true;
    //     let nextDOM = colgroup.firstChild as HTMLElement;
    //     const row = node.firstChild;
    //     if (!row) return;

    //     for (let i = 0, col = 0; i < row.childCount; i++) {
    //         const { colspan, colwidth } = row.child(i).attrs;
    //         for (let j = 0; j < colspan; j++, col++) {
    //             const hasWidth =
    //                 overrideCol === col ? overrideValue : colwidth && colwidth[j];
    //             const cssWidth = hasWidth ? hasWidth + 'px' : '';
    //             totalWidth += hasWidth || defaultCellMinWidth;
    //             if (!hasWidth) fixedWidth = false;
    //             if (!nextDOM) {
    //                 const col = document.createElement('div');
    //                 col.className = `${CLASSNAME}-table-view-handle-inner`;
    //                 col.style.width = cssWidth;
    //                 colgroup.appendChild(col);
    //             } else {
    //                 if (nextDOM.style.width != cssWidth) {
    //                     nextDOM.style.width = cssWidth;
    //                 }
    //                 nextDOM = nextDOM.nextSibling as HTMLElement;
    //             }
    //         }
    //     }

    //     while (nextDOM) {
    //         const after = nextDOM.nextSibling;
    //         nextDOM.parentNode?.removeChild(nextDOM);
    //         nextDOM = after as HTMLElement;
    //     }

    //     if (fixedWidth) {
    //         container.style.width = totalWidth + 'px';
    //         container.style.minWidth = '';
    //     } else {
    //         container.style.width = '';
    //         container.style.minWidth = totalWidth + 'px';
    //     }
    // }
    // syncRowHandles() {
    //     const table = this.node;
    //     const map = TableMap.get(table);

    //     for (let i = 0; i < map.height; i++) {
    //         // 找到每一行第一个单元格在 Table 中的相对位置
    //         const cellPos = map.map[i * map.width];
    //         const cellNode = table.nodeAt(cellPos);

    //         // 获取对应的 DOM 节点（ProseMirror 会自动渲染这些 td）
    //         // 注意：这里需要通过视图找到该 cell 的 DOM
    //         // const cellDOM = this.table.querySelector(`[data-cell-pos="${cellPos}"]`) ||
    //         //     this.table.rows[i].cells[0];

    //         // if (cellDOM && !cellDOM.querySelector('.row-handle')) {
    //         //     const handle = document.createElement("div");
    //         //     handle.className = "row-handle";
    //         //     handle.contentEditable = "false";
    //         //     // handle.onclick = (e) => {
    //         //     //     e.stopPropagation();
    //         //     //     this.selectRow(i);
    //         //     // };
    //         //     cellDOM.prepend(handle);
    //         // }
    //     }
    // }
    // 必须处理 stopEvent，防止面板上的点击触发编辑器的选区更改
    // stopEvent(event: any) {
    //     return this.toolbar.contains(event.target);
    // }
    //     createColToolbar() {
    //         const map = TableMap.get(this.node);

    //         // --- 1. 定位列锚点 (Top) ---
    //         const cols = this.table.querySelectorAll('col');
    //         // 注意：prosemirror-tables 插件通常会确保 col 数量等于 map.width

    //         const toolbar = document.createElement('div');
    //         toolbar.className = `${CLASSNAME}-table-view-col-toolbar`;
    //         let accumulatedLeft = 0;

    //         for (let i = 0; i < map.width; i++) {
    //             const colDOM = cols[i];
    //             if (!colDOM) continue;

    //             const width = colDOM.getBoundingClientRect().width;
    //             const anchor = document.createElement('div');

    //             anchor.className = `${CLASSNAME}-table-view-col-anchor`;
    //             anchor.style.position = "absolute";
    //             anchor.style.left = `${accumulatedLeft}px`;
    //             anchor.style.width = `${width}px`;
    //             anchor.innerText = String.fromCharCode(65 + i);

    //             toolbar.appendChild(anchor);
    //             accumulatedLeft += width;
    //         }
    //         this.dom.appendChild(toolbar);

    //     }

}