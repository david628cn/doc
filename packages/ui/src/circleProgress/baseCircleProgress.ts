import { CLASSNAME } from '../config';
import './index.less';

export type BaseCircleProgressProps = {
    radius?: number;
    percent?: number;
    strokeWidth?: number;
    type?: 'hash' | 'uploading' | 'idle';
    status?: 'active' | 'paused' | 'error' | 'success';
    style?: Partial<CSSStyleDeclaration>;
};

export class BaseCircleProgress {
    private props: Required<Omit<BaseCircleProgressProps, 'style' | 'status'>> & { status?: BaseCircleProgressProps['status'] };
    public element: HTMLDivElement;

    // DOM 节点引用
    private innerContainer!: HTMLDivElement;
    private activeCircle!: any;
    private contentEl!: HTMLDivElement;

    constructor(props: BaseCircleProgressProps) {
        // 补全默认值
        this.props = {
            radius: props.radius ?? 20,
            percent: props.percent ?? 0,
            strokeWidth: props.strokeWidth ?? 8,
            type: props.type ?? 'hash',
            status: props.status
        };

        this.element = document.createElement('div');
        this.initView(props.style);
        this.render();
    }

    private initView(style?: Partial<CSSStyleDeclaration>): void {
        // 绑定基础样式与自定义内联样式
        if (style) {
            Object.assign(this.element.style, style);
        }

        this.innerContainer = document.createElement('div');
        this.innerContainer.className = `${CLASSNAME}-circle-progress-inner`;

        // 创建 SVG
        const svg = document.createElementNS('http://w3.org', 'svg');
        svg.setAttribute('class', `${CLASSNAME}-circle-progress-svg`);
        svg.setAttribute('width', '1em');
        svg.setAttribute('height', '1em');
        svg.setAttribute('viewBox', '0 0 100 100');

        // 背景圆环
        const bgCircle = document.createElementNS('http://w3.org', 'circle');
        bgCircle.setAttribute('class', `${CLASSNAME}-circle-progress-circle-bg`);
        bgCircle.setAttribute('cx', '50');
        bgCircle.setAttribute('cy', '50');
        bgCircle.setAttribute('r', String(this.props.radius));
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke-width', String(this.props.strokeWidth));
        svg.appendChild(bgCircle);

        // 进度条圆环
        this.activeCircle = document.createElementNS('http://w3.org', 'circle');
        this.activeCircle.setAttribute('cx', '50');
        this.activeCircle.setAttribute('cy', '50');
        this.activeCircle.setAttribute('r', String(this.props.radius));
        this.activeCircle.setAttribute('fill', 'none');
        this.activeCircle.setAttribute('stroke-width', String(this.props.strokeWidth));
        this.activeCircle.setAttribute('transform', 'rotate(-90 50 50)'); // 从顶部开始
        svg.appendChild(this.activeCircle);

        // 文字内容区
        this.contentEl = document.createElement('div');
        this.contentEl.className = `${CLASSNAME}-circle-progress-content`;

        this.innerContainer.appendChild(svg);
        this.innerContainer.appendChild(this.contentEl);
        this.element.appendChild(this.innerContainer);
    }

    /**
     * 根据当前状态数据刷新 DOM 属性与样式类
     */
    private render(): void {
        const { radius, percent, status, type } = this.props;

        // 1. 计算圆周长与进度偏移量
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        this.activeCircle.setAttribute('stroke-dasharray', String(circumference));
        this.activeCircle.setAttribute('stroke-dashoffset', String(offset));

        // 2. 动态更新最外层容器的 Success 完成类名
        if (status === 'success') {
            this.element.className = `${CLASSNAME}-circle-progress ${CLASSNAME}-circle-pprogress-pcompleted`.trim();
        } else {
            this.element.className = `${CLASSNAME}-circle-progress`;
        }

        // 3. 动态更新进度条高亮圆环的 Class 状态
        let statusClass = `${CLASSNAME}-circle-progress-status-upload`;
        if (status === 'success') {
            statusClass = `${CLASSNAME}-circle-progress-status-upload`;
        } else if (status === 'paused') {
            statusClass = `${CLASSNAME}-circle-progress-status-pause`;
        } else if (status === 'error') {
            statusClass = `${CLASSNAME}-circle-progress-status-error`;
        } else if (type === 'hash') {
            statusClass = `${CLASSNAME}-circle-progress-status-hash`;
        }

        this.activeCircle.setAttribute(
            'class',
            `${CLASSNAME}-circle-progress-active ${statusClass}`.trim()
        );

        // 4. 更新文字百分比
        this.contentEl.textContent = `${Math.floor(percent)}%`;
    }

    /**
     * 对外暴露的方法：全量更新配置项
     */
    public update(props: Partial<BaseCircleProgressProps>): void {
        if (props.radius !== undefined) this.props.radius = props.radius;
        if (props.percent !== undefined) this.props.percent = props.percent;
        if (props.strokeWidth !== undefined) this.props.strokeWidth = props.strokeWidth;
        if (props.type !== undefined) this.props.type = props.type;
        if (props.status !== undefined) this.props.status = props.status;
        this.render();
    }

    /**
     * 快捷方法：仅动态改变百分比
     */
    public setPercent(percent: number): void {
        this.props.percent = percent;
        this.render();
    }

    /**
     * 快捷方法：仅动态改变状态 (如 success / error)
     */
    public setStatus(status: BaseCircleProgressProps['status']): void {
        this.props.status = status;
        this.render();
    }
}
