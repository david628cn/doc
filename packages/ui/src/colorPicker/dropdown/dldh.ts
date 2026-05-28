const EventEmit = {
    bind: (target: any, eventType: string, wrapCallback: Function, option?: any) => {
        if (target.addEventListener) {
            target.addEventListener(eventType, wrapCallback, option || false);
        } else if (target.attachEvent) {
            target.attachEvent(`on${eventType}`, wrapCallback);
        }
        return true;
    },
    unbind: (target: any, eventType: string, wrapCallback: Function, option?: any) => {
        let useCapture = false;
        if (typeof option === 'object') {
            useCapture = option.capture || false;
        } else if (typeof option === 'boolean') {
            useCapture = option;
        }
        if (target.addEventListener) {
            target.removeEventListener(eventType, wrapCallback, useCapture);
        } else if (target.attachEvent) {
            target.detachEvent(`on${eventType}`, wrapCallback);
        }
        return null;
    }
};


const getDom = (el: any) => {
    return typeof el === 'string' ? document.getElementById(el) : el;
}

const getScroll = (el: any) => {
    const dom: any = getDom(el);
    let pos: any;
    if (dom === document || dom === document.body) {
      const l = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      const t = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      pos = {
        left: l,
        top: t
      };
    } else {
      pos = {
        left: dom.scrollLeft,
        top: dom.scrollTop
      };
    }
    return pos;
  }

const getAnchorXY = (el: any, position: string, local: any) => {
    const dom = getDom(el);
    let x = 0;
    let y = 0;
    let w;
    let h;
    let vp = false;
    if (dom === document.body || dom === document) {
        vp = true;
        w = document.documentElement.clientWidth || document.body.clientWidth;
        h = document.documentElement.clientHeight || document.body.clientHeight;
      } else {
        w = dom.offsetWidth;
        h = dom.offsetHeight;
    }
    const round = Math.round;
    switch ((position || 'tl').toLowerCase()) {
        case 'c':
            x = round(w * .5);
            y = round(h * .5);
            break;
        case 't':
            x = round(w * .5);
            y = 0;
            break;
        case 'l':
            x = 0;
            y = round(h * .5);
            break;
        case 'r':
            x = w;
            y = round(h * .5);
            break;
        case 'b':
            x = round(w * .5);
            y = h;
            break;
        case 'tl':
            x = 0;
            y = 0;
            break;
        case 'bl':
            x = 0;
            y = h;
            break;
        case 'br':
            x = w;
            y = h;
            break;
        case 'tr':
            x = w;
            y = 0;
            break;
    }
    if (local === true) {
        return [x, y];
    }
    if (vp) {
        const sc = getScroll(dom);
        return [x + sc.left, y + sc.top];
    }
    const rect = dom.getBoundingClientRect();
    const scroll = getScroll(document);
    const xy = [Math.round(rect.left + scroll.left), Math.round(rect.top + scroll.top)];
    return [x + xy[0], y + xy[1]];
}

const getAlignToXY = (list: any, target: any, position: string, offset: Array<number> = [0, 0]) => {
    const listDom = getDom(list);
    const targetDom = getDom(target);
    let pos = position;
    if (!pos) {
        pos = 'tl-bl';
    } else if (pos === '?') {
        pos = 'tl-bl?';
    } else if (pos.indexOf('-') === -1) {
        pos = 'tl-' + pos;
    }
    let c = false;
    pos = pos.toLowerCase();
    const posArr: any = pos.match(/^([a-z]+)-([a-z]+)(\?)?$/);
    const pos1 = posArr[1];
    const pos2 = posArr[2];
    c = !!posArr[3];
    const listXY = getAnchorXY(listDom, pos1, true);
    const targetXY = getAnchorXY(targetDom, pos2, false);
    let x = targetXY[0] - listXY[0] + offset[0];
    let y = targetXY[1] - listXY[1] + offset[1];
    if (c) {
        const listWidth = listDom.offsetWidth;
        const listHeight = listDom.offsetHeight;

        const viewWidth = (document.documentElement.clientWidth || document.body.clientWidth) - 5;
        const viewHeight = (document.documentElement.clientHeight || document.body.clientHeight) - 5;

        const p1y = pos1.charAt(0);
        const p1x = pos1.charAt(pos1.length - 1);
        const p2y = pos2.charAt(0);
        const p2x = pos2.charAt(pos2.length - 1);

        const swapY = ((p1y === 't' && p2y === 'b') || (p1y === 'b' && p2y === 't'));
        const swapX = ((p1x === 'r' && p2x === 'l') || (p1x === 'l' && p2x === 'r'));

        const scrollX = (document.documentElement.scrollLeft || document.body.scrollLeft || 0) + 5;
        const scrollY = (document.documentElement.scrollTop || document.body.scrollTop || 0) + 5;

        const targetRect = targetDom.getBoundingClientRect();

        if ((x + listWidth) > viewWidth + scrollX) {
            x = swapX ? targetRect.left - listWidth : viewWidth + scrollX - listWidth;
        }
        if (x < scrollX) {
            x = swapX ? targetRect.right : scrollX;
        }
        if ((y + listHeight) > viewHeight + scrollY) {
            y = swapY ? targetRect.top - listHeight : viewHeight + scrollY - listHeight;
        }
        if (y < scrollY) {
            y = swapY ? targetRect.bottom : scrollY;
        }

    }
    return [x, y];
}

const alignTo = (list: any, target: any, position: any, offset: Array<number> = [0, 0]) => {
    const xy = getAlignToXY(list, target, position, offset);
    const dom = getDom(list);
    dom.style.left = `${ xy[0] }px`;
    dom.style.top = `${ xy[1] }px`;
}

export {
    EventEmit,
    alignTo
}