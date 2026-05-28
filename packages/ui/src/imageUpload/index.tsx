
import { useState, useRef } from 'react';
import { CropperView, type CropperViewHandle } from '../crop';
import { Button } from '../button';
import { CircleProgress } from '../circleProgress';
import { CLASSNAME } from '../config';
import './index.less';

const dataUrlToBlob = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
}

export type ImageUploadProps = {
    className?: string;
    style?: React.CSSProperties;
    percent?: number;
    aspectRatio?: number;
    /** 裁剪框是否可移动（默认 true） */
    cropBoxMovable?: boolean;
    /** 裁剪框是否可缩放（默认 true） */
    cropBoxResizable?: boolean;
    /** 是否允许旋转（默认 true） */
    rotatable?: boolean;
    /** 是否展示旋转按钮（默认 true） */
    showRotateControls?: boolean;
    onChange?: (v: any) => void;
    onCancel?: () => void;
    onUpload?: (file: File) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = props => {
    const {
        className,
        style,
        aspectRatio,
        cropBoxMovable = true,
        cropBoxResizable = true,
        rotatable = true,
        showRotateControls = true,
        percent,
        onCancel,
        onUpload
    } = props;
    const cropRef = useRef<CropperViewHandle | null>(null);
    const fileRef = useRef<File | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    // const [btnDisable, setBtnDisable] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    // const canCrop = useMemo(() => !!imageUrl, [imageUrl]);


    const loadFile = (file: File) => {
        setErrorMsg('');
        // setBtnDisable(true);
        // return new Promise((resolve, reject) => {
        //     const reader = new FileReader();
        //     reader.onload = () => {
        //         resolve(String(reader.result ?? ''));
        //     };
        //     reader.onerror = () => {
        //         resolve('');
        //     }
        //     reader.readAsDataURL(file);
        // });
        fileRef.current = file;
        const reader = new FileReader();
        reader.onload = () => {
            setImageUrl(String(reader.result ?? ''));
        };
        // reader.onprogress = (event) => {
        //     console.log(event);
        //     if (event.lengthComputable) {
        //         const percent = Math.round((event.loaded / event.total) * 100);
        //         console.log(`本地读取进度: ${percent}%`);
        //         // 这里可以更新你的 React State 来驱动进度条
        //     }
        // };
        reader.onerror = () => {
            setImageUrl('');
            setErrorMsg('选择图片文件失败');
        }
        reader.readAsDataURL(file);
    }

    const handleReset = () => {
        setErrorMsg('');
        setImageUrl('');
        fileRef.current = null;
        if (inputRef.current) inputRef.current.value = '';
        onCancel?.();
    };

    const handleConfirm = async () => {
        if (!cropRef.current) return;
        setLoading(true);
        const dataUrl = cropRef.current.getDataUrl({ type: 'image/png' });
        const blob = await dataUrlToBlob(dataUrl);
        const raw = fileRef.current;
        const name = raw?.name ? raw.name.replace(/\.\w+$/, '') : 'upload';
        const file = new File([blob], `${name}.png`, { type: blob.type || 'image/png' });
        try {
            const res: any = await onUpload?.(file);
            if (!res) {
                setLoading(false);
            }
        } catch {
            setLoading(false);
        }
    }

    return (
        <div className={`${CLASSNAME}-image-upload ${className ?? ''}`.trim()} style={style}>
            <div
                className={`${CLASSNAME}-image-upload-body`}
                tabIndex={1}
                onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
                    if (loading) {
                        return;
                    }
                    setErrorMsg('');
                    const items = Array.from(e.clipboardData?.items ?? []);

                    // 1. 优先处理二进制图片文件 (截图、右键“复制图片”)
                    const imgFileItem = items.find(it => it.kind === 'file' && it.type.startsWith('image/'));
                    if (imgFileItem) {
                        const file = imgFileItem.getAsFile();
                        if (file) {
                            e.preventDefault();
                            loadFile(file);
                            return;
                        }
                    }

                    // 2. 处理 URL 链接 (右键“复制图片地址”)
                    const textItem = items.find(it => it.kind === 'string' && it.type === 'text/plain');
                    if (textItem) {
                        // 关键点：我们需要在回调之外先拿到字符串（或者使用 clipboardData.getData）
                        const pastedText = e.clipboardData.getData('text');

                        // 验证是否以 http:// 或 https:// 开头
                        const isUrl = /^https?:\/\//i.test(pastedText);

                        if (isUrl) {
                            e.preventDefault(); // 阻止 URL 文本直接粘贴进输入框

                            // 异步下载图片并转换
                            fetch(pastedText)
                                .then(res => res.blob())
                                .then(blob => {
                                    if (blob.type.startsWith('image/')) {
                                        const file = new File([blob], "downloaded-image", { type: blob.type });
                                        loadFile(file);
                                    }
                                })
                                .catch(err => {
                                    // console.error("图片下载失败，可能是跨域(CORS)问题:", err);
                                    setErrorMsg('图片下载失败，可能是跨域(CORS)问题');
                                });
                        } else {
                            setErrorMsg('粘贴的链接不包含图像');
                        }
                    }
                }}
            >
                <input
                    ref={inputRef}
                    className={`${CLASSNAME}-image-upload-input`}
                    type="file"
                    accept="image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        loadFile(file);
                    }}
                />

                {!imageUrl ? (
                    <Button
                        className={`${CLASSNAME}-image-upload-drop`}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className={`${CLASSNAME}-image-upload-drop-icon`} aria-hidden="true">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M12 3v12"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M7.5 7.5 12 3l4.5 4.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div className={`${CLASSNAME}-image-upload-drop-text`}>上传图片</div>
                    </Button>
                ) : (
                    <div className={`${CLASSNAME}-image-crop-stage`}>
                        <CropperView
                            ref={cropRef}
                            key={imageUrl}
                            image={imageUrl}
                            aspectRatio={aspectRatio}
                            cropBoxMovable={cropBoxMovable}
                            cropBoxResizable={cropBoxResizable}
                            rotatable={rotatable}
                            onReady={() => {
                                // setBtnDisable(false);
                            }}
                        />
                    </div>
                )}
                {!imageUrl && <div className={`${CLASSNAME}-image-upload-hint`}>或⌘+V粘贴图片或链接</div>}
                {errorMsg && <div className={`${CLASSNAME}-image-upload-error`}>{errorMsg}</div>}
                {loading && <div className={`${CLASSNAME}-image-upload-progress`}>
                    <CircleProgress
                        percent={percent}
                    />
                </div>}     
            </div>
            <div className={`${CLASSNAME}-image-upload-footer`}>
                <div className={`${CLASSNAME}-image-upload-footer-left`}>
                    <Button onClick={handleReset} disabled={loading}>
                        取消
                    </Button>
                    {showRotateControls && rotatable && imageUrl ? (
                        <div className={`${CLASSNAME}-image-upload-rotate`}>
                            {/* <Tooltip title="左旋转" pos="b-t?"> */}
                            <Button
                                title="左旋转"
                                onClick={() => cropRef.current?.rotate(-90)}
                                disabled={loading}
                            >
                                ↺
                            </Button>
                            <Button
                                title="右旋转"
                                onClick={() => cropRef.current?.rotate(90)}
                                disabled={loading}
                            >
                                ↻
                            </Button>
                            {/* </Tooltip> */}
                        </div>
                    ) : null}
                </div>
                <Button
                    color="blue"
                    loading={loading}
                    onClick={handleConfirm}
                >
                    上传
                </Button>
            </div>
        </div>
    );
}

export * from './baseImageUpload';