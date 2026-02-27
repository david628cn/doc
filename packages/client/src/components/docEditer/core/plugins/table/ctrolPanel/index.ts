import { DragDrop } from '@/components/dragDrop';
import { getAlignPos, setPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';

export type CtrolPanelProps = {
    // tableView: HTMLElement | null | undefined;
    container?: HTMLElement | null | undefined;
    onClickColPanel?: Function;
    onClickRowPanel?: Function;
    [key: string]: unknown;
};

export class CtrolPanel {
    // tableView
    container: HTMLElement | null | undefined;
    colPanel: HTMLElement | null | undefined;
    rowPanel: HTMLElement | null | undefined;
    cell: HTMLElement | null | undefined;
    rowDragDrop: any;
    colDragDrop: any;
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

        this.colPanel.firstChild.addEventListener('click', this.onClickColPanel, false);
        this.rowPanel.firstChild.addEventListener('click', this.onClickRowPanel, false);

        this.rowDragDrop = new DragDrop({
            container: this.container,
            translate: true,
            handle: this.rowPanel,
            axis: 'y',
            onStart: this.onRowDragStart,
            onMove: this.onRowDragMove,
            onEnd: this.onRowDragEnd
        });

        this.colDragDrop = new DragDrop({
            container: this.container,
            translate: true,
            handle: this.colPanel,
            axis: 'x',
            onStart: this.onColDragStart,
            onMove: this.onColDragMove,
            onEnd: this.onColDragEnd
        });
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
    onRowDragStart = (e: MouseEvent) => {
        
    }
    onRowDragMove = (e: MouseEvent) => {
        console.log('onRowDragMove>>>', e);
    }
    onRowDragEnd = (e: MouseEvent) => {

    }
    onColDragStart = (e: MouseEvent) => {

    }
    onColDragMove = (e: MouseEvent) => {
        console.log('onColDragMove>>>', e);
    }
    onColDragEnd = (e: MouseEvent) => {

    }
    onClickColPanel = (e: MouseEvent) => {
    }
    onClickRowPanel = (e: MouseEvent) => {
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