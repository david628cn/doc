import { getRect, setAlignPos } from '@carvy/ui';
import { Menu } from '../menu'; 
import { CLASSNAME } from '../../config'; 
import './index.less';

export interface SelectProps {
    className?: string;
    placeholder?: string;
    options?: any[];
    fieldNames?: { key?: string; label?: string; children?: string };
    value?: any;
    disabled?: boolean;
    readonly?: boolean;
    shortKey?: boolean;
    popuoverContainer?: HTMLElement;
    popuoverClassName?: string;
    popuoverContainerStyle?: any;
    isAutoScroll?: boolean; // 📢 支持外部注入跟随更新开关
    onSelect?: (value: string, item: any) => void; 
    onChange?: (value: string | null) => void; 
}

export class Select {
    private props: SelectProps;
    public container!: HTMLDivElement;
    
    // 📢 方案 A 核心：所有下拉及菜单相关的子节点/子实例改为动态随生命周期临时生成与销毁
    private dropdownElement: HTMLDivElement | null = null;
    private dropdownInnerElement: HTMLDivElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private menuContainer: HTMLDivElement | null = null;
    private menuInstance: Menu | null = null;

    private isOpen: boolean = false;
    private _selectedValue: string | null = null;
    private _disabled: boolean = false;
    private _readonly: boolean = false;
    private _options: any[] = [];
    private _shortKey: boolean = false;

    private popContainer: HTMLElement;

    private resizeObserver: ResizeObserver | null = null;
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;
    private scrollHandler: (() => void) | null = null;
    private isPositionPending: boolean = false; // rAF单帧防抖合并锁

    constructor(containerElement: string | HTMLElement, props: SelectProps) {
        this.props = {
            placeholder: 'Please select...',
            disabled: false,
            readonly: false,
            value: null,
            isAutoScroll: true,
            ...props
        };
        this._shortKey = this.props.shortKey || false;
        this._disabled = !!this.props.disabled;
        this._readonly = !!this.props.readonly;
        this._options = this.props.options || [];
        this.popContainer = this.props.popuoverContainer || document.body;

        this.renderStructure();
        this.bindHostEvents(); // 📢 只绑定宿主输入框本身的点击
        this.mount(containerElement);
        
        if (this.props.value !== null && this.props.value !== undefined) {
            this.initDefaultValue(this.props.value);
        }
    }

    public get shortKey(): boolean { return this._shortKey; }
    public set shortKey(v: boolean) {
        this._shortKey = v || false;
        if (this.menuInstance) {
            this.menuInstance.shortKey = this._shortKey;
        }
    }

    private initDefaultValue(initialKey: string) {
        const keyField = this.props.fieldNames?.key || 'key';
        let targetItem: any = null;
        const findNode = (list: any[]) => {
            for (const item of list) {
                if (item[keyField] === initialKey) { targetItem = item; break; }
                const childrenField = this.props.fieldNames?.children || 'children';
                if (item[childrenField] && Array.isArray(item[childrenField])) findNode(item[childrenField]);
            }
        };
        findNode(this._options);

        if (targetItem || initialKey) {
            this._selectedValue = initialKey;
            const labelField = this.props.fieldNames?.label || 'label';
            const displayLabel = targetItem ? targetItem[labelField] : initialKey;

            const valueElement = this.container.querySelector(`.${CLASSNAME}-select-value`);
            if (valueElement) {
                valueElement.textContent = String(displayLabel);
                valueElement.classList.add('has-value');
            }
        }
    }

    public get value(): string | null { return this._selectedValue; }
    public set value(key: string | null) {
        if (this._selectedValue === key) return;
        
        if (key === null) {
            this._selectedValue = null;
            const valueElement = this.container.querySelector(`.${CLASSNAME}-select-value`);
            if (valueElement) {
                valueElement.textContent = this.props.placeholder || '';
                valueElement.classList.remove('has-value');
            }
            this.props.onChange?.(key);
            return;
        }

        const keyField = this.props.fieldNames?.key || 'key';
        let targetItem: any = null;
        const findNode = (list: any[]) => {
            for (const item of list) {
                if (item[keyField] === key) { targetItem = item; break; }
                const childrenField = this.props.fieldNames?.children || 'children';
                if (item[childrenField] && Array.isArray(item[childrenField])) findNode(item[childrenField]);
            }
        };
        findNode(this._options);

        this.handleMenuSelect(key, targetItem);
    }

    public get disabled(): boolean { return this._disabled; }
    public set disabled(value: boolean) {
        this._disabled = !!value;
        const prefix = `${CLASSNAME}-select`;
        if (this._disabled) {
            this.container.classList.add(`${prefix}-disabled`);
            if (this.isOpen) this.toggleDropdown(false);
        } else {
            this.container.classList.remove(`${prefix}-disabled`);
        }
    }

    public get readonly(): boolean { return this._readonly; }
    public set readonly(value: boolean) {
        this._readonly = !!value;
        const prefix = `${CLASSNAME}-select`;
        if (this._readonly) {
            this.container.classList.add(`${prefix}-readonly`);
            if (this.isOpen) this.toggleDropdown(false);
        } else {
            this.container.classList.remove(`${prefix}-readonly`);
        }
    }

    public get options(): any[] { return this._options; }
    
    // 📢 【方案 A 极致简化优点】：因为平时不保存 DOM，数据改变只要同步数据源即可，拒绝过度重绘开销
    public set options(newOptions: any[]) {
        this._options = newOptions || [];
        if (this.isOpen) {
            this.toggleDropdown(false); // 若开着，顺手安全收起自清洁
        }
        
        // 校准当前已选的值是否依然有效
        const keyField = this.props.fieldNames?.key || 'key';
        let exists = false;
        const checkExists = (list: any[]) => {
            for (const item of list) {
                if (item[keyField] === this._selectedValue) { exists = true; break; }
                const childrenField = this.props.fieldNames?.children || 'children';
                if (item[childrenField] && Array.isArray(item[childrenField])) checkExists(item[childrenField]);
            }
        };
        if (this._selectedValue) checkExists(this._options);
        
        if (!exists && this._selectedValue !== null) {
            this.value = null; 
        }
    }

    private renderStructure() {
        const prefix = `${CLASSNAME}-select`;
        this.container = document.createElement('div');
        this.container.className = prefix;
        if (this.props.className) this.container.classList.add(this.props.className);

        if (this.props.disabled) this.container.classList.add(`${prefix}-disabled`);
        if (this.props.readonly) this.container.classList.add(`${prefix}-readonly`);

        this.container.innerHTML = `
            <span class="${prefix}-value">${this.props.placeholder}</span>
            <span class="${prefix}-small"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z" fill="currentColor"></path></svg></span>
        `;
    }

    private bindHostEvents() {
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.disabled || this.readonly) return;
            this.toggleDropdown(!this.isOpen);
        });

        if (this.props.isAutoScroll) {
            this.scrollHandler = () => this.updateDropdownPosition();
        }
    }

    // 📢 【中心核心：方案 A 显隐联动逻辑（随用随建）】
    public toggleDropdown(show: boolean) {
        if (this.disabled || this.readonly) show = false;
        if (this.isOpen === show) return;
        
        this.isOpen = show;
        const prefix = `${CLASSNAME}-select`;
        const activeClass = `${prefix}-popuover-open`;

        if (show) {
            this.container.classList.add(`${prefix}-open`);

            // 1. 实时创建下拉浮层
            this.dropdownElement = document.createElement('div');
            this.dropdownElement.className = `${prefix}-popuover`;
            if (this.props.popuoverClassName) this.dropdownElement.classList.add(this.props.popuoverClassName);
            this.dropdownElement.addEventListener('click', (e) => e.stopPropagation());

            this.dropdownInnerElement = document.createElement('div');
            this.dropdownInnerElement.className = `${prefix}-popuover-inner`;

            // 2. 实时组装内置搜索框
            const searchBox = document.createElement('div');
            searchBox.className = `${prefix}-search-wrap`;
            
            this.searchInput = document.createElement('input');
            this.searchInput.className = `${prefix}-search-input`;
            this.searchInput.type = 'text';
            this.searchInput.placeholder = 'Search...';
            
            searchBox.appendChild(this.searchInput);
            this.dropdownInnerElement.appendChild(searchBox);

            // 3. 实时组装 Menu 挂载区
            this.menuContainer = document.createElement('div');
            this.menuContainer.className = `${prefix}-menu-wrapper`;
            this.dropdownInnerElement.appendChild(this.menuContainer);
            this.dropdownElement.appendChild(this.dropdownInnerElement);

            if (this.props.popuoverContainerStyle) {
                for (let p in this.props.popuoverContainerStyle) {
                    this.dropdownInnerElement.style[p as any] = this.props.popuoverContainerStyle[p];
                }
            }

            this.popContainer.appendChild(this.dropdownElement);

            // 4. 实时实例化内置 Menu 组件
            this.menuInstance = new Menu(this.menuContainer, {
                mode: 'inline',
                shortKey: this.shortKey, 
                items: this._options,
                fieldNames: this.props.fieldNames,
                defaultSelectedKeys: this._selectedValue ? [this._selectedValue] : [],
                onSelect: (params) => {
                    this.handleMenuSelect(params.key, params.item);
                }
            });

            this.dropdownElement.classList.add(activeClass);
            this.updateDropdownPosition();

            // 延迟高亮获焦搜索框
            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                    this.searchInput.select(); 
                }
            }, 50);

            // 5. 绑定内置搜索事件
            this.searchInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                if (this.menuInstance && typeof this.menuInstance.filter === 'function') {
                    this.menuInstance.filter(target.value);
                }
            });

            // 6. 绑定全局监听
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

            this.resizeObserver = new ResizeObserver(() => this.updateDropdownPosition());
            this.resizeObserver.observe(this.container);
            this.resizeObserver.observe(this.dropdownElement);
        } else {
            this.container.classList.remove(`${prefix}-open`);

            // 7. 📢 【方案 A 核心：全彻底销毁，不留一丝事件与残余 DOM】
            if (this.documentClickHandler) {
                document.removeEventListener('mousedown', this.documentClickHandler);
                this.documentClickHandler = null;
            }
            if (this.scrollHandler) {
                window.removeEventListener('resize', this.scrollHandler);
                document.removeEventListener('scroll', this.scrollHandler, true);
            }
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            if (this.menuInstance && typeof (this.menuInstance as any).destroy === 'function') {
                (this.menuInstance as any).destroy();
            }

            if (this.dropdownElement) {
                this.dropdownElement.remove();
                this.dropdownElement = null;
            }
            
            // 指针重置释放内存
            this.dropdownInnerElement = null;
            this.searchInput = null;
            this.menuContainer = null;
            this.menuInstance = null;
            this.isPositionPending = false;
        }
    }

    private handleMenuSelect(key: string, rawItem: any) {
        const hasChanged = this._selectedValue !== key;
        this._selectedValue = key;
        
        const labelField = this.props.fieldNames?.label || 'label';
        const displayLabel = rawItem ? rawItem[labelField] : key;

        const valueElement = this.container.querySelector(`.${CLASSNAME}-select-value`);
        if (valueElement) {
            valueElement.textContent = String(displayLabel);
            valueElement.classList.add('has-value');
        }

        this.props.onSelect?.(key, rawItem);
        if (hasChanged) {
            this.props.onChange?.(key);
        }

        this.toggleDropdown(false); // 📢 选完立刻干净毁灭自清洁
    }

    public updateDropdownPosition() {
        if (!this.isOpen || !this.container || !this.dropdownElement || this.isPositionPending) return;

        this.isPositionPending = true;
        requestAnimationFrame(() => {
            this.isPositionPending = false;
            if (!this.container || !this.dropdownElement || !this.dropdownInnerElement) return;

            if (!this.dropdownInnerElement.style.width) {
                const containerRect = getRect(this.container);
                this.dropdownInnerElement.style.width = `${containerRect.width}px`;
            }
            
            setAlignPos(this.dropdownElement, this.container, {
                pos: 'tl-bl?', 
                gap: 4,
                dxy: [0, 0],
                container: this.popContainer
            });
        });
    }

    private mount(target: string | HTMLElement) {
        const mountTarget = typeof target === 'string' ? document.querySelector(target) : target;
        if (mountTarget) mountTarget.appendChild(this.container);
    }

    public destroy() {
        this.toggleDropdown(false); // 强制安全毁灭下拉狂口、清理全局监听
        this.container.remove();
    }
}
