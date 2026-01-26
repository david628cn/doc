import { getRect } from "@/components/utils/align";



export type GridPlateProps = {
    container?: HTMLElement | null | undefined;
    [key: string]: unknown;
}

export class GridPlate {
    container: HTMLElement | null | undefined;
    proxyNode: any;
    current: any;
    locked: boolean = false;
    // distance: number = 0;
    scale: number = 1;
    space: number = 1;
    increase: any = {
        left: 0,
        top: 0
    };
    startPagePos = {
        left: 0,
        top: 0
    };
    endPagePos = {
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
    constructor(props: GridPlateProps) {
        Object.assign(this, props);
        if (!this.container || !(this.container instanceof HTMLElement)) {
            this.container = document.body;
        }
        this.container.addEventListener('mousedown', this.handleMouseDown, false);
        this.container.addEventListener('touchstart', this.handleMouseDown, { passive: false });

        this.container.addEventListener('mousemove', this.handleMouseMove, false);
        this.container.addEventListener('touchmove', this.handleMouseMove, { passive: false });

        this.container.addEventListener('mouseenter', this.handleMouseEnter, false);
        this.container.addEventListener('mouseleave', this.handleMouseLeave, false);

    }
    createHelper() {
        if (this.container && !this.proxyNode) {
            const proxyNode = document.createElement('div');
            proxyNode.classList.add('draggable-proxy');
            // proxyNode.style.position = 'absolute';
            this.container.appendChild(proxyNode);
            this.proxyNode = proxyNode;
        }
    }
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
    getRect(dom: any) {
        return getRect(dom);
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
    onDocMouseDown(e: any) {}
    onDocMouseMove(e: any) {}
    onDocMouseUp(e: any) {}
    handleMouseMove = (e: any) => {
        e.preventDefault();
        const node = this.closest(e.target, (el: any) => el.classList.contains('notion-block'));
        // if (node) {
        //     console.log('handleMouseMove', node);
        // }
    }
    handleMouseEnter = (e: any) => {
        e.preventDefault();
        console.log('handleMouseEnter');
    }
    handleMouseLeave = (e: any) => {
        e.preventDefault();
        console.log('handleMouseLeave');
    }
    handleMouseDown = (e: any) => {
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
        const node = this.closest(e.target, (el: any) => el.classList.contains('notion-block'));
        if (!node) {
            return;
        }
        this.current = e.target;
        const rect = getRect(node);
        const containerRect = getRect(this.container);
        const relativeRect = {
            width: rect.width,
            height: rect.height,
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top
        };
        this.startPagePos = this.endPagePos = {
            left: relativeRect.left,
            top: relativeRect.top
        };
        const pos = this.getPosition(e);
        this.endPos = this.startPos = {
            left: pos.left,
            top: pos.top
        };

        this.unlock();
        this.createHelper();
        
        this.setRect(this.proxyNode, relativeRect);
        this.proxyNode.style.display = 'block';

        document.addEventListener('mousemove', this.handleDocMove, false);
        document.addEventListener('touchmove', this.handleDocMove, { passive: false });

        document.addEventListener('mouseup', this.handleDocUp, false);
        document.addEventListener('touchend', this.handleDocUp, { passive: false });
        document.addEventListener('touchcancel', this.handleDocUp, { passive: false });

        this.onDocMouseDown(e);
    }
    handleDocMove = (e: any) => {
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

        const node = this.closest(e.target, (el: any) => el.classList.contains('notion-block'));
        console.log('handleDocMove', node);

        if (this.endPos.left - this.startPos.left === 0 && this.endPos.top - this.startPos.top === 0) {
            return;
        }
        const scale = this.scale;
        const space = this.space;
        this.increase = {
            left: Math.round((this.endPos.left - this.startPos.left) / space / scale) * space, 
            top: Math.round((this.endPos.top - this.startPos.top) / space / scale) * space
        }

        this.endPagePos = {
            left: this.startPagePos.left + this.increase.left,
            top: this.startPagePos.top + this.increase.top
        };

        this.setPos(this.proxyNode, this.endPagePos);

        this.onDocMouseMove(e);
    }
    handleDocUp = (e: any) => {
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
        this.proxyNode.style.display = 'none';

        document.removeEventListener('mousemove', this.handleDocMove);
        document.removeEventListener('touchmove', this.handleDocMove);

        document.removeEventListener('mouseup', this.handleDocUp);
        document.removeEventListener('touchend', this.handleDocUp);
        document.removeEventListener('touchcancel', this.handleDocUp);
        this.onDocMouseUp(e);
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
    closest(el: HTMLElement | null | undefined, fn: Function) {
        let cur: any = el;
        while (cur && cur !== document.body) {
            if (fn(cur)) {
                return cur;
            }
            cur = cur.parentNode;
        }
        return null;
    }
    insertAfter(newNode: any, referenceNode: any) {
        const parent = referenceNode.parentNode;
        if (parent.lastChild === referenceNode) {
            parent.appendChild(newNode); // 直接追加到最后
        } else {
            parent.insertBefore(newNode, referenceNode.nextSibling); // 插入到下一个节点之前
        }
    }
    setRect(node: HTMLElement | null | undefined, rect: any, is: boolean = false) {
        if (node instanceof HTMLElement) {
            node.style.width = `${rect.width}px`;
            node.style.height = `${rect.height}px`;
            // node.style.left = `${rect.left}px`;
            // node.style.top = `${rect.top}px`;
            this.setPos(node, {
                left: rect.left,
                top: rect.top
            }, is);
        }
    }
    setPos(node: HTMLElement | null | undefined, pos: any, is: boolean = false) {
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
    destroy() {
        if (this.container) {
            this.container.removeEventListener('mousedown', this.handleMouseDown);
            this.container.removeEventListener('touchstart', this.handleMouseDown);

            this.container.removeEventListener('mousemove', this.handleMouseMove);
            this.container.removeEventListener('touchmove', this.handleMouseMove);

            this.container.removeEventListener('mouseenter', this.handleMouseEnter);
            this.container.removeEventListener('mouseleave', this.handleMouseLeave);
        }
        document.removeEventListener('mousemove', this.handleDocMove);
        document.removeEventListener('touchmove', this.handleDocMove);

        document.removeEventListener('mouseup', this.handleDocUp);
        document.removeEventListener('touchend', this.handleDocUp);
        document.removeEventListener('touchcancel', this.handleDocUp);
    }
}