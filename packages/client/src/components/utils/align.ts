export type position = {
    left: number;
    top: number;
}

export type Rect = position & {
    width: number;
    height: number;
    right: number;
    bottom: number;
}

export type Element = HTMLElement & {
    scrollLeft?: number;
    scrollTop?: number;
    currentStyle?: CSSStyleDeclaration;
}

export const getStyle = (dom: Element | null | undefined, styleProp: any): string => {
    if (!dom) {
        return '';
    }
    return dom.currentStyle ? dom.currentStyle[styleProp] : window.getComputedStyle(dom)[styleProp];
}

export const getScroll = (dom: any): position => {
    let pos: position;
    if (dom === document || dom === document.body) {
        const left = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        pos = {
            left,
            top
        };
    } else {
        pos = {
            left: dom.scrollLeft || 0,
            top: dom.scrollTop || 0
        };
    }
    return pos;
}

export const getRect = (dom: Element | null | undefined): Rect => {
    if (!dom) {
        return {
            width: 0,
            height: 0,
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        }
    }
    const { width, height, left, top, right, bottom } = dom.getBoundingClientRect();
    return {
        width,
        height,
        left,
        top,
        right,
        bottom
    }
}

export const getRectSroll = (dom: Element | null | undefined, scrollDom: any = document): Rect => {
    if (!dom) {
        return {
            width: 0,
            height: 0,
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        }
    }
    const { width, height, left, top, right, bottom } = dom.getBoundingClientRect();
    const scroll = getScroll(scrollDom);
    return {
        width,
        height,
        left: left + scroll.left,
        top: top + scroll.top,
        right: right - scroll.left,
        bottom: bottom - scroll.top
    }
}

export const getBorderWidth = (dom: Element | null | undefined, side: string): number => {
    let rs = 0;
    for (let i = 0, len = side.length; i < len; i++) {
        let width: any = getStyle(dom, {
            'l': 'border-left-width',
            'r': 'border-right-width',
            't': 'border-top-width',
            'b': 'border-bottom-width'
        }[side.charAt(i)]);
        if (width) {
            width = parseInt(width, 10);
            if (width) {
                rs += width;
            }
        }
    }
    return rs;
}

export const getPadding = (dom: Element | null | undefined, side: string) => {
    let rs = 0;
    for (let i = 0, len = side.length; i < len; i++) {
        let width: any = getStyle(dom, {
            'l': 'padding-left',
            'r': 'padding-right',
            't': 'padding-top',
            'b': 'padding-bottom'
        }[side.charAt(i)]);
        if (width) {
            width = parseInt(width, 10);
            if (width) {
                rs += width;
            }
        }
    }
    return rs;
}

export const getMargin = (dom: Element | null | undefined, side: string) => {
    let rs = 0;
    for (let i = 0, len = side.length; i < len; i++) {
        let width: any = getStyle(dom, {
            'l': 'margin-left',
            'r': 'margin-right',
            't': 'margin-top',
            'b': 'margin-bottom'
        }[side.charAt(i)]);
        if (width) {
            width = parseInt(width, 10);
            if (width) {
                rs += width;
            }
        }
    }
    return rs;
}

export const findParentWithPosition = (dom: any) => {
    let curDom = dom;
    while (curDom) {
        // const style = window.getComputedStyle(curDom);
        if (getStyle(curDom, 'position') !== 'static') {
            return curDom;
        }
        curDom = curDom.parentElement;
    }
    return document.body;
}

export const getAnchor = (rect: Rect, pos: string, isAnchor: boolean = false): position => {
    let left = 0;
    let top = 0;
    switch ((pos || 'tl').toLowerCase()) {
        case 'c':
            left = Math.round(rect.width * .5);
            top = Math.round(rect.height * .5);
            break;
        case 't':
            left = Math.round(rect.width * .5);
            top = 0;
            break;
        case 'l':
            left = 0;
            top = Math.round(rect.height * .5);
            break;
        case 'r':
            left = rect.width;
            top = Math.round(rect.height * .5);
            break;
        case 'b':
            left = Math.round(rect.width * .5);
            top = rect.height;
            break;
        case 'tl':
            left = 0;
            top = 0;
            break;
        case 'bl':
            left = 0;
            top = rect.height;
            break;
        case 'br':
            left = rect.width;
            top = rect.height;
            break;
        case 'tr':
            left = rect.width;
            top = 0;
            break;
    }
    if (!isAnchor) {
        return {
            left,
            top
        };
    }
    const scroll = getScroll(document);
    left = left + Math.round(rect.left + scroll.left)
    top = top + Math.round(rect.top + scroll.top);
    return {
        left,
        top
    };
}

// export const getAlignPos = (rectDom: Rect | HTMLElement, anchorDom: Rect | HTMLElement, config: any): position => {
//     let curPos = config.pos || config.placement;
//     const gap = config.gap || 0;
//     if (!curPos) {
//         curPos = 'tl-bl';
//     } else if (curPos === '?') {
//         curPos = 'tl-bl?';
//     } else if (curPos.indexOf('-') === -1) {
//         curPos = 'tl-' + curPos;
//     }
//     curPos = curPos.toLowerCase();
//     const posArr: any = curPos.match(/^([a-z]+)-([a-z]+)(\?)?$/);
//     // const pos = posArr[0];
//     const pos1 = posArr[1];
//     const pos2 = posArr[2];
//     const p1x = pos1.charAt(pos1.length - 1);
//     const p1y = pos1.charAt(0);
//     const p2x = pos2.charAt(pos2.length - 1);
//     const p2y = pos2.charAt(0);
//     const isAuto = posArr[3];

//     let rect = rectDom;
//     let anchorRect = anchorDom;
//     if (rect instanceof HTMLElement) {
//         rect = getRect(rect);
//     }
//     if (anchorRect instanceof HTMLElement) {
//         anchorRect = getRect(anchorRect);
//     }
//     const portalPos = getAnchor(rect, pos1);
//     const anchorRectPos = getAnchor(anchorRect, pos2, true);

//     const container = config.container || document.body;

//     let positionNode = findParentWithPosition(container);
//     let positionNodeRect = getRect(positionNode);

//     let gapLeft = 0;
//     let gapTop = 0;

//     let swapX = false;
//     let swapY = false;

//     if (p1x === 'r' && p2x === 'l') {
//         gapLeft -= gap;
//         swapX = true;
//     } else if (p1x === 'l' && p2x === 'r') {
//         gapLeft += gap;
//         swapX = true;
//     }
//     if (p1y === 't' && p2y === 'b') {
//         gapTop += gap;
//         swapY = true;
//     } else if (p1y === 'b' && p2y === 't') {
//         gapTop -= gap;
//         swapY = true;
//     }

//     let docScroll = getScroll(document.body);
//     let positionNodeScroll = {
//         left: 0,
//         top: 0
//     };
//     if (document.body !== positionNode) {
//         positionNodeScroll = getScroll(positionNode);
//     }

//     let left = anchorRectPos.left - portalPos.left - positionNodeRect.left + gapLeft - docScroll.left + positionNodeScroll.left;
//     let top = anchorRectPos.top - portalPos.top - positionNodeRect.top + gapTop - docScroll.top + positionNodeScroll.top;

//     if (isAuto) {
//         const dxy = {
//             left: 0,
//             top: 0
//         };

//         // const viewWidth = (document.documentElement.clientWidth || document.body.clientWidth);
//         // const viewHeight = (document.documentElement.clientHeight || document.body.clientHeight);

//         // const positionNodeWidth = positionNode.clientWidth;
//         // const positionNodeHeight = positionNode.clientHeight;

//         const docRect = getRect(document.body);

//         const getRelativeLeft = (x: number) => {
//             return x + positionNodeRect.left + positionNodeScroll.left - positionNodeScroll.left - positionNodeScroll.left;
//         }
//         const getRelativeTop = (y: number) => {
//             return y + positionNodeRect.top + positionNodeScroll.top - positionNodeScroll.top - positionNodeScroll.top;
//         }
//         // console.log(700 + positionNodeRect.left - positionNodeScroll.left + docScroll.left, anchorRect.left + docScroll.left);

//         // console.log(positionNodeRect.left + docScroll.left, docRect.left + docScroll.left, 700 + positionNodeRect.left + docScroll.left);

//         // console.log(docRect.left, positionNodeRect.left);

//         if ((swapX || swapY) && left + positionNodeRect.left + rect.width - positionNodeScroll.left - docScroll.left + dxy.left > Math.min(docRect.right, positionNodeRect.right)) {
//             left = left - rect.width - anchorRect.width - 2 * gapLeft;
//         }
//         // console.log('>>> ', 420 + positionNodeRect.left + positionNodeScroll.left - positionNodeScroll.left - positionNodeScroll.left, anchorRect.left)
//         // console.log('>>> ', getRelativeLeft(left - dxy.left), positionNodeRect.left)
//         // console.log('>>> ', left + positionNodeRect.left + docScroll.left < dxy.left + docScroll.left + docScroll.left)
//         if ((swapX || swapY) && (getRelativeLeft(left - dxy.left) < 0 || (getRelativeLeft(left - dxy.left) < positionNodeRect.left))) {
//             left = left + rect.width + anchorRect.width - 2 * gapLeft;
//             // left = left + rect.width + anchorRect.width - 2 * gapLeft;
//         }
//         if ((swapX || swapY) && top + positionNodeRect.top + rect.height - positionNodeScroll.top - docScroll.top + dxy.top > Math.min(docRect.bottom, positionNodeRect.bottom)) {
//             top = top - rect.height - anchorRect.height - 2 * gapTop;
//         }
//         if ((swapX || swapY) && (getRelativeTop(top - dxy.top) < 0 || (getRelativeTop(top - dxy.top) < positionNodeRect.top))) {
//             top = top + rect.height + anchorRect.height - 2 * gapTop;
//         }

//         // console.log(docRect, positionNodeRect, viewWidth, viewHeight, positionNodeWidth, positionNodeHeight);

//     }

//     return {
//         left,
//         top
//     }
// }

export const getAlignPos = (rectDom: Rect | HTMLElement, anchorDom: Rect | HTMLElement, config: any): position => {
    let curPos = config.pos || config.placement;
    const gap = config.gap || 0;
    if (!curPos) {
        curPos = 'tl-bl';
    } else if (curPos === '?') {
        curPos = 'tl-bl?';
    } else if (curPos.indexOf('-') === -1) {
        curPos = 'tl-' + curPos;
    }
    curPos = curPos.toLowerCase();
    const posArr: any = curPos.match(/^([a-z]+)-([a-z]+)(\?)?$/);
    // const pos = posArr[0];
    const pos1 = posArr[1];
    const pos2 = posArr[2];
    const p1x = pos1.charAt(pos1.length - 1);
    const p1y = pos1.charAt(0);
    const p2x = pos2.charAt(pos2.length - 1);
    const p2y = pos2.charAt(0);
    const isAuto = posArr[3];

    let rect = rectDom;
    let anchorRect = anchorDom;
    if (rect instanceof HTMLElement) {
        rect = getRect(rect);
    }
    if (anchorRect instanceof HTMLElement) {
        anchorRect = getRect(anchorRect);
    }
    const portalPos = getAnchor(rect, pos1);
    const anchorRectPos = getAnchor(anchorRect, pos2, true);

    const container = config.container || document.body;

    let positionNode = findParentWithPosition(container);
    let positionNodeRect = getRect(positionNode);

    let gapLeft = 0;
    let gapTop = 0;

    if (p1x === 'r' && p2x === 'l') {
        gapLeft -= gap;
    } else if (p1x === 'l' && p2x === 'r') {
        gapLeft += gap;
    }
    if (p1y === 't' && p2y === 'b') {
        gapTop += gap;
    } else if (p1y === 'b' && p2y === 't') {
        gapTop -= gap;
    }

    let docScroll = getScroll(document.body);
    let positionNodeScroll = {
        left: 0,
        top: 0
    };
    if (document.body !== positionNode) {
        positionNodeScroll = getScroll(positionNode);
    }

    let left = anchorRectPos.left - portalPos.left - positionNodeRect.left + gapLeft - docScroll.left + positionNodeScroll.left;
    let top = anchorRectPos.top - portalPos.top - positionNodeRect.top + gapTop - docScroll.top + positionNodeScroll.top;

    if (isAuto) {
        const dxy = {
            x: config.dxy?.x || 20,
            y: config.dxy?.y || 20
        };

        const swapX = ((p1x === 'r' && p2x === 'l') || (p1x === 'l' && p2x === 'r'));
        const swapY = ((p1y === 't' && p2y === 'b') || (p1y === 'b' && p2y === 't'));

        const viewWidth = (document.documentElement.clientWidth || document.body.clientWidth);
        const viewHeight = (document.documentElement.clientHeight || document.body.clientHeight);

        // const positionNodeWidth = positionNode.clientWidth;
        // const positionNodeHeight = positionNode.clientHeight;

        // const docRect = getRect(document.documentElement);

        // const getRelativeLeft = (x: number) => {
        //     return x + positionNodeRect.left + positionNodeScroll.left - positionNodeScroll.left - positionNodeScroll.left;
        // }
        // const getRelativeTop = (y: number) => {
        //     return y + positionNodeRect.top + positionNodeScroll.top - positionNodeScroll.top - positionNodeScroll.top;
        // }


        if (left + positionNodeRect.left - positionNodeScroll.left + rect.width + dxy.x > viewWidth) {
            left = swapX ? left - anchorRect.width - rect.width - 2 * gapLeft : viewWidth - positionNodeRect.left - rect.width + positionNodeScroll.left;
            // left = viewWidth - positionNodeRect.left - rect.width + positionNodeScroll.left;
        }

        if (left + positionNodeRect.left - positionNodeScroll.left < dxy.x) {
            left = swapX ? left + anchorRect.width + rect.width - 2 * gapLeft : positionNodeRect.left + positionNodeScroll.left + docScroll.left + docScroll.left;
        }
        if (top + positionNodeRect.top - positionNodeScroll.top + rect.height + dxy.y > viewHeight) {
            top = swapY ? top - anchorRect.height - rect.height - 2 * gapTop : viewHeight - positionNodeRect.top - rect.height + positionNodeScroll.top;
            // top = viewHeight - positionNodeRect.top - rect.height + positionNodeScroll.top;
        }

        if (top + positionNodeRect.top - positionNodeScroll.top < dxy.y) {
            top = swapY ? top + anchorRect.height + rect.height - 2 * gapTop : positionNodeRect.top + positionNodeScroll.top + docScroll.top + docScroll.top;
        }

    }

    return {
        left,
        top
    }
}

export const setPos = (node: HTMLElement, pos: any, is: boolean = false) => {
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

export const setAlignPos = (rectDom: HTMLElement, anchorDom: Rect | HTMLElement, config: any, is: boolean = false): position => {
    const pos = getAlignPos(rectDom, anchorDom, config);
    if (rectDom instanceof HTMLElement) {
        setPos(rectDom, pos, is);
    }
    return pos;
}

export const isTouchEvent = (event: any) => {
    return (
        (event.touches && event.touches.length) ||
        (event.changedTouches && event.changedTouches.length)
    );
}
export const getPosition = (event: any) => {
    if (event.touches && event.touches.length) {
        return {
            x: event.touches[0].pageX,
            y: event.touches[0].pageY,
            left: event.touches[0].pageX,
            top: event.touches[0].pageY
        };
    } else if (event.changedTouches && event.changedTouches.length) {
        return {
            x: event.changedTouches[0].pageX,
            y: event.changedTouches[0].pageY,
            left: event.changedTouches[0].pageX,
            top: event.changedTouches[0].pageY
        };
    } else {
        return {
            x: event.pageX,
            y: event.pageY,
            left: event.pageX,
            top: event.pageY
        };
    }
}

export const isValidPosition = (pos: number | null | undefined): pos is number => {
    return typeof pos === 'number' && pos >= 0;
}

export const closest = (dom: any, fn: Function) => {
    let cur: any = dom;
    while (cur && cur !== document.body) {
        if (fn(cur)) {
            return cur;
        }
        cur = cur.parentNode;
    }
    return null;
}

// export const closestByNodeName = (dom: any, nodeName: string, fn: Function) => {
//     let cur = dom;

//     // 向上遍历直到找到 TABLE 标签或到达根节点
//     while (cur && cur.nodeName !== nodeName) {
//         // 如果到了编辑器容器外还没找到，就停止
//         if (fn(cur)) {
//             break;
//         }
//         cur = cur.parentNode;
//     }

//     return (cur && cur.nodeName === nodeName) ? cur : null;
// }