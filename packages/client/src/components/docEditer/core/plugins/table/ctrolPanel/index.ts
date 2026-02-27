// import { DragDrop } from '@/components/dragDrop';
import { getRect, getAlignPos, setPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';

export type CtrolPanelProps = {
    // tableView: HTMLElement | null | undefined;
    container?: HTMLElement | null | undefined;
    onClickPanel?: Function;
    onStart?: Function;
    onMove?: Function;
    onEnd?: Function;
    [key: string]: unknown;
};

export class CtrolPanel {
    // tableView
    container: HTMLElement | null | undefined;
    colPanel: HTMLElement | null | undefined;
    rowPanel: HTMLElement | null | undefined;
    cell: HTMLElement | null | undefined;
    moving: 'col' | 'row' | null = null;
    active: 'col' | 'row' | null = null;
    current: any;
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
    constructor(props: CtrolPanelProps) {
        Object.assign(this, props);
        // this.container = this.tableView.childNodes[1];
        this.colPanel = document.createElement('div');
        this.colPanel.className = `${CLASSNAME}-table-view-col-panel`;
        this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        this.rowPanel = document.createElement('div');
        this.rowPanel.className = `${CLASSNAME}-table-view-row-panel`;
        this.rowPanel.innerHTML = `<div class="${CLASSNAME}-table-view-row-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;


        this.container.appendChild(this.colPanel);
        this.container.appendChild(this.rowPanel);

        this.container.addEventListener('mousedown', this.handleStart, false);
        // this.colPanel.firstChild.addEventListener('click', this.onClickColPanel, false);
        // this.rowPanel.firstChild.addEventListener('click', this.onClickRowPanel, false);

        // this.rowDragDrop = new DragDrop({
        //     container: this.container,
        //     translate: true,
        //     handle: this.rowPanel,
        //     axis: 'y',
        //     onStart: this.onRowDragStart,
        //     onMove: this.onRowDragMove,
        //     onEnd: this.onRowDragEnd
        // });

        // this.colDragDrop = new DragDrop({
        //     container: this.container,
        //     translate: true,
        //     handle: this.colPanel,
        //     axis: 'x',
        //     onStart: this.onColDragStart,
        //     onMove: this.onColDragMove,
        //     onEnd: this.onColDragEnd
        // });
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
            this.onClickPanel(e, type);
            
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
            this.active = type;
            document.addEventListener('mousemove', this.handleMove, false);
            document.addEventListener('touchmove', this.handleMove, { passive: false });

            document.addEventListener('mouseup', this.handleEnd, false);
            document.addEventListener('touchend', this.handleEnd, { passive: false });
            document.addEventListener('touchcancel', this.handleEnd, { passive: false });
            this.onStart(e, this.active);
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

        // if (this.endPos.left - this.startPos.left === 0 && this.endPos.top - this.startPos.top === 0) {
        //     return;
        // }
        // const scale = this.scale;
        // const space = this.space;
        this.increase = {
            left: this.endPos.left - this.startPos.left,
            top: this.endPos.top - this.startPos.top
        };
        let left = this.startXY.left + this.increase.left;
        let top = this.startXY.top + this.increase.top;

        this.endXY = {
            left,
            top
        };
        console.log('handleMove>>>', this.endXY);

        setPos(this.current, this.endXY, true);
        // // this.autoScroll();
        this.onMove(e, this.active);
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
        this.moving = null;
        this.current = null;
        // // this.proxyNode.style.display = 'none';
        // if (this.autoScroller) {
        //     this.autoScroller.clear();
        // }
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
        this.onEnd(e, this.active);
        this.active = null;
    }
    showColPanel(cell?: HTMLElement) {
        if (this.colPanel) {
            this.colPanel.classList.add(`${CLASSNAME}-table-view-col-panel-show`);
            if (cell) {
                this.cell = cell;
                this.colPanel.style.width = `${cell.offsetWidth}px`;
                const pos = getAlignPos(this.colPanel, cell, {
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
    showRowPanel(cell?: HTMLElement) {
        if (this.rowPanel) {
            this.rowPanel.classList.add(`${CLASSNAME}-table-view-row-panel-show`);
            if (cell) {
                this.cell = cell;
                this.rowPanel.style.height = `${cell.offsetHeight}px`;
                const pos = getAlignPos(this.rowPanel, cell, {
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