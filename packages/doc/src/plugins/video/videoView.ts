import { type Node } from 'prosemirror-model';
import { EditorView, type ViewMutationRecord } from 'prosemirror-view';
import { Resizable } from '@carvy/ui';
import { CLASSNAME } from '../../config';
import './index.less';


export class VideoView {
    dom: HTMLElement;
    content: HTMLElement;
    video: HTMLVideoElement;
    node: Node;
    view: EditorView;
    getPos: () => number;
    ctrolPanel: HTMLDivElement;
    resizable: Resizable | null | undefined;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        this.dom = document.createElement('div');
        this.dom.className = `${CLASSNAME}-video-view`;

        // 关键样式：确保它像一个字符一样排列，而不是一个死盒子
        // this.dom.style.position = 'relative';
        this.dom.style.display = 'inline-block';
        this.dom.style.overflow = 'auto';
        this.dom.contentEditable = 'false';
        this.content = document.createElement('div');
        this.content.className = `${CLASSNAME}-video-view-content`;
        this.content.style.position = 'relative';
        this.content.style.display = 'flex';
        this.content.contentEditable = 'false';

        // if (node.attrs.width) {
        //     this.content.style.width = `${node.attrs.width}px`;
        // }
        // if (node.attrs.height) {
        //     this.content.style.height = `${node.attrs.height}px`;
        // }
        // 2. 创建真正的图片元素 (作为 ResizableNodeView 的 target)
        this.video = document.createElement('video');
        // 禁止原生拖拽，防止干扰缩放
        // this.video.draggable = false;
        // this.video.contentEditable = 'false';
        this.updateStatus();

        this.ctrolPanel = document.createElement('div');
        this.ctrolPanel.className = `${CLASSNAME}-video-view-ctrol-panel`;
        this.ctrolPanel.contentEditable = 'false';

        this.content.appendChild(this.video);
        this.dom.appendChild(this.content);
        this.content.appendChild(this.ctrolPanel);

        this.resizable = new Resizable({
            el: this.ctrolPanel,
            handles: 'all',
            preserveRatio: true,
            container: view.dom,
            onMove: (e: any, resizeable: Resizable) => {
                this.video.style.width = `${resizeable.endBox.width}px`;
                this.video.style.height = `${resizeable.endBox.height}px`;
                this.ctrolPanel.style.pointerEvents = 'auto';
            },
            onEnd: (e: any, resizeable: Resizable) => {
                this.ctrolPanel.style.pointerEvents = 'none';
                this.commitSize(resizeable.endBox.width, resizeable.endBox.height);
            }
        });


    }
    commitSize(width: number, height: number) {
        const { tr } = this.view.state;
        const pos = this.getPos();
        if (typeof pos !== 'number') {
            return;
        }
        // 派发事务更新节点属性
        this.view.dispatch(
            tr.setNodeMarkup(pos, null, {
                ...this.node.attrs,
                width: Math.round(width),
                height: Math.round(height)
            })
        );
    }
    updateStatus() {
        if (!this.video || !this.node) {
            return;
        }
        // if (this.video.src !== this.node.attrs.src) {
            this.video.src = this.node.attrs.src || 'https://v-cdn.zjol.com.cn/280443.mp4';
        // }
        this.video.title = this.node.attrs.title || '';
        this.video.controls = true;
        this.video.preload = 'metadata';
        this.video.style.width = this.node.attrs.width ? `${this.node.attrs.width}px` : '';
        this.video.style.height = this.node.attrs.height ? `${this.node.attrs.height}px` : '';
        // this.ctrolPanel.style.width = this.node.attrs.width ? `${this.node.attrs.width}px` : '';
        // this.ctrolPanel.style.height = this.node.attrs.height ? `${this.node.attrs.height}px` : '';
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        // 当文档属性变化时（如撤销/重做），同步 DOM
        this.node = node;
        this.updateStatus();
        return true;
    }
    destroy() {
        if (this.resizable) {
            this.resizable.destroy();
            this.resizable = null;
        }
    }
    // stopEvent(event: Event): boolean {
    //     // 1. 如果正在缩放，拦截所有事件（防止缩放时光标乱跳）
    //     if (this.resizable?.resizing) {
    //         return true;
    //     }

    //     // 2. 如果点击的是缩放手柄或控制面板，拦截它，不让编辑器处理成“点击输入文字”
    //     if (this.ctrolPanel?.contains(event.target as any)) {
    //         return true;
    //     }

    //     // 3. 键盘事件放行（重要：否则 Backspace 删不掉图片，Ctrl+Z 无效）
    //     return false;
    // }
    // stopEvent(event: any): boolean {
    //     // 缩放中拦截所有
    //     if (this.resizable?.resizing) {
    //         return true;
    //     }
    //     // 键盘事件一律放行，确保 Ctrl+Z 冒泡到编辑器
    //     if (event instanceof KeyboardEvent) {
    //         return false;
    //     }
    //     return this.ctrolPanel.contains(event.target);
    // }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    // ignoreMutation(record: ViewMutationRecord): boolean {
    //     if (this.dom.contains(record.target)) {
    //         return true;
    //     }
    //     return false;
    // }
    ignoreMutation(mutation: ViewMutationRecord): boolean {
        // 如果是选区变动，绝对不能忽略，否则撤销后光标位置会错乱
        if (mutation.type === 'selection') {
            return false;
        }

        // 只有在【正在缩放】时，才忽略属性变化
        if (this.resizable?.resizing && mutation.type === 'attributes') {
            return true;
        }

        // 其他情况返回 false，让 PM 能够感知到撤销带来的 DOM 改变
        return false;
    }
}