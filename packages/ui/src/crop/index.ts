import Cropper from 'cropperjs';
export * from './cropperView';
import { CLASSNAME } from '../config';
import 'cropperjs/dist/cropper.css';
import './index.less';

export * from './imageCropper';

export type CropProps = {
    container: any;
    image: string; // 图片地址
    aspectRatio?: number; // 裁剪比例，如 16/9
    minScale?: number;
    maxScale?: number;
    zoomStep?: number;
};

export class Crop {
    container: HTMLElement;
    imgElement!: HTMLImageElement; // 明确类型
    cropper!: Cropper;             // 使用 Cropper 自带类型

    // 配置备份
    private zoomStep: number = 0.1;

    constructor(props: CropProps) {
        this.container = typeof props.container === 'string' ? document.getElementById(props.container)! : props.container;
        this.container.classList.add(`${CLASSNAME}-crop-container`);
        this.zoomStep = props.zoomStep || 0.1;
        this.init(props);
    }

    private init(props: CropProps) {
        // 1. 创建图片 DOM
        this.imgElement = document.createElement('img');
        this.imgElement.src = props.image;
        this.imgElement.style.maxWidth = '100%';
        this.imgElement.style.display = 'block';
        this.imgElement.crossOrigin = 'anonymous';
        this.container.appendChild(this.imgElement);

        // 2. 初始化 Cropper
        this.cropper = new Cropper(this.imgElement, {
            // --- 核心配置：满足你之前的“只让图片动”需求 ---
            dragMode: 'move',           // 拖拽模式：移动图片
            cropBoxMovable: false,      // 禁止手动移动裁剪框
            cropBoxResizable: false,    // 禁止手动改变裁剪框大小
            toggleDragModeOnDblclick: false, // 禁止双击切换模式

            // --- 基础配置 ---
            aspectRatio: props.aspectRatio || NaN, // 比例，默认自由
            autoCropArea: 0.9,          // 默认裁剪框占据 80% 区域
            viewMode: 0,                // 0: 无限制, 1: 限制在图片内
            guides: false,               // 显示裁剪框辅助线
            center: false,               // 显示中心指示器
            highlight: false,            // 显示高亮区域
            background: false,    // 關閉棋盤背景（我們用黑色底）

            // 限制缩放范围
            zoomOnWheel: true,          // 开启鼠标滚动缩放
            minContainerWidth: 200,
            minContainerHeight: 200,

            responsive: true,
            restore: false, // 窗口缩放后不自动恢复之前的旧状态，而是重新触发 ready


            ready: () => {
                // console.log('Cropper is ready');
                // this.setRectCenter(100, 100);
            }
        });
    }

    /**
     * 設置裁剪框大小並自動居中
     * @param width 目標寬度 (像素)
     * @param height 目標高度 (像素)
     */
    // public setRectCenter(width: number, height: number) {
    //     // 1. 獲取容器當前的數據（即畫布所在的黑底區域）
    //     const containerData = this.cropper.getContainerData();

    //     // 2. 計算居中位置： (容器寬高 - 裁剪框寬高) / 2
    //     const left = (containerData.width - width) / 2;
    //     const top = (containerData.height - height) / 2;

    //     // 3. 應用位置和大小
    //     this.cropper.setCropBoxData({
    //         left: left,
    //         top: top,
    //         width: width,
    //         height: height
    //     });
    // }

    // --- 通用 API 方法 ---

    /**
     * 旋转图片
     * @param deg 旋转角度 (如 90, -90)
     */
    public rotate(deg: number) {
        this.cropper.rotate(deg);
    }

    /**
     * 缩放图片
     * @param delta 缩放比例 (如 0.1 放大, -0.1 缩小)
     */
    public zoom(delta: number) {
        const imageData: any = this.cropper.getImageData();
        const newRatio = imageData.ratio + delta;

        // 如果 props 传了范围限制
        // if (newRatio < this.minScale) return;
        // if (newRatio > this.maxScale) return;

        this.cropper.zoom(delta);
    }

    /**
     * 移动图片
     * @param x 水平像素
     * @param y 垂直像素
     */
    public move(x: number, y: number) {
        this.cropper.move(x, y);
    }

    /**
     * 手动设置裁剪框的位置和大小 (setRect)
     */
    public setRect(rect: { left?: number, top?: number, width?: number, height?: number }) {
        this.cropper.setCropBoxData(rect);
    }

    /**
     * 重置所有状态
     */
    public reset() {
        this.cropper.reset();
    }

    /**
     * 核心：获取裁剪区域的图片像素数据 (getSnapshot)
     * @param options 可选导出配置（如指定宽高）
     */
    public getSnapshot(options: { width?: number, height?: number } = {}) {
        const canvas = this.cropper.getCroppedCanvas(options);
        return canvas.toDataURL('image/png');
    }

    // public getSnapshot(options: { width?: number, height?: number } = {}) {
    //     const canvas = this.cropper.getCroppedCanvas({
    //         ...options,
    //         imageSmoothingEnabled: true,
    //         imageSmoothingQuality: 'high', // 开启高质量平滑渲染
    //     });
    //     // 导出为 JPEG 并设置 0.9 的质量比（PNG 不支持质量参数）
    //     return canvas.toDataURL('image/jpeg', 0.9);
    // }

    /**
     * 销毁实例，清理内存和 DOM
     */
    public destroy() {
        this.cropper.destroy();
        this.container.innerHTML = '';
    }
}
