import { EditorView } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    TableView
} from 'prosemirror-tables';
import { pluginKey } from './index';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';




export class TableEx extends TableView {
    view: EditorView;
    getPos: Function;
    toolbar: HTMLDivElement;
    cellProxy: HTMLDivElement;
    defaultCellMinWidth: number = 100;
    constructor(node: Node, defaultCellMinWidth: number, view: EditorView, getPos: () => number) {
        super(node, defaultCellMinWidth);
        this.view = view;
        this.getPos = getPos;
        this.dom.className = `${CLASSNAME}-table-view`;
        this.createToolbar();
        this.dom.appendChild(this.toolbar);
        this.updateToolbar(node);
    }
    update(node: Node): boolean {
        console.log('pluginState >>>')
        const updated = super.update(node);
        if (updated) {
            this.updateToolbar(node);
        }
        
        return updated;
    }
    // update(node: Node): boolean {
    //     if (node.type !== this.node.type) {
    //         return false;
    //     }
    //     this.node = node;
    //     updateColumnsOnResize(node, this.colgroup, this.table, this.defaultCellMinWidth);
    //     return true;
    // }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    // ignoreMutation(record: ViewMutationRecord): boolean {
    //     return (
    //         record.type == 'attributes' &&
    //         (record.target == this.table || this.colgroup.contains(record.target))
    //     );
    // }

    // 必须处理 stopEvent，防止面板上的点击触发编辑器的选区更改
    // stopEvent(event: any) {
    //     return this.toolbar.contains(event.target);
    // }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = `${CLASSNAME}-table-view-toolbar`;
        this.toolbar.contentEditable = 'false'; // 必须！防止光标跳入

        this.cellProxy = document.createElement('div');
        // this.cellProxy.style.width = `300px`;
        // this.cellProxy.style.height = `30px`;
        this.cellProxy.style.position = 'absolute';
        this.cellProxy.style.border = '2px solid #2383e2';
        this.cellProxy.style.background = 'transparent';

        this.toolbar.appendChild(this.cellProxy);
        // toolbar.innerHTML = `<div class="notion-table-cell" style="isolation: auto;"><div class="notion-simple-table-selector" style="transform: translateX(-50%); top: -3px; inset-inline-start: 50%; width: 18px; height: 6px; opacity: 1; z-index: 4; position: absolute; border-radius: 4px; cursor: pointer; background: var(--c-icoTer); border: 2px solid var(--c-bacPri);"></div><div class="notion-simple-table-selector" style="transform: translateY(-50%); inset-inline-start: -3px; top: 50%; width: 6px; height: 18px; opacity: 1; z-index: 4; position: absolute; border-radius: 4px; cursor: pointer; background: var(--c-icoTer); border: 2px solid var(--c-bacPri);"></div><div id=":r10:" class="notion-table-cell-text content-editable-leaf-rtl notranslate" spellcheck="true" placeholder=" " contenteditable="true" data-content-editable-leaf="true" role="textbox" aria-multiline="true" tabindex="0" aria-roledescription="表格单元格 1 行 1 列" style="max-width: 100%; width: 100%; white-space: break-spaces; word-break: break-word; caret-color: var(--c-texPri); padding: 7px 9px; background-color: transparent; font-size: 14px; line-height: 20px;">a</div><div style="position: absolute; inset-inline-end: 0px; width: 0px; top: 0px; flex-grow: 0; height: 100%; z-index: 1; pointer-events: none;"><div style="position: absolute; width: 3px; margin-inline-start: -1px; margin-top: -1px; height: calc(100% + 2px); transition: background 150ms 50ms; cursor: col-resize; background: rgba(35, 131, 226, 0);"></div></div></div>`;

        return toolbar;
    }
    updateToolbar(node: Node) {
        
        const pluginState = pluginKey.getState(this.view.state);
        console.log('pluginState', pluginState)
        if (pluginState.rect) {
            console.log(this.cellProxy, pluginState.rect);
            this.cellProxy.style.width = `${pluginState.rect.width}px`;
            this.cellProxy.style.height = `${pluginState.rect.height}px`;
            setAlignPos(this.cellProxy, pluginState.rect, {
                placement: 'tl-tl',
                container: this.toolbar
            });
        }
        
    }

}