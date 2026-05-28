import React, { useState, type ReactNode } from 'react';
import { CLASSNAME } from '../config';
import './index.less';

// const getBase64FromUrl = async (url: string, size: number): Promise<string | null> => {
//     // 1. 嚴格檢查協議（支持 http 和 https）
//     if (!/^https?:\/\//i.test(url)) {
//         console.error("無效的 URL 格式，必須以 http:// 或 https:// 開頭");
//         return null;
//     }

//     try {
//         // 增加 mode: 'cors' 確保跨域請求行為明確
//         const response = await fetch(url, { mode: 'cors' });
        
//         if (!response.ok) return null;

//         // 2. 內容類型校驗（防止抓到 HTML 報錯頁面）
//         const contentType = response.headers.get('Content-Type');
//         if (!contentType || !contentType.startsWith('image/')) {
//             console.error("URL 指向的不是有效的圖片資源");
//             return null;
//         }

//         if (size > 0) {
//             const contentLength = response.headers.get('Content-Length');
//             // size 10 * 1024 * 1024
//             if (contentLength && parseInt(contentLength) > size) { // 限制 10MB
//                 console.error(`圖片實際大小 (${(blob.size / 1024 / 1024).toFixed(2)}MB) 超過限制`);
//                 return null;
//             }
//         }

//         const blob = await response.blob();

//         // 2. 核心修正：Blob 獲取後進行最終大小確認 (100% 準確)
//         if (size > 0 && blob.size > size) {
//             console.error(`圖片實際大小 (${(blob.size / 1024 / 1024).toFixed(2)}MB) 超過限制`);
//             return null;
//         }
        
//         return new Promise((resolve) => {
//             const reader = new FileReader();
//             reader.onload = () => resolve(reader.result as string);
//             reader.onerror = () => {
//                 console.error("FileReader 讀取 Blob 失敗");
//                 resolve(null);
//             };
//             reader.readAsDataURL(blob);
//         });
//     } catch (err) {
//         // 捕獲網絡斷開或嚴格的 CORS 攔截
//         console.warn("圖片抓取失敗，可能是跨域限制或網絡問題:", err);
//         return null;
//     }
// }

const getBase64FromUrl = async (url: string, maxSize: number = 0): Promise<string | null> => {
    if (!/^https?:\/\//i.test(url)) return null;

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;

        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.startsWith('image/')) return null;

        const blob = await response.blob();

        // 1. 如果圖片本身就沒超過限制，直接返回原始 Base64
        if (maxSize <= 0 || blob.size <= maxSize) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }

        // 2. 超過限制，啟動 Canvas 壓縮邏輯
        // console.log(`圖片 (${(blob.size / 1024).toFixed(1)}kb) 超過限制，開始壓縮...`);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 初步縮放：如果圖片解析度極高（如 4K），先限制最大寬度為 1600px
                let width = img.width;
                let height = img.height;
                const maxResolution = 1600;
                if (width > maxResolution) {
                    height = (height * maxResolution) / width;
                    width = maxResolution;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                // 3. 遞歸調整質量（Quality）直到體積達標
                let quality = 0.9;
                let resultBase64 = '';
                let currentSize = Infinity;

                // 循環壓縮：每次降低 0.1 質量，最低降到 0.2
                while (currentSize > maxSize && quality > 0.2) {
                    resultBase64 = canvas.toDataURL('image/jpeg', quality);
                    // Base64 字符串長度與字節換算約為 1.33:1
                    currentSize = resultBase64.length * 0.75;
                    quality -= 0.1;
                }

                URL.revokeObjectURL(img.src); // 釋放記憶體
                
                if (currentSize <= maxSize) {
                    console.log(`壓縮成功：最終體積 ${(currentSize / 1024).toFixed(1)}kb`);
                    resolve(resultBase64);
                } else {
                    // 如果質量降到 0.2 還超大，嘗試進一步縮小尺寸 (再壓 50%)
                    canvas.width /= 2;
                    canvas.height /= 2;
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                }
            };
            img.onerror = () => resolve(null);
        });
    } catch (err) {
        console.warn("抓取或壓縮失敗:", err);
        return null;
    }
}

// const getBase64WithCompress = async (url: string, maxWidth = 1200, quality = 0.8): Promise<string | null> => {
//     // 1. 先獲取原始圖片數據 (Blob)
//     try {
//         const response = await fetch(url, { mode: 'cors' });
//         if (!response.ok) return null;
        
//         const blob = await response.blob();
//         if (!blob.type.startsWith('image/')) return null;

//         // 2. 利用 Image 和 Canvas 進行壓縮
//         return new Promise((resolve) => {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 const img = new Image();
//                 img.src = e.target?.result as string;

//                 img.onload = () => {
//                     const canvas = document.createElement('canvas');
//                     const ctx = canvas.getContext('2d');
                    
//                     let width = img.width;
//                     let height = img.height;

//                     // 3. 等比例縮放：如果寬度超過 maxWidth（如 1200px），則按比例縮小
//                     if (width > maxWidth) {
//                         height = (height * maxWidth) / width;
//                         width = maxWidth;
//                     }

//                     canvas.width = width;
//                     canvas.height = height;
//                     ctx?.drawImage(img, 0, 0, width, height);

//                     // 4. 導出壓縮後的 Base64 (0.8 為 80% 質量)
//                     // 這裡統一轉為 image/jpeg 以獲得最佳壓縮比
//                     const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
//                     resolve(compressedBase64);
//                 };
//                 img.onerror = () => resolve(null);
//             };
//             reader.readAsDataURL(blob);
//         });
//     } catch (err) {
//         console.error('壓縮圖片失敗:', err);
//         return null;
//     }
// };

const debounce = (fn: Function, delay: number = 500) => {
    let timer: any = null;
    return (...args: any) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

export type LinkFormProps = {
    className?: string;
    children?: ReactNode;
    onComplete?: Function;
    // onChange?: (index: number) => void;
    // [key: string]: unknown
}

export const LinkForm: React.FC<LinkFormProps> = props => {
    const {
        className,
        onComplete
    } = props;

    const [url, setUrl] = useState<any>(null);

    // const inputRef = useRef(null);

    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        onComplete?.({
            file: url
        });
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        doUpload(e.target.value);
    }

    const doUpload = async (v: string) => {
        const file: any = await getBase64FromUrl(v);
        console.log('file', file);
        setUrl(file);
    }

    const cls = [`${CLASSNAME}-link-form-container`];
    if (className) {
        cls.push(className);
    }

    return (
        <div className={cls.join(' ')}>
            <div className={`${CLASSNAME}-link-form-content`}>
                <div className={`${CLASSNAME}-link-form-items`}>
                    <div className={`${CLASSNAME}-link-form-item`}>
                        <div className={`${CLASSNAME}-link-form-item-label-container`}>
                            <span className={`${CLASSNAME}-link-form-item-label ${CLASSNAME}-link-form-required`}>Link url</span>
                        </div>
                        <div className={`${CLASSNAME}-link-form-item-input-container`}>
                            <input
                                className={`${CLASSNAME}-link-form-item-input`}
                                type="text"
                                placeholder="Link url"
                                defaultValue={''}
                                onChange={debounce(handleChange)}
                            />
                        </div>
                    </div>
                    <div className={`${CLASSNAME}-link-form-item`}>
                        <div className={`${CLASSNAME}-link-form-item-label-container`}>
                            <span className={`${CLASSNAME}-link-form-item-label`}>Link description</span>
                        </div>
                        <div className={`${CLASSNAME}-link-form-item-input-container`}>
                            <input
                                className={`${CLASSNAME}-link-form-item-input`}
                                type="text"
                                placeholder="Link description"
                                defaultValue={''}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {
                url ? <div className={`${CLASSNAME}-link-form-preview`}>
                    <img className={`${CLASSNAME}-link-form-preview-img`} src={url} />
                </div> : null
            }
            <button className={`${CLASSNAME}-link-form-submit`} disabled={!url || !url.trim()} onClick={handleClick}>确定</button>
        </div>
    );
}