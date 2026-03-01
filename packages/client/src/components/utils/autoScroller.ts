// export class AutoScroller {
//     container: HTMLElement;
//     private onScrollCallback: (offset: { left: number; top: number }) => void;
//     private rafId: number | null = null;
//     public isAutoScrolling: boolean = false;

//     // 物理模擬參數
//     private readonly BASE_SPEED = 0.15; // 速度係數，決定拉開距離後的靈敏度
//     private readonly MAX_SPEED = 40;    // 極限速度，防止拉太遠導致滾動失控

//     // 緩存當前滾動強度
//     private scrollIntensity = { x: 0, y: 0 };

//     constructor(container: HTMLElement, onScrollCallback?: (offset: any) => void) {
//         this.container = container;
//         this.onScrollCallback = onScrollCallback;
//     }

//     /**
//      * @param helper 拖拽代理物 (getBoundingClientRect)
//      * @param container 容器 (getBoundingClientRect)
//      */
//     update(helper: Box, container: Box) {
//         // 1. 計算 Helper 超出 Container 邊界的物理位移 (越往外，值越大)
//         const diffX = this.getOutsideDelta(helper.left, helper.width, container.left, container.width);
//         const diffY = this.getOutsideDelta(helper.top, helper.height, container.top, container.height);

//         // 2. 更新當前滾動強度 (帶方向的位移值)
//         this.scrollIntensity = {
//             x: this.clampSpeed(diffX * this.BASE_SPEED),
//             y: this.clampSpeed(diffY * this.BASE_SPEED)
//         };

//         // 3. 狀態判定
//         if (this.scrollIntensity.x === 0 && this.scrollIntensity.y === 0) {
//             this.clear();
//             return;
//         }

//         if (!this.rafId) {
//             this.isAutoScrolling = true;
//             this.startLoop();
//         }
//     }

//     /**
//      * 計算超出的物理距離
//      * 返回正值代表向右/下溢出，負值代表向左/上溢出，0 代表在範圍內
//      */
//     private getOutsideDelta(hStart: number, hSize: number, cStart: number, cSize: number): number {
//         const hEnd = hStart + hSize;
//         const cEnd = cStart + cSize;

//         // 超出右/下邊界：返回超出的距離 (正數)
//         if (hEnd > cEnd) return hEnd - cEnd;
//         // 超出左/上邊界：返回超出的距離 (負數)
//         if (hStart < cStart) return hStart - cStart;
        
//         return 0;
//     }

//     private clampSpeed(speed: number): number {
//         if (Math.abs(speed) < 1) return 0; // 忽略微小偏移，防止抖動
//         return Math.sign(speed) * Math.min(Math.abs(speed), this.MAX_SPEED);
//     }

//     private startLoop() {
//         const step = () => {
//             const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = this.container;

//             // 邊界物理檢查
//             const canUp = this.scrollIntensity.y < 0 && scrollTop > 0;
//             const canDown = this.scrollIntensity.y > 0 && scrollTop + clientHeight < scrollHeight;
//             const canLeft = this.scrollIntensity.x < 0 && scrollLeft > 0;
//             const canRight = this.scrollIntensity.x > 0 && scrollLeft + clientWidth < scrollWidth;

//             const offset = {
//                 left: (canLeft || canRight) ? this.scrollIntensity.x : 0,
//                 top: (canUp || canDown) ? this.scrollIntensity.y : 0
//             };

//             if (offset.left !== 0 || offset.top !== 0) {
//                 this.container.scrollLeft += offset.left;
//                 this.container.scrollTop += offset.top;
//                 this.onScrollCallback?.(offset);
//                 this.rafId = requestAnimationFrame(step);
//             } else {
//                 this.clear();
//             }
//         };
//         this.rafId = requestAnimationFrame(step);
//     }

//     clear() {
//         if (this.rafId) cancelAnimationFrame(this.rafId);
//         this.rafId = null;
//         this.isAutoScrolling = false;
//         this.scrollIntensity = { x: 0, y: 0 };
//     }
// }

export class AutoScroller {
    container: any;
    interval: any;
    isAutoScrolling: boolean = false;
    scrollRect: any;
    constructor(container: any, onScrollCallback?: (offset: any) => void) {
        this.container = container;
        this.onScrollCallback = onScrollCallback;
        this.scrollRect = this.getScrollRect();
    }
    onScrollCallback(offset: any) {

    }

    getScrollRect() {
        // --- 垂直方向 (Vertical) ---
        const totalHeight = this.container.scrollHeight; // 內容總高度 (如 8000px)
        const viewportHeight = this.container.clientHeight; // 容器可視高度 (如 800px)
        const maxScrollTop = totalHeight - viewportHeight; // 最大可滾動距離

        // --- 水平方向 (Horizontal) ---
        const totalWidth = this.container.scrollWidth; // 內容總寬度
        const viewportWidth = this.container.clientWidth; // 容器可視寬度
        const maxScrollLeft = totalWidth - viewportWidth; // 最大可滾動左移距離

        return {
            minTop: 0,
            maxTop: maxScrollTop,
            minLeft: 0,
            maxLeft: maxScrollLeft
        }
    }

    start() {
        this.scrollRect = this.getScrollRect();
    }

    clear() {
        if (this.interval == null) {
            return;
        }

        clearInterval(this.interval);
        this.interval = null;
    }

    update(helper: any, container: any) {
        const width = helper.width;
        const height = helper.height;

        const dw = width / 2;
        const dh = height / 2;
        
        const maxLeft = container.left + container.width;
        const maxTop = container.top + container.height;

        const direction = {
            x: 0,
            y: 0,
        };
        const speed = {
            x: 1,
            y: 1,
        };
        const acceleration = {
            x: 10,
            y: 10,
        };

        const {
            scrollTop,
            scrollLeft,
            scrollHeight,
            scrollWidth,
            clientHeight,
            clientWidth,
        } = this.container;

        const isTop = scrollTop === 0;
        const isBottom = scrollHeight - scrollTop - clientHeight === 0;
        const isLeft = scrollLeft === 0;
        const isRight = scrollWidth - scrollLeft - clientWidth === 0;

        if (helper.top >= maxTop - dh && !isBottom) {
            // Scroll Down
            direction.y = 1;
            speed.y =
                acceleration.y *
                Math.abs((maxTop - dh - helper.top) / height);
        } else if (helper.top <= container.top + dh && !isTop) {
            // Scroll Up
            direction.y = -1;
            speed.y =
                acceleration.y *
                Math.abs((helper.top + dh - container.top) / height);
        }
        if (helper.left <= container.left - dw && !isLeft) {
            // Scroll Left
            direction.x = -1;
            speed.x =
                acceleration.x *
                Math.abs((helper.left + dw - container.left) / width);
        } else if (helper.left >= maxLeft - dw && !isRight) {
            // Scroll Right
            direction.x = 1;
            speed.x =
                acceleration.x *
                Math.abs((maxLeft - dw - helper.left) / width);
        }

        if (this.interval) {
            this.clear();
            this.isAutoScrolling = false;
        }

        if (direction.x !== 0 || direction.y !== 0) {
            this.interval = setInterval(() => {
                this.isAutoScrolling = true;
                const offset = {
                    left: speed.x * direction.x,
                    top: speed.y * direction.y
                };
                // const offset = {
                //     left: Math.min(this.scrollRect.right, Math.max(this.scrollRect.left, speed.x * direction.x)),
                //     top: Math.min(this.scrollRect.bottom, Math.max(this.scrollRect.top, speed.y * direction.y))
                // };
                let nextTop = this.container.scrollTop + offset.top;
                let nextLeft = this.container.scrollLeft + offset.left;
                this.container.scrollTop = Math.min(this.scrollRect.maxTop, Math.max(this.scrollRect.minTop, nextTop));
                this.container.scrollLeft = Math.min(this.scrollRect.maxLeft, Math.max(this.scrollRect.minLeft, nextLeft));
                this.onScrollCallback?.(offset);
            }, 5);
        }
    }
}
