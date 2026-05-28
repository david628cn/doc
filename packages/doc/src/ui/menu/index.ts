import { getAlignPos, getRect, setPos, findParentWithPosition } from '@carvy/ui';
import { CLASSNAME } from '../../config';
import './index.less';
// import '../../config/animate.less';


const Keys = Object.freeze({
    ENTER: 'Enter',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    ESC: 'Escape'
});

export interface MenuProps {
    className?: string;
    mode?: string;          // 'popuover' | 'inline'
    trigger?: string;       // 'click' | 'hover'
    defaultSelectedKeys?: string[];
    defaultOpenKeys?: string[];
    defaultActiveKey?: string[];
    openKeys?: string[];
    selectedKeys?: string[];
    activeKey?: string | null;
    selectable?: boolean;
    multiple?: boolean;
    inlineIndent?: number;
    items?: any[];
    shortKey?: boolean;
    dxy?: number[];
    gap?: number;
    style?: Partial<CSSStyleDeclaration> | string;
    // 1. 自定义字段配置
    fieldNames?: { key?: string; label?: string; children?: string };
    // 2. Popover 独立悬浮挂载点
    popuoverContainer?: HTMLElement;
    // 事件回调
    onSelect?: (params: { key: string; selectedKeys: string[]; item: any }) => void;
    onOpenChange?: (params: { key?: string; openKeys: string[] }) => void;
    onActiveChange?: (params: { key: string; activeKey: string }) => void;
}

class Delayer {
    private timer: any = null;
    clear() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
    start(callback: () => void, delay: number = 0) {
        this.clear();
        this.timer = setTimeout(() => { this.clear(); callback(); }, delay * 1000);
    }
}

export class Menu {
    private props: MenuProps;
    private selectedKeys: string[] = [];
    private openKeys: string[] = [];
    private activeKey: string | null = null;

    // 动态别名映射缓存
    private kField: string;
    private lField: string;
    private cField: string;

    // 原始数据与过滤后数据
    private rawItems: any[] = [];
    private filteredItems: any[] = [];
    private mergedItems: any[] = [];
    private flatList: any[] = [];
    private flatMap: Map<string, any> = new Map();

    private dxy: number[] = [0, 0];
    private gap: number = 0;

    // DOM 引用
    public container!: HTMLDivElement;
    private titleDomMap: Map<string, HTMLElement> = new Map();
    private dropdownDomMap: Map<string, HTMLElement> = new Map();
    private resizeObservers: Map<string, ResizeObserver> = new Map();
    private delayer = new Delayer();
    private filterDebounceTimer: any = null;

    private _shortKey: boolean = false;

    // 事件解绑收集池
    private globalListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject; options?: any }> = [];

    constructor(containerElement: string | HTMLElement | null, props: MenuProps) {
        this.props = { mode: 'inline', trigger: 'hover', inlineIndent: 14, ...props };

        this._shortKey = this.props.shortKey || false;
        // 初始化字段映射名称
        this.kField = this.props.fieldNames?.key || 'key';
        this.lField = this.props.fieldNames?.label || 'label';
        this.cField = this.props.fieldNames?.children || 'children';

        this.rawItems = this.props.items || [];
        this.filteredItems = [...this.rawItems];

        this.initData();
        this.initStatus();
        this.render();
        this.bindGlobalEvents();
        this.mount(containerElement);
    }

    public get shortKey(): boolean {
        return this._shortKey;
    }

    public set shortKey(v: boolean) {
        this._shortKey = v || false;
    }

    private mount(target: string | HTMLElement | null) {
        const mountTarget = typeof target === 'string' ? document.querySelector(target) : target;
        if (mountTarget) mountTarget.appendChild(this.container);
    }

    private initData() {
        this.mergedItems = this.recursiveMerge(this.filteredItems);
        const adjacency = this.treeToAdjacency(this.mergedItems);
        this.flatList = adjacency.list;
        this.flatMap = adjacency.map;
    }

    private initStatus() {
        this.selectedKeys = [...(this.props.selectedKeys || this.props.defaultSelectedKeys || [])];
        this.openKeys = [...(this.props.openKeys || this.props.defaultOpenKeys || [])];
        this.activeKey = this.props.activeKey || null;

        if (this.selectedKeys.length > 0) {
            const allParentKeys: string[] = [];
            this.selectedKeys.forEach(key => {
                const parents = this.findParentKeys(this.mergedItems, key);
                if (parents) allParentKeys.push(...parents);
            });
            if (allParentKeys.length > 0) {
                this.openKeys = Array.from(new Set([...this.openKeys, ...allParentKeys]));
            }
        }
    }

    // --- 过滤逻辑 (支持防抖) ---
    public filter(keyword: string, debounceDelay: number = 300) {
        if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);

        this.filterDebounceTimer = setTimeout(() => {
            // 创建一个临时集合，用于存放命中子节点的父级 Key
            const matchedParentKeys = new Set<string>();

            if (!keyword.trim()) {
                this.filteredItems = [...this.rawItems];
                // 清空搜索时，如果想让菜单恢复原来的展开状态，可以在这里重新加载默认的 openKeys
                // 例如：this.openKeys = [...this.props.defaultOpenKeys || []];
            } else {
                const kw = keyword.toLowerCase();

                const performFilter = (list: any[]): any[] => {
                    return list.map(item => ({ ...item })).filter(item => {
                        const hasChildren = item[this.cField] && Array.isArray(item[this.cField]);

                        if (hasChildren) {
                            item[this.cField] = performFilter(item[this.cField]);
                        }

                        const matchSelf = String(item[this.lField] || '').toLowerCase().includes(kw);
                        const matchChildren = hasChildren && item[this.cField].length > 0;

                        // 【核心改动】：如果子节点有匹配项，说明当前节点是父节点，需要被展开
                        if (matchChildren && item[this.kField]) {
                            matchedParentKeys.add(item[this.kField]);
                        }

                        return matchSelf || matchChildren;
                    });
                };

                this.filteredItems = performFilter(this.rawItems);

                // 【核心联动】：将匹配到的所有父级 keys 合并到现有的 openKeys 当中，并去重
                this.openKeys = Array.from(new Set([...this.openKeys, ...matchedParentKeys]));
            }

            // 重新刷新并渲染 DOM 树
            this.refresh();

            // 【重要同步】：刷新完 DOM 树后，必须调用你原有的 DOM 状态同步方法，让刚加进去的 openKeys 在视觉上展开
            if (typeof this.syncOpenDOMState === 'function') {
                this.syncOpenDOMState();
            }
        }, debounceDelay);
    }

    private refresh() {
        this.cleanupDOMAndObservers();
        this.initData();
        this.container.innerHTML = '';
        const rootUl = this.renderMenuNode(this.filteredItems, 0);
        this.container.appendChild(rootUl);
        this.syncSelectDOMState();
        this.syncOpenDOMState();
        this.syncActiveDOMState();
    }

    private recursiveMerge(tree: any[] = []): any[] {
        if (!tree) return [];
        const result: any[] = [];
        for (const node of tree) {
            const processedNode = { ...node };
            if (processedNode[this.cField] && Array.isArray(processedNode[this.cField])) {
                processedNode[this.cField] = this.recursiveMerge(processedNode[this.cField]);
            }
            if (processedNode.type === 'group') {
                if (processedNode[this.cField] && processedNode[this.cField].length > 0) {
                    result.push(...processedNode[this.cField]);
                }
            } else if (processedNode.type !== 'divider') {
                result.push(processedNode);
            }
        }
        return result;
    }

    private treeToAdjacency(tree: any[]) {
        const result: any[] = [];
        const nodeMap = new Map<string, any>();
        const traverse = (nodes: any[], parentId: string | null = null) => {
            for (const node of nodes) {
                const adjNode = { ...node, [this.kField]: node[this.kField], parentKey: parentId };
                result.push(adjNode);
                if (node[this.kField] !== undefined && node[this.kField] !== null) {
                    nodeMap.set(node[this.kField], adjNode);
                }
                if (node[this.cField] && Array.isArray(node[this.cField])) {
                    traverse(node[this.cField], node[this.kField]);
                }
            }
        };
        traverse(tree);
        return { list: result, map: nodeMap };
    }

    private findParentKeys(tree: any[] = [], targetKey: string): string[] | null {
        const path: string[] = [];
        const find = (node: any, target: string): boolean => {
            if (node[this.kField] === target) return true;
            if (node[this.cField] && node[this.cField].length > 0) {
                if (node[this.kField]) path.push(node[this.kField]);
                for (let i = 0; i < node[this.cField].length; i++) {
                    if (find(node[this.cField][i], target)) return true;
                }
                path.pop();
            }
            return false;
        };
        for (let i = 0; i < tree.length; i++) { if (find(tree[i], targetKey)) return [...path]; }
        return null;
    }

    private findChildrenKeys(tree: any[] = [], targetKey: string): string[] | null {
        const childrenKeys: string[] = [];
        const collectChildren = (nodes: any[]) => {
            if (!nodes || !Array.isArray(nodes)) return;
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i][this.kField]) childrenKeys.push(nodes[i][this.kField]);
                collectChildren(nodes[i][this.cField]);
            }
        };
        const find = (node: any, target: string): boolean => {
            if (node[this.kField] && node[this.kField] === target) { collectChildren(node[this.cField]); return true; }
            if (node[this.cField] && node[this.cField].length > 0) {
                for (let i = 0; i < node[this.cField].length; i++) { if (find(node[this.cField][i], target)) return true; }
            }
            return false;
        };
        for (let i = 0; i < tree.length; i++) { if (find(tree[i], targetKey)) return childrenKeys; }
        return null;
    }

    // --- DOM 渲染核心 ---
    private render() {
        this.container = document.createElement('div');
        this.container.className = `${CLASSNAME}-menu-container`;
        if (this.props.style) {
            if (typeof this.props.style === 'string') this.container.style.cssText = this.props.style;
            else Object.assign(this.container.style, this.props.style);
        }
        const rootUl = this.renderMenuNode(this.filteredItems, 0);
        this.container.appendChild(rootUl);
    }

    private renderMenuNode(items: any[], level: number): HTMLUListElement {
        const ul = document.createElement('ul');
        ul.className = `${CLASSNAME}-menu`;
        if (this.props.className) ul.classList.add(this.props.className);
        if (this.props.mode === 'popuover') ul.classList.add(`${CLASSNAME}-menu-popuover`);

        items.forEach((item) => {
            if (item.type === 'divider' || item.type === 'line') {
                const li = document.createElement('li'); li.className = `${CLASSNAME}-menu-divider`;
                ul.appendChild(li); return;
            }

            const currentIndent = this.props.inlineIndent || 14;
            const itemStyle: Partial<CSSStyleDeclaration> = {};
            if (this.props.mode === 'popuover') itemStyle.paddingLeft = `${currentIndent}px`;
            else itemStyle.paddingLeft = `${(level + 1) * currentIndent}px`;

            const key = item[this.kField];
            const label = item[this.lField];
            const children = item[this.cField];

            if (item.type === 'group') {
                const li = document.createElement('li'); li.className = `${CLASSNAME}-menu-item-basic ${CLASSNAME}-menu-group`;
                if (item.title) li.title = item.title;
                const titleDiv = document.createElement('div'); titleDiv.className = `${CLASSNAME}-menu-group-title`;
                Object.assign(titleDiv.style, itemStyle);
                this.appendIconAndLabel(titleDiv, item.icon, label);
                li.appendChild(titleDiv);
                if (children && children.length > 0) {
                    const subUl = this.renderMenuNode(children, level);
                    subUl.classList.add(`${CLASSNAME}-menu-group-list`);
                    li.appendChild(subUl);
                }
                ul.appendChild(li); return;
            }

            if (children && children.length > 0) {
                const li = document.createElement('li'); li.className = `${CLASSNAME}-menu-item-basic ${CLASSNAME}-menu-submenu`;
                if (item.title) li.title = item.title;
                const titleDiv = document.createElement('div'); titleDiv.className = `${CLASSNAME}-menu-submenu-title`;
                Object.assign(titleDiv.style, itemStyle);

                if (this.openKeys.includes(key)) titleDiv.classList.add(`${CLASSNAME}-menu-submenu-open`);
                if (this.activeKey === key) titleDiv.classList.add(`${CLASSNAME}-menu-item-active`);

                this.appendIconAndLabel(titleDiv, item.icon, label);
                const arrow = document.createElement('i'); arrow.className = `${CLASSNAME}-menu-submenu-arrow`;
                titleDiv.appendChild(arrow); li.appendChild(titleDiv);

                this.titleDomMap.set(key, titleDiv);

                const subUl = this.renderMenuNode(children, level + 1);
                subUl.classList.add(`${CLASSNAME}-menu-sub-list`);

                if (this.props.mode === 'popuover') {
                    const dropdownDiv = document.createElement('div');
                    dropdownDiv.className = `${CLASSNAME}-menu-dropdown animated slideInUp`;
                    dropdownDiv.appendChild(subUl);
                    this.dropdownDomMap.set(key, dropdownDiv);

                    dropdownDiv.addEventListener('mouseenter', () => this.handlePopupMouseEnter(key));
                    dropdownDiv.addEventListener('mouseleave', () => this.handlePopupMouseLeave(key));

                    if (this.openKeys.includes(key)) {
                        const targetParent = this.props.popuoverContainer || document.body;
                        targetParent.appendChild(dropdownDiv);
                        this.updatePosition(key);
                    }
                } else {
                    if (!this.openKeys.includes(key)) subUl.style.display = 'none';
                    li.appendChild(subUl);
                }

                titleDiv.addEventListener('click', (e) => this.handleSubMenuSelect(e, key));
                titleDiv.addEventListener('mouseenter', () => this.handleSubMenuMouseEnter(key));
                titleDiv.addEventListener('mouseleave', () => this.handleSubMenuMouseLeave(key));
                ul.appendChild(li); return;
            }

            const li = document.createElement('li'); li.className = `${CLASSNAME}-menu-item-basic ${CLASSNAME}-menu-item`;
            li.setAttribute('role', key);
            if (this.selectedKeys.includes(key)) li.classList.add(`${CLASSNAME}-menu-item-selected`);

            const titleDiv = document.createElement('div'); titleDiv.className = `${CLASSNAME}-menu-item-title`;
            Object.assign(titleDiv.style, itemStyle);
            if (this.activeKey === key) titleDiv.classList.add(`${CLASSNAME}-menu-item-active`);

            this.appendIconAndLabel(titleDiv, item.icon, label);
            li.appendChild(titleDiv);
            this.titleDomMap.set(key, titleDiv);

            titleDiv.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.handleSelect(key); });
            ul.appendChild(li);
        });
        return ul;
    }

    private appendIconAndLabel(parent: HTMLElement, icon: any, label: any) {
        if (icon) {
            const iconSpan = document.createElement('span'); iconSpan.className = `${CLASSNAME}-menu-item-icon`;
            if (icon instanceof HTMLElement) iconSpan.appendChild(icon); else iconSpan.innerHTML = String(icon);
            parent.appendChild(iconSpan);
        }
        if (label) {
            const contentSpan = document.createElement('span'); contentSpan.className = `${CLASSNAME}-menu-item-content`;
            if (label instanceof HTMLElement) contentSpan.appendChild(label); else contentSpan.innerHTML = String(label);
            parent.appendChild(contentSpan);
        }
    }

    // --- 核心更新与状态同步 ---
    private updatePosition(key: string) {
        const titleDom = this.titleDomMap.get(key);
        const dropdownDom = this.dropdownDomMap.get(key);
        const el = this.props.popuoverContainer || document.body;

        if (this.openKeys.includes(key) && titleDom && dropdownDom) {
            const xy = getAlignPos(dropdownDom, titleDom, { pos: 'tl-tr?', gap: this.gap, dxy: this.dxy, container: el });
            if (xy) {
                let left = xy.left, top = xy.top;
                const pdom = findParentWithPosition(el);
                if (pdom) { const containerRect = getRect(pdom); left -= containerRect.left; top -= containerRect.top; }
                setPos(dropdownDom, { left, top });
            }
            dropdownDom.classList.add('animated', 'slideDownIn', `${CLASSNAME}-popuover-open`);
        } else if (dropdownDom) {
            dropdownDom.classList.remove('animated', 'slideDownIn', `${CLASSNAME}-popuover-open`);
        }
    }

    private handleSelect(key: string) {
        let newSelectedKeys = [...this.selectedKeys];
        if (this.props.mode === 'popuover') {
            newSelectedKeys = this.props.multiple && !newSelectedKeys.includes(key) ? [...newSelectedKeys, key] : [key];
            this.selectedKeys = newSelectedKeys;
            let newOpenKeys: string[] = [];
            newSelectedKeys.forEach(node => { const parents = this.findParentKeys(this.mergedItems, node); newOpenKeys = newOpenKeys.concat(parents || []); });
            this.openKeys = newOpenKeys;
            this.syncOpenDOMState();
            this.props.onOpenChange?.({ key, openKeys: newOpenKeys });
        } else {
            this.selectedKeys = this.props.multiple && !newSelectedKeys.includes(key) ? [...newSelectedKeys, key] : [key];
        }
        this.syncSelectDOMState();
        this.props.onSelect?.({ key, selectedKeys: this.selectedKeys, item: this.flatMap.get(key) });
    }

    private handleOpenChange(key: string, action: 'active' | 'cancel' | 'clear') {
        let newOpenKeys = [...this.openKeys];
        if (this.props.mode === 'popuover') {
            if (action === 'clear') newOpenKeys = [];
            else if (action === 'cancel') {
                const childrenKeys = this.findChildrenKeys(this.mergedItems, key);
                const arr = [key].concat(childrenKeys || []);
                newOpenKeys = newOpenKeys.filter(node => !arr.includes(node));
            } else if (action === 'active') {
                const parents = this.findParentKeys(this.mergedItems, key);
                newOpenKeys = (parents || []).concat([key]);
            }
        } else {
            if (action === 'cancel') newOpenKeys = newOpenKeys.filter(node => key !== node);
            else if (action === 'active') { if (!newOpenKeys.includes(key)) newOpenKeys.push(key); }
        }
        this.openKeys = newOpenKeys;
        this.syncOpenDOMState();
        this.props.onOpenChange?.({ key, openKeys: newOpenKeys });
    }

    private handleActiveChange(key: string | null, action: 'active' | 'cancel') {
        let nextActiveKey = this.activeKey;
        if (action === 'active') nextActiveKey = key;
        else if (action === 'cancel' && this.activeKey === key) nextActiveKey = null;

        this.activeKey = nextActiveKey;
        this.syncActiveDOMState();
        if (nextActiveKey) this.props.onActiveChange?.({ key: nextActiveKey, activeKey: nextActiveKey });
    }

    private handleSubMenuSelect(e: Event, key: string) {
        console.log(2);
        e.preventDefault();
        // e.stopPropagation();
        if (this.props.mode === 'popuover' && this.props.trigger !== 'click') return;
        this.handleOpenChange(key, this.openKeys.includes(key) ? 'cancel' : 'active');
    }

    private handleSubMenuMouseEnter(key: string) {
        this.delayer.start(() => {
            this.handleActiveChange(key, 'active');
            if (this.props.mode === 'popuover' && this.props.trigger !== 'click') this.handleOpenChange(key, 'active');
        }, 0.1);
    }

    private handleSubMenuMouseLeave(key: string) {
        this.delayer.start(() => {
            this.handleActiveChange(key, 'cancel');
            if (this.props.mode === 'popuover' && this.props.trigger !== 'click') this.handleOpenChange(key, 'cancel');
        }, 0.1);
    }

    private handlePopupMouseEnter(key: string) {
        if (this.props.mode === 'popuover' && this.props.trigger !== 'click') this.delayer.start(() => this.handleOpenChange(key, 'active'), 0.1);
    }

    private handlePopupMouseLeave(key: string) {
        if (this.props.mode === 'popuover' && this.props.trigger !== 'click') this.delayer.start(() => this.handleOpenChange(key, 'cancel'), 0.1);
    }

    private syncSelectDOMState() {
        this.titleDomMap.forEach((titleDiv, key) => {
            const li = titleDiv.parentElement;
            if (li?.classList.contains(`${CLASSNAME}-menu-item`)) {
                if (this.selectedKeys.includes(key)) li.classList.add(`${CLASSNAME}-menu-item-selected`);
                else li.classList.remove(`${CLASSNAME}-menu-item-selected`);
            }
        });
    }

    private syncOpenDOMState() {
        this.titleDomMap.forEach((titleDiv, key) => {
            const isOpen = this.openKeys.includes(key);
            const li = titleDiv.parentElement;
            if (isOpen) titleDiv.classList.add(`${CLASSNAME}-menu-submenu-open`);
            else titleDiv.classList.remove(`${CLASSNAME}-menu-submenu-open`);

            if (this.props.mode === 'popuover') {
                const dropdownDiv = this.dropdownDomMap.get(key);
                if (dropdownDiv) {
                    if (isOpen) {
                        if (!dropdownDiv.parentElement) {
                            const targetParent = this.props.popuoverContainer || document.body;
                            targetParent.appendChild(dropdownDiv);
                            this.bindObserver(key, titleDiv, dropdownDiv);
                        }
                        this.updatePosition(key);
                    } else if (dropdownDiv.parentElement) {
                        dropdownDiv.remove(); this.unbindObserver(key);
                    }
                }
            } else if (li) {
                const subUl = li.querySelector(`.${CLASSNAME}-menu-sub-list`) as HTMLElement;
                if (subUl) subUl.style.display = isOpen ? '' : 'none';
            }
        });
    }

    private syncActiveDOMState() {
        this.titleDomMap.forEach((titleDiv, key) => {
            if (this.activeKey === key) {
                titleDiv.classList.add(`${CLASSNAME}-menu-item-active`);
                titleDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else titleDiv.classList.remove(`${CLASSNAME}-menu-item-active`);
        });
    }

    private bindObserver(key: string, titleDom: HTMLElement, dropdownDom: HTMLElement) {
        this.unbindObserver(key);
        const observer = new ResizeObserver(() => this.updatePosition(key));
        observer.observe(titleDom); observer.observe(dropdownDom);
        this.resizeObservers.set(key, observer);
    }

    private unbindObserver(key: string) {
        if (this.resizeObservers.has(key)) { this.resizeObservers.get(key)!.disconnect(); this.resizeObservers.delete(key); }
    }

    // --- 全局监听收集与解绑器 ---
    private addTrackedListener(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: any) {
        target.addEventListener(type, listener, options);
        this.globalListeners.push({ target, type, listener, options });
    }

    private bindGlobalEvents() {
        this.addTrackedListener(document, 'keydown', (e) => this.doShortcut(e as KeyboardEvent), true);

        if (this.props.mode === 'popuover') {
            const handleDocClick = (e: MouseEvent | TouchEvent) => {
                const target = e.target as HTMLElement;
                let hit = false;
                this.titleDomMap.forEach((dom) => { if (dom.contains(target)) hit = true; });
                this.dropdownDomMap.forEach((dom) => { if (dom.contains(target)) hit = true; });
                if (!hit && this.openKeys.length > 0) {
                    this.openKeys = []; this.syncOpenDOMState(); this.props.onOpenChange?.({ openKeys: [] });
                }
            };
            this.addTrackedListener(document, 'mousedown', handleDocClick as EventListener, false);
            this.addTrackedListener(document, 'touchstart', handleDocClick as EventListener, { passive: false });
        }

        const handleResizeAndScroll = () => this.openKeys.forEach(key => this.updatePosition(key));
        this.addTrackedListener(window, 'resize', handleResizeAndScroll);
        this.addTrackedListener(document, 'scroll', handleResizeAndScroll, true);
    }

    private cleanupDOMAndObservers() {
        this.resizeObservers.forEach(obs => obs.disconnect());
        this.resizeObservers.clear();
        this.dropdownDomMap.forEach(div => div.remove());
        this.dropdownDomMap.clear();
        this.titleDomMap.clear();
    }

    // 3. 原生销毁销毁机制
    public destroy() {
        this.delayer.clear();
        if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
        this.cleanupDOMAndObservers();
        this.globalListeners.forEach(({ target, type, listener, options }) => {
            target.removeEventListener(type, listener, options);
        });
        this.globalListeners = [];
        this.container.remove();
    }

    private getKeyInParenIndex(key: string | null) {
        if (key === null) {
            const curList = this.mergedItems.map((node: any) => node[this.kField]);
            return { index: -1, list: curList };
        }
        const curItem = this.flatMap.get(key);
        if (curItem && curItem.parentKey !== null && curItem.parentKey !== undefined) {
            const parentItem = this.flatMap.get(curItem.parentKey);
            if (parentItem) {
                const children = parentItem[this.cField] || [];
                const index = children.findIndex((node: any) => node[this.kField] === key);
                return { index, list: children.map((node: any) => node[this.kField]) };
            }
        }
        const curList = this.mergedItems.map((node: any) => node[this.kField]);
        return { index: curList.indexOf(key), list: curList };
    }

    // --- 精准优化的快捷键导航算法 ---
    private doShortcut(e: KeyboardEvent) {
        if (!this.shortKey) return;
        const keyCode: any = e.key;
        if (!Object.values(Keys).includes(keyCode)) return;

        // 【解决初始按键不工作】无任何高亮时的方向键激活首项/尾项逻辑
        if (!this.activeKey) {
            if (keyCode === Keys.UP || keyCode === Keys.DOWN) {
                e.preventDefault();
                const { list } = this.getKeyInParenIndex(null);
                if (list.length > 0) {
                    const startKey = keyCode === Keys.UP ? list[list.length - 1] : list[0];
                    this.handleActiveChange(startKey, 'active');
                }
                return;
            }
        }

        // ESC 关闭当前菜单并退回高亮至父级项
        if (keyCode === Keys.ESC) {
            e.preventDefault();
            if (this.activeKey) {
                const curItem = this.flatMap.get(this.activeKey);
                if (curItem && curItem.parentKey) {
                    this.handleOpenChange(curItem.parentKey, 'cancel');
                    this.handleActiveChange(curItem.parentKey, 'active');
                }
            }
            return;
        }

        // ENTER 展开子菜单树 or 选中子项
        if (keyCode === Keys.ENTER) {
            if (!this.activeKey) return;
            const activeNode = this.flatMap.get(this.activeKey);
            if (activeNode) {
                e.preventDefault();
                if (activeNode[this.cField] && activeNode[this.cField].length > 0) {
                    this.handleOpenChange(this.activeKey, 'active');
                    this.handleActiveChange(activeNode[this.cField][0][this.kField], 'active');
                } else {
                    this.handleSelect(this.activeKey);
                }
            }
            return;
        }

        e.preventDefault();
        const curActiveKey = this.activeKey;
        let reActiveKey: string | undefined;
        const curItem = this.flatMap.get(curActiveKey!);
        let { index, list } = this.getKeyInParenIndex(curActiveKey);
        switch (keyCode) {
            case Keys.UP:
                index -= 1;
                if (index < 0) index = list.length - 1;
                reActiveKey = list[index];
                break;
            case Keys.DOWN:
                index += 1;
                if (index > list.length - 1) index = 0;
                reActiveKey = list[index];
                break;
            case Keys.LEFT:
                // 左键关闭退出当前层并高亮父项
                if (curItem && curItem.parentKey) {
                    this.handleOpenChange(curItem.parentKey, 'cancel');
                    reActiveKey = curItem.parentKey;
                }
                break;
            case Keys.RIGHT:
                // 右键展开并激活第0个子项
                if (curItem && curItem[this.cField] && curItem[this.cField].length > 0) {
                    this.handleOpenChange(curActiveKey!, 'active');
                    reActiveKey = curItem[this.cField][0][this.kField];
                }
                break;
            default:
                return;
        }

        if (reActiveKey === null || reActiveKey === undefined) return;

        this.handleActiveChange(reActiveKey, 'active');

        // 计算联动的打开树状态
        // const parentKeys = this.findParentKeys(this.mergedItems, reActiveKey);
        // let newOpenKeys: string[] = [].concat((parentKeys || []) as any);
        // const sub = this.flatMap.get(reActiveKey);

        // if (sub && sub[this.cField] && sub[this.cField].length > 0 && !this.openKeys.includes(reActiveKey)) {
        //     newOpenKeys.push(reActiveKey);
        // }

        // this.openKeys = newOpenKeys;
        // this.syncOpenDOMState();
        // this.props.onOpenChange?.({ openKeys: newOpenKeys });
    }
}