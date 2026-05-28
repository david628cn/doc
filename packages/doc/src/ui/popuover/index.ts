import { getAlignPos, setPos, getRect } from '@carvy/ui';
import { CLASSNAME } from '../../config';
import './index.less';

export interface PopuoverChangeEventProps {
    open: boolean;
    event: any;
    action: string;
}

export interface PopuoverRect {
    left?: number;
    top?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export type PopuoverContentType = HTMLElement | string | { container: HTMLElement } | { element: HTMLElement } | (() => any);

export interface PopuoverProps {
    className?: string;
    innerClassName?: string;
    zIndex?: number;
    container?: HTMLElement;
    defaultOpen?: boolean;
    open?: boolean;
    pos?: string;
    gap?: number;
    dxy?: number[];
    distroyOnClose?: boolean;
    trigger?: string | string[];
    translate?: boolean;
    items?: PopuoverContentType;
    mask?: boolean;
    rect?: PopuoverRect;
    isAutoScroll?: boolean;
    popuoverProps?: any;
    mouseLeaveDelay?: number;
    onChange?: (p: PopuoverChangeEventProps) => void;
    onPointerDown?: (e: MouseEvent) => void;
    style?: Partial<CSSStyleDeclaration>;

    // ✨【新特性】：点击区域外的拦截与自定义控制回调
    onPopuoverMouseDown?: (params: { isOutside: boolean; event: MouseEvent | TouchEvent }) => void | boolean;
}

class Delayer {
    private timer: any = null;
    clear() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
    start(callback: () => void, delay: number = 0) {
        this.clear();
        this.timer = setTimeout(() => { this.clear(); callback(); }, delay * 1000);
    }
}

export class Popuover {
    private props: PopuoverProps;
    private isControlled: boolean;
    private _open: boolean = false;
    private hasRendered: boolean = false;
    private positionReady: boolean = false;

    public anchorElement: HTMLElement | null = null;
    private activeRect: any;
    private hasRectMode: boolean = false;

    public containerElement!: HTMLDivElement;
    private innerElement!: HTMLDivElement;
    private maskElement: HTMLDivElement | null = null;
    private popuoverContainer: HTMLElement;

    private delayer = new Delayer();
    private resizeObserver: ResizeObserver | null = null;

    private triggerListeners: Array<{ type: string; handler: (e: Event) => void }> = [];
    private boundDocClick: ((e: MouseEvent | TouchEvent) => void) | null = null;
    private boundScrollResize: (() => void) | null = null;
    
    constructor(anchor: HTMLElement | null, props: PopuoverProps) {
        this.anchorElement = anchor;

        const rawTrigger = props.trigger === undefined || (Array.isArray(props.trigger) && props.trigger.length === 0)
            ? 'manual'
            : props.trigger;

        this.props = {
            pos: 'tl-bl?',
            translate: false,
            gap: 0,
            dxy: [0, 0],
            distroyOnClose: true,
            mouseLeaveDelay: 0.1,
            mask: false,
            isAutoScroll: true,
            ...props,
            trigger: rawTrigger
        };

        this.isControlled = 'open' in this.props;
        this._open = !!(this.isControlled ? this.props.open : this.props.defaultOpen);
        this.popuoverContainer = this.props.container || document.body;

        if ('rect' in this.props && this.props.rect) {
            this.activeRect = this.props.rect;
            this.hasRectMode = true;
        }

        this.initStructure();
        this.bindTriggerEvents();
        this.bindGlobalEvents();

        if (this._open) {
            this.showPopup();
        }
    }

    public get items(): PopuoverContentType | undefined {
        return this.props.items;
    }

    public set items(content: PopuoverContentType | undefined) {
        this.updateItems(content);
    }

    public updateItems(content: PopuoverContentType | undefined) {
        this.props.items = content;
        if (this._open) {
            this.renderContentContent();
            this.updatePosition();
        }
    }

    public show(target?: HTMLElement | PopuoverRect) {
        if (target) {
            if (target instanceof HTMLElement) {
                this.hasRectMode = false;
                this.activeRect = getRect(target);
                this.unbindTriggerEvents();
                this.anchorElement = target;
                this.bindTriggerEvents();
            } else {
                this.hasRectMode = true;
                this.activeRect = target;
                this.unbindTriggerEvents();
                this.anchorElement = null;
            }
            this.rebindResizeObserver();
        }
        this.setPopupVisible(true, 'manualShow');
    }

    public hide() {
        this.setPopupVisible(false, 'manualHide');
    }

    public get open(): boolean { return this._open; }
    public set open(val: boolean) {
        if (this._open === val) return;
        this.setPopupVisible(val, 'controlledApi');
    }

    private initStructure() {
        this.containerElement = document.createElement('div');
        this.containerElement.className = `${CLASSNAME}-popuover-container`;
        if (this.props.className) this.containerElement.classList.add(this.props.className);
        if (this.props.onPointerDown) {
            this.containerElement.addEventListener('pointerdown', this.props.onPointerDown);
        }
        const zIdx = this.props.zIndex !== undefined ? String(this.props.zIndex) : 'var(--z-index-popover)';
        this.containerElement.style.setProperty('--popuover-z-index', zIdx);

        if (this.props.style) {
            Object.assign(this.containerElement.style, this.props.style);
        }

        this.innerElement = document.createElement('div');
        this.innerElement.className = `${CLASSNAME}-popuover-inner`;
        if (this.props.innerClassName) this.innerElement.classList.add(this.props.innerClassName);

        if (this.props.popuoverProps) {
            Object.keys(this.props.popuoverProps).forEach(key => {
                if (key.startsWith('on') && typeof this.props.popuoverProps[key] === 'function') {
                    const evtType = key.substring(2).toLowerCase();
                    this.innerElement.addEventListener(evtType, this.props.popuoverProps[key]);
                } else {
                    this.innerElement.setAttribute(key, String(this.props.popuoverProps[key]));
                }
            });
        }

        this.containerElement.appendChild(this.innerElement);

        if (this.props.mask) {
            this.maskElement = document.createElement('div');
            this.maskElement.className = `${CLASSNAME}-popuover-mask`;
            this.maskElement.style.setProperty('--popuover-z-index', zIdx);
            this.maskElement.appendChild(this.containerElement);
        }

        const triggers = Array.isArray(this.props.trigger) ? this.props.trigger : [this.props.trigger];
        if (triggers.includes('hover')) {
            this.innerElement.addEventListener('mouseenter', () => this.setPopupVisible(true, 'popuoverMouseEnter'));
            this.innerElement.addEventListener('mouseleave', (e) => this.delaySetPopupVisible(false, 'popuoverMouseLeave', e));
        }
        if (triggers.includes('contextMenu')) {
            this.innerElement.addEventListener('contextMenu', (e) => this.setPopupVisible(!this._open, 'contextMenu', e));
        }
    }

    private bindTriggerEvents() {
        if (!this.anchorElement || this.hasRectMode) return;
        const triggers = Array.isArray(this.props.trigger) ? this.props.trigger : [this.props.trigger];
        if (triggers.includes('manual')) return;

        const addEvent = (type: string, handler: (e: Event) => void) => {
            this.anchorElement!.addEventListener(type, handler);
            this.triggerListeners.push({ type, handler });
        };

        if (triggers.includes('contextMenu')) {
            addEvent('contextmenu', (e) => { e.preventDefault(); this.setPopupVisible(!this._open, 'contextMenu', e); });
        }
        if (triggers.includes('click')) {
            addEvent('click', (e) => { e.preventDefault(); e.stopPropagation(); this.setPopupVisible(!this._open, 'click', e); });
        }
        if (triggers.includes('mouseDown')) {
            const mdHandler = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.setPopupVisible(!this._open, 'mouseDown', e); };
            addEvent('mousedown', mdHandler);
            addEvent('touchstart', mdHandler);
        }
        if (triggers.includes('hover')) {
            addEvent('mouseenter', (e) => { e.preventDefault(); this.setPopupVisible(true, 'mouseEnter', e); });
            addEvent('mouseleave', (e) => { e.preventDefault(); this.delaySetPopupVisible(false, 'mouseLeave', e); });
        }
        if (triggers.includes('focus') || triggers.includes('blur')) {
            addEvent('focus', (e) => { e.preventDefault(); this.setPopupVisible(triggers.includes('focus'), 'focus', e); });
            addEvent('blur', (e) => { e.preventDefault(); this.delaySetPopupVisible(!triggers.includes('blur'), 'blur', e); });
        }
    }

    private unbindTriggerEvents() {
        if (this.anchorElement) {
            this.triggerListeners.forEach(listener => {
                this.anchorElement!.removeEventListener(listener.type, listener.handler);
            });
            this.triggerListeners = [];
        }
    }

    /**
     * ✨【核心重构点】：引入并对接 onPopuoverMouseDown 拦截回调机制
     */
    private bindGlobalEvents() {
        this.boundDocClick = (e: MouseEvent | TouchEvent) => {
            if (!this._open) return;
            const target = e.target as HTMLElement;

            // 1. 【安全防重】：如果是触屏产生的模拟 mouse 事件，直接拦截，防止移动端 1 次点击触发两遍
            if (e.type === 'mousedown' && 'ontouchstart' in window) {
                return;
            }

            // 2. 判断是否点击在【弹窗内容主体】内部
            const isInsidePopover = this.containerElement.contains(target);

            // 3. 判断是否点击在【触发锚点 DOM】内部
            const isInsideAnchor = !this.hasRectMode && this.anchorElement && this.anchorElement.contains(target);

            // 4. ✨【点击蒙层或内部判断】：如果是点击在弹窗主体内，或点击在锚点内，认定为没有点击到“区域外”
            if (isInsidePopover || isInsideAnchor) {
                this.props.onPopuoverMouseDown?.({ isOutside: false, event: e });
                return;
            }

            // 🚀 5. 【核心高级路由】：此时点击的目标既不在主体内，也不在锚点内（说明点击了蒙层或更外部的空白区）
            // 认定鼠标实打实地点击在了“区域外”
            if (typeof this.props.onPopuoverMouseDown === 'function') {
                // 执行外部拦截逻辑
                const interceptResult = this.props.onPopuoverMouseDown({ isOutside: true, event: e });

                // 只有当外部回调显式返回 `false` 时，才拦截打断默认的隐藏关闭
                if (interceptResult === false) {
                    return;
                }
            }

            // 6. 默认没有配置拦截或者没有要求阻止时，执行点击区域外（包含点击蒙层）自动隐藏关闭
            this.setPopupVisible(false, 'docMousedown', e);
        };

        document.addEventListener('mousedown', this.boundDocClick, false);
        document.addEventListener('touchstart', this.boundDocClick, { passive: false });
    }

    private setPopupVisible(v: boolean, action: string, event?: any) {
        this.delayer.clear();
        if (!this.isControlled) this._open = v;
        this.props.onChange?.({ open: v, event, action });
        if (v) this.showPopup();
        else this.hidePopup();
    }

    private delaySetPopupVisible(v: boolean, action: string, event?: any) {
        this.delayer.start(() => {
            if (!this.isControlled) this._open = v;
            this.props.onChange?.({ open: v, event, action });
            if (v) this.showPopup();
            else this.hidePopup();
        }, this.props.mouseLeaveDelay);
    }

    private showPopup() {
        this.hasRendered = true;
        this.positionReady = true;

        const elToMount = this.maskElement || this.containerElement;
        if (!elToMount.parentElement) {
            this.popuoverContainer.appendChild(elToMount);
        }

        this.renderContentContent();
        this.containerElement.classList.add(`${CLASSNAME}-popuover-open`);
        this.innerElement.classList.add('animated', 'slideDownIn');

        this.updatePosition();
        setTimeout(() => this.updatePosition(), 16);

        this.rebindResizeObserver();

        if (!this.boundScrollResize && this.props.isAutoScroll) {
            this.boundScrollResize = () => this.updatePosition();
            document.addEventListener('scroll', this.boundScrollResize, true);
            window.addEventListener('resize', this.boundScrollResize);
        }
    }

    private hidePopup() {
        this.positionReady = false;
        this.containerElement.classList.remove(`${CLASSNAME}-popuover-open`);
        this.innerElement.classList.remove('animated', 'slideDownIn');

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.boundScrollResize) {
            document.removeEventListener('scroll', this.boundScrollResize, true);
            window.removeEventListener('resize', this.boundScrollResize);
            this.boundScrollResize = null;
        }

        if (this.props.distroyOnClose) {
            const elToRemove = this.maskElement || this.containerElement;
            elToRemove.remove();
            this.innerElement.innerHTML = '';
        }
    }

    private rebindResizeObserver() {
        if (!this._open) return;
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.resizeObserver = new ResizeObserver(() => this.updatePosition());
        if (!this.hasRectMode && this.anchorElement) {
            this.resizeObserver.observe(this.anchorElement);
        }
        this.resizeObserver.observe(this.containerElement);
    }

    private renderContentContent() {
        this.innerElement.innerHTML = '';
        let rawContent = this.props.items;
        if (!rawContent) return;

        if (typeof rawContent === 'function') {
            rawContent = rawContent();
        }

        if (!rawContent) return;

        if (rawContent instanceof HTMLElement) {
            this.innerElement.appendChild(rawContent);
        } else if (typeof rawContent === 'object' && 'container' in rawContent && rawContent.container instanceof HTMLElement) {
            this.innerElement.appendChild(rawContent.container);
        } else if (typeof rawContent === 'object' && 'element' in rawContent && rawContent.element instanceof HTMLElement) {
            this.innerElement.appendChild(rawContent.element);
        } else {
            this.innerElement.innerHTML = String(rawContent);
        }
    }

    public updatePosition = () => {
        if (!this._open) return;
        const el = this.popuoverContainer;
        let xy: any;

        if (!this.hasRectMode) {
            if (this.anchorElement) {
                xy = getAlignPos(this.containerElement, this.anchorElement, {
                    pos: this.props.pos, gap: this.props.gap, dxy: this.props.dxy, container: el
                });
            }
        } else if (this.activeRect) {
            xy = getAlignPos(this.containerElement, this.activeRect, {
                pos: this.props.pos, gap: this.props.gap, dxy: this.props.dxy, container: el
            });
        }

        if (xy) {
            let left = xy.left;
            let top = xy.top;
            // const pdom = findParentWithPosition(el);
            // if (pdom) {
            //     const containerRect = getRect(pdom);
            //     left -= containerRect.left;
            //     top -= containerRect.top;
            // }
            setPos(this.containerElement, { left, top }, this.props.translate);
        }
    };

    public destroy() {
        this.hidePopup();
        this.delayer.clear();
        if (this.boundDocClick) {
            document.removeEventListener('mousedown', this.boundDocClick);
            document.removeEventListener('touchstart', this.boundDocClick);
        }
        if (this.props.onPointerDown) {
            this.containerElement.removeEventListener('pointerdown', this.props.onPointerDown);
        }
        this.unbindTriggerEvents();
        const elToRemove = this.maskElement || this.containerElement;
        elToRemove.remove();
    }
}

export interface TooltipProps extends Omit<PopuoverProps, 'items'> {
    title: PopuoverContentType; // ✨ 同步支持传入 DOM、字符串、或组件类实例
}

export class Tooltip {
    public popuoverInstance: Popuover;

    constructor(anchor: HTMLElement | null, props: TooltipProps) {
        const {
            gap = 10,
            pos = 'b-t?',
            trigger = 'hover',
            title,
            className,
            ...otherProps
        } = props;

        const containerClasses = [`${CLASSNAME}-tooltip-container`];
        if (className) containerClasses.push(className);

        this.popuoverInstance = new Popuover(anchor, {
            ...otherProps,
            gap,
            pos,
            trigger,
            items: title,
            className: containerClasses.join(' ')
        });
    }

    public get title(): PopuoverContentType | undefined {
        return this.popuoverInstance.items;
    }

    public set title(newTitle: PopuoverContentType | undefined) {
        this.popuoverInstance.items = newTitle;
    }

    public updateTitle(newTitle: PopuoverContentType | undefined) {
        this.popuoverInstance.updateItems(newTitle);
    }

    public show(customAnchor?: HTMLElement) { this.popuoverInstance.show(customAnchor); }
    public hide() { this.popuoverInstance.hide(); }
    public get open(): boolean { return this.popuoverInstance.open; }
    public set open(val: boolean) { this.popuoverInstance.open = val; }
    public updatePosition() { this.popuoverInstance.updatePosition(); }
    public destroy() { this.popuoverInstance.destroy(); }
}