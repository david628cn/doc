import { CLASSNAME } from '../../../config';
import { getRgba, rgbaToString, ColorItem } from '../colors';
import './index.less';

export interface ColorListProps {
    label: string;
    colors: ColorItem[];
    value?: string;
}

export class ColorList {
    public container: HTMLDivElement;
    private props: ColorListProps;

    constructor(props: ColorListProps) {
        this.props = props;
        this.container = document.createElement('div');
        this.container.className = `${CLASSNAME}-color-list`;
        this.render();
    }

    public updateProps(nextValue: string, nextColors?: ColorItem[]) {
        this.props.value = nextValue;
        if (nextColors) {
            this.props.colors = nextColors;
        }
        this.render();
    }

    private render() {
        this.container.innerHTML = '';

        const labelDiv = document.createElement('div');
        labelDiv.className = `${CLASSNAME}-color-list-label`;
        labelDiv.textContent = this.props.label;
        this.container.appendChild(labelDiv);

        const groupDiv = document.createElement('div');
        groupDiv.className = `${CLASSNAME}-color-list-group`;

        const arr = this.props.colors || [];
        arr.forEach((item) => {
            const colorObj = getRgba(item.value);
            const colorStr = rgbaToString(colorObj);

            const itemDiv = document.createElement('div');
            itemDiv.className = `${CLASSNAME}-color-list-item`;
            itemDiv.style.setProperty('--highlight-color', colorStr);
            
            // ✨【关键设计】：通过 DOM 的 dataset 属性将该色块的核心凭证数据和宿主分类写在 HTML 标签上
            // 方便外层的事件委托中心在 Click 和 Hover 时一锤定音地抓取并反查
            itemDiv.setAttribute('data-color-value', item.value);
            itemDiv.setAttribute('data-color-type', item.type || '');
            if (item.label) {
                itemDiv.setAttribute('data-color-label', item.label);
            }

            if (item.type === 'backgroundColor') {
                itemDiv.classList.add(`${CLASSNAME}-color-list-highlight-item`);
            }
            if (colorObj.a === 0) {
                itemDiv.classList.add(`${CLASSNAME}-color-list-transparent`);
            }

            const currentSelectedValue = this.props.value || '';
            const valueColor = rgbaToString(getRgba(currentSelectedValue));
            if (valueColor === colorStr) {
                itemDiv.classList.add(`${CLASSNAME}-color-list-selected`);
            }

            const textSpan = document.createElement('span');
            textSpan.className = `${CLASSNAME}-color-list-text`;

            if (item.type === 'color') {
                textSpan.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org" style="color: ${colorStr}; flex-grow: 1;">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12.8944 5.55279C12.725 5.214 12.3787 5 12 5C11.6212 5 11.2749 5.214 11.1055 5.55279L5.10555 17.5528C4.85856 18.0468 5.05878 18.6474 5.55276 18.8944C6.04674 19.1414 6.64741 18.9412 6.8944 18.4472L8.64957 14.9369C8.75862 14.9777 8.87671 15 9 15H15C15.1233 15 15.2413 14.9777 15.3504 14.9369L17.1055 18.4472C17.3525 18.9412 17.9532 19.1414 18.4472 18.8944C18.9412 18.6474 19.1414 18.0468 18.8944 17.5528L12.8944 5.55279ZM14.3819 13L12 8.23607L9.61801 13H14.3819Z" fill="currentColor"></path>
                    </svg>
                `;
            } else if (colorObj.a === 0) {
                textSpan.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://w3.org" style="color: red; flex-grow: 1; transform: scaleX(-1);">
                        <path d="M51.61290313 32.16298813l940.06112062 940.06112062-19.55857406 19.55857406L32 51.72156219z" fill="currentColor"></path>
                    </svg>
                `;
            }

            itemDiv.appendChild(textSpan);
            
            // ✨ 拦截指针行为防止失焦（这个是纯行为拦截，也可以使用全局监听，但在这里留作 DOM 自带表现更安全）
            // itemDiv.addEventListener('pointerdown', (e) => e.preventDefault());

            groupDiv.appendChild(itemDiv);
        });

        this.container.appendChild(groupDiv);
    }
}
