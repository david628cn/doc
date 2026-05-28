import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

// 定义返回的 CSS 数据接口
// export interface TransformCSSData {
//     transformOrigin: string; // 例如: "37.49% 69.245%"
//     transform: string;       // 例如: "translate(0%, -38.49%)"
// }

export interface CropOptions {
    img: HTMLImageElement | HTMLDivElement;
    src?: string;
    // 🔴 扩展回调函数，带上第三个参数 transformCSS
    onOk: (blob: Blob | null, dataUrl: string, transformCSS: any) => void;
    cropperOptions?: Cropper.Options;
}

export class ImageCropper {
    private container: HTMLDivElement;
    private img: HTMLElement;
    private onOk: (blob: Blob | null, dataUrl: string, transformCSS: any) => void;
    private cropperInstance: Cropper | null = null;

    constructor(container: HTMLDivElement, options: CropOptions) {
        this.container = container;
        this.img = options.img;
        this.onOk = options.onOk;
        this.init(options);
    }

    public static crop(container: HTMLDivElement, options: CropOptions): ImageCropper {
        return new ImageCropper(container, options);
    }

    private init(options: CropOptions): void {
        let targetImg: HTMLImageElement | null = null;
        if (this.img instanceof HTMLImageElement) {
            targetImg = this.img;
        } else {
            targetImg = this.img.querySelector('img');
        }

        if (!targetImg) {
            console.error('ImageCropper Error: 未找到可用的 <img> 元素。');
            return;
        }

        const imgSrc = options.src || targetImg.getAttribute('src') || targetImg.src;
        if (!imgSrc || imgSrc === 'undefined' || imgSrc.includes('undefined')) {
            console.error('ImageCropper Error: 无法获取有效的图片地址。');
            return;
        }

        this.container.innerHTML = '';
        const rect = targetImg.getBoundingClientRect();
        const width = rect.width || targetImg.offsetWidth || 900;
        const height = rect.height || targetImg.offsetHeight || 400;

        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;

        const cloneImg = document.createElement('img');
        cloneImg.src = imgSrc;
        cloneImg.crossOrigin = targetImg.crossOrigin || 'anonymous';
        cloneImg.style.display = 'block';
        cloneImg.style.width = '100%';
        cloneImg.style.height = '100%';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
      position: absolute;
      bottom: -45px;
      right: 0;
      z-index: 9999;
    `;

        const btn = document.createElement('button');
        btn.innerText = '确定裁剪';
        btn.style.cssText = `
      padding: 6px 14px;
      background: #1677ff;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

        btn.addEventListener('click', () => this.handleCrop());
        btnContainer.appendChild(btn);

        this.container.appendChild(cloneImg);
        this.container.appendChild(btnContainer);

        const defaultOptions: Cropper.Options = {
            viewMode: 1,
            dragMode: 'crop',
            background: false,
            responsive: true,
            checkOrientation: false,
            aspectRatio: NaN, // 保持自由拉伸，你可以在这拉出任意尺寸来计算百分比
            autoCropArea: 1,
            ready: () => {
                if (!this.cropperInstance) return;
                const canvasData = this.cropperInstance.getCanvasData();
                this.cropperInstance.setCropBoxData({
                    left: canvasData.left,
                    top: canvasData.top,
                    width: canvasData.width,
                    height: canvasData.height
                });
            }
        };

        this.cropperInstance = new Cropper(cloneImg, {
            ...defaultOptions,
            ...options.cropperOptions
        });
    }

    private handleCrop(): void {
        if (!this.cropperInstance) return;

        // 1. 获取基于原图真实分辨率的绝对像素数据 (x, y, width, height)
        const cropData = this.cropperInstance.getData(true);
        // 获取原图的真实宽高数据
        const imageData = this.cropperInstance.getImageData();

        const naturalW = imageData.naturalWidth;
        const naturalH = imageData.naturalHeight;

        // 2. 🔴 精准算法修正：
        // 当外层使用 width: 900px 且比例一致时，直接使用左上角相对于原图的负百分比位移
        // 并且必须将变换轴心固定在左上角 (0% 0%)，防止产生轴心二次偏移
        const translateX = -((cropData.x / naturalW) * 100).toFixed(3);
        const translateY = -((cropData.y / naturalH) * 100).toFixed(3);
        const scale = (naturalW / cropData.width).toFixed(3);

        const transformCSSData = {
            containerStyle: {
                aspectRatio: `${cropData.width} / ${cropData.height}`
            },
            // 2. 图片只需要应用这个 transform 变形，width 永远保持 100%
            imageStyle: {
                transformOrigin: '0% 0%',
                transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`
            }
        };

        // 3. 生成常规的 Canvas 裁剪图片
        const canvas = this.cropperInstance.getCroppedCanvas({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/jpeg');

        canvas.toBlob((blob) => {
            this.onOk(blob, dataUrl, transformCSSData);
            this.destroy();
        }, 'image/jpeg');
    }

    private destroy(): void {
        if (this.cropperInstance) {
            this.cropperInstance.destroy();
            this.cropperInstance = null;
        }
        this.container.innerHTML = '';
    }
}

export default ImageCropper;
