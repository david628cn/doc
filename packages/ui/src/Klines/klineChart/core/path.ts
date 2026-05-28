import Base from './base';

interface PathProps {
    points?: Array<Array<number>>;
    style?: any;
}

class Path extends Base {
    private points: Array<Array<number>>;
    private style?: any;
    constructor(props: PathProps) {
        super();
        this.points = props.points || [];
        this.style = props.style;
    }
    draw(ctx: CanvasRenderingContext2D | any, osCtx: OffscreenCanvasRenderingContext2D | any) {
        ctx.save();
        ctx.beginPath();
        if (this.style) {
            for (let attr in this.style) {
                if (attr !== 'setLineDash') {
                    ctx[attr] = this.style[attr];
                } else {
                    ctx[attr](this.style[attr]);
                }
            }
        }
        for (let i = 0; i < this.points.length; i++) {
            if (i === 0) {
                ctx.moveTo(this.points[i][0], this.points[i][1]);
            } else {
                ctx.lineTo(this.points[i][0], this.points[i][1]);
            }
        }
        if (this.style['fillStyle']) {
            ctx.fill();
        }
        if (this.style['strokeStyle']) {
            ctx.stroke();
        }
        ctx.closePath();
        ctx.restore();
    }
}

export default Path;