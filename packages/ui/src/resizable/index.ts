import { getRect, getBorderWidth, getPadding } from '../utils/align';
import { CLASSNAME } from '../config';
import './index.less';

export type ResizableProps = {
    el?: HTMLElement | null | undefined;
    container?: HTMLElement | null | undefined;
    handles?: string;
    translate?: boolean;
    scale?: number;
    space?: number;
    /** 默认是否保持等比（仍可在拖拽时按住 Shift 临时开启） */
    preserveRatio?: boolean;
    // onAutoScroll?: (offset: any) => void;
    onStart?: (e: any, resizable: Resizable) => void;
    onMove?: (e: any, resizable: Resizable) => void;
    onEnd?: (e: any, resizable: Resizable) => void;
    [key: string]: unknown;
}

export class Resizable {
    el: HTMLElement | null | undefined;
    container: HTMLElement | null | undefined;
    handleSource: any = {};
    handles: any;
    multiDirectional: boolean = false;
    positions: any = {
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
    pos: string | null | undefined;
    preserveRatio: boolean = false;
    private preserveRatioDefault: boolean = false;
    corner: any;
    southeast: any;
    updateBox: any;
    startBox: any;
    endBox: any;
    resizing: boolean = false;
    heightIncrement: number = 0;
    widthIncrement: number = 0;
    minHeight: number = 1;
    minWidth: number = 1;
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
        this.preserveRatioDefault = !!props.preserveRatio;
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
                this.handleSource[this.positions[o[j]]] = this.createHandle(this.positions[o[j]]);
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
        if (!this.el) {
            return;
        }
        const hl: any = document.createElement('div');
        hl.className = `${CLASSNAME}-resizable-handle ${CLASSNAME}-resizable-handle-${pos}`;
        // hl.innerHTML = `<div class="${CLASSNAME}-resizable-handle-inner"></div>`
        hl.style['-moz-user-select'] = 'none';
        hl.style['-khtml-user-select'] = 'none';
        hl.style['user-select'] = 'none';
        hl.style['-webkit-user-select'] = 'ignore';
        hl.setAttribute('pos', pos);
        this.el.appendChild(hl);
        hl.addEventListener('mousedown', this.handleStart, false);
        hl.addEventListener('touchstart', this.handleStart, { passive: false });
        return hl;
    }
    // resizeMove(dom: any, pos: string, increase: any, opt?: any) {
    //     if (this.resizing && pos) {
    //         let t = opt.curSize || opt.startBox,
    //             l = t.left,
    //             k = t.top,
    //             c = l,
    //             b = k,
    //             m = t.width,
    //             u = t.height,
    //             d = m,
    //             o = u,
    //             n = opt.minWidth !== undefined ? opt.minWidth : this.minWidth,
    //             A = opt.minHeight !== undefined ? opt.minHeight : this.minHeight,
    //             s = opt.maxWidth !== undefined ? opt.maxWidth : this.maxWidth,
    //             D = opt.maxHeight !== undefined ? opt.maxHeight : this.maxHeight,
    //             i = opt.widthIncrement !== undefined ? opt.widthIncrement : this.widthIncrement,
    //             a = opt.heightIncrement !== undefined ? opt.heightIncrement : this.heightIncrement,
    //             //B = [e.pageX, e.pageY],
    //             //r = -(this.startPoint[0] - Math.max(this.minX, B[0])),
    //             //p = -(this.startPoint[1] - Math.max(this.minY, B[1])),
    //             scale = this.scale,
    //             r = Math.round(increase.left / scale / this.space) * this.space + (opt && opt.increment ? opt.increment[0] : 0),
    //             p = Math.round(increase.top / scale / this.space) * this.space + (opt && opt.increment ? opt.increment[1] : 0),
    //             j = pos, E, g;
    //         switch (j) {
    //             case "east":
    //                 m += r;
    //                 m = Math.min(Math.max(n, m), s);
    //                 break;
    //             case "south":
    //                 u += p;
    //                 u = Math.min(Math.max(A, u), D);
    //                 break;
    //             case "southeast":
    //                 m += r;
    //                 u += p;
    //                 m = Math.min(Math.max(n, m), s);
    //                 u = Math.min(Math.max(A, u), D);
    //                 break;
    //             case "north":
    //                 p = this.constrain(u, p, A, D);
    //                 k += p;
    //                 u -= p;
    //                 break;
    //             case "west":
    //                 r = this.constrain(m, r, n, s);
    //                 l += r;
    //                 m -= r;
    //                 break;
    //             case "northeast":
    //                 m += r;
    //                 m = Math.min(Math.max(n, m), s);
    //                 p = this.constrain(u, p, A, D);
    //                 k += p;
    //                 u -= p;
    //                 break;
    //             case "northwest":
    //                 r = this.constrain(m, r, n, s);
    //                 p = this.constrain(u, p, A, D);
    //                 k += p;
    //                 u -= p;
    //                 l += r;
    //                 m -= r;
    //                 break;
    //             case "southwest":
    //                 r = this.constrain(m, r, n, s);
    //                 u += p;
    //                 u = Math.min(Math.max(A, u), D);
    //                 l += r;
    //                 m -= r;
    //                 break
    //         }
    //         var q = this.snap(m, i, n);
    //         var C = this.snap(u, a, A);
    //         if (q !== m || C !== u) {
    //             switch (j) {
    //                 case "northeast":
    //                     k -= C - u;
    //                     break;
    //                 case "north":
    //                     k -= C - u;
    //                     break;
    //                 case "southwest":
    //                     l -= q - m;
    //                     break;
    //                 case "west":
    //                     l -= q - m;
    //                     break;
    //                 case "northwest":
    //                     l -= q - m;
    //                     k -= C - u;
    //                     break
    //             }
    //             m = q;
    //             u = C
    //         }
    //         if (this.preserveRatio) {
    //             switch (j) {
    //                 case "southeast":
    //                 case "east":
    //                     u = o * (m / d);
    //                     u = Math.min(Math.max(A, u), D);
    //                     m = d * (u / o);
    //                     break;
    //                 case "south":
    //                     m = d * (u / o);
    //                     m = Math.min(Math.max(n, m), s);
    //                     u = o * (m / d);
    //                     break;
    //                 case "northeast":
    //                     m = d * (u / o);
    //                     m = Math.min(Math.max(n, m), s);
    //                     u = o * (m / d);
    //                     break;
    //                 case "north":
    //                     E = m;
    //                     m = d * (u / o);
    //                     m = Math.min(Math.max(n, m), s);
    //                     u = o * (m / d);
    //                     l += (E - m) / 2;
    //                     break;
    //                 case "southwest":
    //                     u = o * (m / d);
    //                     u = Math.min(Math.max(A, u), D);
    //                     E = m;
    //                     m = d * (u / o);
    //                     l += E - m;
    //                     break;
    //                 case "west":
    //                     g = u;
    //                     u = o * (m / d);
    //                     u = Math.min(Math.max(A, u), D);
    //                     k += (g - u) / 2;
    //                     E = m;
    //                     m = d * (u / o);
    //                     l += E - m;
    //                     break;
    //                 case "northwest":
    //                     E = m;
    //                     g = u;
    //                     u = o * (m / d);
    //                     u = Math.min(Math.max(A, u), D);
    //                     m = d * (u / o);
    //                     k += g - u;
    //                     l += E - m;
    //                     break
    //             }
    //         }
    //         let width: number;
    //         let height: number;
    //         //dom.style.width = (m - this.getBorderWidth(dom, 'lr') - this.getPadding(dom, 'lr')) + 'px';
    //         //dom.style.height = (u - this.getBorderWidth(dom, 'tb') - this.getPadding(dom, 'tb')) + 'px';
    //         //dom.style.transform = `translate(${l}px, ${k}px)`;
    //         if (!dom) {
    //             width = m;
    //             height = u;
    //         } else {
    //             width = (m - getBorderWidth(dom, 'lr') - getPadding(dom, 'lr'));
    //             height = (u - getBorderWidth(dom, 'tb') - getPadding(dom, 'tb'));
    //         }
    //         return {
    //             left: l,
    //             top: k,
    //             width,
    //             height
    //         };
    //     }
    //     return opt.startBox;
    // }
    resizeMove(dom: any, direction: string | null | undefined, increase: any, opt?: any) {
        if (this.resizing && direction) {
            // 1. 初始状态与当前位置
            let box = opt.curSize || opt.startBox,
                currentLeft = box.left,
                currentTop = box.top,
                currentWidth = box.width,
                currentHeight = box.height,
                originalWidth = currentWidth,  // 用于比例计算
                originalHeight = currentHeight; // 用于比例计算

            // 2. 限制条件 (最小/最大宽高)
            let minWidth = opt.minWidth !== undefined ? opt.minWidth : this.minWidth,
                minHeight = opt.minHeight !== undefined ? opt.minHeight : this.minHeight,
                maxWidth = opt.maxWidth !== undefined ? opt.maxWidth : this.maxWidth,
                maxHeight = opt.maxHeight !== undefined ? opt.maxHeight : this.maxHeight;

            if (this.container) {
                maxWidth = this.container.offsetWidth - getBorderWidth(this.container, 'lr') - getPadding(this.container, 'lr');
                maxHeight = this.container.offsetHeight - getBorderWidth(this.container, 'tb') - getPadding(this.container, 'tb');
            }

            // 3. 步进/增量配置
            let widthStep = opt.widthIncrement !== undefined ? opt.widthIncrement : this.widthIncrement,
                heightStep = opt.heightIncrement !== undefined ? opt.heightIncrement : this.heightIncrement,
                scale = this.scale;

            // 4. 计算鼠标移动带来的实际像素增量 (考虑了缩放和网格间距)
            let deltaX = Math.round(increase.left / scale / this.space) * this.space + (opt?.increment ? opt.increment[0] : 0),
                deltaY = Math.round(increase.top / scale / this.space) * this.space + (opt?.increment ? opt.increment[1] : 0);

            // 5. 根据拉伸方向计算初步的 宽高 和 坐标
            switch (direction) {
                case "east":
                    currentWidth = Math.min(Math.max(minWidth, currentWidth + deltaX), maxWidth);
                    break;
                case "south":
                    currentHeight = Math.min(Math.max(minHeight, currentHeight + deltaY), maxHeight);
                    break;
                case "southeast":
                    currentWidth = Math.min(Math.max(minWidth, currentWidth + deltaX), maxWidth);
                    currentHeight = Math.min(Math.max(minHeight, currentHeight + deltaY), maxHeight);
                    break;
                case "north":
                    deltaY = this.constrain(currentHeight, deltaY, minHeight, maxHeight);
                    currentTop += deltaY;
                    currentHeight -= deltaY;
                    break;
                case "west":
                    deltaX = this.constrain(currentWidth, deltaX, minWidth, maxWidth);
                    currentLeft += deltaX;
                    currentWidth -= deltaX;
                    break;
                case "northeast":
                    currentWidth = Math.min(Math.max(minWidth, currentWidth + deltaX), maxWidth);
                    deltaY = this.constrain(currentHeight, deltaY, minHeight, maxHeight);
                    currentTop += deltaY;
                    currentHeight -= deltaY;
                    break;
                case "northwest":
                    deltaX = this.constrain(currentWidth, deltaX, minWidth, maxWidth);
                    deltaY = this.constrain(currentHeight, deltaY, minHeight, maxHeight);
                    currentTop += deltaY;
                    currentHeight -= deltaY;
                    currentLeft += deltaX;
                    currentWidth -= deltaX;
                    break;
                case "southwest":
                    deltaX = this.constrain(currentWidth, deltaX, minWidth, maxWidth);
                    currentHeight = Math.min(Math.max(minHeight, currentHeight + deltaY), maxHeight);
                    currentLeft += deltaX;
                    currentWidth -= deltaX;
                    break;
            }

            // 6. 自动吸附 (Snap) 到步进值
            let snappedWidth = this.snap(currentWidth, widthStep, minWidth);
            let snappedHeight = this.snap(currentHeight, heightStep, minHeight);

            // 如果吸附导致了尺寸变化，需要补偿坐标（防止反向抖动）
            if (snappedWidth !== currentWidth || snappedHeight !== currentHeight) {
                switch (direction) {
                    case "northeast":
                    case "north":
                        currentTop -= (snappedHeight - currentHeight);
                        break;
                    case "southwest":
                    case "west":
                        currentLeft -= (snappedWidth - currentWidth);
                        break;
                    case "northwest":
                        currentLeft -= (snappedWidth - currentWidth);
                        currentTop -= (snappedHeight - currentHeight);
                        break;
                }
                currentWidth = snappedWidth;
                currentHeight = snappedHeight;
            }

            // 7. 保持宽高比逻辑 (Preserve Ratio)
            if (this.preserveRatio) {
                let tempW, tempH;
                switch (direction) {
                    case "southeast":
                    case "east":
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        currentHeight = Math.min(Math.max(minHeight, currentHeight), maxHeight);
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        break;
                    case "south":
                    case "northeast":
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        currentWidth = Math.min(Math.max(minWidth, currentWidth), maxWidth);
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        break;
                    case "north":
                        tempW = currentWidth;
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        currentWidth = Math.min(Math.max(minWidth, currentWidth), maxWidth);
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        currentLeft += (tempW - currentWidth) / 2;
                        break;
                    case "southwest":
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        currentHeight = Math.min(Math.max(minHeight, currentHeight), maxHeight);
                        tempW = currentWidth;
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        currentLeft += (tempW - currentWidth);
                        break;
                    case "west":
                        tempH = currentHeight;
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        currentHeight = Math.min(Math.max(minHeight, currentHeight), maxHeight);
                        currentTop += (tempH - currentHeight) / 2;
                        tempW = currentWidth;
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        currentLeft += (tempW - currentWidth);
                        break;
                    case "northwest":
                        tempW = currentWidth;
                        tempH = currentHeight;
                        currentHeight = originalHeight * (currentWidth / originalWidth);
                        currentHeight = Math.min(Math.max(minHeight, currentHeight), maxHeight);
                        currentWidth = originalWidth * (currentHeight / originalHeight);
                        currentTop += (tempH - currentHeight);
                        currentLeft += (tempW - currentWidth);
                        break;
                }
            }

            // 8. 最终输出计算 (扣除边距和边框)
            let finalWidth: number;
            let finalHeight: number;

            if (!dom) {
                finalWidth = currentWidth;
                finalHeight = currentHeight;
            } else {
                finalWidth = (currentWidth - getBorderWidth(dom, 'lr') - getPadding(dom, 'lr'));
                finalHeight = (currentHeight - getBorderWidth(dom, 'tb') - getPadding(dom, 'tb'));
            }

            return {
                left: currentLeft,
                top: currentTop,
                width: finalWidth,
                height: finalHeight
            };
        }
        return opt.startBox;
    }
    constrain(currentSize: number, delta: number, minSize: number, maxSize: number) {
        // 如果 尺寸 - 位移 < 最小值，说明拉得太多了，强制位移量刚好达到最小值
        if (currentSize - delta < minSize) {
            delta = currentSize - minSize;
        }
        // 如果 尺寸 - 位移 > 最大值，说明缩得太多了，强制位移量刚好达到最大值
        else if (currentSize - delta > maxSize) {
            delta = currentSize - maxSize;
        }
        return delta;
    }
    snap(size: number, step: number, minLimit: number) {
        // 如果没有步进值或尺寸为0，直接返回原尺寸
        if (!step || !size) {
            return size;
        }

        let snappedSize = size;
        let remainder = size % step; // 计算超出刻度的余数

        if (remainder > 0) {
            // 如果余数超过步进的一半，向上取整到下一个刻度
            if (remainder > (step / 2)) {
                snappedSize = size + (step - remainder);
            }
            // 否则向下取整到上一个刻度
            else {
                snappedSize = size - remainder;
            }
        }

        // 最终结果不能小于设定的下限（通常是最小宽度或高度）
        return Math.max(minLimit, snappedSize);
    }
    // constrain(b: number, c: number, a: number, d: number) {
    //     if (b - c < a) {
    //         c = b - a;
    //     } else {
    //         if (b - c > d) {
    //             c = b - d;
    //         }
    //     }
    //     return c;
    // }
    // snap(c: number, e: number, b: number) {
    //     if (!e || !c) {
    //         return c
    //     }
    //     let d = c, a = c % e;
    //     if (a > 0) {
    //         if (a > (e / 2)) {
    //             d = c + (e - a)
    //         } else {
    //             d = c - a
    //         }
    //     }
    //     return Math.max(b, d);
    // }
    resizeElement() {
        if (!this.el) {
            return;
        }
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

        if (e.button !== 0 && !this.isTouchEvent(e)) {
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
        // Shift 按住：保持等比；未按住：自由缩放（若 props 默认等比，则始终等比）
        const isMouseEvent = !this.isTouchEvent(e);
        const shiftPreserve = isMouseEvent ? !!e.shiftKey : false;
        this.preserveRatio = this.preserveRatioDefault || shiftPreserve;
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
                this.handleSource[n].parentNode?.removeChild(this.handleSource[n]);
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


// 声明一个全局私有变量，用来存储唯一的单例实例
let globalResizableInstance: Resizable | null = null;

export interface ResizableOptions extends ResizableProps {
    // 这里可以扩展动态调用特有的配置，目前与 ResizableProps 保持一致
}

/**
 * 动态初始化 / 更新 Resizable 单例
 */
export function resizable(options: ResizableOptions): Resizable | null {
    // 1. 如果之前已经有实例，先安全地销毁旧实例（移除旧元素的手柄和全局事件）
    if (globalResizableInstance) {
        globalResizableInstance.destroy();
        globalResizableInstance = null;
    }

    // 2. 参数校验，如果没传有效的元素，直接返回
    if (!options.el || !(options.el instanceof HTMLElement)) {
        return null;
    }

    // 3. 创建新的实例（构造函数内部会自动生成新元素的手柄）
    globalResizableInstance = new Resizable(options);

    // 4. 将 hide 方法动态挂载到返回的对象上，方便链式调用或单独解构
    (globalResizableInstance as any).hide = function () {
        if (globalResizableInstance) {
            globalResizableInstance.destroy();
            globalResizableInstance = null;
        }
    };

    return globalResizableInstance;
}

/**
 * 显式隐藏/销毁当前的缩放器
 */
resizable.hide = function () {
    if (globalResizableInstance) {
        globalResizableInstance.destroy();
        globalResizableInstance = null;
    }
};