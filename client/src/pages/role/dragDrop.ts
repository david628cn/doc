import { getRect } from "@/components/utils/align";



export type DragDropProps = {
    container?: HTMLElement | null | undefined;
    [key: string]: unknown;
}

export class DragDrop {
    container: HTMLElement | null | undefined;
    // proxyNode: any;
    current: any;
    locked: boolean = false;
    // distance: number = 0;
    scale: number = 1;
    space: number = 1;
    increase: any = {
        left: 0,
        top: 0
    };
    // startPagePos = {
    //     left: 0,
    //     top: 0
    // };
    // endPagePos = {
    //     left: 0,
    //     top: 0
    // };
    startPos: any = {
        left: 0,
        top: 0
    };
    endPos: any = {
        left: 0,
        top: 0
    };
    static isTouchEvent(event: any) {
        return (
            (event.touches && event.touches.length) ||
            (event.changedTouches && event.changedTouches.length)
        );
    }
    static getPosition(event: any) {
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
    static setRect(node: HTMLElement | null | undefined, rect: any, is: boolean = false) {
        if (node instanceof HTMLElement) {
            node.style.width = `${rect.width}px`;
            node.style.height = `${rect.height}px`;
            // node.style.left = `${rect.left}px`;
            // node.style.top = `${rect.top}px`;
            DragDrop.setPos(node, {
                left: rect.left,
                top: rect.top
            }, is);
        }
    }
    static getRect(dom: any) {
        return getRect(dom);
    }
    static setPos(node: HTMLElement | null | undefined, pos: any, is: boolean = false) {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        if (is) {
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
        this.container.addEventListener('mousedown', this.handleStart, false);
        this.container.addEventListener('touchstart', this.handleStart, { passive: false });
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
        // const rect = getRect(node);
        // const containerRect = getRect(this.container);
        // const relativeRect = {
        //     width: rect.width,
        //     height: rect.height,
        //     left: rect.left - containerRect.left,
        //     top: rect.top - containerRect.top
        // };
        // this.startPagePos = this.endPagePos = {
        //     left: relativeRect.left,
        //     top: relativeRect.top
        // };
        const pos = DragDrop.getPosition(e);
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
       
        const pos = DragDrop.getPosition(e);
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

        // this.endPagePos = {
        //     left: this.startPagePos.left + this.increase.left,
        //     top: this.startPagePos.top + this.increase.top
        // };

        // this.setPos(this.proxyNode, this.endPagePos);

        this.onMove(e);
    }
    handleEnd = (e: any) => {
        if (!DragDrop.isTouchEvent(e)) {
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