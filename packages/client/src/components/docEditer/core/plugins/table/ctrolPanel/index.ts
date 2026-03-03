import { EditorView } from 'prosemirror-view';
import {
    // TableMap,
    // moveTableRow,
    // moveTableColumn,
    CellSelection,
    cellAround
} from 'prosemirror-tables';
import { DragDrop } from '@/components/dragDrop';
import {
    getAxisMap,
    // getTableMatrix,
    getSafeInfo,
    // getCellSpanInfo,
    getCellSpanInfoByCellNode,
    getExtendedRange,
    selectCellDimension,
    findParentNodeClosestToPos,
    getTableNodeMatrix,
    getCellSelectionDOMRect,
    getNodeRect,
    getCellDimensionRect
    // getDimensionByCell,
    // getDimensionDOM,
    // closestTr
} from '@/components/docEditer/core/utils';
import { getRect, getAlignPos, setPos } from '@/components/utils/align';
import { moveTableRowEx as moveTableRow, moveTableColumnEx as moveTableColumn } from './utils';
import { CLASSNAME } from '@/global';
import './index.less';


export type CtrolPanelProps = {
    view: EditorView;
    tableContainer: HTMLElement | null | undefined;
    // container?: HTMLElement | null | undefined;
    cell?: HTMLElement | null | undefined;
    // onClickPanel?: Function;
    // onStart?: Function;
    // onMove?: Function;
    // onEnd?: Function;
    [key: string]: unknown;
};

export class CtrolPanel {
    view: EditorView;
    tableContainer: HTMLElement | null | undefined;
    ctrolPanel: HTMLElement | null | undefined;
    table: HTMLTableElement | null | undefined;
    colPanel: HTMLElement | null | undefined;
    rowPanel: HTMLElement | null | undefined;
    indicator: HTMLElement | null | undefined;
    cell: HTMLElement | null | undefined;
    moving: 'col' | 'row' | null = null;
    colDrag: DragDrop;
    rowDrag: DragDrop;
    current: any;
    matrix: any;
    sourceRange: any;
    toIndex: number | null | undefined;
    preview: HTMLElement | null | undefined;
    previewRect = {
        width: 0,
        height: 0,
        left: 0,
        top: 0
    };
    static selectRect: any;
    constructor(props: CtrolPanelProps) {
        Object.assign(this, props);
        const inner = this.tableContainer.childNodes[0] as HTMLElement;
        this.table = inner.firstChild as HTMLTableElement;
        this.ctrolPanel = this.tableContainer.childNodes[1] as HTMLElement;

        const svg = `<svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20"><path d="M6.25 4a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m5 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m1.25 7.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5M6.25 10a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m6.25 7.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5M6.25 16a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0"></path></svg>`;

        this.colPanel = document.createElement('div');
        this.colPanel.className = `${CLASSNAME}-table-view-col-panel`;
        // this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner">${svg}</div>`;
        
        this.rowPanel = document.createElement('div');
        this.rowPanel.className = `${CLASSNAME}-table-view-row-panel`;
        this.rowPanel.innerHTML = `<div class="${CLASSNAME}-table-view-row-panel-inner">${svg}</div>`;

        this.indicator = document.createElement('div');
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator`;

        this.ctrolPanel.appendChild(this.colPanel);
        this.ctrolPanel.appendChild(this.rowPanel);
        this.ctrolPanel.appendChild(this.indicator);

        [this.colPanel.firstChild, this.rowPanel.firstChild].forEach((handle: any, index: number) => {
            const type = index === 0 ? 'col' : 'row';
            this.colDrag = new DragDrop({
                handle,
                container: this.tableContainer,
                // preview: this.preview,
                translate: true,
                onStart: (e: any, drag: DragDrop) => {
                    this.handleStart(type, drag);
                },
                onMove: (e: any, drag: DragDrop) => {
                    this.handleMove(type, drag);
                },
                onEnd: (e: any, drag: DragDrop) => {
                    this.handleEnd(type, drag);
                }
            });
        });

        // this.ctrolPanel.addEventListener('click', this.handleClickPanel, false);
    }

    // onClickPanel = (e: MouseEvent, type: 'col' | 'row') => { }
    // onStart(e: any, type: 'col' | 'row') { }
    // onMove(e: any, type: 'col' | 'row') { }
    // onEnd(e: any, type: 'col' | 'row') { }

    // handleClickPanel = (e: any) => {
    //     // if (!isTouchEvent(e)) {
    //     // }
    //     if (e.preventDefault) {
    //         e.preventDefault();
    //     } else {
    //         e.returnValue = false;
    //     }
    //     if (e.stopPropagation) {
    //         e.stopPropagation();
    //     } else {
    //         e.cancelBubble = true;
    //     }
    //     const col = this.colPanel?.contains(e.target as Node);
    //     const row = this.rowPanel?.contains(e.target as Node);
    //     if (col || row) {
    //         let type: 'col' | 'row';
    //         if (col) {
    //             type = 'col';
    //         } else if (row) {
    //             type = 'row';
    //         }
    //         // selectDimensionByCell(this.view, this.cell, type);
    //         this.onClickPanel?.(e, type);
    //     }
    // }
    handleStart(type: 'col' | 'row' = 'row', drag: DragDrop) {
        selectCellDimension(this.view, this.cell as HTMLTableCellElement, type);
        const cellPos = this.view.posAtDOM(this.cell, 0);
        const $cellPos = this.view.state.doc.resolve(cellPos);
        const tableNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
        const cellNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
        // if (tableNodeInfo) {
        const tableNode = tableNodeInfo.node;
        this.matrix = getTableNodeMatrix(tableNode);
        const cellSpanInfo = getCellSpanInfoByCellNode(cellNodeInfo.node, this.matrix);
        this.sourceRange = getExtendedRange(
            type === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow,
            this.matrix,
            type
        );
        this.toIndex = this.sourceRange.start;
        this.previewRect = getCellDimensionRect(this.view, this.cell as HTMLTableCellElement, type, this.view.dom.parentNode as HTMLDivElement);
        this.createPreview(this.previewRect);
        drag.preview = this.preview;
    }
    handleMove(type: 'col' | 'row' = 'row', drag: DragDrop) {
        this.moving = type;
        const safeInfo = getSafeInfo(drag.endPos, getAxisMap(this.table), this.matrix, type);
        this.toIndex = safeInfo.index;
        this.showIndicator(safeInfo.pos, type);
        setPos(this.preview, {
            left: type === 'row' ? this.previewRect.left : this.previewRect.left + drag.increase.left,
            top: type === 'col' ? this.previewRect.top : this.previewRect.top + drag.increase.top
        }, true);
    }
    handleEnd(type: 'col' | 'row' = 'row', drag: DragDrop) {
        drag.preview = null;
        this.moving = null;
        this.current = null;
        this.hidePreview();
        this.hideIndicator();

        const { start, end } = this.sourceRange;
        let finalTo = this.toIndex;

        // if (finalTo >= start && finalTo <= end + 1) {
        //     console.log('原地移动');
        // } else {

        // }
        if (finalTo < start || finalTo > end + 1) {
            // 2. 核心换算逻辑
            if (finalTo > end) {
                // 向后移：目标索引减去移动块的大小
                // finalTo = finalTo - (end - start + 1);
                finalTo = finalTo - 1;
            }
            const { state, dispatch } = this.view;
            try {
                const command = type === 'col'
                    ? moveTableColumn({ from: start, to: finalTo, select: true })
                    : moveTableRow({ from: start, to: finalTo, select: true });
                const success = command(state, dispatch);
                // if (success) {
                //     setTimeout(() => {
                //         selectCellDimension(this.view, this.cell as HTMLTableCellElement, type);
                //     }, 1000);

                // }
            } catch (err: any) {
                console.warn("Caught Prosemirror Table Map Error:", err);
            }
        }


        // 1. 拦截原地移动：目标线在源块的范围内（start 到 end+1）
        // if (finalTo < start || finalTo > end + 1) {
        //     const { state, dispatch } = this.view;

        //     if (finalTo > start) {
        //         // finalTo = finalTo - (end - start + 1);
        //         finalTo = finalTo - 1;
        //     }

        //     try {
        //         const command = type === 'col'
        //             ? moveTableColumn({ from: start, to: finalTo })
        //             : moveTableRow({ from: start, to: finalTo });
        //         command(state, dispatch);
        //         // const success = command(state, dispatch);
        //         // if (success) {
        //         //     setTimeout(() => this.view.focus(), 10);
        //         // }
        //     } catch (err: any) {
        //         console.warn("Caught Prosemirror Table Map Error:", err);
        //     }
        // }
    }
    createPreview(rect?: any) {
        if (this.preview && this.preview.parentNode) {
            this.preview.parentNode.removeChild(this.preview);
        }
        if (!this.preview) {
            this.preview = document.createElement('div');
            this.preview.className = `${CLASSNAME}-table-view-ctrol-panel-preview`;
        }
        // if (content) {
        //     this.preview.appendChild(content);
        // }
        this.preview.style.opacity = '1';
        if (rect) {
            this.preview.style.width = `${rect.width}px`;
            this.preview.style.height = `${rect.height}px`;
            setPos(this.preview, {
                left: rect.left,
                top: rect.top
            }, true);
        }
        this.view.dom.parentNode.appendChild(this.preview);
    }
    hidePreview() {
        if (this.preview && this.preview.parentNode) {
            this.preview.parentNode.removeChild(this.preview);
        }
        this.preview.style.opacity = '0';
        this.preview.innerHTML = '';
    }
    showIndicator(pos: number, axis: 'row' | 'col') {
        if (!this.indicator) {
            return;
        }
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator ${CLASSNAME}-table-view-ctrol-panel-${axis}-axis`;
        this.indicator.style.opacity = '1';
        const ctrolPanelRect = getRect(this.ctrolPanel);
        // const scrollLeft = getScroll(this.tableContainer);
        if (axis === 'row') {
            setPos(this.indicator, {
                // width: containerRect.width,
                left: 0,
                top: pos - ctrolPanelRect.top
            }, true);
        } else {
            setPos(this.indicator, {
                // height: containerRect.height,
                left: pos - ctrolPanelRect.left,
                top: 0
            }, true);
        }
    }
    hideIndicator() {
        this.indicator.style.opacity = '0';
        setPos(this.indicator, {
            left: 0,
            top: 0
        }, true);
    }
    showColPanel() {
        if (this.colPanel) {
            this.colPanel.classList.add(`${CLASSNAME}-table-view-col-panel-show`);
            if (this.cell) {
                this.colPanel.style.width = `${this.cell.offsetWidth}px`;
                const pos = getAlignPos(this.colPanel, this.cell, {
                    placement: 'bl-tl',
                    container: this.ctrolPanel
                });
                setPos(this.colPanel, {
                    ...pos,
                    top: 0
                }, true);
            }
        }
    }
    hideColPanel() {
        if (this.colPanel) {
            this.colPanel.classList.remove(`${CLASSNAME}-table-view-col-panel-show`);
        }
    }
    showRowPanel() {
        if (this.rowPanel) {
            this.rowPanel.classList.add(`${CLASSNAME}-table-view-row-panel-show`);
            if (this.cell) {
                this.rowPanel.style.height = `${this.cell.offsetHeight}px`;
                const pos = getAlignPos(this.rowPanel, this.cell, {
                    placement: 'tr-tl',
                    container: this.ctrolPanel
                });
                setPos(this.rowPanel, {
                    ...pos,
                    left: 0
                }, true);
            }
        }
    }
    hideRowPanel() {
        if (this.rowPanel) {
            this.rowPanel.classList.remove(`${CLASSNAME}-table-view-row-panel-show`);
        }
    }
    getSelectionCellsRect() {
        const { selection } = this.view.state;
        let rect = null;
        if (selection instanceof CellSelection) {
            rect = getCellSelectionDOMRect(this.view, selection);
        } else {
            const { $anchor } = selection;
            const cell = cellAround($anchor);
            if (cell) {
                rect = getNodeRect(this.view, cell.pos)
            }
        }
        // const tableNodeInfo = findParentNodeClosestToPos(selection.$from, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
        // const dom = view.nodeDOM(tableNodeInfo.pos); 
        // const tableContainer = closestTableView(dom);
        // const curCtolPanel = ctrolPanelMap.get(tableContainer);
        return rect;

    }
    showSelectionCells() {
        if (!CtrolPanel.selectRect) {
            CtrolPanel.selectRect = document.createElement('div');
            CtrolPanel.selectRect.className = `${CLASSNAME}-table-view-cell-selection`;
            const inner = document.createElement('div');
            inner.className = `${CLASSNAME}-table-view-cell-selection-inner`;
            CtrolPanel.selectRect.appendChild(inner);
        }
        if (CtrolPanel.selectRect.parentNode) {
            CtrolPanel.selectRect.parentNode.removeChild(CtrolPanel.selectRect);
        }
        const rect = this.getSelectionCellsRect();
        CtrolPanel.selectRect.style.width = `${rect.width}px`;
        CtrolPanel.selectRect.style.height = `${rect.height}px`;
        const ctrolPanelRect = getRect(this.ctrolPanel);
        // const l = getPadding(scrop.ctrolPanel, 'l');
        // const t = getPadding(scrop.ctrolPanel, 't');
        setPos(CtrolPanel.selectRect, {
            left: rect.left - ctrolPanelRect.left,
            top: rect.top - ctrolPanelRect.top
        }, true);
        this.ctrolPanel.appendChild(CtrolPanel.selectRect);
    }
    destroy() {
        this.colDrag.destroy();
        this.rowDrag.destroy();
    }
}