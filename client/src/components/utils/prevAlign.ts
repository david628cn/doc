type position = {
    left: number;
    top: number;
}

type Rect = position & {
    width: number;
    height: number;
    right: number;
    bottom: number;
}

type Element = HTMLElement & {
    scrollLeft?: number;
    scrollTop?: number;
    currentStyle?: CSSStyleDeclaration;
}

const getStyle = (dom: Element | null | undefined, styleProp: any): string => {
    if (!dom) {
        return '';
    }
    return dom.currentStyle ? dom.currentStyle[styleProp] : window.getComputedStyle(dom)[styleProp];
}

const getScroll = (dom: any): position => {
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

const getRect = (dom: Element | null | undefined): Rect => {
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

const getRectSroll = (dom: Element | null | undefined, scrollDom: any = document): Rect => {
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

const getBorderWidth = (dom: Element | null | undefined, side: string): number => {
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

const getPadding = (dom: Element | null | undefined, side: string) => {
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

const getMargin = (dom: Element | null | undefined, side: string) => {
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

const getAnchor = (rect: Rect, pos: string, isAnchor: boolean = false): position => {
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

const getAlignPos = (rect: Rect, anchorRect: Rect, pos?: string, offset: Array<number> = [0, 0]): position => {
    let curPos = pos;
    if (!curPos) {
        curPos = 'tl-bl';
    } else if (curPos === '?') {
        curPos = 'tl-bl?';
    } else if (curPos.indexOf('-') === -1) {
        curPos = 'tl-' + curPos;
    }
    curPos = curPos.toLowerCase();
    const posArr: any = curPos.match(/^([a-z]+)-([a-z]+)(\?)?$/);
    const pos1 = posArr[1];
    const pos2 = posArr[2];
    const p1x = pos1.charAt(pos1.length - 1);
    const p1y = pos1.charAt(0);
    const p2x = pos2.charAt(pos2.length - 1);
    const p2y = pos2.charAt(0);
    
    const portalPos = getAnchor(rect, pos1);
    const portalRect = rect;
    const dxy = offset;
    if (p1x === 'r' || p1y === 'r') {
        dxy[0] = -offset[0];
    }
    if (p1y === 'b' || p1x === 'b') {
        dxy[1] = -offset[1];
    }
    const anchorRectPos = getAnchor(anchorRect, pos2, true);

    let left = anchorRectPos.left - portalPos.left + dxy[0];
    let top = anchorRectPos.top - portalPos.top + dxy[1];
    const pad = [5, 5];
    if (posArr[3]) {
        const viewWidth = (document.documentElement.clientWidth || document.body.clientWidth);
        const viewHeight = (document.documentElement.clientHeight || document.body.clientHeight);
        
        const swapX = ((p1x === 'r' && p2x === 'l') || (p1x === 'l' && p2x === 'r'));
        const swapY = ((p1y === 't' && p2y === 'b') || (p1y === 'b' && p2y === 't'));

        const scrollX = (document.documentElement.scrollLeft || document.body.scrollLeft || 0);
        const scrollY = (document.documentElement.scrollTop || document.body.scrollTop || 0);

        if ((left + portalRect.width) > viewWidth + scrollX) {
            left = swapX ? anchorRect.left - portalRect.width - dxy[0] : viewWidth + scrollX - portalRect.width;
            // left = targetRect.left + scrollX;
        }
        if (left < scrollX) {
            left = swapX ? anchorRect.right - dxy[0] : scrollX;
            // left = anchorRect.left + anchorRect.width - portalRect.width + scrollX;
        }
        if ((top + portalRect.height) > viewHeight + scrollY) {
            top = swapY ? anchorRect.top - portalRect.height - dxy[1] : viewHeight + scrollY - portalRect.height;
            // top = anchorRect.top - portalRect.height + scrollY;
        }
        if (top < scrollY) {
            top = swapY ? anchorRect.bottom + scrollY - dxy[1] : scrollY;
            // top = anchorRect.top + anchorRect.height + scrollY;
        }
    }
    return {
        left,
        top
    }
}

export {
    getStyle,
    getScroll,
    getRect,
    getRectSroll,
    getBorderWidth,
    getPadding,
    getMargin,
    getAlignPos
};