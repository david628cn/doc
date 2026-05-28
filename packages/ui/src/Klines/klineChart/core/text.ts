import Base from './base';

interface TextProps {
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    style?: any;
}

class Text extends Base {
    private text: string = '';
    private x: number = 0;
    private y: number = 0;
    private width?: number;
    private height?: number;
    private style?: any;
    constructor(props: TextProps) {
        super();
        this.text = props.text;
        this.x = props.x;
        this.y = props.y;
        this.width = props.width;
        this.height = props.height;
        this.style = props.style;
    }
    draw(ctx: CanvasRenderingContext2D | any, osCtx: OffscreenCanvasRenderingContext2D | any) {
        ctx.save();
        if (this.style) {
            for (let attr in this.style) {
                ctx[attr] = this.style[attr];
            }
        }
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export default Text;