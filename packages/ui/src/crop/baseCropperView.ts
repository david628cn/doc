import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { CLASSNAME } from '../config';
import './index.less';

export type BaseCropperViewHandle = {
    rotate: (deg: number) => void;
    zoom: (delta: number) => void;
    reset: () => void;
    replace: (image: string) => void;
    getDataUrl: (opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }) => string;
    getBlob: (opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }) => Promise<Blob>;
    destroy: () => void;
};

export type BaseCropperViewProps = {
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    image: string;
    aspectRatio?: number;
    circular?: boolean;
    dragMode?: Cropper.DragMode;
    cropBoxMovable?: boolean;
    cropBoxResizable?: boolean;
    rotatable?: boolean;
    options?: Omit<Cropper.Options, 'aspectRatio' | 'ready'>;
    onReady?: (cropper: Cropper) => void;
};

export class BaseCropperView implements BaseCropperViewHandle {
    private props: BaseCropperViewProps;
    public element: HTMLDivElement;

    private cropperInstance: Cropper | null = null;
    private isReady: boolean = false;

    constructor(props: BaseCropperViewProps) {
        this.props = props;
        this.element = document.createElement('div');
        this.initView();
        this.initCropper();
    }

    private initView(): void {
        const { className, style, circular, image } = this.props;

        // 拼装样式类名
        const classList = [
            `${CLASSNAME}-crop-container`,
            circular ? `${CLASSNAME}-crop-circular` : null,
            className ?? null,
        ].filter(Boolean) as string[];

        this.element.className = classList.join(' ');

        // 绑定内联样式
        if (style) {
            Object.assign(this.element.style, style);
        }
        this.element.style.opacity = image ? '1' : '0.6';
        this.element.setAttribute('data-ready', '0');
    }

    private initCropper(): void {
        const {
            image,
            dragMode,
            cropBoxMovable,
            cropBoxResizable,
            rotatable,
            circular,
            aspectRatio,
            options,
            onReady,
        } = this.props;

        this.element.innerHTML = '';
        this.isReady = false;

        // 创建图片节点
        const img = document.createElement('img');
        img.src = image;
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.crossOrigin = 'anonymous';
        this.element.appendChild(img);

        // 初始化 CropperJS
        this.cropperInstance = new Cropper(img, {
            dragMode: dragMode ?? 'move',
            cropBoxMovable: cropBoxMovable ?? false,
            cropBoxResizable: cropBoxResizable ?? false,
            rotatable: rotatable ?? true,
            toggleDragModeOnDblclick: false,
            aspectRatio: circular ? 1 : (aspectRatio ?? NaN),
            autoCropArea: 0.8,
            viewMode: 0,
            guides: false,
            center: false,
            highlight: false,
            background: false,
            zoomOnWheel: true,
            responsive: true,
            restore: false,
            ...(options ?? {}),
            ready: () => {
                if (circular && this.cropperInstance) {
                    const c = this.cropperInstance;
                    const cd = c.getContainerData();
                    const size = Math.max(80, Math.floor(Math.min(cd.width, cd.height) * 0.6));
                    c.setCropBoxData({
                        left: (cd.width - size) / 2,
                        top: (cd.height - size) / 2,
                        width: size,
                        height: size,
                    });
                }
                this.isReady = true;
                this.element.setAttribute('data-ready', '1');
                onReady?.(this.cropperInstance!);
            },
        });
    }

    // 以下为对外暴露的实例方法，对齐原 CropperViewHandle 接口

    public rotate(deg: number): void {
        this.cropperInstance?.rotate(deg);
    }

    public zoom(delta: number): void {
        this.cropperInstance?.zoom(delta);
    }

    public reset(): void {
        this.cropperInstance?.reset();
    }

    public replace(next: string): void {
        this.cropperInstance?.replace(next, true);
    }

    public getDataUrl(opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }): string {
        const c = this.cropperInstance;
        if (!c) return '';
        const type = opts?.type ?? 'image/png';
        const quality = opts?.quality ?? 0.92;
        const canvas = c.getCroppedCanvas({ width: opts?.width, height: opts?.height });
        return canvas.toDataURL(type, type === 'image/jpeg' ? quality : undefined);
    }

    public async getBlob(opts?: {
        width?: number;
        height?: number;
        type?: 'image/png' | 'image/jpeg';
        quality?: number;
    }): Promise<Blob> {
        const c = this.cropperInstance;
        if (!c) throw new Error('Cropper not ready');
        const type = opts?.type ?? 'image/png';
        const quality = opts?.quality ?? 0.92;
        const canvas = c.getCroppedCanvas({ width: opts?.width, height: opts?.height });
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                b => {
                    if (!b) return reject(new Error('toBlob failed'));
                    resolve(b);
                },
                type,
                type === 'image/jpeg' ? quality : undefined
            );
        });
    }

    public destroy(): void {
        this.cropperInstance?.destroy();
        this.cropperInstance = null;
        this.element.innerHTML = '';
        this.element.setAttribute('data-ready', '0');
    }
}
