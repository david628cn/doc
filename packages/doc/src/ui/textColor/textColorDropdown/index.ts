import { getAlignPos, getRect, setPos } from '@carvy/ui';
import { TextColorPanel, ColorValue } from '../textColorPanel';
import { TEXT_COLORS, HIGHLIGHT_COLORS, ColorItem } from '../colors';
import { CLASSNAME } from '../../../config';
import './index.less';

export interface TextColorDropdownProps {
    popuoverClassName?: string;
    value?: ColorValue;
    defaultValue?: ColorValue;
    title?: string;
    pos?: string;
    trigger?: string;
    keyName?: string;
    colors?: ColorItem[];
    backgroundColors?: ColorItem[];
    popuoverContainer?: HTMLElement;
    isAutoScroll?: boolean;
    onChange?: (params: { value: ColorValue; event?: Event; type?: string; item?: ColorItem; rgba?: string }) => void;
    onPointerDown?: (e: MouseEvent) => void;
    onDropdownChange?: (params: { open: boolean }) => void
}

export class TextColorDropdown {
    private props: TextColorDropdownProps;
    public container!: HTMLButtonElement;
    dropdownElement: HTMLDivElement | null = null; // 📢 方案 A 核心：动态按需持有弹窗 DOM
    private _value!: ColorValue;
    private isOpen: boolean = false;
    private popContainer: HTMLElement;
    private panelInstance: TextColorPanel | null = null;
    
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;
    private scrollHandler: (() => void) | null = null;
    private isPositionPending: boolean = false; // 位置计算单帧防抖锁

    constructor(containerElement: string | HTMLElement | null, props?: TextColorDropdownProps) {
        this.props = {
            pos: 'tl-bl?',
            trigger: 'click',
            isAutoScroll: true,
            ...props
        };
        this.popContainer = this.props.popuoverContainer || document.body;
        this.initValueState();
        this.renderStructure();
        this.bindEvents();
        this.mount(containerElement);
    }

    public get value(): ColorValue { return this._value }
    public set value(next: ColorValue) {
        if (!next) return;
        this._value = {
            color: next.color || TEXT_COLORS[0].value,
            backgroundColor: next.backgroundColor || HIGHLIGHT_COLORS[0].value
        };
        this.syncHostDOMState();
        if (this.panelInstance) {
            this.panelInstance.syncValue(this._value);
        }
    }

    private initValueState() {
        const baseValue: any = this.props.value || this.props.defaultValue || {};
        this._value = {
            color: baseValue.color || TEXT_COLORS[0].value,
            backgroundColor: baseValue.backgroundColor || HIGHLIGHT_COLORS[0].value
        }
    }

    private renderStructure() {
        const prefix = `${CLASSNAME}-text-color-dropdown`;
        this.container = document.createElement('button');
        this.container.className = `${prefix}-container`;
        this.container.setAttribute('type', 'button');
        if (this.props.title) this.container.title = this.props.title;

        const mainColorBtn = document.createElement('div');
        mainColorBtn.className = prefix;
        mainColorBtn.innerHTML = `<span class="${prefix}-text"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org" style="flex-grow: 1;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.8944 5.55279C12.725 5.214 12.3787 5 12 5C11.6212 5 11.2749 5.214 11.1055 5.55279L5.10555 17.5528C4.85856 18.0468 5.05878 18.6474 5.55276 18.8944C6.04674 19.1414 6.64741 18.9412 6.8944 18.4472L8.64957 14.9369C8.75862 14.9777 8.87671 15 9 15H15C15.1233 15 15.2413 14.9777 15.3504 14.9369L17.1055 18.4472C17.3525 18.9412 17.9532 19.1414 18.4472 18.8944C18.9412 18.6474 19.1414 18.0468 18.8944 17.5528L12.8944 5.55279ZM14.3819 13L12 8.23607L9.61801 13H14.3819Z" fill="currentColor"></path></svg></span>`;
        this.container.appendChild(mainColorBtn);

        const line = document.createElement('div');
        line.className = `${prefix}-line`;
        this.container.appendChild(line);

        const arrowBtn = document.createElement('div');
        arrowBtn.className = `${prefix}-inner`;
        arrowBtn.innerHTML = `<span class="${prefix}-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z" fill="currentColor"></path></svg></span>`;
        this.container.appendChild(arrowBtn);

        this.syncHostDOMState();
    }

    private syncHostDOMState() {
        const prefix = `${CLASSNAME}-text-color-dropdown`;
        const mainBtn = this.container.querySelector(`.${prefix}`) as HTMLElement;
        const textSpan = this.container.querySelector(`.${prefix}-text`) as HTMLElement;
        const svgPath = this.container.querySelector(`svg path`) as HTMLElement;
        if (mainBtn) mainBtn.style.setProperty('--highlight-color', this._value.backgroundColor);
        if (textSpan) textSpan.style.setProperty('--highlight-color', this._value.backgroundColor);
        if (svgPath) svgPath.style.color = this._value.color
    }

    public updateDropdownPosition() {
        if (!this.isOpen || !this.dropdownElement || this.isPositionPending) return;

        this.isPositionPending = true;
        requestAnimationFrame(() => {
            this.isPositionPending = false;
            if (!this.dropdownElement) return;
            const xy = getAlignPos(this.dropdownElement, this.container, {
                pos: this.props.pos || 'tl-bl?',
                gap: 4,
                dxy: [0, 0],
                container: this.popContainer
            });
            setPos(this.dropdownElement, xy);
        });
    }

    private bindEvents() {
        const prefix = `${CLASSNAME}-text-color-dropdown`;
        
        const leftZone = this.container.querySelector(`.${prefix}`) as HTMLElement;
        leftZone?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(false);
            this.props.onChange?.({ value: this._value })
        });

        const rightZone = this.container.querySelector(`.${prefix}-inner`) as HTMLElement;
        rightZone?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(!this.isOpen);
        });

        // 绑定全局跟随事件的处理器引用
        if (this.props.isAutoScroll) {
            this.scrollHandler = () => this.updateDropdownPosition();
        }
    }
    // 📢 【核心：方案 A 控制枢纽】
    public toggleDropdown(show: boolean) {
        if (this.isOpen === show) return;
        
        const prefix = `${CLASSNAME}-text-color-dropdown`;
        const activeClass = `${prefix}-popuover-open`;

        if (show) {
            this.isOpen = true;
            if (this.dropdownElement && this.props.onPointerDown) {
                this.dropdownElement.removeEventListener('pointerdown', this.props.onPointerDown);
            }
            // 1. ✨【按需创建】：点击展开时，现场实时建立 DOM 弹窗实体
            this.dropdownElement = document.createElement('div');
            this.dropdownElement.className = `${prefix}-popuover`;
            if (this.props.popuoverClassName) this.dropdownElement.classList.add(this.props.popuoverClassName);
            this.dropdownElement.addEventListener('click', (e) => e.stopPropagation());

            if (this.props.onPointerDown) {
                this.dropdownElement.addEventListener('pointerdown', this.props.onPointerDown);
            }

            const dropdownInnerElement = document.createElement('div');
            dropdownInnerElement.className = `${prefix}-popuover-inner`;

            this.panelInstance = new TextColorPanel({
                value: this._value,
                keyName: this.props.keyName,
                colors: this.props.colors,
                backgroundColors: this.props.backgroundColors,
                onPanelChange: (params) => {
                    this._value = params.value;
                    this.syncHostDOMState();
                    this.props.onChange?.(params);
                    if (params.type === 'reset') {
                        this.toggleDropdown(false); // 选完颜色自动触发方案 A 销毁链路
                    }
                }
            });

            dropdownInnerElement.appendChild(this.panelInstance.container);
            this.dropdownElement.appendChild(dropdownInnerElement);
            this.popContainer.appendChild(this.dropdownElement);

            // 2. 赋予显示类名并校准位置
            this.dropdownElement.classList.add(activeClass);
            this.updateDropdownPosition();

            // 3. ✨【动态挂载】：仅在弹窗存活时，挂载全局点击拦截与滚动跟随
            this.documentClickHandler = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (!this.container.contains(target) && this.dropdownElement && !this.dropdownElement.contains(target)) {
                    this.toggleDropdown(false);
                }
            };
            document.addEventListener('mousedown', this.documentClickHandler);

            if (this.props.isAutoScroll && this.scrollHandler) {
                window.addEventListener('resize', this.scrollHandler);
                document.addEventListener('scroll', this.scrollHandler, true); // 捕获模式
            }
        } else {
            this.isOpen = false;
            if (this.dropdownElement && this.props.onPointerDown) {
                this.dropdownElement.removeEventListener('pointerdown', this.props.onPointerDown);
            }
            // 4. ✨【就地拔除与自我毁灭】：关闭隐藏时，彻底将绑定的全局事件与 DOM 清洗干净
            if (this.documentClickHandler) {
                document.removeEventListener('mousedown', this.documentClickHandler);
                this.documentClickHandler = null;
            }
            this.unbindScrollEvents();

            if (this.dropdownElement) {
                this.dropdownElement.classList.remove(activeClass);
                this.dropdownElement.remove(); // 物理上移除 DOM 节点
                this.dropdownElement = null;
            }
            if (this.panelInstance) {
                this.panelInstance.destroy();
            }
            this.panelInstance = null;
            this.isPositionPending = false;
        }

        this.props.onDropdownChange?.({ open: show });
    }
    contains(target: HTMLElement) {
        if (this.dropdownElement) {
            return this.dropdownElement.contains(target);
        }
        return false;
    }
    show() {
        this.toggleDropdown(true);
    }
    hide() {
        this.toggleDropdown(false);
    }
    private unbindScrollEvents() {
        if (this.scrollHandler) {
            window.removeEventListener('resize', this.scrollHandler);
            document.removeEventListener('scroll', this.scrollHandler, true);
        }
    }

    private mount(target: string | HTMLElement | null) {
        const mountTarget = typeof target === 'string' ? document.getElementById(target) : target;
        if (mountTarget) mountTarget.appendChild(this.container);
    }

    // 当外层整个工具栏 items 发生重绘，执行销毁时激发的终生管道
    public destroy() {
        this.toggleDropdown(false); // 强制彻底拔掉隐藏节点、回收全部监听
        this.container.remove();    // 移出宿主按钮本身
    }
}
