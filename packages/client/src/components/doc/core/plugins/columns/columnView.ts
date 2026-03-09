class ColumnView {
    constructor(node, view, getPos) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;

        this.dom = document.createElement("div");
        this.dom.className = "docx-grid_column-block";

        // 内容区域
        this.contentDOM = document.createElement("div");
        this.dom.appendChild(this.contentDOM);

        // 创建全能控制条
        this.controlBar = document.createElement("div");
        this.controlBar.className = "column-control-bar";
        this.dom.appendChild(this.controlBar);

        // 绑定统一的点击/按下入口
        this.controlBar.addEventListener("mousedown", this.handleMouseDown.bind(this));

        this.updateStatus();
    }

    updateStatus() {
        const pos = this.getPos();
        if (typeof pos !== "number") return;

        const $pos = this.view.state.doc.resolve(pos);
        this.isLast = $pos.index() === $pos.parent.childCount - 1;

        // 样式切换：最后一列显示“+”号或特定颜色，中间列显示竖线
        if (this.isLast) {
            this.controlBar.classList.add("is-last-column");
            this.controlBar.title = "点击添加新列";
        } else {
            this.controlBar.classList.remove("is-last-column");
            this.controlBar.title = "左右拖动调整宽度";
        }

        // 依然维持 calc 布局计算
        this.refreshWidth($pos.parent.childCount);
    }

    handleMouseDown(e) {
        if (this.isLast) {
            // 逻辑 A: 最后一列点击触发新增
            this.addNewColumn();
        } else {
            // 逻辑 B: 中间列触发拖拽 Resize
            this.startResizing(e);
        }
    }

    addNewColumn() {
        const { state, dispatch } = this.view;
        const $pos = state.doc.resolve(this.getPos());
        const parent = $pos.parent;

        // 重新计算所有列的百分比 (例如平分)
        const newCount = parent.childCount + 1;
        const newWidth = (100 / newCount).toFixed(4);

        let tr = state.tr;
        // 1. 更新现有所有列的宽度
        parent.forEach((node, offset, index) => {
            tr.setNodeMarkup($pos.before() + 1 + offset, null, { ...node.attrs, width: newWidth });
        });
        // 2. 在末尾插入新列
        const newNode = state.schema.nodes.column.createAndFill({ width: newWidth });
        tr.insert($pos.after() - 1, newNode);

        dispatch(tr);
    }

    onMouseDown(e) {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.node.attrs.width;

        // 获取下一列的信息
        const $pos = this.view.state.doc.resolve(this.getPos());
        const nextNode = $pos.nodeAfter;
        if (!nextNode) return;
        const nextStartWidth = nextNode.attrs.width;

        const onMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const containerWidth = this.dom.parentElement.offsetWidth;
            const deltaPercent = (deltaX / containerWidth) * 100;

            // 计算新比例
            const newWidth = Math.max(10, startWidth + deltaPercent);
            const newNextWidth = Math.max(10, nextStartWidth - deltaPercent);

            // 实时更新两列的 Width 属性
            const tr = this.view.state.tr;
            tr.setNodeMarkup(this.getPos(), null, { ...this.node.attrs, width: newWidth });
            tr.setNodeMarkup(this.getPos() + this.node.nodeSize, null, { ...nextNode.attrs, width: newNextWidth });
            this.view.dispatch(tr);
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    updateStyle() {
        const { width, totalGap } = this.node.attrs;
        const compensation = (totalGap * (width / 100)).toFixed(4);
        this.dom.style.width = `calc(${width}% - ${compensation}px)`;
    }

    update(node) {
        if (node.type !== this.node.type) return false;
        this.node = node;
        this.updateStyle();
        return true;
    }
}