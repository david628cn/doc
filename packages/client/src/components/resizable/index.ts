import { getRect, getBorderWidth, getPadding } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';

export type ResizableProps = {
    el?: HTMLElement | null | undefined;
    handles?: string;
    translate?: boolean;
    scale?: number;
    space?: number;
    // onAutoScroll?: (offset: any) => void;
    onStart?: (e: any, resizable: Resizable) => void;
    onMove?: (e: any, resizable: Resizable) => void;
    onEnd?: (e: any, resizable: Resizable) => void;
    [key: string]: unknown;
}

export class Resizable {
    el: HTMLElement | null | undefined;
    handleSource: any = {};
    handles: any;
    multiDirectional: boolean = false;
    positions = {
        n: "north",
        s: "south",
        e: "east",
        w: "west",
        se: "southeast",
        sw: "southwest",
        nw: "northwest",
        ne: "northeast"
    }
    current: any;
    pos: string;
    preserveRatio: boolean = false;
    corner: any;
    southeast: any;
    updateBox: any;
    startBox: any;
    endBox: any;
    resizing: boolean = false;
    heightIncrement: number = 0;
    widthIncrement: number = 0;
    minHeight: number = 5;
    minWidth: number = 5;
    maxHeight: number = 10000;
    maxWidth: number = 10000;
    // distance: number = 0;
    translate: boolean = false;
    scale: number = 1;
    space: number = 1;
    startPoint: any = {
        left: 0,
        top: 0
    };
    increase: any = {
        left: 0,
        top: 0
    };
    constructor(props: ResizableProps) {
        Object.assign(this, props);
        if (!this.el || !(this.el instanceof HTMLElement)) {
            return;
        }
        if (!this.handles) {
            this.handles = 's,e,se';
            if (this.multiDirectional) {
                this.handles += ',n,w';
            }
        }
        if (this.handles === 'all') {
            this.handles = 'n s e w ne nw se sw';
        }
        let o = this.handles.split(/\s*?[,;]\s*?| /);
        for (let j = 0, l = o.length; j < l; j++) {
            if (o[j] && this.positions[o[j]]) {
                var n = this.positions[o[j]];
                this.handleSource[n] = this.createHandle(n);
            }
        }
        this.corner = this.southeast;
        if (this.handles.indexOf("n") !== -1 || this.handles.indexOf("w") !== -1) {
            this.updateBox = true;
        }
        if (navigator.userAgent.toLowerCase().indexOf('msie') > -1) {
            this.el.style.zoom = '1';
        }
    }
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
    createHandle(pos: string) {
        const hl = document.createElement('div');
        hl.className = `${CLASSNAME}-resizable-handle ${CLASSNAME}-resizable-handle-${pos}`;
        hl.style['-moz-user-select'] = 'none';
        hl.style['-khtml-user-select'] = 'none';
        hl.style['user-select'] = 'none';
        hl.style['-webkit-user-select'] = 'ignore';
        hl.setAttribute('pos', pos);
        this.el.appendChild(hl);
        hl.addEventListener('mousedown', this.handleStart, false);
        hl.addEventListener('touchstart', this.handleStart, { passive: false });
    }
    resizeMove(dom: any, pos: string, increase: any, opt?: any) {
        if (this.resizing && pos) {
            let t = opt.curSize || opt.startBox,
                l = t.left,
                k = t.top,
                c = l,
                b = k,
                m = t.width,
                u = t.height,
                d = m,
                o = u,
                n = opt.minWidth !== undefined ? opt.minWidth : this.minWidth,
                A = opt.minHeight !== undefined ? opt.minHeight : this.minHeight,
                s = opt.maxWidth !== undefined ? opt.maxWidth : this.maxWidth,
                D = opt.maxHeight !== undefined ? opt.maxHeight : this.maxHeight,
                i = opt.widthIncrement !== undefined ? opt.widthIncrement : this.widthIncrement,
                a = opt.heightIncrement !== undefined ? opt.heightIncrement : this.heightIncrement,
                //B = [e.pageX, e.pageY],
                //r = -(this.startPoint[0] - Math.max(this.minX, B[0])),
                //p = -(this.startPoint[1] - Math.max(this.minY, B[1])),
                scale = this.scale,
                r = Math.round(increase.left / scale / this.space) * this.space + (opt && opt.increment ? opt.increment[0] : 0),
                p = Math.round(increase.top / scale / this.space) * this.space + (opt && opt.increment ? opt.increment[1] : 0),
                j = pos, E, g;
            switch (j) {
                case "east":
                    m += r;
                    m = Math.min(Math.max(n, m), s);
                    break;
                case "south":
                    u += p;
                    u = Math.min(Math.max(A, u), D);
                    break;
                case "southeast":
                    m += r;
                    u += p;
                    m = Math.min(Math.max(n, m), s);
                    u = Math.min(Math.max(A, u), D);
                    break;
                case "north":
                    p = this.constrain(u, p, A, D);
                    k += p;
                    u -= p;
                    break;
                case "west":
                    r = this.constrain(m, r, n, s);
                    l += r;
                    m -= r;
                    break;
                case "northeast":
                    m += r;
                    m = Math.min(Math.max(n, m), s);
                    p = this.constrain(u, p, A, D);
                    k += p;
                    u -= p;
                    break;
                case "northwest":
                    r = this.constrain(m, r, n, s);
                    p = this.constrain(u, p, A, D);
                    k += p;
                    u -= p;
                    l += r;
                    m -= r;
                    break;
                case "southwest":
                    r = this.constrain(m, r, n, s);
                    u += p;
                    u = Math.min(Math.max(A, u), D);
                    l += r;
                    m -= r;
                    break
            }
            var q = this.snap(m, i, n);
            var C = this.snap(u, a, A);
            if (q !== m || C !== u) {
                switch (j) {
                    case "northeast":
                        k -= C - u;
                        break;
                    case "north":
                        k -= C - u;
                        break;
                    case "southwest":
                        l -= q - m;
                        break;
                    case "west":
                        l -= q - m;
                        break;
                    case "northwest":
                        l -= q - m;
                        k -= C - u;
                        break
                }
                m = q;
                u = C
            }
            if (this.preserveRatio) {
                switch (j) {
                    case "southeast":
                    case "east":
                        u = o * (m / d);
                        u = Math.min(Math.max(A, u), D);
                        m = d * (u / o);
                        break;
                    case "south":
                        m = d * (u / o);
                        m = Math.min(Math.max(n, m), s);
                        u = o * (m / d);
                        break;
                    case "northeast":
                        m = d * (u / o);
                        m = Math.min(Math.max(n, m), s);
                        u = o * (m / d);
                        break;
                    case "north":
                        E = m;
                        m = d * (u / o);
                        m = Math.min(Math.max(n, m), s);
                        u = o * (m / d);
                        l += (E - m) / 2;
                        break;
                    case "southwest":
                        u = o * (m / d);
                        u = Math.min(Math.max(A, u), D);
                        E = m;
                        m = d * (u / o);
                        l += E - m;
                        break;
                    case "west":
                        g = u;
                        u = o * (m / d);
                        u = Math.min(Math.max(A, u), D);
                        k += (g - u) / 2;
                        E = m;
                        m = d * (u / o);
                        l += E - m;
                        break;
                    case "northwest":
                        E = m;
                        g = u;
                        u = o * (m / d);
                        u = Math.min(Math.max(A, u), D);
                        m = d * (u / o);
                        k += g - u;
                        l += E - m;
                        break
                }
            }
            let width: number;
            let height: number;
            //dom.style.width = (m - this.getBorderWidth(dom, 'lr') - this.getPadding(dom, 'lr')) + 'px';
            //dom.style.height = (u - this.getBorderWidth(dom, 'tb') - this.getPadding(dom, 'tb')) + 'px';
            //dom.style.transform = `translate(${l}px, ${k}px)`;
            if (!dom) {
                width = m;
                height = u;
            } else {
                width = (m - getBorderWidth(dom, 'lr') - getPadding(dom, 'lr'));
                height = (u - getBorderWidth(dom, 'tb') - getPadding(dom, 'tb'));
            }
            return {
                left: l,
                top: k,
                width,
                height
            };
        }
        return opt.startBox;
    }
    constrain(b: number, c: number, a: number, d: number) {
        if (b - c < a) {
            c = b - a;
        } else {
            if (b - c > d) {
                c = b - d;
            }
        }
        return c;
    }
    snap(c: number, e: number, b: number) {
        if (!e || !c) {
            return c
        }
        let d = c, a = c % e;
        if (a > 0) {
            if (a > (e / 2)) {
                d = c + (e - a)
            } else {
                d = c - a
            }
        }
        return Math.max(b, d);
    }
    resizeElement() {
        // let scale = this.getScale(), g = 10;

        // this.increaseX = Math.round((this.endX - this.startX) / g / scale) * g;
        // this.increaseY = Math.round((this.endY - this.startY) / g / scale) * g;
        let { width, height, x, y } = this.endBox;
        this.el.style.width = width + 'px';
        this.el.style.height = height + 'px';
        this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    onStart(e: any, self: Resizable) { }
    onMove(e: any, self: Resizable) { }
    onEnd(e: any, self: Resizable) { }
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
        this.current = e.target;
        this.pos = this.current.getAttribute('pos');
        this.resizing = true;
        this.startPoint = this.getPosition(e);
        this.endBox = this.startBox = getRect(this.el);
        this.increase.left = 0;
        this.increase.top = 0;

        document.addEventListener('mousemove', this.handleMove, false);
        document.addEventListener('touchmove', this.handleMove, { passive: false });

        document.addEventListener('mouseup', this.handleEnd, false);
        document.addEventListener('touchend', this.handleEnd, { passive: false });
        document.addEventListener('touchcancel', this.handleEnd, { passive: false });

        this.onStart(e, this);
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
        if (!this.resizing) {
            return;
        }
        const pos = this.getPosition(e);
        this.increase.left = pos.left - this.startPoint.left;
        this.increase.top = pos.top - this.startPoint.top;
        this.endBox = this.resizeMove(this.el, this.pos, this.increase, {
            startBox: this.startBox
        });
        // this.autoScroll();
        this.resizeElement();
        this.onMove(e, this);
        
    }
    handleEnd = (e: any) => {
        // if (!this.isTouchEvent(e)) {
        //     e.preventDefault();
        // } else {
        //     e.returnValue = false;
        // }
        // if (e.stopPropagation) {
        //     e.stopPropagation();
        // } else {
        //     e.cancelBubble = true;
        // }
        this.resizing = false;

        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
        this.onEnd(e, this);
    }
    // autoScroll() {
    //     const containerRect = getRect(this.container);
    //     const minLeft = containerRect.left;
    //     const minTop = containerRect.top;
    //     const maxLeft = containerRect.right;
    //     const maxTop = containerRect.bottom;

    //     // const helperRect = getRect(this.helper);

    //     this.autoScroller.update({
    //         width: this.handle.offsetWidth,
    //         height: this.handle.offsetHeight,
    //         minTranslate: {
    //             x: minLeft,
    //             y: minTop
    //         },
    //         maxTranslate: {
    //             x: maxLeft,
    //             y: maxTop
    //         },
    //         translate: {
    //             x: this.endPos.x + getMargin(this.handle, 'l'),
    //             y: this.endPos.y + getMargin(this.handle, 't')
    //         }
    //         // translate: {
    //         //     x: helperRect.left,
    //         //     y: helperRect.top
    //         // }

    //     });
    // }
    destroy() {
        for (let n in this.handleSource) {
            if (this.handleSource[n]) {
                this.handleSource[n].removeEventListener('mousedown', this.handleStart);
                this.handleSource[n].removeEventListener('touchstart', this.handleStart);
            }
        }
        this.handleSource = null;
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
    }
}