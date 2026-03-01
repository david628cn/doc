import { EditorView } from 'prosemirror-view';
import {
    TableMap,
    moveTableRow,
    moveTableColumn
} from 'prosemirror-tables';
// import { DragDrop } from '@/components/dragDrop';
import { AutoScroller } from '@/components/utils/autoScroller';
import {
    closestTable,
    getAxisMap,
    getTableMatrix,
    getSafeIndex,
    getCellSpanInfo,
    getExtendedRange,
    isStay,
    selectDimensionByCell,
    closestTableView
    // getDimensionByCell,
    // getDimensionDOM,
    // closestTr
} from '@/components/docEditer/core/utils';
import { getRect, getAlignPos, setPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';


export type CtrolPanelProps = {
    view: EditorView;
    // tableView: HTMLElement | null | undefined;
    container?: HTMLElement | null | undefined;
    cell?: HTMLElement | null | undefined;
    onClickPanel?: Function;
    onStart?: Function;
    onMove?: Function;
    onEnd?: Function;
    [key: string]: unknown;
};

export class CtrolPanel {
    view: EditorView;
    tableview: HTMLElement | null | undefined;
    container: HTMLElement | null | undefined;
    table: HTMLTableElement | null | undefined;
    colPanel: HTMLElement | null | undefined;
    rowPanel: HTMLElement | null | undefined;
    indicator: HTMLElement | null | undefined;
    cell: HTMLElement | null | undefined;
    preview: HTMLElement | null | undefined;
    moving: 'col' | 'row' | null = null;
    // active: 'col' | 'row' | null = null;
    current: any;
    matrix: any;
    axis: any;
    autoScroller: AutoScroller;
    sourceRange: any;
    // fromIndex: number | null | undefined;
    toIndex: number | null | undefined;
    startXY = {
        left: 0,
        top: 0
    };
    endXY = {
        left: 0,
        top: 0
    };
    startPos: any = {
        left: 0,
        top: 0
    };
    endPos: any = {
        left: 0,
        top: 0
    };
    increase: any = {
        left: 0,
        top: 0
    };
    startPreviewRect = {
        width: 0,
        height: 0,
        left: 0,
        top: 0
    };
    endPreviewRect = {
        width: 0,
        height: 0,
        left: 0,
        top: 0
    };
    constructor(props: CtrolPanelProps) {
        Object.assign(this, props);
        // this.container = this.tableView.childNodes[1];
        this.colPanel = document.createElement('div');
        this.colPanel.className = `${CLASSNAME}-table-view-col-panel`;
        this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        this.rowPanel = document.createElement('div');
        this.rowPanel.className = `${CLASSNAME}-table-view-row-panel`;
        this.rowPanel.innerHTML = `<div class="${CLASSNAME}-table-view-row-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;

        this.indicator = document.createElement('div');
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator`;

        this.tableview = closestTableView(this.container);
        this.autoScroller = new AutoScroller(this.tableview);

        this.container.appendChild(this.colPanel);
        this.container.appendChild(this.rowPanel);
        this.container.appendChild(this.indicator);

        this.container.addEventListener('click', this.handleClickPanel, false);
        this.container.addEventListener('mousedown', this.handleStart, false);
    }
    // getPosByDom(dom: any) {
    //     let xy = dom.style.transform.split(/[(|,|)]/g);
    //     return {
    //         x: parseFloat(xy[1]),
    //         y: parseFloat(xy[2])
    //     };
    // }
    // setPos(dom: any, pos: number[]) {
    //     dom.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    //     //dom.style.left = pos[0] + 'px';
    //     //dom.style.top = pos[1] + 'px';
    // }
    onClickPanel = (e: MouseEvent, type: 'col' | 'row') => { }
    onStart(e: any, type: 'col' | 'row') { }
    onMove(e: any, type: 'col' | 'row') { }
    onEnd(e: any, type: 'col' | 'row') { }
    isTouchEvent(event: any) {
        return (
            (event.touches && event.touches.length) ||
            (event.changedTouches && event.changedTouches.length)
        );
    }
    getPosition(event: any) {
        if (event.touches && event.touches.length) {
            return {
                left: event.touches[0].pageX,
                top: event.touches[0].pageY
            };
        } else if (event.changedTouches && event.changedTouches.length) {
            return {
                left: event.changedTouches[0].pageX,
                top: event.changedTouches[0].pageY
            };
        } else {
            return {
                left: event.pageX,
                top: event.pageY
            };
        }
    }
    showIndicator(pos: number, axis: 'row' | 'col') {
        if (!this.indicator) {
            return;
        }
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator ${CLASSNAME}-table-view-ctrol-panel-${axis}-axis`;
        const containerRect = getRect(this.container);
        // const scrollLeft = getScroll(this.tableview);
        if (axis === 'row') {
            setPos(this.indicator, {
                // width: containerRect.width,
                left: 0,
                top: pos - containerRect.top
            }, true);
        } else {
            setPos(this.indicator, {
                // height: containerRect.height,
                left: pos - containerRect.left,
                top: 0
            }, true);
        }
    }
    handleClickPanel = (e: any) => {
        // if (!isTouchEvent(e)) {
        // }
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        const col = this.colPanel?.contains(e.target as Node);
        const row = this.rowPanel?.contains(e.target as Node);
        if (col || row) {
            let type: 'col' | 'row';
            if (col) {
                type = 'col';
            } else if (row) {
                type = 'row';
            }
            // selectDimensionByCell(this.view, this.cell, type);
            this.onClickPanel?.(e, type);
        }
    }
    handleStart = (e: any) => {
        // if (!isTouchEvent(e)) {
        // }
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        if (e.button !== 0 && e.button !== 1) {
            return;
        }
        const col = this.colPanel?.contains(e.target as Node);
        const row = this.rowPanel?.contains(e.target as Node);
        if (col || row) {
            let type: 'col' | 'row';
            if (col) {
                type = 'col';
                this.current = this.colPanel;
            } else if (row) {
                type = 'row';
                this.current = this.rowPanel;
            }
            selectDimensionByCell(this.view, this.cell, type);
            const rect = getRect(this.current);
            const containerRect = getRect(this.container);
            const relativeRect = {
                width: rect.width,
                height: rect.height,
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top
            };
            this.startXY = this.endXY = {
                left: relativeRect.left,
                top: relativeRect.top
            };
            const pos = this.getPosition(e);
            this.endPos = this.startPos = {
                left: pos.left,
                top: pos.top
            };
            this.moving = type;

            this.table = closestTable(this.cell);
            const tableRect = getRect(this.table);
            const cellRect = getRect(this.cell);
            const parentViewRect = getRect(this.view.dom.parentNode as HTMLDivElement);
            const relativeCellRect = {
                width: cellRect.width,
                height: cellRect.height,
                left: cellRect.left - parentViewRect.left,
                top: cellRect.top - parentViewRect.top
            };
            this.startPreviewRect = {
                width: type === 'row' ? tableRect.width : relativeCellRect.width,
                height: type === 'col' ? tableRect.height : relativeCellRect.height,
                left: relativeCellRect.left,
                top: relativeCellRect.top
            };

            // const dimension = getDimensionByCell(this.view, this.cell);
            this.matrix = getTableMatrix(this.table);
            // this.axis = getAxisMap(this.table);
            const cellSpanInfo = getCellSpanInfo(this.cell as HTMLTableCellElement, this.matrix);
            this.sourceRange = getExtendedRange(
                this.moving === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow,
                this.matrix,
                this.moving
            );

            this.toIndex = this.sourceRange.start;
            this.createPreview(this.startPreviewRect);

            this.autoScroller.clear();
            this.autoScroller.start();

            document.addEventListener('mousemove', this.handleMove, false);
            document.addEventListener('touchmove', this.handleMove, { passive: false });

            document.addEventListener('mouseup', this.handleEnd, false);
            document.addEventListener('touchend', this.handleEnd, { passive: false });
            document.addEventListener('touchcancel', this.handleEnd, { passive: false });

            this.onStart(e, this.moving);
        }
    }
    handleMove = (e: any) => {
        // if (!isTouchEvent(e)) {
        // }
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }

        if (!this.moving) {
            return;
        }

        const pos = this.getPosition(e);
        this.endPos = {
            left: pos.left,
            top: pos.top
        };

        if (this.endPos.left - this.startPos.left === 0 && this.endPos.top - this.startPos.top === 0) {
            return;
        }

        this.increase = {
            left: this.endPos.left - this.startPos.left,
            top: this.endPos.top - this.startPos.top
        };
        let left = this.startXY.left + this.increase.left;
        let top = this.startXY.top + this.increase.top;

        // if (this.moving === 'col') {
        //     top = 0;
        // } else if (this.moving === 'row') {
        //     left = 0;
        // }

        this.endXY = {
            left,
            top
        };

        const axis = getAxisMap(this.table);

        const curPos = this.moving === 'row' ? this.endPos.top : this.endPos.left;
        const lines = this.moving === 'row' ? axis.yLines : axis.xLines;

        this.toIndex = getSafeIndex(curPos, lines, this.matrix, this.moving);
        const finalPos = lines[this.toIndex];

        this.indicator.style.opacity = '1';
        this.showIndicator(finalPos, this.moving);

        this.preview.style.opacity = '1';

        left = this.moving === 'row' ? this.startPreviewRect.left : this.startPreviewRect.left + this.increase.left;
        top = this.moving === 'col' ? this.startPreviewRect.top : this.startPreviewRect.top + this.increase.top;

        setPos(this.preview, {
            left,
            top
        }, true);

        this.autoScroller.update(getRect(this.preview), getRect(this.tableview));

        this.onMove(e, this.moving);
    }
    handleEnd = (e: any) => {
        if (!this.isTouchEvent(e)) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        this.current = null;
        this.removePreview();
        this.indicator.style.opacity = '0';
        setPos(this.indicator, {
            left: 0,
            top: 0
        }, true);

        const { start, end } = this.sourceRange;
    
        if (!isStay(this.toIndex, this.sourceRange)) {
            const { state, dispatch } = this.view;

            let finalTo = this.toIndex;
            // const rangeSize = end - start + 1;
            if (finalTo > start) {
                finalTo -= 1;
            }
            try {
                const pos = this.view.posAtDOM(this.cell, 0);
                const command = this.moving === 'col'
                    ? moveTableColumn({ from: start, to: finalTo })
                    : moveTableRow({ from: start, to: finalTo });

                const success = command(state, dispatch);
                if (success) {
                    setTimeout(() => this.view.focus(), 10);
                }
            } catch (err: any) {
                console.warn("Caught Prosemirror Table Map Error:", err);
            }
            
        }

        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);

        this.autoScroller.clear();

        this.onEnd(e, this.moving);
        this.moving = null;
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
    removePreview() {
        if (this.preview && this.preview.parentNode) {
            this.preview.parentNode.removeChild(this.preview);
        }
        this.preview.innerHTML = '';
    }
    showColPanel() {
        if (this.colPanel) {
            this.colPanel.classList.add(`${CLASSNAME}-table-view-col-panel-show`);
            if (this.cell) {
                this.colPanel.style.width = `${this.cell.offsetWidth}px`;
                const pos = getAlignPos(this.colPanel, this.cell, {
                    placement: 'bl-tl',
                    container: this.container
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
                    container: this.container
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
    // show(cell?: HTMLElement) {
    //     this.container.classList.add(`${CLASSNAME}-table-view-ctrol-panel-show`);
    //     this.showColPanel(cell);
    //     this.showRowPanel(cell);
    // }
    // hide() {
    //     this.container.classList.remove(`${CLASSNAME}-table-view-ctrol-panel-show`);
    // }
}