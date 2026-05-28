export * from './cropBox';
import { CLASSNAME } from '../config';


export type StatgeProps = {
    container: any;
    image: any;
    minScale?: number;
    maxScale?: number;
    moveStep?: number;
    zoomStep?: number;
};

export class Statge {
    container: any;
    inner: any;
    canvas: any;
    ctx: CanvasRenderingContext2D | null = null;
    image: any;
    imgElement: HTMLImageElement | null = null;

    // 配置项
    minScale: number = 0.01;
    maxScale: number = 50;
    moveStep: number = 1;
    zoomStep: number = 0.1;

    // 变换状态 (核心)
    scale: number = 1;
    offsetX: number = 0;
    offsetY: number = 0;
    rotate: number = 0; // 弧度

    // 交互状态
    private isDragging: boolean = false;
    private lastX: number = 0;
    private lastY: number = 0;
    private lastTouchDist: number = 0;
    private lastTouchAngle: number = 0;

    constructor(props: StatgeProps) {
        Object.assign(this, props);
        this.initDOM();
        this.bindEvents();
        this.loadImage(this.image);
    }

    private initDOM() {
        this.container = typeof this.container === 'string' ? document.getElementById(this.container) : this.container;
        this.container.classList.add(`${CLASSNAME}-statge-container`);
        this.inner = document.createElement('div');
        this.inner.classList.add(`${CLASSNAME}-statge-inner`);
        this.inner.style.cssText = 'width:100%; height:100%; overflow:hidden; position:relative; touch-action:none;';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.inner.appendChild(this.canvas);
        this.container.appendChild(this.inner);
    }

    // --- 公共 API ---

    public move(dx: number, dy: number) {
        this.offsetX += dx * this.moveStep;
        this.offsetY += dy * this.moveStep;
        this.render();
    }

    public zoom(delta: number, clientX?: number, clientY?: number) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = clientX !== undefined ? clientX : rect.left + rect.width / 2;
        const cy = clientY !== undefined ? clientY : rect.top + rect.height / 2;
        this.applyTransform(delta, 0, cx, cy);
    }

    public rotateDeg(deg: number) {
        const rad = (deg * Math.PI) / 180;
        const rect = this.canvas.getBoundingClientRect();
        this.applyTransform(1, rad, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    /**
     * 核心：获取裁剪区域的图片像素数据
     */
    public getSnapshot(rect: { x: number, y: number, width: number, height: number, rotate: number }) {
        if (!this.imgElement) return null;

        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d');
        offCanvas.width = rect.width;
        offCanvas.height = rect.height;
        if (!offCtx) return null;

        // 1. 将原点移至导出画布中心
        offCtx.translate(rect.width / 2, rect.height / 2);
        // 2. 抵消裁剪框自身的旋转
        offCtx.rotate(-rect.rotate);
        // 3. 计算相对位移并应用图片的变换
        const boxCenterX = rect.x + rect.width / 2;
        const boxCenterY = rect.y + rect.height / 2;
        
        offCtx.translate(this.offsetX - boxCenterX, this.offsetY - boxCenterY);
        offCtx.rotate(this.rotate);
        offCtx.scale(this.scale, this.scale);

        // 4. 绘制原图
        offCtx.drawImage(this.imgElement, 0, 0);

        return offCanvas.toDataURL('image/png');
    }

    public reset() {
        this.rotate = 0;
        this.loadImage(this.image);
    }

    // --- 内部逻辑 (变换与事件) ---

    private applyTransform(zoomDelta: number, angleDelta: number, clientX: number, clientY: number) {
        if (!this.imgElement) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;

        let newScale = this.scale * zoomDelta;
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        const actualZoom = newScale / this.scale;

        const dx = this.offsetX - cx;
        const dy = this.offsetY - cy;
        const cos = Math.cos(angleDelta);
        const sin = Math.sin(angleDelta);

        this.offsetX = cx + (dx * cos - dy * sin) * actualZoom;
        this.offsetY = cy + (dx * sin + dy * cos) * actualZoom;
        this.scale = newScale;
        this.rotate += angleDelta;
        this.render();
    }

    private bindEvents() {
        const wheel = (e: WheelEvent) => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1-this.zoomStep : 1+this.zoomStep, e.clientX, e.clientY); };
        const mdown = (e: MouseEvent) => { this.isDragging = true; this.lastX = e.clientX; this.lastY = e.clientY; };
        const mmove = (e: MouseEvent) => { if(this.isDragging) { this.move(e.clientX-this.lastX, e.clientY-this.lastY); this.lastX = e.clientX; this.lastY = e.clientY; }};
        const tstart = (e: TouchEvent) => {
            if(e.touches.length === 1) { this.isDragging = true; this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; }
            else if(e.touches.length === 2) { this.isDragging = false; this.lastTouchDist = this.getDist(e.touches); this.lastTouchAngle = this.getAng(e.touches); }
        };
        const tmove = (e: TouchEvent) => {
            e.preventDefault();
            if(e.touches.length === 1 && this.isDragging) { this.move(e.touches[0].clientX-this.lastX, e.touches[0].clientY-this.lastY); this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; }
            else if(e.touches.length === 2) {
                const d = this.getDist(e.touches); const a = this.getAng(e.touches);
                this.applyTransform(d/this.lastTouchDist, a-this.lastTouchAngle, (e.touches[0].clientX+e.touches[1].clientX)/2, (e.touches[0].clientY+e.touches[1].clientY)/2);
                this.lastTouchDist = d; this.lastTouchAngle = a;
            }
        };
        const stop = () => { this.isDragging = false; this.lastTouchDist = 0; };

        this.inner.addEventListener('wheel', wheel, { passive: false });
        this.inner.addEventListener('mousedown', mdown);
        this.inner.addEventListener('touchstart', tstart, { passive: false });
        this.inner.addEventListener('touchmove', tmove, { passive: false });
        window.addEventListener('mousemove', mmove);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchend', stop);
    }

    private getDist = (t: TouchList) => Math.sqrt(Math.pow(t[1].clientX-t[0].clientX, 2) + Math.pow(t[1].clientY-t[0].clientY, 2));
    private getAng = (t: TouchList) => Math.atan2(t[1].clientY-t[0].clientY, t[1].clientX-t[0].clientX);

    async loadImage(url: string) {
        const img = await new Promise<HTMLImageElement>((res) => {
            fetch(url, { mode: 'cors' }).then(r => r.blob()).then(b => {
                const i = new Image(); i.onload = () => res(i); i.src = URL.createObjectURL(b);
            });
        });
        this.imgElement = img;
        this.canvas.width = this.inner.offsetWidth;
        this.canvas.height = this.inner.offsetHeight;
        this.scale = Math.min(this.canvas.width/img.width, this.canvas.height/img.height);
        this.offsetX = (this.canvas.width - img.width*this.scale)/2;
        this.offsetY = (this.canvas.height - img.height*this.scale)/2;
        this.render();
    }

    render() {
        if(!this.ctx || !this.imgElement) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.rotate(this.rotate);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.imgElement, 0, 0);
        this.ctx.restore();
    }
}
