import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { CLASSNAME } from '../../config';

export class ColumnsView {
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
    node: Node;
    view: EditorView;
    getPos: () => number;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        // 1. 創建主容器
        this.dom = document.createElement('div');
        this.dom.classList.add(`${CLASSNAME}-columns-container`);
        this.dom.style.width = '100%';
        this.dom.style.position = 'relative';

        // 3. 初始化拖动柄
        // 2. 創建分欄內容容器（這是 ProseMirror 管理內容的地方）
        this.contentDOM = document.createElement('div');
        this.contentDOM.classList.add(`${CLASSNAME}-columns`);
        this.contentDOM.style.display = 'flex';
        this.contentDOM.style.width = '100%';
        this.contentDOM.style.position = 'relative';
        this.contentDOM.style.display = 'flex';
        this.contentDOM.style.flexWrap = 'wrap';
        this.contentDOM.style.flexGrow = '1';
        this.contentDOM.style.gap = `${this.node.attrs.gap}px`;
        this.contentDOM.style.background = '#fff';

        // 3. 插入「柄 (Handles)」
        // this.refreshHandles();

        this.dom.appendChild(this.contentDOM);
    }
    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }

        // 2. 關鍵：更新本地引用
        const oldNode = this.node;
        this.node = node;
console.log('???????');
        // 3. 邏輯判斷：只有當「影響結構」的屬性改變時，才執行昂貴的 DOM 操作
        if (this.node.childCount !== oldNode.childCount || this.node.attrs.gap !== oldNode.attrs.gap) {
            // this.refreshHandles(); // 只有欄數或間隙變了，才重新排布柄
            console.log('???????');
        }

        return true;
    }
    // refreshHandles() {
    //     // 1. 清除舊柄
    //     // this.dom.querySelectorAll('.column-handle').forEach(h => h.remove());

    //     const n = this.node.childCount;
    //     const gap = this.node.attrs.gap; // 與 CSS 的 gap 一致

    //     const firstHandle = this.createHandle('handle-first', 0);
    //     firstHandle.style.left = '0';
    //     this.dom.appendChild(firstHandle);

    //     // 3. 插入中間柄 (Between columns)
    //     let accumulatedRatio = 0;
    //     for (let i = 0; i < n - 1; i++) {
    //         const midHandle = this.createHandle('handle-mid', i + 1);
    //         /**
    //          * 核心公式說明：
    //          * 累積比例 * 100% 得到的點是在「沒有間隙」時的邊界。
    //          * 在有 gap 的 flex 佈局中，第 i 個間隙的中心點位置是：
    //          * (前 i 欄寬度總和) + (前 i-1 個 gap) + (第 i 個 gap 的一半)
    //          * 簡化為 calc 如下：
    //          */
    //         const colRatio = this.node.child(i).attrs.ratio; // 假設是 0.333
    //         accumulatedRatio += colRatio;
    //         const compensation = (gap * (n - 1) / n);
    //         midHandle.style.left = `calc(${accumulatedRatio * 100}% - ${compensation}px)`;

    //         this.dom.appendChild(midHandle);
    //     }

    //     const lastHandle = this.createHandle('handle-last', n);
    //     lastHandle.style.left = 'auto';
    //     lastHandle.style.right = '0';
    //     this.dom.appendChild(lastHandle);
    // }
    // createHandle(type: string, index: number) {
    //     const h = document.createElement("div");
    //     h.className = `${CLASSNAME}-column-handle ${type}`;
    //     h.contentEditable = 'false';
    //     h.dataset.index = `${index}`;
    //     h.style.width = `${this.node.attrs.gap}px`;
    //     h.style.height = `100%`;
    //     h.style.position = 'absolute';
    //     h.style.left = '0';
    //     h.style.top = '0';
    //     h.style.zIndex = '10';
    //     h.style.background = 'red';
    //     // 這裡綁定點擊插入或拖拽事件
    //     return h;
    // }
}