import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { CLASSNAME } from '../../config';

export class ColumnView {
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
    node: Node;
    view: EditorView;
    getPos: () => number;
    resizerLeft: HTMLDivElement;
    resizerRight: HTMLDivElement;

    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        // 1. 建立容器
        this.dom = document.createElement('div');
        this.dom.className = `${CLASSNAME}-column-container`;
        this.dom.style.position = 'relative';
        this.dom.style.padding = '20px';
        this.dom.style.display = 'flex';
        this.dom.style.border = '1px solid #0B120E24';
        this.dom.style.borderRadius = '4px';
        this.dom.style.flexGrow = '0';
        this.dom.style.flexShrink = '0';

        // 2. 內容掛載點
        this.contentDOM = document.createElement('div');
        this.contentDOM.className = `${CLASSNAME}-column`;
        this.contentDOM.style.width = '100%';
        this.contentDOM.style.boxSizing = 'border-box';
        this.dom.appendChild(this.contentDOM);

        // 3. 創建控制條（即拖動柄）
        this.resizerLeft = document.createElement('div');
        this.resizerLeft.className = `${CLASSNAME}-column-resizer-handle`;
        this.resizerLeft.style.width = '10px';
        this.resizerLeft.style.height = '100%';
        this.resizerLeft.style.position = 'absolute';
        this.resizerLeft.style.left = '0';
        this.resizerLeft.style.top = '0';
        this.resizerLeft.style.display = 'none';
        this.dom.appendChild(this.resizerLeft);

        this.resizerRight = document.createElement('div');
        this.resizerRight.className = `${CLASSNAME}-column-resizer-handle`;
        this.resizerRight.style.width = '10px';
        this.resizerRight.style.height = '100%';
        this.resizerRight.style.position = 'absolute';
        this.resizerRight.style.right = '0';
        this.resizerRight.style.top = '0';
        this.resizerRight.style.display = 'none';
        this.dom.appendChild(this.resizerRight);

        // 4. 事件綁定
        // this.controlBar.addEventListener('mousedown', this.handleMouseDown.bind(this));

        this.updateStatus();
    }

    /**
     * 獲取當前列在父節點中的索引和上下文
     */
    getContext() {
        const pos = this.getPos();
        if (typeof pos !== 'number') {
            return null;
        }
        const $pos = this.view.state.doc.resolve(pos);
        const parent = $pos.parent;
        const index = $pos.index();
        const isLast = index === parent.childCount - 1;
        return { parent, index, isLast, $pos };
    }

    updateStatus() {
        const ctx = this.getContext();
        if (!ctx) {
            return;
        }
console.log('>>>>>>', ctx);
        const { parent, index, isLast } = ctx;
        const n = parent.childCount;
        const gap = parent.attrs.gap;
        const compensation = (gap * (n - 1) / n);
        this.dom.style.width = `calc(${this.node.attrs.ratio * 100}% - ${compensation}px)`;

        if (index === 0) {
            this.resizerLeft.style.width = `${gap + 1}px`;
            this.resizerLeft.style.left = `-${gap + 1}px`;
            this.resizerLeft.style.display = 'block';
        } else {
            this.resizerLeft.style.width = `${gap + 1}px`;
            this.resizerLeft.style.left = `-${gap + 1}px`;
            this.resizerLeft.style.display = 'none';
        }

        this.resizerRight.style.width = `${gap + 1}px`;
        this.resizerRight.style.right = `-${gap + 1}px`;
        this.resizerRight.style.display = 'block';
        
        

        // 視覺區分：最後一列的柄可以用於添加
        // if (isLast) {
        //     this.controlBar.classList.add(`${CLASSNAME}-column-last-column`);
        // } else {
        //     this.controlBar.classList.remove(`${CLASSNAME}-column-last-column`);
        // }
    }

    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        this.updateStatus();
        return true;
    }

    // createHandle(type: string, index: string) {
    //     const h = document.createElement("div");
    //     h.className = `${CLASSNAME}-column-handle ${type}`;
    //     h.contentEditable = 'false';
    //     h.dataset.index = index;
    //     // 這裡綁定點擊插入或拖拽事件
    //     return h;
    // }

    // handleMouseDown(e: MouseEvent) {
    //     const ctx = this.getContext();
    //     if (!ctx) return;

    //     if (ctx.isLast) {
    //         // 邏輯 A: 點擊最後一列柄 -> 新增列
    //         // 如果你希望最後一個柄也能拖拽寬度，則需要判斷點擊位置
    //         this.addNewColumn();
    //     } else {
    //         // 邏輯 B: 中間列 -> 拖拽 Resize
    //         this.startResizing(e);
    //     }
    // }

    // startResizing(e: MouseEvent) {
    //     e.preventDefault();
    //     const startX = e.clientX;
    //     const ctx = this.getContext();
    //     if (!ctx) return;

    //     const { parent, index, $pos } = ctx;
    //     const leftNode = this.node;
    //     const rightNode = parent.child(index + 1);

    //     const containerWidth = (this.dom.parentElement as HTMLElement).offsetWidth;
    //     const startLeftRatio = leftNode.attrs.ratio;
    //     const startRightRatio = rightNode.attrs.ratio;

    //     const onMouseMove = (moveEvent: MouseEvent) => {
    //         const deltaR = (moveEvent.clientX - startX) / containerWidth;
    //         const newLeftR = Math.max(0.05, startLeftRatio + deltaR);
    //         const newRightR = Math.max(0.05, startRightRatio - deltaR);

    //         // 實時優化：直接改 DOM 樣式
    //         const offset = (10 * (parent.childCount + 1)) / parent.childCount;
    //         this.dom.style.width = `calc(${newLeftR * 100}% - ${offset}px)`;
    //         if (this.dom.nextElementSibling?.nextElementSibling) {
    //             // 跳過 resizer widget 找到下一個 column DOM
    //             (this.dom.nextElementSibling.nextElementSibling as HTMLElement).style.width =
    //                 `calc(${newRightR * 100}% - ${offset}px)`;
    //         }
    //     };

    //     const onMouseUp = (upEvent: MouseEvent) => {
    //         const deltaR = (upEvent.clientX - startX) / containerWidth;
    //         const tr = this.view.state.tr;
    //         const leftPos = this.getPos();
    //         const rightPos = leftPos + this.node.nodeSize;

    //         // 提交數據，觸發協同更新
    //         tr.setNodeMarkup(leftPos, undefined, { ...leftNode.attrs, ratio: startLeftRatio + deltaR });
    //         tr.setNodeMarkup(rightPos, undefined, { ...rightNode.attrs, ratio: startRightRatio - deltaR });

    //         this.view.dispatch(tr);
    //         document.removeEventListener('mousemove', onMouseMove);
    //         document.removeEventListener('mouseup', onMouseUp);
    //     };

    //     document.addEventListener('mousemove', onMouseMove);
    //     document.addEventListener('mouseup', onMouseUp);
    // }

    // addNewColumn() {
    //     // 具體新增邏輯：計算平分比例並插入新 column 節點
    //     const { state, dispatch } = this.view;
    //     const ctx = this.getContext();
    //     if (!ctx) {
    //         return;
    //     }

    //     const tr = state.tr;
    //     const n = ctx.parent.childCount + 1;
    //     const newRatio = 1 / n;

    //     // 更新所有舊列比例
    //     let curPos = ctx.$pos.before();
    //     ctx.parent.forEach((node, offset) => {
    //         tr.setNodeMarkup(curPos + 1 + offset, undefined, { ...node.attrs, ratio: newRatio });
    //     });

    //     // 插入新列
    //     const newNode = state.schema.nodes.column.createAndFill({ ratio: newRatio });
    //     tr.insert(ctx.$pos.after() - 1, newNode);
    //     dispatch(tr);
    // }
}