import { getRect } from "@/components/utils/align";


export type DragDropProps = {
    container?: HTMLElement | null | undefined;
    handle?: any;
    translate?: boolean;
    axis?: 'x' | 'y';
    scale?: number;
    space?: number;
    [key: string]: unknown;
}

export class DragDrop {
    container: HTMLElement | null | undefined;
    handle: any;
    axis: string;
    current: any;
    locked: boolean = false;
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
    constructor(props: DragDropProps) {
        Object.assign(this, props);
        if (!this.container || !(this.container instanceof HTMLElement)) {
            this.container = document.body;
        }
        this.handle.addEventListener('mousedown', this.handleStart, false);
        this.handle.addEventListener('touchstart', this.handleStart, { passive: false });
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
    lock() {
        this.locked = true;
    }
    unlock() {
        this.locked = false;
    }
    isLocked() {
        return this.locked;
    }
    // getRect(dom: any) {
    //     let { left, top } = this.getPosByDom(dom);
    //     return {
    //         left,
    //         top,
    //         width: dom.offsetWidth,
    //         height: dom.offsetHeight
    //     };
    // }
    onStart(e: any) {}
    onMove(e: any) {}
    onEnd(e: any) {}
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

        this.unlock();
        // this.createHelper();
        
        // this.setRect(this.proxyNode, relativeRect);
        // this.proxyNode.style.display = 'block';

        document.addEventListener('mousemove', this.handleMove, false);
        document.addEventListener('touchmove', this.handleMove, { passive: false });

        document.addEventListener('mouseup', this.handleEnd, false);
        document.addEventListener('touchend', this.handleEnd, { passive: false });
        document.addEventListener('touchcancel', this.handleEnd, { passive: false });

        this.onStart(e);
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
        if (this.isLocked()) {
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

        this.endXY = {
            left: this.startXY.left + this.increase.left,
            top: this.startXY.top + this.increase.top
        };

        this.setPos(this.handle, this.endXY);

        this.onMove(e);
    }
    handleEnd = (e: any) => {
        if (!this.isTouchEvent(e)) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        this.lock();
        // this.proxyNode.style.display = 'none';

        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
        this.onEnd(e);
    }
    destroy() {
        if (this.container) {
            this.container.removeEventListener('mousedown', this.handleStart);
            this.container.removeEventListener('touchstart', this.handleStart);
        }
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
    }
}