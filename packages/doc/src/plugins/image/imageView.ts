import { type Node } from 'prosemirror-model';
import { EditorView, type ViewMutationRecord } from 'prosemirror-view';
import { BaseBlockView } from '../baseBlockView';
// import { CssImageCropper } from './cssImageCropperOptions';
import { Resizable, BaseCircleProgress } from '@carvy/ui';
import { CLASSNAME } from '../../config';
import './index.less';

// let imageCropper: any;

export class ImageView extends BaseBlockView {
    content: HTMLDivElement;
    img: HTMLImageElement;
    // placeholder: HTMLDivElement;
    ctrolPanel: HTMLDivElement;
    resizable: Resizable | null | undefined;
    progress: BaseCircleProgress | null | undefined;
    // cropViewerPanel: HTMLDivElement;

    constructor(node: Node, view: EditorView, getPos: () => number) {
        super({ node, view, getPos });

        this.dom.className = `${CLASSNAME}-image-view`;

        this.content = document.createElement('div');
        this.content.className = `${CLASSNAME}-image-view-content`;
        this.content.style.position = 'relative';

        this.img = document.createElement('img');

        // this.img.onload = () => {
        //     console.log('图片加载完成，天然尺寸：', this.img.naturalWidth, this.img.naturalHeight);
        // }
        // this.img.onerror = () => {
        //     console.error('图片加载失败，src:', this.img.src);
        // }

        this.contentDOM = document.createElement('span');
        this.contentDOM.className = `${CLASSNAME}-editor-caption`;
        this.contentDOM.setAttribute('data-placeholder', '请输入图片描述...');

        this.ctrolPanel = document.createElement('div');
        this.ctrolPanel.className = `${CLASSNAME}-image-view-ctrol-panel`;
        this.ctrolPanel.contentEditable = 'false';

        // this.placeholder = document.createElement('div');
        // this.placeholder.className = `${CLASSNAME}-image-view-placeholder`;
        // this.placeholder.contentEditable = 'false';
        // this.placeholder.innerHTML = `<div class="${CLASSNAME}-image-view-placeholder-inner"></div>`;

        // 独立解耦的裁剪面板挂载点
        // this.cropViewerPanel = document.createElement('div');
        // this.cropViewerPanel.className = `${CLASSNAME}-image-view-crop-panel`;
        // this.cropViewerPanel.contentEditable = 'false';

        this.content.appendChild(this.img);
        this.content.appendChild(this.ctrolPanel);
        // this.content.appendChild(this.cropViewerPanel);
        // this.content.appendChild(this.placeholder);

        this.dom.appendChild(this.content);
        this.dom.appendChild(this.contentDOM);

        // 🚀 实例化独立裁剪组件
        // this.cssCropper = new ImageCropper({
        //     container: this.cropViewerPanel,
        //     src: this.node.attrs.src,
        //     onChange: (data: any) => {
        //         console.log('裁剪区域正在改变:', data);
        //     },
        //     onOk: (blob, dataUrl) => {
        //         console.log('裁剪完成！Base64 数据：', dataUrl);
        //         console.log('用于上传的 Blob 对象：', blob);
        //         // 这里可以执行你的上传逻辑 (例如 append 到 FormData)
        //     },
        //     onCancel: () => {
        //         console.log('用户取消了裁剪');
        //     },
        //     onReset: () => {
        //         console.log('裁剪框已重置');
        //     }

        // });

        // 🚀 外部常规尺寸缩放解冻：这个才是负责在富文本里改变图片整体大小的
        this.resizable = new Resizable({
            el: this.ctrolPanel,
            handles: 'e,w',
            preserveRatio: true, // 缩放整体大小时保持比例
            container: view.dom,
            onMove: (e: any, resizeable: Resizable) => {
                const nextW = resizeable.endBox.width;
                // const nextH = resizeable.endBox.height;
                this.img.style.width = `${nextW}px`;
                // this.img.style.height = `${nextH}px`;

                // 联动：当图片整体被放大缩小时，裁剪组件的宿主画布等比刷新，但不会破坏图片已裁好的相对区域
                this.ctrolPanel.style.pointerEvents = 'auto';
            },
            onEnd: (e: any, resizeable: Resizable) => {
                this.ctrolPanel.style.pointerEvents = 'none';
                this.commitSize(resizeable.endBox.width, resizeable.endBox.height);
            }
        });

        // this.progress = new BaseCircleProgress({
        //     radius: 40,          // 圆环半径
        //     strokeWidth: 8,      // 线条粗细
        //     percent: 30,         // 初始进度 30%
        //     type: 'uploading',   // 业务类型
        //     status: 'active',    // 当前状态
        //     style: {             // 传递给最外层 div 的自定义样式
        //         width: '120px',
        //         height: '120px',
        //         fontSize: '24px' // 控制 1em 的实际大小
        //     }
        // });
        // this.placeholder.appendChild(this.progress.element);
        this.createHandle();
        this.updateStatus();
    }
    createDom(): HTMLElement {
        const dom = document.createElement('span');
        dom.className = `${CLASSNAME}-block-wrapper ${CLASSNAME}-block-type-${this.node.type.name}`;
        dom.setAttribute('data-block-type', this.node.type.name);
        return dom;
    }
    commitSize(width: number, height: number) {
        const { tr } = this.view.state;
        const pos = this.getPos();
        if (typeof pos !== 'number') return;

        this.view.dispatch(
            tr.setNodeMarkup(pos, null, {
                ...this.node.attrs,
                width: Math.round(width),
                height: Math.round(height)
            })
        );
    }

    updateStatus() {
        console.log('更新图片视图，当前 src:', this.img, this.node); // --- IGNORE ---
        if (!this.img || !this.node) return;

        const newSrc = this.node.attrs.src || '';

        if (this.img.src !== newSrc) {
            this.img.src = newSrc;
        }

        this.img.alt = this.node.attrs.alt || '';
        this.img.title = this.node.attrs.title || '';

        // 渲染富文本中图片的排版大小
        const viewW = this.node.attrs.width;
        const viewH = this.node.attrs.height || 'auto';
        this.img.style.width = `${viewW}px`;
        // this.img.style.height = `${viewH}px`;
        this.img.style.display = 'none';
        this.ctrolPanel.style.display = 'none';
        if (this.contentDOM) {
            const hasCaption = this.node.attrs.caption !== false;
            this.contentDOM.style.display = hasCaption ? 'block' : 'none';
            this.contentDOM.contentEditable = hasCaption ? 'true' : 'false';
        }
        this.progress?.setPercent(10);
        // 🚀 核心优化 2：把数据源和刷新隔离。
        // 当状态驱动刷新时，通过暴露的组件 API 仅重刷裁剪区内部图片的矩阵偏移，绝不惊动外部图片框架的大小
        // if (imageCropper) {
        //     imageCropper.setSrc(newSrc);

        //     imageCropper.setTransform({
        //         width: viewW,
        //         // height: viewH,
        //         scaleX: this.node.attrs.scale || 1,
        //         translateX: this.node.attrs.translateX || 0,
        //         translateY: this.node.attrs.translateY || 0
        //     });
        // }
    }

    onUpdate() {
        this.updateStatus();
        return true;
    }

    onDestroy() {
        if (this.resizable) {
            this.resizable.destroy();
            this.resizable = null;
        }
        // if (imageCropper) {
        //     imageCropper.destroy();
        //     imageCropper = null;
        // }
    }

    ignoreMutation(mutation: ViewMutationRecord): boolean {
        if (mutation.type === 'selection') return false;
        if (this.contentDOM?.contains?.(mutation.target)) return false;
        if (this.resizable?.resizing && mutation.type === 'attributes') return true;
        if (this.ctrolPanel.contains(mutation.target)) return true;
        // if (this.cropViewerPanel && this.cropViewerPanel.contains(mutation.target)) return true;
        return false;
    }
}
