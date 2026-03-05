import { getRect } from "@/components/utils/align";

// export class AutoScroller {
//     container: HTMLElement;
//     private onScrollCallback: (offset: { left: number; top: number }) => void;
//     private rafId: number | null = null;
//     public isAutoScrolling: boolean = false;

//     // 物理模擬參數
//     private readonly BASE_SPEED = 0.15; // 速度係數，決定拉開距離後的靈敏度
//     private readonly MAX_SPEED = 40;    // 極限速度，防止拉太遠導致滾動失控

//     // 緩存當前滾動強度
//     private scrollIntensity = { x: 0, y: 0 };

//     constructor(container: HTMLElement, onScrollCallback?: (offset: any) => void) {
//         this.container = container;
//         this.onScrollCallback = onScrollCallback;
//     }

//     /**
//      * @param helper 拖拽代理物 (getBoundingClientRect)
//      * @param container 容器 (getBoundingClientRect)
//      */
//     update(helper: Box, container: Box) {
//         // 1. 計算 Helper 超出 Container 邊界的物理位移 (越往外，值越大)
//         const diffX = this.getOutsideDelta(helper.left, helper.width, container.left, container.width);
//         const diffY = this.getOutsideDelta(helper.top, helper.height, container.top, container.height);

//         // 2. 更新當前滾動強度 (帶方向的位移值)
//         this.scrollIntensity = {
//             x: this.clampSpeed(diffX * this.BASE_SPEED),
//             y: this.clampSpeed(diffY * this.BASE_SPEED)
//         };

//         // 3. 狀態判定
//         if (this.scrollIntensity.x === 0 && this.scrollIntensity.y === 0) {
//             this.clear();
//             return;
//         }

//         if (!this.rafId) {
//             this.isAutoScrolling = true;
//             this.startLoop();
//         }
//     }

//     /**
//      * 計算超出的物理距離
//      * 返回正值代表向右/下溢出，負值代表向左/上溢出，0 代表在範圍內
//      */
//     private getOutsideDelta(hStart: number, hSize: number, cStart: number, cSize: number): number {
//         const hEnd = hStart + hSize;
//         const cEnd = cStart + cSize;

//         // 超出右/下邊界：返回超出的距離 (正數)
//         if (hEnd > cEnd) return hEnd - cEnd;
//         // 超出左/上邊界：返回超出的距離 (負數)
//         if (hStart < cStart) return hStart - cStart;
        
//         return 0;
//     }

//     private clampSpeed(speed: number): number {
//         if (Math.abs(speed) < 1) return 0; // 忽略微小偏移，防止抖動
//         return Math.sign(speed) * Math.min(Math.abs(speed), this.MAX_SPEED);
//     }

//     private startLoop() {
//         const step = () => {
//             const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = this.container;

//             // 邊界物理檢查
//             const canUp = this.scrollIntensity.y < 0 && scrollTop > 0;
//             const canDown = this.scrollIntensity.y > 0 && scrollTop + clientHeight < scrollHeight;
//             const canLeft = this.scrollIntensity.x < 0 && scrollLeft > 0;
//             const canRight = this.scrollIntensity.x > 0 && scrollLeft + clientWidth < scrollWidth;

//             const offset = {
//                 left: (canLeft || canRight) ? this.scrollIntensity.x : 0,
//                 top: (canUp || canDown) ? this.scrollIntensity.y : 0
//             };

//             if (offset.left !== 0 || offset.top !== 0) {
//                 this.container.scrollLeft += offset.left;
//                 this.container.scrollTop += offset.top;
//                 this.onScrollCallback?.(offset);
//                 this.rafId = requestAnimationFrame(step);
//             } else {
//                 this.clear();
//             }
//         };
//         this.rafId = requestAnimationFrame(step);
//     }

//     clear() {
//         if (this.rafId) cancelAnimationFrame(this.rafId);
//         this.rafId = null;
//         this.isAutoScrolling = false;
//         this.scrollIntensity = { x: 0, y: 0 };
//     }
// }

export class AutoScroller {
    container: any;
    interval: any;
    isAutoScrolling: boolean = false;
    scrollRect: any;
    constructor(container: any, onScrollCallback?: (offset: any) => void) {
        this.container = container;
        this.onScrollCallback = onScrollCallback;
        this.scrollRect = this.getScrollRect();
    }
    onScrollCallback(offset: any) {

    }

    getScrollRect() {
        // --- 垂直方向 (Vertical) ---
        const totalHeight = this.container.scrollHeight; // 內容總高度 (如 8000px)
        const viewportHeight = this.container.clientHeight; // 容器可視高度 (如 800px)
        const maxScrollTop = totalHeight - viewportHeight; // 最大可滾動距離

        // --- 水平方向 (Horizontal) ---
        const totalWidth = this.container.scrollWidth; // 內容總寬度
        const viewportWidth = this.container.clientWidth; // 容器可視寬度
        const maxScrollLeft = totalWidth - viewportWidth; // 最大可滾動左移距離

        return {
            minTop: 0,
            maxTop: maxScrollTop,
            minLeft: 0,
            maxLeft: maxScrollLeft
        }
    }

    start() {
        this.scrollRect = this.getScrollRect();
    }

    clear() {
        if (this.interval == null) {
            return;
        }

        clearInterval(this.interval);
        this.interval = null;
    }

    update(helper: any, container: any) {
        const width = helper.width;
        const height = helper.height;

        const dw = width / 2;
        const dh = height / 2;
        
        const maxLeft = container.left + container.width;
        const maxTop = container.top + container.height;

        const direction = {
            x: 0,
            y: 0,
        };
        const speed = {
            x: 1,
            y: 1,
        };
        const acceleration = {
            x: 10,
            y: 10,
        };

        const {
            scrollTop,
            scrollLeft,
            scrollHeight,
            scrollWidth,
            clientHeight,
            clientWidth,
        } = this.container;

        const isTop = scrollTop === 0;
        const isBottom = scrollHeight - scrollTop - clientHeight === 0;
        const isLeft = scrollLeft === 0;
        const isRight = scrollWidth - scrollLeft - clientWidth === 0;

        if (helper.top >= maxTop - dh && !isBottom) {
            // Scroll Down
            direction.y = 1;
            speed.y =
                acceleration.y *
                Math.abs((maxTop - dh - helper.top) / height);
        } else if (helper.top <= container.top + dh && !isTop) {
            // Scroll Up
            direction.y = -1;
            speed.y =
                acceleration.y *
                Math.abs((helper.top + dh - container.top) / height);
        }
        if (helper.left <= container.left - dw && !isLeft) {
            // Scroll Left
            direction.x = -1;
            speed.x =
                acceleration.x *
                Math.abs((helper.left + dw - container.left) / width);
        } else if (helper.left >= maxLeft - dw && !isRight) {
            // Scroll Right
            direction.x = 1;
            speed.x =
                acceleration.x *
                Math.abs((maxLeft - dw - helper.left) / width);
        }

        if (this.interval) {
            this.clear();
            this.isAutoScrolling = false;
        }

        if (direction.x !== 0 || direction.y !== 0) {
            this.interval = setInterval(() => {
                this.isAutoScrolling = true;
                const offset = {
                    left: speed.x * direction.x,
                    top: speed.y * direction.y
                };
                // const offset = {
                //     left: Math.min(this.scrollRect.right, Math.max(this.scrollRect.left, speed.x * direction.x)),
                //     top: Math.min(this.scrollRect.bottom, Math.max(this.scrollRect.top, speed.y * direction.y))
                // };
                let nextTop = this.container.scrollTop + offset.top;
                let nextLeft = this.container.scrollLeft + offset.left;
                this.container.scrollTop = Math.min(this.scrollRect.maxTop, Math.max(this.scrollRect.minTop, nextTop));
                this.container.scrollLeft = Math.min(this.scrollRect.maxLeft, Math.max(this.scrollRect.minLeft, nextLeft));
                this.onScrollCallback?.(offset);
            }, 5);
        }
    }
}


export type DragDropProps = {
    container?: HTMLElement | null | undefined;
    handle?: any;
    translate?: boolean;
    axis?: 'x' | 'y';
    scale?: number;
    space?: number;
    preview?: any;
    onAutoScroll?: (offset: any) => void;
    onStart?: (e: any, drag: DragDrop) => void;
    onMove?: (e: any, drag: DragDrop) => void;
    onEnd?: (e: any, drag: DragDrop) => void;
    [key: string]: unknown;
}

export class DragDrop {
    container: HTMLElement | null | undefined;
    handle: any;
    autoScroller: any;
    axis: string;
    current: any;
    preview?: any;
    moving: boolean = false;
    // distance: number = 0;
    translate: boolean = false;
    scale: number = 1;
    space: number = 1;
    increase: any = {
        left: 0,
        top: 0
    };
    startXY = {
        left: 0,
        top: 0
    };
    endXY = {
        left: 0,
        top: 0
    };
    startPos: any = {
        left: 0,
        top: 0
    };
    endPos: any = {
        left: 0,
        top: 0
    };
    constructor(props: DragDropProps) {
        Object.assign(this, props);
        if (!this.container || !(this.container instanceof HTMLElement)) {
            this.container = document.body;
        }
        this.autoScroller = new AutoScroller(
            this.container,
            this.onAutoScroll
        );
        this.handle.addEventListener('mousedown', this.handleStart, false);
        this.handle.addEventListener('touchstart', this.handleStart, { passive: false });
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
    // static closest(el: HTMLElement | null | undefined, fn: Function) {
    //     let cur: any = el;
    //     while (cur && cur !== document.body) {
    //         if (fn(cur)) {
    //             return cur;
    //         }
    //         cur = cur.parentNode;
    //     }
    //     return null;
    // }
    // static insertAfter(newNode: any, referenceNode: any) {
    //     const parent = referenceNode.parentNode;
    //     if (parent.lastChild === referenceNode) {
    //         parent.appendChild(newNode); // 直接追加到最后
    //     } else {
    //         parent.insertBefore(newNode, referenceNode.nextSibling); // 插入到下一个节点之前
    //     }
    // }
    setRect(node: HTMLElement | null | undefined, rect: any) {
        if (node instanceof HTMLElement) {
            node.style.width = `${rect.width}px`;
            node.style.height = `${rect.height}px`;
            // node.style.left = `${rect.left}px`;
            // node.style.top = `${rect.top}px`;
            this.setPos(node, {
                left: rect.left,
                top: rect.top
            });
        }
    }
    getRect(dom: any) {
        return getRect(dom);
    }
    setPos(node: HTMLElement | null | undefined, offsetPos: any) {
        const pos = offsetPos;
        if (this.axis === 'x') {
            pos.top = 0;
        } else if (this.axis === 'y') {
            pos.left = 0;
        }
        if (!(node instanceof HTMLElement)) {
            return;
        }
        if (this.translate) {
            node.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
        } else {
            node.style.left = `${pos.left}px`;
            node.style.top = `${pos.top}px`;
        }
    }
    // createHelper() {
    //     if (this.container && !this.proxyNode) {
    //         const proxyNode = document.createElement('div');
    //         proxyNode.classList.add('draggable-proxy');
    //         // proxyNode.style.position = 'absolute';
    //         this.container.appendChild(proxyNode);
    //         this.proxyNode = proxyNode;
    //     }
    // }
    // getPosByDom(dom: any) {
    //     let pos = dom.style.transform.split(/[(|,|)]/g);
    //     return {
    //         left: parseFloat(pos.left),
    //         top: parseFloat(pos.top)
    //     };
    // }
    // lock() {
    //     this.locked = true;
    // }
    // unlock() {
    //     this.locked = false;
    // }
    // isLocked() {
    //     return this.locked;
    // }
    // getRect(dom: any) {
    //     let { left, top } = this.getPosByDom(dom);
    //     return {
    //         left,
    //         top,
    //         width: dom.offsetWidth,
    //         height: dom.offsetHeight
    //     };
    // }
    onStart(e: any, self: DragDrop) { }
    onMove(e: any, self: DragDrop) { }
    onEnd(e: any, self: DragDrop) { }
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
        if (this.autoScroller) {
            this.autoScroller.clear();
            this.autoScroller.start();
        }
        this.current = e.target;
        const rect = getRect(this.handle);
        const containerRect = getRect(this.container);
        const relativeRect = {
            width: rect.width,
            height: rect.height,
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top
        };
        this.startXY = this.endXY = {
            left: relativeRect.left,
            top: relativeRect.top
        };
        const pos = this.getPosition(e);
        this.endPos = this.startPos = {
            left: pos.left,
            top: pos.top
        };

        this.moving = true;
        // this.createHelper();

        // this.setRect(this.proxyNode, relativeRect);
        // this.proxyNode.style.display = 'block';

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
        if (!this.moving) {
            return;
        }

        const pos = this.getPosition(e);
        this.endPos = {
            left: pos.left,
            top: pos.top
        };

        if (this.endPos.left - this.startPos.left === 0 && this.endPos.top - this.startPos.top === 0) {
            return;
        }
        const scale = this.scale;
        const space = this.space;
        this.increase = {
            left: Math.round((this.endPos.left - this.startPos.left) / space / scale) * space,
            top: Math.round((this.endPos.top - this.startPos.top) / space / scale) * space
        }

        let left = this.startXY.left + this.increase.left;
        let top = this.startXY.top + this.increase.top;

        if (left < 0) {
            left = 0;
        }
        if (top < 0) {
            top = 0;
        }

        this.endXY = {
            left,
            top
        };

        // this.setPos(this.handle, this.endXY);
        // this.autoScroll();
 
        this.onMove(e, this);
        if (this.autoScroller) {
            this.autoScroller.update(getRect(this.preview), getRect(this.container));
        }
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
        this.moving = false;
        // this.proxyNode.style.display = 'none';
        if (this.autoScroller) {
            this.autoScroller.clear();
        }
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
    onAutoScroll(offset: any) { }
    destroy() {
        if (this.handle) {
            this.handle.removeEventListener('mousedown', this.handleStart);
            this.handle.removeEventListener('touchstart', this.handleStart);
        }
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
    }
}