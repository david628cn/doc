import { EditorView, DecorationSet, type ViewMutationRecord } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    updateColumnsOnResize,
    TableMap
} from 'prosemirror-tables';
import { pluginKey } from './index';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';

export class TableViewEx {
    node: Node;
    view: EditorView;
    getPos: Function;
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
    inner: HTMLDivElement;
    ctrolpanel: HTMLDivElement;
    cellSelection: HTMLDivElement;
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
        this.createCellSelection();

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
        // this.updateColToolbar();
        // this.updateRowToolbar();
        return true;
    }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    ignoreMutation(record: ViewMutationRecord): boolean {
        return (
            record.type == 'attributes' &&
            (record.target == this.table
                || this.colgroup.contains(record.target)
                || this.cellSelection.contains(record.target)
                || this.ctrolpanel.contains(record.target)
            )
        );
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
        const dom = document.createElement('div');
        dom.className = `${CLASSNAME}-table-view-ctrolpanel`;
        dom.contentEditable = 'false';
        this.dom.appendChild(dom);
        this.ctrolpanel = dom;
    }
    createCellSelection() {
        const dom = document.createElement('div');
        dom.className = `${CLASSNAME}-table-view-cell-selection`;
        dom.contentEditable = 'false';
        this.dom.appendChild(dom);
        this.cellSelection = dom;
    }
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
    //     createRowToolbar() {
    //         const map = TableMap.get(this.node);
    //         // --- 2. 定位行锚点 (Left) ---
    //         const rows = this.table.querySelectorAll('tr');

    //         const toolbar = document.createElement('div');
    //         toolbar.className = `${CLASSNAME}-table-view-row-toolbar`;
    //         let accumulatedTop = 0;
    // console.log(rows, map.height);
    //         for (let i = 0; i < map.height; i++) {
    //             const rowDOM = rows[i];
    //             if (!rowDOM) continue;

    //             const height = rowDOM.getBoundingClientRect().height;
    //             const anchor = document.createElement('div');

    //             anchor.className = `${CLASSNAME}-table-view-row-anchor`;
    //             anchor.style.position = "absolute";
    //             anchor.style.top = `${accumulatedTop}px`;
    //             anchor.style.height = `${height}px`;
    //             anchor.innerText = String.fromCharCode(65 + i);

    //             toolbar.appendChild(anchor);
    //             accumulatedTop += height;
    //         }
    //         this.dom.appendChild(toolbar);
    //     }
    // createColToolbar() {
    //     const toolbar = document.createElement('div');
    //     toolbar.className = `${CLASSNAME}-table-view-col-toolbar`;
    //     toolbar.contentEditable = 'false';
    //     // const map = TableMap.get(this.node);
    //     // const tableNode = this.view.state.doc.nodeAt(this.getPos());
    //     // const rs = calculateTableTotals(this.table);
    //     // console.log('map', rs);
    //     // for (let i = 0; i < map.width; i++) {
    //     //     const anchor = document.createElement("div");
    //     //     anchor.className = `${CLASSNAME}-table-view-col-anchor`;
    //     //     toolbar.appendChild(anchor);
    //     // }
    //     this.dom.appendChild(toolbar);
    //     this.updateColToolbar();
    // }
    // updateColToolbar() {
    //     // setTimeout(() => {
    //     const tbody: any = this.table.querySelector('tbody');
    //     // const rows = tbody.childNodes();        
    //     // }, 0);

    // }
    // createRowToolbar() {
    //     const toolbar = document.createElement('div');
    //     toolbar.className = `${CLASSNAME}-table-view-row-toolbar`;
    //     toolbar.contentEditable = 'false';
    //     // const map = TableMap.get(this.node);
    //     // for (let i = 0; i < map.height; i++) {
    //     //     const anchor = document.createElement("div");
    //     //     anchor.className = `${CLASSNAME}-table-view-row-anchor`;
    //     //     toolbar.appendChild(anchor);
    //     // }
    //     this.dom.appendChild(toolbar);
    //     this.updateRowToolbar();
    // }
    // updateRowToolbar() {

    // }
    // createToolbar() {
    //     this.toolbar = document.createElement('div');
    //     this.toolbar.className = `${CLASSNAME}-table-view-toolbar`;
    //     this.toolbar.contentEditable = 'false'; // 必须！防止光标跳入

    //     this.cellProxy = document.createElement('div');
    //     // this.cellProxy.style.width = `300px`;
    //     // this.cellProxy.style.height = `30px`;
    //     this.cellProxy.style.position = 'absolute';
    //     this.cellProxy.style.border = '2px solid #2383e2';
    //     this.cellProxy.style.background = 'transparent';

    //     this.toolbar.appendChild(this.cellProxy);
    //     // toolbar.innerHTML = `<div class="notion-table-cell" style="isolation: auto;"><div class="notion-simple-table-selector" style="transform: translateX(-50%); top: -3px; inset-inline-start: 50%; width: 18px; height: 6px; opacity: 1; z-index: 4; position: absolute; border-radius: 4px; cursor: pointer; background: var(--c-icoTer); border: 2px solid var(--c-bacPri);"></div><div class="notion-simple-table-selector" style="transform: translateY(-50%); inset-inline-start: -3px; top: 50%; width: 6px; height: 18px; opacity: 1; z-index: 4; position: absolute; border-radius: 4px; cursor: pointer; background: var(--c-icoTer); border: 2px solid var(--c-bacPri);"></div><div id=":r10:" class="notion-table-cell-text content-editable-leaf-rtl notranslate" spellcheck="true" placeholder=" " contenteditable="true" data-content-editable-leaf="true" role="textbox" aria-multiline="true" tabindex="0" aria-roledescription="表格单元格 1 行 1 列" style="max-width: 100%; width: 100%; white-space: break-spaces; word-break: break-word; caret-color: var(--c-texPri); padding: 7px 9px; background-color: transparent; font-size: 14px; line-height: 20px;">a</div><div style="position: absolute; inset-inline-end: 0px; width: 0px; top: 0px; flex-grow: 0; height: 100%; z-index: 1; pointer-events: none;"><div style="position: absolute; width: 3px; margin-inline-start: -1px; margin-top: -1px; height: calc(100% + 2px); transition: background 150ms 50ms; cursor: col-resize; background: rgba(35, 131, 226, 0);"></div></div></div>`;

    //     return toolbar;
    // }
    // updateToolbar(node: Node) {

    //     const pluginState = pluginKey.getState(this.view.state);
    //     console.log('pluginState', pluginState)
    //     if (pluginState.rect) {
    //         console.log(this.cellProxy, pluginState.rect);
    //         this.cellProxy.style.width = `${pluginState.rect.width}px`;
    //         this.cellProxy.style.height = `${pluginState.rect.height}px`;
    //         setAlignPos(this.cellProxy, pluginState.rect, {
    //             placement: 'tl-tl',
    //             container: this.toolbar
    //         });
    //     }

    // }

}