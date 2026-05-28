import { Popuover, Tooltip } from '../popuover';
import { TextColorDropdown } from '../textColor';
import { LinkPanelDropdown } from './linkPanel';
import { CLASSNAME } from '../../config';
import './index.less';

export type ToolbarItem = {
    type?: string;
    field?: string;
    title?: string;
    value?: any;
    // disabled?: boolean;
    icon?: string;
    btn?: HTMLElement;
}

// export type ToolbarValue = {
//     name?: string;
//     value?: any;
// }

export type ToolbarProps = {
    // container?: HTMLElement;
    popuoverClassName?: string;
    items?: ToolbarItem[];
    value?: any;
    disabled?: any;
    popuoverContainer?: HTMLElement;
    onChange?: (params: ToolbarItem, values: ToolbarItem[]) => void;
    onPopuoverMouseDown?: (params: any) => boolean;
}

export class Toolbar {
    container!: HTMLElement;
    element!: HTMLElement;
    props: ToolbarProps;
    private _items: ToolbarItem[] = [];
    private _value: any;
    private _disabled: any;
    tooltip!: Tooltip;
    cmp = new Map();
    private valuesMap: any;
    constructor(container: HTMLElement | string | null | undefined, props: ToolbarProps) {
        const { items = [], value = {}, disabled, onChange, ...rest } = props;
        this.props = {
            ...rest
        };
        this.container = typeof container === 'string' ? document.getElementById(container) : container as any;
        this.element = document.createElement('div');
        this.element.className = `${CLASSNAME}-toolbar-content`;
        this.element.addEventListener('click', this.onClick);
        this.element.addEventListener('mouseover', this.onMouseOver);
        this.element.addEventListener('mouseout', this.onMouseOut);
        if (this.container) {
            this.container.appendChild(this.element);
        }
        this.onChange = onChange ?? (() => { });
        this.items = items;
        this._disabled = disabled;
        this._value = value;
        this.updateStatus();
    }
    get items(): ToolbarItem[] {
        return this._items;
    }
    set items(v: ToolbarItem[]) {
        this._items = v;
        this.renderItems(this._items);
    }
    get value(): any {
        return this._value;
    }
    set value(v: any) {
        this._value = v || {};
        this.updateStatus();
    }
    get disabled(): any {
        return this._disabled;
    }
    set disabled(v: any) {
        this._disabled = v || {};
        this.updateStatus();
    }
    updateStatus() {
        // 1. 遍历组件映射 Map (field: 字段名如 'bold', elements: 对应绑定的 DOM 节点数组)
        for (const [field, elements] of this.cmp) {
            const currentValue = this.value[field];
            // 获取当前字段是否处于全局禁用状态
            const isFieldDisabled = !!this.disabled?.[field];
            elements?.forEach((element: unknown) => {
                // 2. 类型守卫，确保是标准的 HTMLElement 节点
                if (!(element instanceof HTMLElement)) {
                    if (element && typeof element === 'object' && 'value' in element) {
                        (element as any).value = currentValue;
                    }
                    if (element && typeof element === 'object' && 'value' in element) {
                        (element as any).disabled = isFieldDisabled;
                    }
                    return;
                }

                const activeClass = `${CLASSNAME}-button-active`;
                const disabledClass = `${CLASSNAME}-button-disabled`; // 推荐统一加上禁用样式类
                const boundValue = this.valuesMap.get(element);

                // 3. 🎯 核心高亮逻辑判定 (Active)
                let shouldActive = false;
                if (typeof currentValue === 'boolean') {
                    shouldActive = currentValue; // 布尔值直接联动
                } else {
                    shouldActive = currentValue !== undefined && currentValue === boundValue; // 非布尔值相等才高亮
                }

                // 4. 🎯 核心禁用逻辑判定 (Disabled)
                // 如果元素本身是按钮标签（如 <button> 或 <input>），可以直接修改原生的 disabled 属性
                if ('disabled' in element) {
                    (element as any).disabled = isFieldDisabled;
                }
                // 5. ✨ 使用 classList.toggle 二级参数，一行代码同步两类样式
                element.classList.toggle(activeClass, shouldActive);
                element.classList.toggle(disabledClass, isFieldDisabled);
            });
        }
    }
    /**
 * 🛠️ 辅助方法：根据传入值的类型，返回该类型的初始空值
 */
    private getInitialValueByType(currentValue: any): any {
        if (currentValue === null || currentValue === undefined) {
            return null;
        }

        // 使用 typeof 判断基础类型
        const type = typeof currentValue;

        switch (type) {
            case 'boolean':
                return false;      // 布尔值反选为 false
            case 'string':
                return '';         // 字符串反选为空串
            case 'number':
                return 0;          // 数字反选为 0（根据业务也可以返回 -1 或 null）
            case 'object':
                if (Array.isArray(currentValue)) {
                    return [];     // 数组反选为空数组
                }
                return {};         // 普通对象反选为空对象
            default:
                return undefined;
        }
    }
    onClick = (e: MouseEvent) => {
        e.preventDefault();
        const itemClass = `${CLASSNAME}-toolbar-button`;
        const target = e.target as HTMLElement;
        const itemDiv = target.closest<HTMLElement>(`.${itemClass}`);
        if (!itemDiv) return;

        const itemField = itemDiv.getAttribute('data-field');
        if (!itemField) return; // 确保 field 存在

        let itemValue: any = this.valuesMap.get(itemDiv);
        // 💡 核心逻辑：如果 itemValue 有值，且当前值与点击值相等（触发反选）
        if (typeof this.value[itemField] === 'boolean' || typeof itemValue === 'boolean') {
            itemValue = this.value[itemField] !== undefined ? !this.value[itemField] : !itemValue;
        } else {
            if (itemValue !== undefined && this.value[itemField] === itemValue) {
                // 根据当前字段的值类型，动态赋予对应的“初始/空”值
                itemValue = this.getInitialValueByType(this.value[itemField]);
            }
        }
        this.handleChange({
            field: itemField,
            value: itemValue,
            btn: itemDiv
        });
    }
    handleChange(item: ToolbarItem) {
        const nextValue = {
            ...this.value,
            [item.field as string]: item.value
        };
        this.value = nextValue;
        this.onChange?.(item, nextValue);
    }
    onChange(params: ToolbarItem, values: ToolbarItem[]) { }
    onMouseOver = (e: MouseEvent) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const related = e.relatedTarget as HTMLElement;
        const btnEl = target.closest('[data-title]') as HTMLElement;
        if (!btnEl || (related && btnEl.contains(related))) return;
        const title = btnEl.getAttribute('data-title');
        if (title) {
            if (!this.tooltip) {
                this.tooltip = new Tooltip(null, { title: '', pos: 'b-t?' });
            }
            this.tooltip.title = title;
            this.tooltip.show(btnEl);
        }
    }
    onMouseOut = (e: MouseEvent) => {
        // if (this.tooltip) {
        //     this.tooltip.hide();
        // }
    }
    renderItems(items: ToolbarItem[] = []) {
        this.clearCmp();
        this.element.innerHTML = '';
        items.forEach(item => {
            if (Array.isArray(item)) {
                const groupEl = document.createElement('div');
                groupEl.className = `${CLASSNAME}-button-group ${CLASSNAME}-toolbar-button-group`;
                item.forEach(cfg => this.renderItem(groupEl, cfg));
                this.element.appendChild(groupEl);
            } else {
                this.renderItem(this.element, item);
            }
        });
    }
    renderItem(parent: HTMLElement, item: ToolbarItem) {
        if (item.type === 'separator') {
            const sep = document.createElement('div');
            sep.className = `${CLASSNAME}-toolbar-separator`;
            parent.appendChild(sep);
        } else if (item.type === 'textStyle') {
            const textColorDropdow = new TextColorDropdown(null, {
                popuoverClassName: this.props.popuoverClassName,
                popuoverContainer: this.props.popuoverContainer,
                // isAutoScroll: false,
                // onPointerDown: e => e.preventDefault(),
                onChange: (params) => {
                    this.handleChange({
                        field: item.field,
                        value: params.value
                    });
                }
            });
            // textColorDropdow.value = item.value;
            parent.appendChild(textColorDropdow.container);
            this.setCmp(item.field as string, textColorDropdow);
            this.valuesMap.set(textColorDropdow, item.value);
        } else if (item.type === 'link') {
            const linkPanelDropdown = new LinkPanelDropdown(null, {
                popuoverClassName: this.props.popuoverClassName,
                popuoverContainer: this.props.popuoverContainer,
                // isAutoScroll: false,
                field: item.field || '',
                title: item.title || '',
                onConfirm: (v) => {
                    this.handleChange({
                        field: item.field,
                        value: v
                    });
                    linkPanelDropdown.hide();
                },
                onClear: () => {
                    this.handleChange({
                        field: item.field,
                        value: null
                    });
                    linkPanelDropdown.hide();
                }
            });
            parent.appendChild(linkPanelDropdown.element);
            this.setCmp(item.field as string, linkPanelDropdown);
            this.valuesMap.set(linkPanelDropdown, item.value);
        } else {
            const btn = document.createElement('button');
            btn.className = `${CLASSNAME}-button ${CLASSNAME}-toolbar-button`;
            btn.setAttribute('data-field', item.field || '');
            btn.setAttribute('data-title', item.title || '');
            btn.innerHTML = item.icon || '';
            parent.appendChild(btn);
            this.setCmp(item.field as string, btn);
            this.valuesMap.set(btn, item.value);
        }
    }
    hideCmps() {
        for (const [field, elements] of this.cmp) {
            elements?.forEach((element: any) => {
                // 2. 类型守卫，确保是标准的 HTMLElement 节点
                if (!(element instanceof HTMLElement)) {
                    element?.hide?.();
                }
            });
        }
    }
    containsCmps(target: any) {
        for (const [field, elements] of this.cmp) {
            const has = elements.find((element: any) => {
                if (!(element instanceof HTMLElement)) {
                    return element?.contains?.(target);
                }
            });
            if (has) {
                return true;
            }
        }
        return false;
    }
    setCmp(key: string, cmp: any) {
        let arr = this.cmp.get(key) || [];
        arr.push(cmp);
        this.cmp.set(key, arr);
    }
    clearCmp() {
        for (const v of this.cmp.values()) {
            (v || []).forEach((c: any) => c.destroy?.())
        }
        this.cmp.clear();
        this.valuesMap = new WeakMap();
    }
    destroy() {
        this.element.addEventListener('click', this.onClick);
        this.element.removeEventListener('mouseover', this.onMouseOver);
        this.element.removeEventListener('mouseout', this.onMouseOut);
        this.clearCmp();
    }
}

export type ToolbarDropdownProps = {
    clssName?: string;
    isAutoScroll?: boolean,
    gap?: number;
    items?: any[];
    value?: any;
    disabled?: any;
    onChange?: (params: any) => void;
}

export class ToolbarDropdown {
    container!: HTMLElement;
    private _items: any[] = [];
    private _value: any;
    private _disabled: any;
    props: ToolbarDropdownProps;
    private popover!: Popuover;
    private toolbar!: Toolbar;
    onChange(params: any) { };
    constructor(container: HTMLElement | string, props: ToolbarDropdownProps) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container as any;
        const { items = [], onChange, ...rest } = props;
        this.props = {
            // isAutoScroll: false,
            ...rest
        };
        this._items = items;
        this.onChange = onChange ?? this.onChange;
    }
    get items() {
        return this._items;
    }
    set items(ds: any[]) {
        if (this.toolbar) {
            this.toolbar.items = ds;
        }
        this._items = ds;
    }
    get value(): any {
        return this._value;
    }
    set value(v: any) {
        this._value = v || {};
        if (this.toolbar) {
            this.toolbar.value = v;
        }
    }
    get disabled(): any {
        return this._disabled;
    }
    set disabled(v: any) {
        this._disabled = v || {};
        if (this.toolbar) {
            this.toolbar.disabled = v;
        }
    }
    updateData(ds: any) {
        // if (this.toolbar) {
        //     this.toolbar.updateData(ds);
        // }
    }
    setDisabledFields(ds: any) {
        // if (this.toolbar) {
        //     this.toolbar.setDisabledFields(ds);
        // }
    }
    get isOpen(): boolean {
        if (this.popover && this.popover.open) {
            return true;
        }
        return false;
    }
    show(rect: any) {
        if (!this.popover) {
            if (!this.toolbar) {
                this.toolbar = new Toolbar(null, {
                    items: this.items,
                    value: this.value,
                    disabled: this.disabled,
                    popuoverContainer: this.container,
                    popuoverClassName: this.props.clssName,
                    // isAutoScroll: this.props.isAutoScroll,
                    // onChange: ({ type: itemType, name, value, data }) => {
                    // }
                    onChange: this.onChange
                });
            }

            // 📢 修正：绑定 Popover 实例参数项，使用 [] 数组形式传递给 items 规避 [object Object]
            this.popover = new Popuover(null, {
                pos: 'b-t?',
                items: this.toolbar,
                container: this.container as HTMLElement,
                gap: this.props.gap,
                isAutoScroll: this.props.isAutoScroll,
                className: this.props.clssName,
                innerClassName: `${CLASSNAME}-toolbar-dropdown-inner`,
                // onPointerDown: e => e.preventDefault()
                onPopuoverMouseDown: ({ isOutside, event }) => {
                    if (this.toolbar) {
                        const has = this.toolbar.containsCmps(event.target);
                        if (has) {
                            return false;
                        }
                    }
                    return isOutside;
                },
                // onChange: (status: any) => {
                //     console.log(`[Popover] 狀態變更 -> 是否展開: ${status.open}`);
                // }
                // onChange: this.onPopuoverChange
            });
        }
        // this.toolbar.items = this.items
        this.popover.show(rect);
    }
    hide() {
        if (this.toolbar) {
            this.toolbar.hideCmps();
            if (this.toolbar.tooltip) {
                this.toolbar.tooltip.hide();
            }
        }
        if (this.popover) {
            this.popover.hide();
        }
    }
    destroy() {
        if (this.toolbar) {
            this.toolbar.destroy();
        }
        if (this.popover) {
            this.popover.destroy();
        }
    }
}