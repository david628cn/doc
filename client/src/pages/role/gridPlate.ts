import { DragDrop } from './dragDrop';



export type GridPlateProps = {
    container?: HTMLElement | null | undefined;
    [key: string]: unknown;
}

export class GridPlate {
    container: HTMLElement | null | undefined;
    dragDrop: any;
    constructor(props: GridPlateProps) {
        Object.assign(this, props);
        if (!this.container || !(this.container instanceof HTMLElement)) {
            this.container = document.body;
        }
        this.dragDrop = new DragDrop({
            container: this.container,
            onStart(e: MouseEvent) {
                console.log('onStart>>>', e, this);
            },
            onMove(e: MouseEvent) {
                console.log('onMove>>>', e, this);
            },
            onEnd(e: MouseEvent) {
                console.log('onEnd>>>', e, this);
            }
        });
    }

}