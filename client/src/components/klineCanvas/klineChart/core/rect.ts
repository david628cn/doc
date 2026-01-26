import Base from './base';

interface RectProps {
    x: number;
    y: number;
    width?: number;
    height?: number;
    style?: any;
}

class Rect extends Base {
    private x: number = 0;
    private y: number = 0;
    private width?: number;
    private height?: number;
    private style?: any;
    constructor(props: RectProps) {
        super();
        this.x = props.x;
        this.y = props.y;
        this.width = props.width;
        this.height = props.height;
        this.style = props.style;
    }
    draw(ctx: CanvasRenderingContext2D | any, osCtx: OffscreenCanvasRenderingContext2D | any) {
        ctx.save();
        ctx.beginPath();
        if (this.style) {
            for (let attr in this.style) {
                ctx[attr] = this.style[attr];
            }
        }
        ctx.rect(this.x, this.y, this.width, this.height);
        if (this.style['fillStyle']) {
            ctx.fill();
        }
        if (this.style['strokeStyle']) {
            ctx.stroke();
        }
        ctx.restore();
    }
}

export default Rect;