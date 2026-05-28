// export const getBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         // 读取完成后触发
//         reader.onload = () => resolve(reader.result as string);
//         // 读取失败触发
//         reader.onerror = (error) => reject(error);
//         // 开始读取文件并转换为 DataURL (Base64)
//         reader.readAsDataURL(file);
//     });
// };

export const getBase64 = (file: File, maxWidth = Infinity, maxHeight = Infinity): Promise<string> | null => {
    if (!file) {
        return null;
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const base64 = e.target?.result as string;

            // 如果没有设置缩放边界 (保持默认 Infinity)，直接返回原图 Base64
            if (maxWidth === Infinity && maxHeight === Infinity) {
                resolve(base64);
                return;
            }

            // 如果设置了边界，则走 Canvas 缩放逻辑
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 等比例缩放算法
                const ratio = Math.min(maxWidth / width, maxHeight / height, 1); // 这里的 1 确保不会放大图片
                width = width * ratio;
                height = height * ratio;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // 导出 Base64
                resolve(canvas.toDataURL(file.type || 'image/jpeg', 0.9));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

// export type CropOptions = {
//     x: number;      // 起始横坐标
//     y: number;      // 起始纵坐标
//     width: number;  // 裁剪宽度
//     height: number; // 裁剪高度
//     scale?: number; // 缩放倍率，默认 1
// }

/**
 * 根据坐标和缩放进行裁剪
 * @param file 原始文件
 * @param options 裁剪参数
 */
export const getCropBase64 = (file: File, options: any): Promise<string> | null => {
    if (!file) {
        return null;
    }
    
    const { x, y, width, height, scale = 1 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 目标画布尺寸 = 裁剪尺寸 * 缩放倍率
                const targetWidth = width * scale;
                const targetHeight = height * scale;

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                /**
                 * drawImage 参数详解：
                 * img: 源图
                 * x, y: 源图上的裁剪起始点
                 * width, height: 源图上的裁剪宽高
                 * 0, 0: 目标画布上的起始点
                 * targetWidth, targetHeight: 目标画布上的宽高（实现缩放）
                 */
                ctx?.drawImage(
                    img, 
                    x, y, width, height, 
                    0, 0, targetWidth, targetHeight
                );

                // 导出预览图
                resolve(canvas.toDataURL(file.type || 'image/jpeg', 0.9));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};