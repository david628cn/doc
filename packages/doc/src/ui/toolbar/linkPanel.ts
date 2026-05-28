import { Popuover, Tooltip } from '../popuover';
import { CLASSNAME } from '../../config';
import './linkPanel.less';

export type LinkPanelValue = {
    href?: string;
}

export type LinkPanelProps = {
    value?: LinkPanelValue;
    onConfirm?: (v: LinkPanelValue) => void;
    onClear?: (v: LinkPanelValue) => void;
}

export class LinkPanel {
    public container: HTMLDivElement;
    public element: HTMLDivElement;
    private inputElement: HTMLInputElement;
    private form: HTMLFormElement;
    private confirmBtn: HTMLButtonElement;
    private openBtn: HTMLButtonElement;
    private clearBtn: HTMLButtonElement;
    private copyBtn: HTMLButtonElement;
    private _value: LinkPanelValue;
    private props: LinkPanelProps;
    private isBlurLocked: boolean = false;
    tooltip!: Tooltip;
    // ✨ 新增：缓存文本复原定时器，防止用户高频连击导致定时器冲突
    private copyResetTimer: any = null;

    constructor(container: HTMLElement | string | null | undefined, props: LinkPanelProps) {
        const { value, ...rest } = props;
        this.props = {
            ...rest
        };
        this.container = typeof container === 'string' ? document.getElementById(container) : container as any;
        const prefix = `${CLASSNAME}-link-panel`;
        this.element = document.createElement('div');
        this.element.className = prefix;

        this.element.innerHTML = `
            <form class="${prefix}-form">
                <input class="${CLASSNAME}-input ${prefix}-input" name="href" type="text"/>
                <span class="${CLASSNAME}-button-group">
                    <button class="${CLASSNAME}-button ${prefix}-btn-confirm" type="submit"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M21 4C21 3.44772 20.5523 3 20 3C19.4477 3 19 3.44772 19 4V11C19 11.7956 18.6839 12.5587 18.1213 13.1213C17.5587 13.6839 16.7956 14 16 14H6.41421L9.70711 10.7071C10.0976 10.3166 10.0976 9.68342 9.70711 9.29289C9.31658 8.90237 8.68342 8.90237 8.29289 9.29289L3.29289 14.2929C2.90237 14.6834 2.90237 15.3166 3.29289 15.7071L8.29289 20.7071C8.68342 21.0976 9.31658 21.0976 9.70711 20.7071C10.0976 20.3166 10.0976 19.6834 9.70711 19.2929L6.41421 16H16C17.3261 16 18.5979 15.4732 19.5355 14.5355C20.4732 13.5979 21 12.3261 21 11V4Z" fill="currentColor"></path></svg></button>
                    <div class="${prefix}-separator"></div>
                    <button class="${CLASSNAME}-button ${prefix}-btn-clear" data-title="移除链接" type="reset"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg></button>
                    <button class="${CLASSNAME}-button ${prefix}-btn-open" data-title="打开链接" type="button"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 3C14 2.44772 14.4477 2 15 2H21C21.5523 2 22 2.44772 22 3V9C22 9.55228 21.5523 10 21 10C20.4477 10 20 9.55228 20 9V5.41421L10.7071 14.7071C10.3166 15.0976 9.68342 15.0976 9.29289 14.7071C8.90237 14.3166 8.90237 13.6834 9.29289 13.2929L18.5858 4H15C14.4477 4 14 3.55228 14 3Z" fill="currentColor"></path><path d="M4.29289 7.29289C4.48043 7.10536 4.73478 7 5 7H11C11.5523 7 12 6.55228 12 6C12 5.44772 11.5523 5 11 5H5C4.20435 5 3.44129 5.31607 2.87868 5.87868C2.31607 6.44129 2 7.20435 2 8V19C2 19.7957 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H16C16.7957 22 17.5587 21.6839 18.1213 21.1213C18.6839 20.5587 19 19.7957 19 19V13C19 12.4477 18.5523 12 18 12C17.4477 12 17 12.4477 17 13V19C17 19.2652 16.8946 19.5196 16.7071 19.7071C16.5196 19.8946 16.2652 20 16 20H5C4.73478 20 4.48043 19.8946 4.29289 19.7071C4.10536 19.5196 4 19.2652 4 19V8C4 7.73478 4.10536 7.48043 4.29289 7.29289Z" fill="currentColor"></path></svg></button>
                    <button class="${CLASSNAME}-button ${prefix}-btn-copy" data-title="复制链接" type="button"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg></button>
                </span>
            </form>
        `;
        this.element.addEventListener('mouseover', this.onMouseOver);
        this.element.addEventListener('mouseout', this.onMouseOut);
        this.form = this.element.querySelector(`.${prefix}-form`) as HTMLFormElement;
        this.inputElement = this.element.querySelector(`.${prefix}-input`) as HTMLInputElement;
        this.confirmBtn = this.element.querySelector(`.${prefix}-btn-confirm`) as HTMLButtonElement;
        this.openBtn = this.element.querySelector(`.${prefix}-btn-open`) as HTMLButtonElement;
        this.clearBtn = this.element.querySelector(`.${prefix}-btn-clear`) as HTMLButtonElement;
        this.copyBtn = this.element.querySelector(`.${prefix}-btn-copy`) as HTMLButtonElement;

        // 绑定即时输入监听
        this.inputElement.addEventListener('input', this.onInput);

        // 焦点死锁监听
        this.inputElement.addEventListener('blur', this.onBlur);

        this.form.addEventListener('submit', this.onConfirm);
        // 按按钮点击事件
        this.confirmBtn.addEventListener('click', this.onConfirm);

        this.openBtn.addEventListener('click', this.onOpen);

        this.clearBtn.addEventListener('click', this.onClear);

        // ✨【核心增强】：点击复制链接并执行文本秒切复原
        this.copyBtn.addEventListener('click', this.onCopy);

        if (this.container) {
            this.container.appendChild(this.element);
        }

        this._value = value || {
            href: ''
        };
        this.updateStatus();
    }

    get value(): LinkPanelValue {
        return this._value;
    }
    set value(v: LinkPanelValue) {
        this._value = v || {
            href: ''
        };
        this.updateStatus();
    }

    updateStatus() {
        const { href } = this.value || {};
        if (!href) {
            this.confirmBtn.disabled = true;
            this.clearBtn.disabled = true;
            this.copyBtn.disabled = true;
            this.openBtn.disabled = true;
            this.inputElement.value = '';
        } else {
            this.confirmBtn.disabled = false;
            this.clearBtn.disabled = false;
            this.copyBtn.disabled = false;
            this.openBtn.disabled = false;
            this.inputElement.value = href;
        }
    }

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

    onOpen = (event: MouseEvent) => {
        event.preventDefault();
        if (this.value.href) {   
            // window.location.href = this.value.href;
            window.open(this.value.href);
        }
    }

    onInput = (event: InputEvent) => {
        event.preventDefault();
        this.validateCurrentInput();
        this.value = {
            href: this.inputElement.value.trim()
        };
        // this.updateStatus();
    }

    onBlur = (event: FocusEvent) => {
        event.preventDefault();
        this.updateStatus();
        if (this.isBlurLocked) {
            setTimeout(() => this.inputElement.focus(), 10);
        }
    }

    onConfirm = (event: MouseEvent | SubmitEvent) => {
        event.preventDefault();
        if (this.confirmBtn.disabled) return;
        const v = this.inputElement.value.trim();
        if (v) {
            this.props.onConfirm?.({
                href: v
            });
        }
    }

    onClear = (event: MouseEvent) => {
        event.preventDefault();
        this.updateStatus();
        this.props.onClear?.({
            href: ''
        });
    }

    onCopy = (event: MouseEvent) => {
        event.preventDefault();
        if (this.copyBtn.disabled) return;
        const href = this.inputElement.value.trim();
        if (!href) return;
        // this.copyBtn.disabled = true;
        navigator.clipboard.writeText(href).then(() => {
            // 🚀 1. 文本秒切状态：瞬间变换字样并切换皮肤反馈
            if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
            this.copyBtn.innerHTML = '<svg width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014"><path d="M883 226.014q-13-13-30-13t-30 13l-439 440-183-184q-13-13-30-13t-30 13-13 30 13 30l213 213q7 7 13.5 10t16.5 3 16.5-3 13.5-10l469-469q13-13 13-30t-13-30"/></svg>';
            
            this.copyResetTimer = setTimeout(() => {
                this.copyBtn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>';
                this.copyResetTimer = null;
                // this.copyBtn.disabled = false;
            }, 1000);

            // this.copyBtn.innerText = '已复制 ✓';
            // this.copyBtn.style.color = '#52c41a'; // 变换为清爽的成功绿
            // this.copyBtn.style.borderColor = '#b7eb8f';
            // this.copyBtn.style.background = '#f6ffed';

            // // 🚀 2. 借用外层 Tooltip 弹窗进行状态飞渡反馈（双保险提示）
            // const parentToolbar = this.container.closest(`.${CLASSNAME}-editor-toolbar-wrap`);
            // if (parentToolbar && (parentToolbar as any).__toolbarInstance__) {
            //     const toolbar = (parentToolbar as any).__toolbarInstance__;
            //     if (toolbar.tooltipInstance) {
            //         toolbar.tooltipInstance.title = '🟢 链接已成功复制到剪贴板';
            //         toolbar.tooltipInstance.show(this.copyBtn);
            //         setTimeout(() => toolbar.tooltipInstance.hide(), 1000); // 1秒后收缩气泡
            //     }
            // }

            // // 🚀 3. 【满足需求】：1 秒钟后全自动复原回“复制链接”
            // this.copyResetTimer = setTimeout(() => {
            //     this.copyBtn.innerText = '复制链接';
            //     this.copyBtn.style.color = '#1a73e8'; // 恢复原来的科技蓝
            //     this.copyBtn.style.borderColor = '#1a73e830';
            //     this.copyBtn.style.background = '#f5f5f5';
            //     this.copyResetTimer = null;
            // }, 1000);

        }).catch(err => {
            // console.error('无法复制链接:', err);
        });
    }

    private validateCurrentInput() {
        // const rawValue = this.inputElement.value.trim();
        // const prefix = `${CLASSNAME}-link-panel`;

        // if (!rawValue) {
        //     this.isBlurLocked = false;
        //     this.inputElement.classList.remove(`${prefix}-input-error`, 'error');
        //     this.inputElement.style.borderColor = '#d9d9d9';

        //     this.confirmBtn.disabled = true;
        //     this.confirmBtn.style.opacity = '0.5';
        //     this.confirmBtn.style.cursor = 'not-allowed';

        //     this.copyBtn.disabled = true;
        //     this.copyBtn.style.opacity = '0.5';
        //     this.copyBtn.style.cursor = 'not-allowed';
        //     return;
        // }

        // const urlRegExp = /^(https?:\/\/)?(localhost|([\da-z.-]+)\.([a-z.]{2,6})|(\d{1,3}\.){3}\d{1,3})(:\d+)?([\/\w .-]*)*\/?$/i;
        // const isLegal = urlRegExp.test(rawValue);

        // if (isLegal) {
        //     this.isLegalState(prefix);
        // } else {
        //     this.isIllegalState(prefix);
        // }
    }

    // private isLegalState(prefix: string) {
    //     this.isBlurLocked = false;
    //     this.inputElement.classList.remove(`${prefix}-input-error`, 'error');
    //     this.inputElement.style.borderColor = '#d9d9d9';

    //     this.confirmBtn.disabled = false;
    //     this.confirmBtn.style.opacity = '1';
    //     this.confirmBtn.style.cursor = 'pointer';

    //     // 只有当没有处于“已复制”的倒计时复原周期内，才去刷默认颜色
    //     if (!this.copyResetTimer) {
    //         this.copyBtn.disabled = false;
    //         this.copyBtn.style.opacity = '1';
    //         this.copyBtn.style.cursor = 'pointer';
    //     }
    // }

    // private isIllegalState(prefix: string) {
    //     this.isBlurLocked = true;
    //     this.inputElement.classList.add(`${prefix}-input-error`, 'error');
    //     this.inputElement.style.borderColor = '#ff4d4f';

    //     this.confirmBtn.disabled = true;
    //     this.confirmBtn.style.opacity = '0.5';
    //     this.confirmBtn.style.cursor = 'not-allowed';

    //     if (!this.copyResetTimer) {
    //         this.copyBtn.disabled = false;
    //         this.copyBtn.style.opacity = '1';
    //         this.copyBtn.style.cursor = 'pointer';
    //     }
    // }

    // public setURL(href: string) {
    //     this.inputElement.value = href || '';
    //     this.validateCurrentInput();
    // }

    public focus() {
        setTimeout(() => {
            this.inputElement.focus();
            this.inputElement.select();
        }, 50);
    }
    destory() {
        this.inputElement.removeEventListener('input', this.onInput);
        this.inputElement.removeEventListener('blur', this.onBlur);
        this.form.removeEventListener('submit', this.onConfirm);
        this.confirmBtn.removeEventListener('click', this.onConfirm);
        this.openBtn.removeEventListener('click', this.onOpen);
        this.clearBtn.removeEventListener('click', this.onClear);
        this.copyBtn.removeEventListener('click', this.onCopy);
        this.element.removeEventListener('mouseover', this.onMouseOver);
        this.element.removeEventListener('mouseout', this.onMouseOut);
    }
}

export type LinkPanelDropdownProps = {
    popuoverClassName?: string;
    title?: string;
    field?: string;
    value?: LinkPanelValue;
    icon?: string;
    pos?: string;
    trigger?: string;
    popuoverContainer?: HTMLElement;
    isAutoScroll?: boolean;
    onPopuoverMouseDown?: (params: any) => boolean;
    onConfirm?: (value: LinkPanelValue) => void;
    onClear?: (value: LinkPanelValue) => void;
}

export class LinkPanelDropdown {
    container: HTMLElement | null = null;
    element: HTMLElement;
    private _value!: LinkPanelValue;
    private props: LinkPanelDropdownProps;
    private popuover: Popuover | null = null;
    private linkPanel: LinkPanel | null = null;
    constructor(container: string | HTMLElement | null, props?: LinkPanelDropdownProps) {
        const { value = {
            href: ''
        } } = props || {};
        this.props = {
            pos: 'tr-br?',
            trigger: 'click',
            isAutoScroll: true,
            ...props
        };
        this.element = document.createElement('button');
        this.element.className = `${CLASSNAME}-button`;
        this.element.setAttribute('data-field', this.props.field || '');
        this.element.setAttribute('data-title', this.props.title || '');
        this.element.innerHTML = this.props.icon || '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.9958 1.06669C15.4226 1.05302 13.907 1.65779 12.7753 2.75074L12.765 2.76086L11.045 4.47086C10.6534 4.86024 10.6515 5.49341 11.0409 5.88507C11.4303 6.27673 12.0634 6.27858 12.4551 5.88919L14.1697 4.18456C14.9236 3.45893 15.9319 3.05752 16.9784 3.06662C18.0272 3.07573 19.0304 3.49641 19.772 4.23804C20.5137 4.97967 20.9344 5.98292 20.9435 7.03171C20.9526 8.07776 20.5515 9.08563 19.8265 9.83941L16.833 12.8329C16.4274 13.2386 15.9393 13.5524 15.4019 13.7529C14.8645 13.9533 14.2903 14.0359 13.7181 13.9949C13.146 13.9539 12.5894 13.7904 12.0861 13.5154C11.5827 13.2404 11.1444 12.8604 10.8008 12.401C10.47 11.9588 9.84333 11.8685 9.40108 12.1993C8.95883 12.5301 8.86849 13.1568 9.1993 13.599C9.71464 14.288 10.3721 14.858 11.1272 15.2705C11.8822 15.683 12.7171 15.9283 13.5753 15.9898C14.4334 16.0513 15.2948 15.9274 16.1009 15.6267C16.907 15.326 17.639 14.8555 18.2473 14.247L21.2472 11.2471L21.2593 11.2347C22.3523 10.1031 22.9571 8.58751 22.9434 7.01433C22.9297 5.44115 22.2987 3.93628 21.1863 2.82383C20.0738 1.71138 18.5689 1.08036 16.9958 1.06669Z" fill="currentColor"></path><path d="M10.4247 8.0102C9.56657 7.94874 8.70522 8.07256 7.89911 8.37326C7.09305 8.67395 6.36096 9.14458 5.75272 9.753L2.75285 12.7529L2.74067 12.7653C1.64772 13.8969 1.04295 15.4125 1.05662 16.9857C1.07029 18.5589 1.70131 20.0637 2.81376 21.1762C3.9262 22.2886 5.43108 22.9196 7.00426 22.9333C8.57744 22.947 10.0931 22.3422 11.2247 21.2493L11.2371 21.2371L12.9471 19.5271C13.3376 19.1366 13.3376 18.5034 12.9471 18.1129C12.5565 17.7223 11.9234 17.7223 11.5328 18.1129L9.82932 19.8164C9.07555 20.5414 8.06768 20.9425 7.02164 20.9334C5.97285 20.9243 4.9696 20.5036 4.22797 19.762C3.48634 19.0203 3.06566 18.0171 3.05655 16.9683C3.04746 15.9222 3.44851 14.9144 4.17355 14.1606L7.16719 11.167C7.5727 10.7613 8.06071 10.4476 8.59811 10.2471C9.13552 10.0467 9.70976 9.96412 10.2819 10.0051C10.854 10.0461 11.4106 10.2096 11.9139 10.4846C12.4173 10.7596 12.8556 11.1397 13.1992 11.599C13.53 12.0412 14.1567 12.1316 14.5989 11.8007C15.0412 11.4699 15.1315 10.8433 14.8007 10.401C14.2854 9.71205 13.6279 9.14198 12.8729 8.72948C12.1178 8.31697 11.2829 8.07166 10.4247 8.0102Z" fill="currentColor"></path></svg>';
        this.element.addEventListener('click', this.onClick);
        this.container = typeof container === 'string' ? document.getElementById(container) : container as any;
        if (this.container) {
            this.container.appendChild(this.element);
        }
        this._value = value;
        this.updateStatus();
    }
    get value(): LinkPanelValue { return this._value }
    set value(v: LinkPanelValue) {
        this._value = v || {
            href: ''
        };
        if (this.linkPanel) {
            this.linkPanel.value = this._value;
        }
        this.updateStatus();
    }
    updateStatus() {
        const { href } = this.value || {};
        if (!href) {
            this.element.classList.remove(`${CLASSNAME}-button-active`);
        } else {
            this.element.classList.add(`${CLASSNAME}-button-active`);
        }
        if (this.linkPanel) {
            this.linkPanel.updateStatus();
        }
    }
    onClick = (e: MouseEvent) => {
        e.preventDefault();
        if (!this.popuover || !this.popuover.open) {
            this.show();
        } else {
            this.hide();
        }
    }
    contains(target: HTMLElement) {
        if (this.popuover) {
            return this.popuover.containerElement.contains(target);
        }
        return false;
    }
    show() {
        if (!this.linkPanel) {
            this.linkPanel = new LinkPanel(null, {
                value: this.value,
                onConfirm: this.props.onConfirm,
                onClear: this.props.onClear
            });
        }
        if (!this.popuover) {
            this.popuover = new Popuover(null, {
                items: this.linkPanel.element,
                container: this.props.popuoverContainer,
                isAutoScroll: this.props.isAutoScroll,
                className: this.props.popuoverClassName,
                onPopuoverMouseDown: this.props.onPopuoverMouseDown

            });
        }
        this.linkPanel.value = this.value;
        this.popuover.show(this.element);
        this.linkPanel.focus();
    }
    hide() {
        if (this.popuover) {
            this.popuover.hide();
        }
        if (this.linkPanel) {
            if (this.linkPanel.tooltip) {
                this.linkPanel.tooltip.hide();
            }
        }
    }
    destory() {
        this.element.removeEventListener('click', this.onClick);
        if (this.linkPanel) {
            this.linkPanel.destory();
        }
    }
}