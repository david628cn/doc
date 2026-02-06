import { node } from 'webpack';
import { getStyle, getRect, getMargin, getScroll, getRectSroll } from '../utils/align';
import AutoScroller from '../utils/autoScroller';
import './index.less';
import { Position } from 'postcss';

// const events: any = {
//     end: ['touchend', 'touchcancel', 'mouseup'],
//     move: ['touchmove', 'mousemove'],
//     start: ['touchstart', 'mousedown'],
// };

const NodeType: any = {
    Anchor: 'A',
    Button: 'BUTTON',
    Canvas: 'CANVAS',
    Input: 'INPUT',
    Option: 'OPTION',
    Textarea: 'TEXTAREA',
    Select: 'SELECT',
};

const isTouchEvent = (event: any) => {
    return (
        (event.touches && event.touches.length) ||
        (event.changedTouches && event.changedTouches.length)
    );
}

const getPosition = (event: any) => {
    if (event.touches && event.touches.length) {
        return {
            x: event.touches[0].pageX,
            y: event.touches[0].pageY
        };
    } else if (event.changedTouches && event.changedTouches.length) {
        return {
            x: event.changedTouches[0].pageX,
            y: event.changedTouches[0].pageY
        };
    } else {
        return {
            x: event.pageX,
            y: event.pageY
        };
    }
}


const insertAfter = (newNode: any, referenceNode: any) => {
    const parent = referenceNode.parentNode;
    if (parent.lastChild === referenceNode) {
        parent.appendChild(newNode); // 直接追加到最后
    } else {
        parent.insertBefore(newNode, referenceNode.nextSibling); // 插入到下一个节点之前
    }
}

// const findParentByCondition = (element: any, condition?: any) => {
//     if (condition(element)) {
//         return element;
//     }
//     while (element.parentNode) {
//         element = element.parentNode;
//         if (condition(element)) {
//             return element;
//         }
//     }
//     return null;
// }

const closest = (el: any, fn: Function) => {
    while (el) {
        if (fn(el)) {
            return el;
        }
        el = el.parentNode;
    }
    return null;
}

interface DraggableProps {
    container?: any;
    onStart?: Function;
    onMove?: Function;
    onEnd?: Function;
}

class Draggable {
    container: any;
    handle: any;
    autoScroller: any;
    delta: any = {
        x: 0,
        y: 0
    };
    private _activeNode: any;
    helperContainer: any;
    proxyNode: any;
    markNode: any;
    distance: number = 0;
    moved: boolean = false;
    position: any = {
        x: 0,
        y: 0
    };
    startPos: any = {
        x: 0,
        y: 0
    };
    endPos: any = {
        x: 0,
        y: 0
    };
    constructor(props: DraggableProps) {
        Object.assign(this, props);
        if (this.container) {
            // Object.keys(this.events).forEach((key) =>
            //     events[key].forEach((eventName: string) => this.container.addEventListener(eventName, this.events[key], false))
            // );
            const hasPosition = getStyle(this.container, 'position') !== 'absolute' && getStyle(this.container, 'position') !== 'sticky';
            if (hasPosition) {
                this.container.style.position = 'relative';
            }
            this.autoScroller = new AutoScroller(
                this.container,
                this.onAutoScroll,
            );
            this.container.addEventListener('mousedown', this.handleStart, false);
            this.container.addEventListener('touchstart', this.handleStart, { passive: false });
        }
        this.helperContainer = document.createElement('div');
        this.helperContainer.className = 'draggable-helperContainer';
        document.body.appendChild(this.helperContainer);
        this.markNode = document.createElement('div');
        this.markNode.className = 'draggable-markNode';
        this.helperContainer.appendChild(this.markNode);
    }
    // shouldCancelStart(e: any) {
    //     return false;
    // }
    set activeNode(node: any) {
        if (this._activeNode) {
            this._activeNode.classList.remove('draggable-active');
        }
        this._activeNode = node;
        if (this._activeNode) {
            this._activeNode.classList.add('draggable-active');
        }
    }
    get activeNode() {
        return this._activeNode;
    }
    createHelper(node: any, parentNode: any = document.body) {
        const proxyNode = parentNode.appendChild(node.cloneNode(true));
        proxyNode.classList.add('draggable-proxyNode');
        proxyNode.style.position = 'absolute';
        this.helperContainer.appendChild(proxyNode);
        return proxyNode;
    }
    removeHelper() {
        if (this.proxyNode) {
            this.proxyNode.parentNode.removeChild(this.proxyNode);
            this.proxyNode = null;
        }
    }
    setRect(node: any, rect: any) {
        if (node) {
            node.style.width = `${rect.width}px`;
            node.style.height = `${rect.height}px`;
            // node.style.left = `${rect.left}px`;
            // node.style.top = `${rect.top}px`;
            this.setPos(node, {
                x: rect.left,
                y: rect.top
            });
        }
    }
    setPos(node: any, pos: any) {
        // node.style.left = `${pos.x}px`;
        // node.style.top = `${pos.y}px`;
        node.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
    handleStart = (e: any) => {
        const node = closest(e.target, (el: any) => el.parentNode === this.container);
        if (node) {
            // if (!isTouchEvent(e)) {
            e.preventDefault();
            // }
            if (e.button === 2) {
                return;
            }
            // const distance = this.distance;
            this.moved = true;
            this.position = getPosition(e);
            this.delta = {
                x: 0,
                y: 0
            };
            this.startPos = {
                x: 0,
                y: 0
            };
            this.removeHelper();
            if (this.autoScroller) {
                this.autoScroller.clear();
            }
            // e.preventDefault();
            // this.container.focus();
            const nodeRectScroll = getRectSroll(node, document);
            const rect = {
                left: nodeRectScroll.left - getMargin(node, 'l'),
                top: nodeRectScroll.top - getMargin(node, 't'),
                width: nodeRectScroll.width,
                height: nodeRectScroll.height
            };
            this.proxyNode = this.createHelper(node, document.body);
            this.setRect(this.proxyNode, rect);

            this.startPos = {
                x: rect.left,
                y: rect.top
            };

            // this.activeNode = node;
            this.onStart();
            document.addEventListener('mousemove', this.handleMove, false);
            document.addEventListener('touchmove', this.handleMove, { passive: false });

            document.addEventListener('mouseup', this.handleEnd, false);
            document.addEventListener('touchend', this.handleEnd, { passive: false });
            document.addEventListener('touchcancel', this.handleEnd, { passive: false });
            // const node = closest(e.target, (el: any) => el.sortableInfo !== null);
        }

    }
    handleMove = (e: any) => {
        if (this.moved) {
            // if (!isTouchEvent(e)) {
            e.preventDefault();
            // }
            const position = getPosition(e);
            const delta = {
                x: position.x - this.position.x,
                y: position.y - this.position.y
            };
            // const combinedDelta = Math.abs(delta.x) + Math.abs(delta.y);
            this.delta = delta;
            // this.helper.style.width = `${rect.width}px`;
            // this.helper.style.height = `${rect.height}px`;
            // this.helper.style.position = 'absolute';
            this.endPos = {
                x: this.startPos.x + this.delta.x,
                y: this.startPos.y + this.delta.y
            }
            this.setPos(this.proxyNode, this.endPos);
            this.onMove();
            this.autoScroll();
            // console.log('handleMove', this.delta);

        }

    }
    handleEnd = (e: any) => {
        if (!isTouchEvent(e)) {
            e.preventDefault();
        }
        // console.log('handleEnd', e);
        this.moved = false;
        this.removeHelper();
        this.activeNode = null;
        if (this.autoScroller) {
            this.autoScroller.clear();
        }
        this.onEnd();
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('touchmove', this.handleMove);

        document.removeEventListener('mouseup', this.handleEnd);
        document.removeEventListener('touchend', this.handleEnd);
        document.removeEventListener('touchcancel', this.handleEnd);
    }
    getNodes() {
        return this.container.querySelectorAll('.drag-item');
    }
    // updatePosition() {
    //     const helperRect = {
    //         width:  this.helper.offsetWidth,
    //         height: this.helper.offsetHeight,
    //         left: this.endPos.x + getMargin(this.helper, 'l'),
    //         top: this.endPos.y + getMargin(this.helper, 't')
    //     };
    //     const nodes = this.container.querySelectorAll('.drag-item');
    //     // let preNode = null;
    //     // let preNodeRect = null;
    //     // let nodeGrap = {
    //     //     width: 0,
    //     //     height: 0
    //     // }
    //     let insertNode= this.activeNode;
    //     for (let i = 0; i < nodes.length; i++) {
    //         const nodeRectScroll = getRect(nodes[i]);
    //         const nodeRect = {
    //             left: nodeRectScroll.left,
    //             top: nodeRectScroll.top,
    //             width: nodeRectScroll.width,
    //             height: nodeRectScroll.height
    //         };
    //         if (nodes[i] === this.activeNode) {
    //             // console.log(i);
    //         } else {
    //             if (helperRect.top + helperRect.height >= nodeRect.top + nodeRect.height / 2) {
    //                 // nodes[i].style.transitionDuration = '300ms';
    //                 // nodes[i].style.transform = `translate(0, -${}px)`;
    //                 // console.log('node in', i);
    //                 insertNode = nodes[i];
    //             } else {
    //                 // nodes[i].style.transitionDuration = '300ms';
    //                 // nodes[i].style.transform = '';
    //                 // console.log('node out', i);
    //             }
    //         }
    //         // preNode = nodes[i];
    //         // preNodeRect = nodeRect;
    //     }
    //     if (insertNode !== this.activeNode) {
    //         if (insertNode === nodes[0]) {
    //             insertNode.parentNode.insertBefore(this.activeNode, insertNode);
    //         } else {
    //             insertAfter(this.activeNode, insertNode);
    //         }
    //     }
    //     // return;
    //     // this.updateScroll();
    //     const containerRect = getRect(this.container);
    //     const minLeft = containerRect.left;
    //     const minTop = containerRect.top;
    //     const maxLeft = containerRect.right;
    //     const maxTop = containerRect.bottom;

    //     // const helperRect = getRect(this.helper);

    //     this.autoScroller.update({
    //         width:  this.helper.offsetWidth,
    //         height: this.helper.offsetHeight,
    //         minTranslate: {
    //             x: minLeft,
    //             y: minTop
    //         },
    //         maxTranslate: {
    //             x: maxLeft,
    //             y: maxTop
    //         },
    //         translate: {
    //             x: this.endPos.x + getMargin(this.helper, 'l'),
    //             y: this.endPos.y + getMargin(this.helper, 't')
    //         }
    //         // translate: {
    //         //     x: helperRect.left,
    //         //     y: helperRect.top
    //         // }

    //     });
    // }
    autoScroll() {
        const containerRect = getRect(this.container);
        const minLeft = containerRect.left;
        const minTop = containerRect.top;
        const maxLeft = containerRect.right;
        const maxTop = containerRect.bottom;

        // const helperRect = getRect(this.helper);

        this.autoScroller.update({
            width: this.proxyNode.offsetWidth,
            height: this.proxyNode.offsetHeight,
            minTranslate: {
                x: minLeft,
                y: minTop
            },
            maxTranslate: {
                x: maxLeft,
                y: maxTop
            },
            translate: {
                x: this.endPos.x + getMargin(this.proxyNode, 'l'),
                y: this.endPos.y + getMargin(this.proxyNode, 't')
            }
            // translate: {
            //     x: helperRect.left,
            //     y: helperRect.top
            // }

        });
    }
    onStart() {

    }
    onMove() {

    }
    onEnd() {

    }
    onAutoScroll(offset: Position) {

    }
}

export default Draggable;