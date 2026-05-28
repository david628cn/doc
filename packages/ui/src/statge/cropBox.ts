// import { CLASSNAME } from '../config';

export class CropBox {
    container: HTMLElement;
    box: any;
    x=100; 
    y=100; 
    width=200; 
    height=200; 
    rotate=0;

    private isActive = false;
    private currentAction = '';
    private resizeDir = '';
    private startX = 0; private startY = 0;
    private startState: any = {};

    constructor(props: { container: HTMLElement }) {
        this.container = props.container;
        this.initDOM();
        this.bindEvents();
        this.updateView();
    }

    private initDOM() {
        this.box = document.createElement('div');
        this.box.style.cssText = `position:absolute;left: 0px;top: 0px;border:2px solid #fff; box-shadow:0 0 0 9999px rgba(0,0,0,0.5); touch-action:none; cursor:move; z-index:10;`;
        
        ['nw','n','ne','e','se','s','sw','w'].forEach(d => {
            const h = document.createElement('div');
            h.dataset.dir = d;
            h.style.cssText = `position:absolute; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:${d}-resize;`;
            const dot = document.createElement('div'); dot.style.cssText = 'width:10px; height:10px; background:#fff; border:1px solid #333;';
            h.appendChild(dot);
            this.setHPos(h, d);
            this.box.appendChild(h);
        });

        const r = document.createElement('div');
        r.dataset.action = 'rotate';
        r.style.cssText = `position:absolute; top:-45px; left:50%; transform:translateX(-50%); width:34px; height:34px; background:#fff; border-radius:50%; border:1px solid #333; cursor:crosshair; display:flex; align-items:center; justify-content:center;`;
        r.innerHTML = '🔄';
        this.box.appendChild(r);
        this.container.appendChild(this.box);
    }

    private setHPos(el: HTMLElement, d: string) {
        const o = '-15px';
        if(d.includes('n')) el.style.top = o; if(d.includes('s')) el.style.bottom = o;
        if(d.includes('w')) el.style.left = o; if(d.includes('e')) el.style.right = o;
        if(d==='n'||d==='s') el.style.left='50%', el.style.marginLeft=o;
        if(d==='w'||d==='e') el.style.top='50%', el.style.marginTop=o;
    }

    public setRect(r: any) {
        if(r.x!==undefined) this.x=r.x; if(r.y!==undefined) this.y=r.y;
        if(r.width) this.width=Math.max(40, r.width); if(r.height) this.height=Math.max(40, r.height);
        this.updateView();
    }

    private bindEvents() {
        const start = (e: any) => {
            const p = e.touches ? e.touches[0] : e;
            const t = e.target.closest('[data-dir]') || e.target.closest('[data-action]');
            this.isActive = true; this.startX = p.clientX; this.startY = p.clientY;
            this.startState = { x:this.x, y:this.y, w:this.width, h:this.height, r:this.rotate };
            if(t?.dataset.dir) { this.currentAction='resize'; this.resizeDir=t.dataset.dir; }
            else if(t?.dataset.action==='rotate') this.currentAction='rotate';
            else this.currentAction='move';
            e.stopPropagation();
        };
        const move = (e: any) => {
            if(!this.isActive) return;
            const p = e.touches ? e.touches[0] : e;
            const dx = p.clientX - this.startX; const dy = p.clientY - this.startY;
            if(this.currentAction==='move') { this.x=this.startState.x+dx; this.y=this.startState.y+dy; }
            else if(this.currentAction==='resize') {
                if(this.resizeDir.includes('e')) this.width = Math.max(40, this.startState.w+dx);
                if(this.resizeDir.includes('s')) this.height = Math.max(40, this.startState.h+dy);
                if(this.resizeDir.includes('w')) { this.x = Math.min(this.startState.x+this.startState.w-40, this.startState.x+dx); this.width = this.startState.w+(this.startState.x-this.x); }
                if(this.resizeDir.includes('n')) { this.y = Math.min(this.startState.y+this.startState.h-40, this.startState.y+dy); this.height = this.startState.h+(this.startState.y-this.y); }
            } else if(this.currentAction==='rotate') {
                const r = this.box.getBoundingClientRect();
                this.rotate = Math.atan2(p.clientY-(r.top+r.height/2), p.clientX-(r.left+r.width/2)) + Math.PI/2;
            }
            this.updateView();
        };
        this.box.addEventListener('mousedown', start); this.box.addEventListener('touchstart', start);
        window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('mouseup', () => this.isActive=false); window.addEventListener('touchend', () => this.isActive=false);
    }

    private updateView() {
        this.box.style.width = `${this.width}px`; this.box.style.height = `${this.height}px`;
        this.box.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotate}rad)`;
    }
}
