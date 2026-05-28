export type position = { left: number; top: number };
export type Rect = position & { width: number; height: number; right: number; bottom: number };
export type ElementNode = HTMLElement & { scrollLeft?: number; scrollTop?: number; currentStyle?: any };

export interface AlignConfig {
    pos?: string;
    placement?: string;
    gap?: number;
    container?: HTMLElement;
    dxy?: number[];
}

export const getStyle = (dom: ElementNode | null | undefined, styleProp: keyof CSSStyleDeclaration | string): string => {
    if (!dom) {
        return '';
    }
    // 修复：兼容旧版 IE 的写法，同时转换为标准字符串索引
    return dom.currentStyle ? dom.currentStyle[styleProp as any] : (window.getComputedStyle(dom) as any)[styleProp];
};

export const getScroll = (dom: any): position => {
    let pos: position;
    if (!dom || dom === document || dom === document.body || dom === document.documentElement) {
        const left = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        pos = { left, top };
    } else {
        pos = { left: dom.scrollLeft || 0, top: dom.scrollTop || 0 };
    }
    return pos;
};

export const getRect = (dom: ElementNode | null | undefined): Rect => {
    if (!dom) {
        return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 };
    }
    const { width, height, left, top, right, bottom } = dom.getBoundingClientRect();
    return { width, height, left, top, right, bottom };
};

export const getRectSroll = (dom: ElementNode | null | undefined, scrollDom: any = document): Rect => {
    if (!dom) {
        return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 };
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
    };
};

const getEdgeSize = (dom: ElementNode | null | undefined, side: string, type: 'border' | 'padding' | 'margin'): number => {
    let rs = 0;
    if (!dom) return rs;
    const map: Record<string, string> = {
        'l': `${type}-left${type === 'border' ? '-width' : ''}`,
        'r': `${type}-right${type === 'border' ? '-width' : ''}`,
        't': `${type}-top${type === 'border' ? '-width' : ''}`,
        'b': `${type}-bottom${type === 'border' ? '-width' : ''}`
    };
    for (let i = 0, len = side.length; i < len; i++) {
        const prop = map[side.charAt(i)];
        if (prop) {
            const width = parseInt(getStyle(dom, prop), 10);
            if (!isNaN(width)) {
                rs += width;
            }
        }
    }
    return rs;
};

export const getBorderWidth = (dom: ElementNode | null | undefined, side: string): number => getEdgeSize(dom, side, 'border');
export const getPadding = (dom: ElementNode | null | undefined, side: string): number => getEdgeSize(dom, side, 'padding');
export const getMargin = (dom: ElementNode | null | undefined, side: string): number => getEdgeSize(dom, side, 'margin');

export const findParentWithPosition = (dom: any): HTMLElement => {
    let curDom = dom;
    while (curDom && curDom !== document.body && curDom !== document.documentElement) {
        if (getStyle(curDom, 'position') !== 'static') {
            return curDom;
        }
        curDom = curDom.parentElement;
    }
    return document.body;
};

export const getAnchor = (rect: Rect, pos: string, isAnchor: boolean = false): position => {
    let left = 0;
    let top = 0;
    switch ((pos || 'tl').toLowerCase()) {
        case 'c': left = Math.round(rect.width * .5); top = Math.round(rect.height * .5); break;
        case 't': left = Math.round(rect.width * .5); top = 0; break;
        case 'l': left = 0; top = Math.round(rect.height * .5); break;
        case 'r': left = rect.width; top = Math.round(rect.height * .5); break;
        case 'b': left = Math.round(rect.width * .5); top = rect.height; break;
        case 'tl': left = 0; top = 0; break;
        case 'bl': left = 0; top = rect.height; break;
        case 'br': left = rect.width; top = rect.height; break;
        case 'tr': left = rect.width; top = 0; break;
    }
    if (!isAnchor) {
        return { left, top };
    }
    // 修复：直接基于 getBoundingClientRect 的绝对视口坐标叠加，不在这里处理页面级别滚动，移交统一计算
    return {
        left: left + rect.left,
        top: top + rect.top
    };
};

export const getAlignPos = (rectDom: Rect | HTMLElement, anchorDom: Rect | HTMLElement, config: AlignConfig = {}): position => {
    let curPos = config.pos || config.placement;
    const gap = config.gap || 0;
    if (!curPos) { curPos = 'tl-bl'; }
    else if (curPos === '?') { curPos = 'tl-bl?'; }
    else if (curPos.indexOf('-') === -1) { curPos = 'tl-' + curPos; }

    curPos = curPos.toLowerCase();
    const posArr = curPos.match(/^([a-z]+)-([a-z]+)(\?)?$/);
    if (!posArr) return { left: 0, top: 0 };

    const pos1 = posArr[1];
    const pos2 = posArr[2];
    const p1x = pos1.charAt(pos1.length - 1);
    const p1y = pos1.charAt(0);
    const p2x = pos2.charAt(pos2.length - 1);
    const p2y = pos2.charAt(0);
    const isAuto = posArr[3];

    let rect = rectDom instanceof HTMLElement ? getRect(rectDom) : rectDom;
    let anchorRect = anchorDom instanceof HTMLElement ? getRect(anchorDom) : anchorDom;

    // 获取绝对视口坐标点
    const portalPos = getAnchor(rect, pos1);
    const anchorRectPos = getAnchor(anchorRect, pos2, true);

    const container = config.container || document.body;
    let positionNode = findParentWithPosition(container);
    let positionNodeRect = getRect(positionNode);

    let gapLeft = 0;
    let gapTop = 0;
    if (p1x === 'r' && p2x === 'l') { gapLeft -= gap; }
    else if (p1x === 'l' && p2x === 'r') { gapLeft += gap; }
    if (p1y === 't' && p2y === 'b') { gapTop += gap; }
    else if (p1y === 'b' && p2y === 't') { gapTop -= gap; }

    // 统一转为相对于 positionNode 视口切面的相对坐标
    let left = anchorRectPos.left - portalPos.left - positionNodeRect.left + gapLeft;
    let top = anchorRectPos.top - portalPos.top - positionNodeRect.top + gapTop;

    // 修正定位节点自身滚动条带来的偏移
    if (positionNode !== document.body && positionNode !== document.documentElement) {
        left += positionNode.scrollLeft || 0;
        top += positionNode.scrollTop || 0;
    }

    let dx = 20, dy = 20;
    if (config && config.dxy) {
        dx = config.dxy[0] >= 0 ? config.dxy[0] : 20;
        dy = config.dxy[1] >= 0 ? config.dxy[1] : 20;
    }

    if (isAuto) {
        const viewWidth = document.documentElement.clientWidth || document.body.clientWidth;
        const viewHeight = document.documentElement.clientHeight || document.body.clientHeight;

        // 1. 严格判定：只有当目标锚点（输入框）完全离开视口时，才放弃防溢出
        const isAnchorOutside =
            anchorRect.bottom < 0 ||
            anchorRect.top > viewHeight ||
            anchorRect.right < 0 ||
            anchorRect.left > viewWidth;

        // 只要锚点还有一部分在屏幕内，就必须确保弹窗安全可见
        if (!isAnchorOutside) {
            const swapX = ((p1x === 'r' && p2x === 'l') || (p1x === 'l' && p2x === 'r'));
            const swapY = ((p1y === 't' && p2y === 'b') || (p1y === 'b' && p2y === 't'));

            // 实时记录弹窗在当前视口中的绝对坐标快照
            let currentAbsLeft = anchorRectPos.left - portalPos.left + gapLeft;
            let currentAbsTop = anchorRectPos.top - portalPos.top + gapTop;

            // ---- 🎯 阶段一：智能方向翻转 (Flip) ----
            // 右侧溢出且允许横向翻转
            if (currentAbsLeft + rect.width + dx > viewWidth && swapX) {
                left = left - anchorRect.width - rect.width - 2 * gapLeft;
                currentAbsLeft = currentAbsLeft - anchorRect.width - rect.width - 2 * gapLeft;
            }
            // 左侧溢出且允许横向翻转
            else if (currentAbsLeft < dx && swapX) {
                left = left + anchorRect.width + rect.width - 2 * gapLeft;
                currentAbsLeft = currentAbsLeft + anchorRect.width + rect.width - 2 * gapLeft;
            }

            // 下侧溢出且允许纵向翻转
            if (currentAbsTop + rect.height + dy > viewHeight && swapY) {
                top = top - anchorRect.height - rect.height - 2 * gapTop;
                currentAbsTop = currentAbsTop - anchorRect.height - rect.height - 2 * gapTop;
            }
            // 上侧溢出且允许纵向翻转
            else if (currentAbsTop < dy && swapY) {
                top = top + anchorRect.height + rect.height - 2 * gapTop;
                currentAbsTop = currentAbsTop + anchorRect.height + rect.height - 2 * gapTop;
            }

            // ---- 🎯 阶段二：安全贴边修正 (Shift) ----
            // 无论是否翻转，如果横向（如右边缘）仍有些许溢出，强行将其推回视口内，防止消失
            if (currentAbsLeft + rect.width + dx > viewWidth) {
                left -= (currentAbsLeft + rect.width + dx - viewWidth);
            }
            if (currentAbsLeft < dx) {
                left += (dx - currentAbsLeft);
            }

            // 无论是否翻转，如果纵向边缘仍有些许溢出，做贴边微调
            if (currentAbsTop + rect.height + dy > viewHeight) {
                top -= (currentAbsTop + rect.height + dy - viewHeight);
            }
            if (currentAbsTop < dy) {
                // 只有当默认计算的绝对 top 确实撞了上墙，才安全贴边，避免了宿主出屏时的悬空卡死
                top += (dy - currentAbsTop);
            }
        }
    }

    return { left, top };
};

export const setPos = (node: HTMLElement, pos: any, isTransform: boolean = false) => {
    if (!(node instanceof HTMLElement)) { return; }
    if (isTransform) {
        node.style.transform = `translate(${pos.left}px,${pos.top}px)`;
    } else {
        node.style.left = `${pos.left}px`;
        node.style.top = `${pos.top}px`;
    }
};

export const setAlignPos = (rectDom: HTMLElement, anchorDom: Rect | HTMLElement, config: AlignConfig = {}, isTransform: boolean = false): position => {
    const pos = getAlignPos(rectDom, anchorDom, config);
    if (rectDom instanceof HTMLElement) {
        setPos(rectDom, pos, isTransform);
    }
    return pos;
};

export const isTouchEvent = (event: any) => {
    return ((event.touches && event.touches.length) || (event.changedTouches && event.changedTouches.length));
};

export const getPosition = (event: any) => {
    if (event.touches && event.touches.length) {
        return { x: event.touches[0].pageX, y: event.touches[0].pageY, left: event.touches[0].pageX, top: event.touches[0].pageY };
    } else if (event.changedTouches && event.changedTouches.length) {
        return { x: event.changedTouches[0].pageX, y: event.changedTouches[0].pageY, left: event.changedTouches[0].pageX, top: event.changedTouches[0].pageY };
    } else {
        return { x: event.pageX, y: event.pageY, left: event.pageX, top: event.pageY };
    }
};

export const isValidPosition = (pos: number | null | undefined): pos is number => {
    return typeof pos === 'number' && pos >= 0;
};

export const closest = (dom: any, fn: Function) => {
    let cur: any = dom;
    while (cur && cur !== document.body && cur !== document.documentElement) {
        if (fn(cur)) { return cur; }
        cur = cur.parentNode;
    }
    return null;
};
