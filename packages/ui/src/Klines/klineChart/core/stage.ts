import { Shape } from './types';

interface StageProps {
    // canvas: HTMLCanvasElement;
    // ctx: CanvasRenderingContext2D;
    width?: number;
    height?: number;
    dpr?: number;
    // shapes: Set<string>;
    onMouseDown?: Function;
    onMouseMove?: Function;
    onMouseUp?: Function;
}

class Stage {
    // private container: any;
    private canvas: any;
    private ctx: any;
    private dpr: number = 1;
    private width: number = 0;
    private height: number = 0;
    private shapes: Array<any> = [];
    // private startPageX: number = 0;
    // private startPageY: number = 0;
    // private endPageX: number = 0;
    // private endPageY: number = 0;
    private startX: number = 0;
    private startY: number = 0;
    private endX: number = 0;
    private endY: number = 0;
    private increaseXY: Array<number> = [];
    private onMouseDown: any;
    private onMouseMove: any;
    private onMouseUp: any;
    static getPixelRatio(ctx: any) {
        const backingStore = ctx.backingStorePixelRatio ||
            ctx.webkitBackingStorePixelRatio  ||
            ctx.mozBackingStorePixelRatio  ||
            ctx.msBackingStorePixelRatio  ||
            ctx.oBackingStorePixelRatio  ||
            ctx.backingStorePixelRatio  || 1;
        return (window.devicePixelRatio || 1) / backingStore;
    }
    constructor(props: StageProps) {
        const {
            width,
            height,
            dpr,
            onMouseDown,
            onMouseMove,
            onMouseUp
        } = props;
        // Object.assign(this, props);
        // if (typeof this.container === 'string') {
        //     this.container = document.getElementById(this.container);
        // }
        if (typeof onMouseDown === 'function') {
            this.onMouseDown = onMouseDown;
        }

        if (typeof onMouseMove === 'function') {
            this.onMouseMove = onMouseMove;
        }

        if (typeof onMouseUp === 'function') {
            this.onMouseUp = onMouseUp;
        }
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        // this.dpr = Stage.getPixelRatio(this.ctx);
        this.setSize(width, height, dpr || Stage.getPixelRatio(this.ctx));
        // if (this.container) {
        //     this.container.appendChild(this.canvas);
        // }
        this.canvas.addEventListener('mousedown', this.handleMouseDown, false);
        this.canvas.addEventListener('touchstart', this.handleMouseDown, { passive: false });

        this.canvas.addEventListener('mousemove', this.handleMouseMove, false);
        this.canvas.addEventListener('touchmove', this.handleMouseMove, { passive: false });

        this.canvas.addEventListener('mouseup', this.handleMouseUp, false);
        this.canvas.addEventListener('touchend', this.handleMouseUp, { passive: false });
    
    }
    setSize(w: number = 0, h: number = 0, dpr?: number) {
        if (dpr) {
            this.dpr = dpr;
        }

        this.width = w;
        this.height = h;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;

        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
    }
    handleMouseDown = (e: any) => {
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
        const pageXY = this.getEventPageXY(e);
        // console.log(this.context.isPointInPath(pageXY[0], pageXY[1]));
        this.endX = this.startX = pageXY[0];
        this.endY = this.startY = pageXY[1];
        this.increaseXY = [0, 0];
        this.onMouseDown?.({
            pageXY,
            dpr: this.dpr,
            increaseXY: this.increaseXY,
            startX: this.startX,
            startY: this.startY
        });
    }
    handleMouseMove = (e: any) => {
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
        const pageXY = this.getEventPageXY(e);
        // console.log(this.context.isPointInPath(pageXY[0], pageXY[1]));
        this.endX = pageXY[0];
        this.endY = pageXY[1];
        // if (this.endX - this.startX === 0 && this.endY - this.startY === 0) {
        //     return;
        // }
        this.increaseXY = [Math.round(this.endX - this.startX), Math.round(this.endY - this.startY)];
        this.onMouseMove?.({
            pageXY,
            dpr: this.dpr,
            increaseXY: this.increaseXY,
            startX: this.startX,
            startY: this.startY
        });
    }
    handleMouseUp = (e: any) => {
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
        const pageXY = this.getEventPageXY(e);
        // console.log(this.context.isPointInPath(pageXY[0], pageXY[1]));
        this.onMouseUp?.({
            pageXY,
            dpr: this.dpr,
            increaseXY: this.increaseXY,
            startX: this.startX,
            startY: this.startY
        });
    }
    getEventPageXY(e: any) {
        if (e.touches) {
            return [e.touches[0].pageX, e.touches[0].pageY];
        }
        return [e.pageX, e.pageY];
    }
    add(shape: Shape | any) {
        if (shape && typeof shape['draw'] === 'function') {
            this.shapes.push(shape);
            shape?.draw(this.ctx);
        }
    }
    clear() {
        for (let i = 0; i < this.shapes.length; i++) {
            this.shapes[i] = null;
        }
        this.shapes.length = 0;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    // private handleCreator(type: string) {

    // }
}

export default Stage;