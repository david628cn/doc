import { useState, useEffect } from 'react';
import Lightbox, { SlideImage } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Download from "yet-another-react-lightbox/plugins/download";

import "yet-another-react-lightbox/styles.css";
import "./index.less"; 

export interface ImagePreviewerSlide extends SlideImage {
    id?: string | number;         
    title?: string;              
    description?: string;        
    [key: string]: any;          
}

export type ImagePreviewerProps = {
    open?: boolean;
    onClose?: () => void;
    images?: ImagePreviewerSlide[];
    defaultIndex?: number;
};

export function ImagePreviewer({
    open,
    onClose,
    images = [],
    defaultIndex = 0
}: ImagePreviewerProps) {
    const [currentIndex, setCurrentIndex] = useState(defaultIndex);
    
    useEffect(() => {
        if (open) {
            setCurrentIndex(defaultIndex);
        }
    }, [open, defaultIndex]);

    if (!images || images.length === 0) return null;

    return (
        <Lightbox
            open={open}
            close={onClose}
            index={currentIndex}
            slides={images}
            
            // 完美加载官方放大、全屏、下载功能插槽
            plugins={[Zoom, Fullscreen, Download]}

            // 开启无限循环切换，点击黑色背景任意空白区域触发关闭
            carousel={{ finite: false }} 
            controller={{ closeOnBackdropClick: true }}

            on={{
                view: ({ index }) => setCurrentIndex(index)
            }}

            zoom={{
                maxZoomPixelRatio: 5,
                zoomInMultiplier: 1.3,
                doubleTapDelay: 300,
            }}

            render={{
                // ✨ 核心技巧 1：把页码当作 buttonClose 的伴生节点渲染
                // 这属于已知的合法类型，TS 绝对不报错，并且能让页码稳稳地出生在底部工具栏正内部的最左侧
                buttonClose: () => (
                    <div key="yarl-custom-counter" className="yarl__custom-bottom-counter">
                        {currentIndex + 1} / {images.length}
                    </div>
                ),

                // ✨ 核心技巧 2：利用绝对处于屏幕顶层的已知 controls 属性，单独手写渲染右上角按钮
                // 这样既不会破坏官方工具栏（yarl__toolbar）里的下载、全屏、缩放图标，又能保证关闭按钮 100% 悬浮在右上角
                controls: () => (
                    <button 
                        className="custom-final-top-close-btn" 
                        onClick={(e) => {
                            e.stopPropagation(); // 阻止冒泡
                            onClose?.();        // 触发关闭
                        }}
                        title="关闭"
                    >
                        ✕
                    </button>
                ),

                // 彻底清除之前会导致位移隐藏的 slideHeader
                slideHeader: () => null,

                // 图片下方的描述性标题文字
                slideFooter: ({ slide }) => {
                    const currentSlide = slide as ImagePreviewerSlide;
                    if (!currentSlide.title) return null;
                    return (
                        <div className="yarl__custom-title-text">
                            {currentSlide.title}
                        </div>
                    );
                }
            }}
        />
    );
}
