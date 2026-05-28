import './index.less';
export interface PreviewSlide {
    id?: string | number;
    src: string;
    title?: string;
}

export interface PreviewerOptions {
    images?: PreviewSlide[];
}

export class ImagePreviewer {
    private images: PreviewSlide[] = [];
    private index: number = 0;
    private scale: number = 1;
    private position = { x: 0, y: 0 };
    private isTransitioning: boolean = false;

    // 基础拖拽状态
    private isDragging: boolean = false;
    private dragStart = { x: 0, y: 0 };
    private initialPosition = { x: 0, y: 0 };

    // ✨ 新增：移动端双指捏合手势状态机
    private isPinching: boolean = false;
    private startTouchDistance: number = 0;
    private startScale: number = 1;

    private overlay: HTMLDivElement | null = null;
    private imgWrapper: HTMLDivElement | null = null;
    private imgElement: HTMLImageElement | null = null;
    private counterElement: HTMLDivElement | null = null;
    private titleElement: HTMLDivElement | null = null;

    constructor(options?: PreviewerOptions) {
        this.images = options?.images || [];
        this.initDOM();
    }

    private initDOM(): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'custom-lightbox-overlay';
        this.overlay.style.display = 'none';
        this.overlay.addEventListener('click', () => this.hide());

        const closeBtn = document.createElement('button');
        closeBtn.className = 'custom-lightbox-close-btn';
        closeBtn.innerText = '✕';
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });
        this.overlay.appendChild(closeBtn);

        const leftArrow = document.createElement('button');
        leftArrow.className = 'custom-lightbox-side-arrow left';
        leftArrow.innerText = '‹';
        leftArrow.addEventListener('click', (e) => this.handlePrev(e));

        const rightArrow = document.createElement('button');
        rightArrow.className = 'custom-lightbox-side-arrow right';
        rightArrow.innerText = '›';
        rightArrow.addEventListener('click', (e) => this.handleNext(e));
        this.overlay.appendChild(leftArrow);
        this.overlay.appendChild(rightArrow);

        this.imgWrapper = document.createElement('div');
        this.imgWrapper.className = 'custom-lightbox-img-wrapper';
        this.imgWrapper.addEventListener('click', (e) => e.stopPropagation());

        // 1. PC 端鼠标交互
        this.imgWrapper.addEventListener('mousedown', (e: MouseEvent) => {
            this.onDragStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e: MouseEvent) => {
            this.onDragMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', () => this.onDragEnd());
        this.imgWrapper.addEventListener('mouseleave', () => this.onDragEnd());

        // 2. ✨ 升级：移动端多指高级交互逻辑 (支持单指滑动 + 双指无级缩放)
        this.imgWrapper.addEventListener('touchstart', (e: TouchEvent) => {
            if (!e.touches || e.touches.length === 0) return;
            if (e.cancelable) e.preventDefault();
            this.isTransitioning = false; // 手指按下时，立刻关闭过渡动画保证极速响应

            if (e.touches.length === 1) {
                // 单指行为：开始拖拽平移或划屏切图
                this.isPinching = false;
                const touch = e.touches[0];
                this.onDragStart(touch.clientX, touch.clientY);
            } else if (e.touches.length >= 2) {
                // 双指行为：触发高阶捏合双指状态
                this.isDragging = false;
                this.isPinching = true;
                this.startTouchDistance = this.getTouchDistance(e.touches);
                this.startScale = this.scale;
            }
        }, { passive: false });

        this.imgWrapper.addEventListener('touchmove', (e: TouchEvent) => {
            if (!e.touches || e.touches.length === 0) return;
            if (e.cancelable) e.preventDefault();

            if (e.touches.length === 1 && this.isDragging) {
                // 单指持续滑动中
                const touch = e.touches[0];
                this.onDragMove(touch.clientX, touch.clientY);
            } else if (e.touches.length >= 2 && this.isPinching) {
                // ✨ 双指无级缩放算法核心：动态计算两指之间的实时距离变化比率
                const currentDistance = this.getTouchDistance(e.touches);
                if (this.startTouchDistance > 0) {
                    const pinchScale = currentDistance / this.startTouchDistance;
                    // 限制缩放区间在 0.8 到 4.5 倍之间，保证物理安全感
                    this.scale = Math.min(Math.max(this.startScale * pinchScale, 0.8), 4.5);
                    this.updateImageStyle();
                }
            }
        }, { passive: false });

        this.imgWrapper.addEventListener('touchend', (e: TouchEvent) => {
            // 弹性缓冲：当双指松开到只剩一根手指或者完全放开时
            if (this.isPinching && e.touches.length < 2) {
                this.isPinching = false;
                this.isTransitioning = true;

                // 防破片保护：如果双指缩得太小（低于1倍原图），松手时平滑弹回原点原比例
                if (this.scale < 1) {
                    this.scale = 1;
                    this.position = { x: 0, y: 0 };
                }
                this.updateImageStyle();
            } else {
                this.onDragEnd();
            }
        });

        this.imgElement = document.createElement('img');
        this.imgElement.className = 'custom-lightbox-img';
        this.imgWrapper.appendChild(this.imgElement);
        this.overlay.appendChild(this.imgWrapper);

        this.titleElement = document.createElement('div');
        this.titleElement.className = 'custom-lightbox-title';
        this.overlay.appendChild(this.titleElement);

        const bottomBar = document.createElement('div');
        bottomBar.className = 'custom-lightbox-bottom-bar';
        bottomBar.addEventListener('click', (e) => e.stopPropagation());

        this.counterElement = document.createElement('div');
        this.counterElement.className = 'custom-lightbox-counter';
        bottomBar.appendChild(this.counterElement);

        bottomBar.appendChild(this.createIconBtn('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', (e) => this.handleDownload(e), '下载'));
        bottomBar.appendChild(this.createIconBtn('M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3', (e) => this.handleToggleFullscreen(e), '全屏'));
        bottomBar.appendChild(this.createIconBtn('M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M21 21l-4.35-4.35M8 11h6', (e) => this.handleZoomOut(e), '缩小'));
        bottomBar.appendChild(this.createIconBtn('M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M21 21l-4.35-4.35M11 8v6M8 11h6', (e) => this.handleZoomIn(e), '放大'));

        this.overlay.appendChild(bottomBar);
        document.body.appendChild(this.overlay);
    }

    // ✨ 辅助代数工具：使用勾股定理计算双指之间的绝对几何像素轴距距离
    private getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public setImages(newImages: PreviewSlide[]): void {
        this.images = newImages || [];
    }

    public show(targetIndex: number, latestImages?: PreviewSlide[]): void {
        if (!this.overlay) return;
        if (latestImages) this.setImages(latestImages);
        if (this.images.length === 0) return;

        this.index = targetIndex >= this.images.length ? 0 : targetIndex;
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        this.isTransitioning = false;

        this.renderActiveSlide();
        this.overlay.style.display = 'flex';
    }

    public hide(): void {
        if (this.overlay) this.overlay.style.display = 'none';
    }

    private renderActiveSlide(): void {
        const current = this.images[this.index];
        if (this.imgElement) this.imgElement.src = current ? current.src : '';
        if (this.counterElement) this.counterElement.innerText = `${this.index + 1} / ${this.images.length}`;
        if (this.titleElement) this.titleElement.innerText = current?.title || '';
        this.updateImageStyle();
    }

    private updateImageStyle(): void {
        if (!this.imgWrapper) return;
        this.imgWrapper.style.transform = `translate(${this.position.x}px, ${this.position.y}px) scale(${this.scale})`;
        this.imgWrapper.style.transition = this.isTransitioning ? 'transform 0.35s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none';
    }

    private handlePrev(e?: MouseEvent): void {
        e?.stopPropagation();
        this.isTransitioning = true;
        this.index = this.index > 0 ? this.index - 1 : this.images.length - 1;
        this.scale = 1; this.position = { x: 0, y: 0 };
        this.renderActiveSlide();
    }

    private handleNext(e?: MouseEvent): void {
        e?.stopPropagation();
        this.isTransitioning = true;
        this.index = this.index < this.images.length - 1 ? this.index + 1 : 0;
        this.scale = 1; this.position = { x: 0, y: 0 };
        this.renderActiveSlide();
    }

    private onDragStart(clientX: number, clientY: number): void {
        this.isDragging = true;
        this.isTransitioning = false;
        this.dragStart = { x: clientX, y: clientY };
        this.initialPosition = { ...this.position };
    }

    private onDragMove(clientX: number, clientY: number): void {
        if (!this.isDragging) return;

        const deltaX = clientX - this.dragStart.x;
        const deltaY = clientY - this.dragStart.y;

        if (this.scale > 1) {
            this.position.x = this.initialPosition.x + deltaX;
            this.position.y = this.initialPosition.y + deltaY;
        } else {
            if (this.images.length <= 1) return;
            this.position.x = deltaX;
            this.position.y = 0;
        }
        this.updateImageStyle();
    }

    private onDragEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.isTransitioning = true;

        if (this.scale > 1) {
            this.updateImageStyle();
        } else {
            const threshold = 120;
            if (this.position.x < -threshold) {
                this.handleNext();
            } else if (this.position.x > threshold) {
                this.handlePrev();
            } else {
                this.position.x = 0;
                this.updateImageStyle();
            }
        }
    }

    private handleDownload(e: MouseEvent): void {
        e.stopPropagation();
        const current = this.images[this.index];
        if (!current) return;
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = current.src;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width; canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0, image.width, image.height);
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url; 
                a.download = current.title || `image-${ this.index + 1 }.png`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
        };
        image.onerror = () => window.open(current.src, '_blank');
    }
    private handleZoomIn(e: MouseEvent): void {
        e.stopPropagation();
        this.isTransitioning = true;
        this.scale = Math.min(this.scale + 0.5, 4);
        this.updateImageStyle();
    }
    private handleZoomOut(e: MouseEvent): void {
        e.stopPropagation();
        this.isTransitioning = true;
        const newScale = Math.max(this.scale - 0.5, 1);
        this.scale = newScale;
        if (newScale === 1) {
            this.position = { x: 0, y: 0 };
        }
        this.updateImageStyle();
    }
    private handleToggleFullscreen(e: MouseEvent): void { e.stopPropagation(); if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => { }); } else { document.exitFullscreen(); } }
    private createIconBtn(svgPath: string, callback: (e: MouseEvent) => void, title: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'custom-lightbox-icon-btn';
        btn.title = title;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width = "20" height = "20" fill = "none" stroke = "currentColor" stroke - width="2" stroke - linecap="round" stroke - linejoin="round" > <path d="${svgPath}" /> </svg>`;
        btn.addEventListener('click', callback);
        return btn;
    }
}  