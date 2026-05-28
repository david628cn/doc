import { BaseCropperView } from '../crop/baseCropperView'; // 引入刚才重构的原生 CropperView
import { BaseCircleProgress } from '../circleProgress/baseCircleProgress'; // 引入刚才重构的原生 CircleProgress
import { CLASSNAME } from '../config';
import './index.less';

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

export type BaseImageUploadProps = {
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    percent?: number;
    aspectRatio?: number;
    cropBoxMovable?: boolean;
    cropBoxResizable?: boolean;
    rotatable?: boolean;
    showRotateControls?: boolean;
    onChange?: (v: any) => void;
    onCancel?: () => void;
    onUpload?: (file: File) => Promise<any>;
};

export class BaseImageUpload {
    private props: BaseImageUploadProps;
    public element: HTMLDivElement;

    // 原生 DOM 元素引用
    private bodyEl!: HTMLDivElement;
    private inputEl!: HTMLInputElement;
    private dropBtnContainer!: HTMLDivElement;
    private cropStageEl!: HTMLDivElement;
    private hintEl!: HTMLDivElement;
    private errorEl!: HTMLDivElement;
    private progressEl!: HTMLDivElement;
    private rotateContainer!: HTMLDivElement;
    private cancelBtn!: HTMLButtonElement;
    private confirmBtn!: HTMLButtonElement;
    private leftRotateBtn!: HTMLButtonElement;
    private rightRotateBtn!: HTMLButtonElement;

    // 原生子组件实例引用
    private cropInstance: BaseCropperView | null = null;
    private progressComponent!: BaseCircleProgress;

    // 内部状态与数据记录
    private fileRecord: File | null = null;
    private currentImageUrl: string = '';
    private isLoading: boolean = false;

    constructor(props: BaseImageUploadProps = {}) {
        this.props = {
            cropBoxMovable: true,
            cropBoxResizable: true,
            rotatable: true,
            showRotateControls: true,
            percent: 0,
            ...props
        };
        this.element = document.createElement('div');
        this.initView();
        this.initEvents();
        this.renderState();
    }

    private initView(): void {
        const { className, style } = this.props;

        // 1. 主容器样式
        this.element.className = `${CLASSNAME}-image-upload ${className ?? ''}`.trim();
        if (style) {
            Object.assign(this.element.style, style);
        }

        // 2. 主体 Body 区域
        this.bodyEl = document.createElement('div');
        this.bodyEl.className = `${CLASSNAME}-image-upload-body`;
        this.bodyEl.tabIndex = 1;

        // 隐藏的 File Input 标签
        this.inputEl = document.createElement('input');
        this.inputEl.className = `${CLASSNAME}-image-upload-input`;
        this.inputEl.type = 'file';
        this.inputEl.accept = 'image/*';
        this.bodyEl.appendChild(this.inputEl);

        // 上传图片（区域型原生按钮）
        this.dropBtnContainer = document.createElement('div');
        this.dropBtnContainer.style.width = '100%';
        const uploadBtn = document.createElement('button');
        uploadBtn.className = `${CLASSNAME}-image-upload-drop ${CLASSNAME}-button`;
        uploadBtn.type = 'button';
        uploadBtn.innerHTML = `
      <div class="${CLASSNAME}-image-upload-drop-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M12 3v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7.5 7.5 12 3l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="${CLASSNAME}-image-upload-drop-text">上传图片</div>
    `;
        uploadBtn.addEventListener('click', () => this.inputEl.click());
        this.dropBtnContainer.appendChild(uploadBtn);
        this.bodyEl.appendChild(this.dropBtnContainer);

        // 裁剪舞台区容器
        this.cropStageEl = document.createElement('div');
        this.cropStageEl.className = `${CLASSNAME}-image-crop-stage`;
        this.bodyEl.appendChild(this.cropStageEl);

        // 提示文本
        this.hintEl = document.createElement('div');
        this.hintEl.className = `${CLASSNAME}-image-upload-hint`;
        this.hintEl.textContent = '或⌘+V粘贴图片或链接';
        this.bodyEl.appendChild(this.hintEl);

        // 错误信息显示区
        this.errorEl = document.createElement('div');
        this.errorEl.className = `${CLASSNAME}-image-upload-error`;
        this.errorEl.style.display = 'none';
        this.bodyEl.appendChild(this.errorEl);

        // 进度条包裹区与实例化原生进度条
        this.progressEl = document.createElement('div');
        this.progressEl.className = `${CLASSNAME}-image-upload-progress`;
        this.progressComponent = new BaseCircleProgress({ percent: this.props.percent });
        this.progressEl.appendChild(this.progressComponent.element);
        this.bodyEl.appendChild(this.progressEl);

        this.element.appendChild(this.bodyEl);

        // 3. 底部 Footer 区域
        const footerEl = document.createElement('div');
        footerEl.className = `${CLASSNAME}-image-upload-footer`;

        const footerLeftEl = document.createElement('div');
        footerLeftEl.className = `${CLASSNAME}-image-upload-footer-left`;

        // 取消原生按钮
        this.cancelBtn = document.createElement('button');
        this.cancelBtn.className = `${CLASSNAME}-button`;
        this.cancelBtn.type = 'button';
        this.cancelBtn.textContent = '取消';
        this.cancelBtn.addEventListener('click', () => this.handleReset());
        footerLeftEl.appendChild(this.cancelBtn);

        // 旋转控制组按钮
        this.rotateContainer = document.createElement('div');
        this.rotateContainer.className = `${CLASSNAME}-image-upload-rotate`;

        this.leftRotateBtn = document.createElement('button');
        this.leftRotateBtn.className = `${CLASSNAME}-button`;
        this.leftRotateBtn.type = 'button';
        this.leftRotateBtn.title = '左旋转';
        this.leftRotateBtn.textContent = '↺';
        this.leftRotateBtn.addEventListener('click', () => this.cropInstance?.rotate(-90));

        this.rightRotateBtn = document.createElement('button');
        this.rightRotateBtn.className = `${CLASSNAME}-button`;
        this.rightRotateBtn.type = 'button';
        this.rightRotateBtn.title = '右旋转';
        this.rightRotateBtn.textContent = '↻';
        this.rightRotateBtn.addEventListener('click', () => this.cropInstance?.rotate(90));

        this.rotateContainer.appendChild(this.leftRotateBtn);
        this.rotateContainer.appendChild(this.rightRotateBtn);
        footerLeftEl.appendChild(this.rotateContainer);

        // 确认上传原生按钮
        this.confirmBtn = document.createElement('button');
        this.confirmBtn.className = `${CLASSNAME}-button ${CLASSNAME}-button-blue`;
        this.confirmBtn.type = 'button';
        this.confirmBtn.textContent = '上传';
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());

        footerEl.appendChild(footerLeftEl);
        footerEl.appendChild(this.confirmBtn);
        this.element.appendChild(footerEl);
    }

    private initEvents(): void {
        // 监听本地文件选择
        this.inputEl.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;
            this.loadFile(file);
        });

        // 监听拖拽/快捷键粘贴事件
        this.bodyEl.addEventListener('paste', (e: ClipboardEvent) => {
            if (this.isLoading) return;
            this.setError('');

            const items = Array.from(e.clipboardData?.items ?? []);

            // 处理直接粘贴的图片文件文件
            const imgFileItem = items.find(it => it.kind === 'file' && it.type.startsWith('image/'));
            if (imgFileItem) {
                const file = imgFileItem.getAsFile();
                if (file) {
                    e.preventDefault();
                    this.loadFile(file);
                    return;
                }
            }

            // 处理粘贴的网络图片链接 URL
            const textItem = items.find(it => it.kind === 'string' && it.type === 'text/plain');
            if (textItem) {
                const pastedText = e.clipboardData?.getData('text') ?? '';
                const isUrl = /^https?:\/\//i.test(pastedText);
                if (isUrl) {
                    e.preventDefault();
                    fetch(pastedText)
                        .then(res => res.blob())
                        .then(blob => {
                            if (blob.type.startsWith('image/')) {
                                const file = new File([blob], "downloaded-image", { type: blob.type });
                                this.loadFile(file);
                            }
                        })
                        .catch(() => {
                            this.setError('图片下载失败，可能是跨域(CORS)问题');
                        });
                } else {
                    this.setError('粘贴的链接不包含图像');
                }
            }
        });
    }

    private loadFile(file: File): void {
        this.setError('');
        this.fileRecord = file;
        const reader = new FileReader();
        reader.onload = () => {
            this.currentImageUrl = String(reader.result ?? '');
            this.renderState();
        };
        reader.onerror = () => {
            this.currentImageUrl = '';
            this.setError('选择图片文件失败');
            this.renderState();
        };
        reader.readAsDataURL(file);
    }

    private handleReset(): void {
        this.setError('');
        this.currentImageUrl = '';
        this.fileRecord = null;
        this.inputEl.value = '';
        this.props.onCancel?.();
        this.renderState();
    }

    private async handleConfirm(): Promise<void> {
        if (!this.cropInstance) return;
        this.setLoading(true);

        // 从原生 CropperView 实例中提取 base64
        const dataUrl = this.cropInstance.getDataUrl({ type: 'image/png' });
        const blob = await dataUrlToBlob(dataUrl);
        const raw = this.fileRecord;
        const name = raw?.name ? raw.name.replace(/\.\w+$/, '') : 'upload';
        const file = new File([blob], `${name}.png`, { type: blob.type || 'image/png' });

        try {
            const res = await this.props.onUpload?.(file);
            // 如果没有返回或者显式处理，关闭 loading 状态
            if (!res) {
                this.setLoading(false);
            }
        } catch {
            this.setLoading(false);
        }
    }

    /**
     * 核心：模拟 React 更新机制，集中处理内部 DOM 状态变动
     */
    private renderState(): void {
        const hasImg = !!this.currentImageUrl;

        // 1. 开关上传落点与提示文字
        this.dropBtnContainer.style.display = hasImg ? 'none' : 'block';
        this.hintEl.style.display = hasImg ? 'none' : 'block';

        // 2. 挂载 / 销毁原生实例 CropperView
        if (hasImg) {
            this.cropStageEl.style.display = 'block';
            if (!this.cropInstance) {
                this.cropInstance = new BaseCropperView({
                    image: this.currentImageUrl,
                    aspectRatio: this.props.aspectRatio,
                    cropBoxMovable: this.props.cropBoxMovable,
                    cropBoxResizable: this.props.cropBoxResizable,
                    rotatable: this.props.rotatable,
                    onReady: () => { }
                });
                this.cropStageEl.appendChild(this.cropInstance.element);
            }
        } else {
            this.cropStageEl.style.display = 'none';
            if (this.cropInstance) {
                this.cropInstance.destroy();
                this.cropInstance = null;
            }
        }
        // 3. 底部左侧旋转控制器显示逻辑
        const showRotate = !!(this.props.showRotateControls && this.props.rotatable && hasImg);
        this.rotateContainer.style.display = showRotate ? 'flex' : 'none';
        // 4. 处理 Loading、Disabled 状态切换
        this.progressEl.style.display = this.isLoading ? 'block' : 'none';
        this.cancelBtn.disabled = this.isLoading;
        this.leftRotateBtn.disabled = this.isLoading;
        this.rightRotateBtn.disabled = this.isLoading;
        this.confirmBtn.disabled = this.isLoading;
        if (this.isLoading) {
            this.confirmBtn.classList.add(`${ CLASSNAME }-button-loading`);
        } else {
            this.confirmBtn.classList.remove(`${ CLASSNAME }-button-loading`);
        }
    }
    private setError(msg: string): void {
        this.errorEl.textContent = msg;
        this.errorEl.style.display = msg ? 'block' : 'none';
    }
    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        this.renderState();
    }
    /**
    对外暴露方法：供外部上传进度回调函数动态更新进度条
    */
    public setPercent(percent: number): void {
        this.props.percent = percent;
        this.progressComponent.setPercent(percent);
    }
}