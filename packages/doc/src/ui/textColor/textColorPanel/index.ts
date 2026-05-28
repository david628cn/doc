import { Usage } from '@carvy/ui';
import { ColorList } from '../colorList';
import { TEXT_COLORS, HIGHLIGHT_COLORS, ColorItem } from '../colors';
import { Tooltip } from '../../popuover';
import { CLASSNAME } from '../../../config';
import './index.less';

export interface ColorValue {
    color: string;
    backgroundColor: string;
}

export interface TextColorPanelProps {
    value?: ColorValue;
    keyName?: string;
    colors?: ColorItem[];
    backgroundColors?: ColorItem[];
    onPanelChange?: (params: { event: MouseEvent; type: string; item: ColorItem; rgba: string; value: ColorValue }) => void;
}

export class TextColorPanel {
    public container: HTMLDivElement;
    private props: TextColorPanelProps;
    private usageColors: ColorItem[] = [];
    private usageRef: Usage | null = null;

    private recentListInstance!: ColorList;
    private textListInstance!: ColorList;
    private bgListInstance!: ColorList;

    private tooltip: Tooltip;
    
    // 扁平化反查池
    private colorItemMap: Map<string, ColorItem> = new Map();

    constructor(props: TextColorPanelProps) {
        this.props = props;
        this.container = document.createElement('div');
        this.container.className = `${CLASSNAME}-text-color-panel`;

        this.tooltip = new Tooltip(null, {
            trigger: 'manual',
            title: '',
            pos: 'b-t?',       
            gap: 8
        });

        this.usageRef = new Usage({
            limit: 8,
            key: this.props.keyName || 'doc_expiring_highlightColor'
        });
        this.usageColors = this.usageRef.load() || [];

        this.buildColorItemCache();
        this.initLists();
        
        // 🚀【核心进化】：统一在最外层容器绑定所有的点击、悬浮进入、悬浮离开总线
        this.bindAllEventDelegations();
    }

    private buildColorItemCache() {
        this.colorItemMap.clear();
        const allColors = [
            ...this.usageColors,
            ...(this.props.colors || TEXT_COLORS),
            ...(this.props.backgroundColors || HIGHLIGHT_COLORS)
        ];
        allColors.forEach(item => {
            if (item && item.value) {
                this.colorItemMap.set(item.value, item);
            }
        });
    }

    /**
     * 🚀【终极技术合并】：全场集中式事件委托总线管理
     */
    private bindAllEventDelegations() {
        // this.container.addEventListener('pointerdown', this.onPointerDown);
        // 🔗 委托一：接管全场色块的【点击选中事件】
        this.container.addEventListener('click', this.onClick);
        // 🔗 委托二：接管全场色块的【悬浮进入气泡提示】
        this.container.addEventListener('mouseover', this.onMouseOver);
        // 🔗 委托三：接管全场色块的【悬浮移出气泡收起】
        this.container.addEventListener('mouseout', this.onMouseOut);
    }
    onClick = (e: MouseEvent) => {
        const itemClass = `${CLASSNAME}-color-list-item`;
        const target = e.target as HTMLElement;
        // 沿点击目标层层向上锁定色块 <li> / <div>
        const itemDiv = target.closest(`.${itemClass}`) as HTMLElement;
        if (!itemDiv) return;

        e.preventDefault();
        e.stopPropagation();

        // 1. 从刚才写入的 dataset 中瞬间提出色值与分类类型
        const rawValue = itemDiv.getAttribute('data-color-value') || '';
        const rawType = itemDiv.getAttribute('data-color-type') || '';
        const matchedItem = this.colorItemMap.get(rawValue);
        if (rawType === 'reset') {
            this.tooltip.hide();
            const resetValue: ColorValue = { color: '', backgroundColor: '' };
            this.doChange({ event: e as unknown as MouseEvent, type: 'reset', item: null, rgba: '', value: resetValue }, false); 
            return;
        }
        if (!matchedItem) return;

        // 2. 执行原 React 中复杂的业务排他/取反逻辑判定
        const newValue = { ...this.props.value } as ColorValue;
        let isSaveHistory = false;

        if (rawType === 'color') {
            const isHas = rawValue === this.props.value?.color;
            newValue.color = isHas ? (this.props.colors || TEXT_COLORS)[0].value : rawValue;
            isSaveHistory = !isHas;
        } else if (rawType === 'backgroundColor') {
            const isHas = rawValue === this.props.value?.backgroundColor;
            newValue.backgroundColor = isHas ? (this.props.backgroundColors || HIGHLIGHT_COLORS)[0].value : rawValue;
            isSaveHistory = !isHas;
        } else {
            // 如果是“最近使用”里的项，动态解析其自带的属性大类
            const isHas = matchedItem.type === 'color' 
                ? rawValue === this.props.value?.color 
                : rawValue === this.props.value?.backgroundColor;
            
            if (matchedItem.type === 'color') {
                newValue.color = isHas ? (this.props.colors || TEXT_COLORS)[0].value : rawValue;
            } else {
                newValue.backgroundColor = isHas ? (this.props.backgroundColors || HIGHLIGHT_COLORS)[0].value : rawValue;
            }
        }

        // 3. 点击色块选中后，顺便让残留的 Tooltip 收缩隐退
        this.tooltip.hide();

        // 4. 下发状态机改变通知
        this.doChange({
            event: e,
            type: matchedItem.type || rawType,
            item: matchedItem,
            rgba: rawValue,
            value: newValue
        }, isSaveHistory);
    }

    onMouseOver = (e: MouseEvent) => {
        const itemClass = `${CLASSNAME}-color-list-item`;
        const target = e.target as HTMLElement;
        const itemDiv = target.closest(`.${itemClass}`) as HTMLElement;
        if (!itemDiv) return;

        const labelText = itemDiv.getAttribute('data-color-label') || '';
        if (labelText) {
            this.tooltip.title = labelText;
            this.tooltip.show(itemDiv);
        }
    }

    onMouseOut = (e: MouseEvent) => {
        const itemClass = `${CLASSNAME}-color-list-item`;
        const target = e.target as HTMLElement;
        const related = e.relatedTarget as HTMLElement;
        const itemDiv = target.closest(`.${itemClass}`) as HTMLElement;
        
        if (!itemDiv || (related && itemDiv.contains(related))) return;
        
        this.tooltip.hide();
    }

    public syncValue(nextValue: ColorValue) {
        this.props.value = nextValue;
        this.recentListInstance.updateProps('', this.usageColors);
        this.textListInstance.updateProps(nextValue.color);
        this.bgListInstance.updateProps(nextValue.backgroundColor);
    }

    private initLists() {
        const currentValue = this.props.value || { color: '', backgroundColor: '' };

        // 实例化子组件（由于全场被委托，子 Props 数据流已经完全转为纯数据，无任何回调传递）
        this.recentListInstance = new ColorList({ label: '最近使用', colors: this.usageColors });
        this.textListInstance = new ColorList({ label: '文本颜色', colors: this.props.colors || TEXT_COLORS, value: currentValue.color });
        this.bgListInstance = new ColorList({ label: '背景颜色', colors: this.props.backgroundColors || HIGHLIGHT_COLORS, value: currentValue.backgroundColor });

        this.container.appendChild(this.recentListInstance.container);
        this.container.appendChild(this.textListInstance.container);
        this.container.appendChild(this.bgListInstance.container);

        const resetBtn = document.createElement('button');
        resetBtn.className = `${CLASSNAME}-color-list-item ${CLASSNAME}-text-color-panel-reset`;
        resetBtn.innerText = '恢复默认';
        resetBtn.setAttribute('data-color-type', 'reset');
        this.container.appendChild(resetBtn);
    }
    private doChange(params: any, isSave: boolean) {
        if (isSave && this.usageRef) {
            const newData = this.usageRef.data.filter((n: any) => {
                return n.type !== params.type || n.value !== params.item.value;
            });
            this.usageRef.data = newData;
            this.usageRef.save();
            this.usageRef.add({ ...params.item, type: params.type });
            this.usageColors = this.usageRef.load() || [];
            
            this.buildColorItemCache();
        }

        this.props.value = params.value;
        this.recentListInstance.updateProps('', this.usageColors);
        this.textListInstance.updateProps(params.value.color);
        this.bgListInstance.updateProps(params.value.backgroundColor);

        this.props.onPanelChange?.(params);
    }

    public destroy() {
        if (this.tooltip) {
            this.tooltip.destroy();
        }
        // this.container.removeEventListener('pointerdown', this.onPointerDown);
        this.container.removeEventListener('click', this.onClick);
        this.container.removeEventListener('mouseover', this.onMouseOver);
        this.container.removeEventListener('mouseout', this.onMouseOut);
        this.container.remove();
    }
}