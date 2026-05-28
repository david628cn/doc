import { Plugin, PluginKey, NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { CLASSNAME } from "../../config";
import './index.less';

export const nativeDragBridge = new Plugin({
    key: new PluginKey("nativeDragBridge"),
    props: {
        handleDrop: (view, event, slice, moved) => {
            // 🛡️ 防御墙 1：如果编辑器当前是“不可编辑/只读”状态，直接一枪崩掉 drop 放置，严禁篡改数据
            if (!view.editable) {
                event.preventDefault();
                return true; 
            }
            
            // ... (你原本正常的通用 handleDrop 搬家逻辑)
        },
        handleDOMEvents: {
            dragstart: (view, event: DragEvent) => {
                // 如果当前编辑器不可编辑（只读模式/预览模式）
                if (!view.editable) {
                    // 彻底切断浏览器的原生拖拽拉起动作，不让其弹出半透明跟随缩略图
                    event.preventDefault();
                    event.stopPropagation();
                    return true; // 告诉 ProseMirror 我们已经拦截了，底层不要再往下走
                }

                // ... (你原本正常的 dragstart 逻辑，如果有的话。若无直接返回 false 放行即可)
                return false;
            },
            // 捕获阶段：在表格等其他插件感知之前，最优先截获操作柄的按下
            mousedown: (view, event: MouseEvent) => {
                if (!view.editable) return false;
                if (event.button !== 0) return false;

                const target = event.target as HTMLElement;
                // 动态匹配你的配置 Class 类名把手
                const isHandle = target.classList.contains(`${CLASSNAME}-drag-block-handle`) || target.closest(`.${CLASSNAME}-drag-block-handle`);
                if (!isHandle) return false;

                // 1. 【强力防抢占】：强行阻止冒泡，彻底让表格 columnResizing 插件变瞎，防止其抢夺把手焦点 [INDEX]
                event.stopPropagation();

                // 2. 利用当前物理坐标，现场反查鼠标下方这整张大表格在内存中的精准首位置 pos [INDEX]
                const result = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (!result) return false;

                const $pos = view.state.doc.resolve(result.pos);
                let tableAbsolutePos = $pos.before(1); // 默认最外层一级

                // 沿着树状结构向上盘查，精准锁定名称正好叫 "table" 的顶级块级容器索引
                for (let d = $pos.depth; d > 0; d--) {
                    if ($pos.node(d).type.name === "table") {
                        tableAbsolutePos = $pos.before(d); // 像素级精确拿到大表格在 doc 里的起始位置 [INDEX]
                        break;
                    }
                }

                // 3. 🌟【核心修复点】：人工构造满足官方源码最高健康度预期的 NodeSelection 实例
                let officialNodeSelection: NodeSelection | null = null;
                try {
                    // 必须使用官方的原装构造器在内存中实例化，只有这个对象才能通过官方后续的类型盘查！
                    officialNodeSelection = NodeSelection.create(view.state.doc, tableAbsolutePos);
                    
                    // 同步将主选区也切换为这个整表选区，双重塞满官方的第一层漏斗
                    view.dispatch(view.state.tr.setSelection(officialNodeSelection));
                } catch (e) {
                    return false;
                }

                // 4. 🌟【时序与保险箱挂号】：顺应你 debug 出来的官方 handlers.dragstart 第二层漏斗
                const inputState = (view as any).input;
                if (inputState) {
                    // 强行把正确的、刚刚实例化的 officialNodeSelection 在官方 input 模块里登记挂号
                    inputState.mouseDown = {
                        done: () => {},
                        // 对齐官方第二层漏斗：把精准的表格位置 pos 喂进 mightDrag 中！ [INDEX]
                        mightDrag: { pos: tableAbsolutePos } 
                    };
                }

                // 5. 允许事件继续（return false）。
                // 此时浏览器自行动作，原生拖拽被拉起，官方源码的 handlers.dragstart 开始运行。
                // 由于我们在内存中提前通过第一选区、第二 mightDrag 铺平了道路，并补齐了符合官方规格的对象，
                // 官方源码在执行到 view.dragging = new Dragging(..., node) 时，
                // 这里的 node 变量将 100% 带有最权威的整表选区指纹，绝对不会再沦为 null！
                // 松手 drop 时，官方原装的 node.replace(tr) 将长驱直入，直接把老表格极其干净地连根拔起！ [INDEX]
                return false; 
            }
        }
    }
});


export type dragHandle = {
    container?: HTMLElement;
    view: EditorView;
    getPos: () => any;
    dom: any;
    contentDOM: HTMLElement;
    icon: any;
    onClick?: () => void;
    // onDragStart?: () => void;
    // onDragMove?: () => void;
    // onDragEnd?: () => void;
}

export const createDragHandle = ({
    container,
    view,
    dom,
    icon,
    getPos,
    contentDOM,
    onClick,
    // onDragStart,
    // onDragMove,
    // onDragEnd
}: dragHandle) => {
    const obj: any = {
        animationFrameId: null
    };
    obj.container = document.createElement('div');
    obj.container.className = `${CLASSNAME}-drag-handle-container`;
    obj.container.setAttribute('contenteditable', 'false'); // 核心防吞防护

    obj.container.innerHTML = `
                <div class="${CLASSNAME}-drag-handle-button-group" draggable="true">
                    ${ icon ? `<span class="${CLASSNAME}-drag-handle-button">${icon}</span>` : 
                    `<span class="${CLASSNAME}-drag-handle-button ${CLASSNAME}-drag-block-handle">
                        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" fill="currentColor"></path>
                            <path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" fill="currentColor"></path>
                            <path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" fill="currentColor"></path>
                            <path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" fill="currentColor"></path>
                            <path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" fill="currentColor"></path>
                            <path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" fill="currentColor"></path>
                        </svg>
                    </span>` }
                </div>`;

    // obj.addBtn = obj.container.querySelector(`.${CLASSNAME}-drag-handle-add`) as HTMLElement;
    obj.dragBtn = obj.container.querySelector(`.${CLASSNAME}-drag-handle-drag`) as HTMLElement;

    const handleClick = (e: MouseEvent) => {
        if (!view.editable) return false;
        e.preventDefault?.();
        onClick?.();
    };

    const handleMousedown = (e: MouseEvent) => {
        if (!view.editable) return false;
        if (e.button !== 0) return;
        e.stopPropagation(); // 阻止表格列宽等插件的事件抢夺
    }

    const handleDragstart = (e: DragEvent) => {
        if (!view.editable) return false;
        const { state, dispatch } = view;
        try {
            // 强制将当前行节点转化为最高权威的 NodeSelection
            // 这能确保在你贴出的官方源码中，首层漏斗被直接塞满！
            // 官方核心层会自动调用 .content() 把段落纯净地打包进 view.dragging
            const selection = NodeSelection.create(state.doc, getPos());
            dispatch(state.tr.setSelection(selection));
        } catch (err) {
            e.preventDefault(); // 失败则拒绝本次拖拽
            return;
        }
        // 2. 检查当前浏览器是否支持原生的 dataTransfer
        if (e.dataTransfer) {
            // 3. 核心机制：利用 setDragImage，把当前整行 DOM 树（this.dom）直接设为浏览器的全局拖拽影子！
            // 参数 1：作为快照源的 DOM 元素
            // 参数 2：快照在水平方向（X轴）相对鼠标指针的像素偏移量
            // 参数 3：快照在垂直方向（Y轴）相对鼠标指针的像素偏移量
            // 这里的 10, 10 代表让快照的左上角紧贴在鼠标指针右下方一点点，手感最顺滑
            e.dataTransfer.setDragImage(contentDOM, 10, 10);

            // 4. 设置允许的系统物理行为（对齐你发给我的官方源码配置）
            e.dataTransfer.effectAllowed = "copyMove";
        }
    }

    const handleDrag = (e: DragEvent) => {
        if (!view.editable) return false;
        // 过滤掉拖拽刚结束时浏览器扔出的最后一帧零坐标 (0, 0)
        if (e.clientX === 0 && e.clientY === 0) return;

        // 寻找带有局部滚动条的父容器（一般就是编辑器的直接父级 wrapper）
        const container = (view.dom.parentNode as HTMLElement) || document.documentElement;
        const rect = container.getBoundingClientRect();

        const threshold = 50; // 边缘敏感判定范围：50px
        const topEdge = rect.top + threshold;
        const bottomEdge = rect.bottom - threshold;

        let speed = 0;
        if (e.clientY < topEdge) {
            speed = -Math.max(1, (topEdge - e.clientY) / 3); // 靠近顶部向上滚
        } else if (e.clientY > bottomEdge) {
            speed = Math.max(1, (e.clientY - bottomEdge) / 3); // 靠近底部向下滚
        }

        if (speed !== 0) {
            // 停止上一次的动画帧，防止多重叠加卡顿
            if (obj.animationFrameId) cancelAnimationFrame(obj.animationFrameId);

            obj.animationFrameId = requestAnimationFrame(() => {
                container.scrollTop += speed;

                // 🌟 核心刷新：滚动后强制触发一次官方线插件的重新定位，防止蓝线跟丢
                const fakeDragOver = new DragEvent("dragover", {
                    clientX: rect.left + rect.width / 2,
                    clientY: e.clientY,
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: new DataTransfer()
                });
                view.dom.dispatchEvent(fakeDragOver);
            });
        }
    }

    const handleDragend = (e: any) => {
        if (!view.editable) return false;
        // e.preventDefault();
        // e.stopPropagation();
        if (obj.animationFrameId) {
            cancelAnimationFrame(obj.animationFrameId);
            obj.animationFrameId = null;
        }
    }
    // 记录上一个被激活的行节点
    // let lastHoveredBlock: any = null;

    // const handleMouseOver = (e: any) => {
    //     console.log('>>>');
    //     // 1. 自动寻找当前鼠标正指向的最内层 block 节点
    //     const currentBlock = e.target.closest(`.${CLASSNAME}-block-wrapper`);

    //     // 2. 如果鼠标当前指向的节点与上一次一致，不重复操作，提升性能
    //     if (currentBlock === lastHoveredBlock) return;

    //     // 3. 移除之前旧节点的激活类名
    //     if (lastHoveredBlock) {
    //         lastHoveredBlock.classList.remove(`${CLASSNAME}-is-block-hovered`);
    //     }

    //     // 4. 为当前绝对的最内层节点打上激活标签
    //     if (currentBlock) {
    //         currentBlock.classList.add(`${CLASSNAME}-is-block-hovered`);
    //     }

    //     lastHoveredBlock = currentBlock;
    // }

    // const handleMouseLeave = (e: any) => {
    //     if (lastHoveredBlock) {
    //         lastHoveredBlock.classList.remove(`${CLASSNAME}-is-block-hovered`);
    //         lastHoveredBlock = null;
    //     }
    // }

    // obj.container.addEventListener('mouseover', handleMouseOver);
    // obj.container.addEventListener('mouseleave', handleMouseLeave);

    obj.container.addEventListener('click',handleClick);

    // 3. 拦截 mousedown：强行阻止冒泡，彻底让表格 columnResizing 插件变瞎
    obj.container.addEventListener("mousedown", handleMousedown);

    // 4. 🌟 核心打通官方源码：当操作柄开始被拖拽的瞬间，强行在内存中同步选区
    obj.container.addEventListener("dragstart", handleDragstart);

    // 🌟 2. 【核心改进】：在拖拽高频移动时直接判定边界并强制滚动
    obj.container.addEventListener("drag", handleDrag);

    // 3. 拖拽结束：清理干净全局单例动画帧
    obj.container.addEventListener("dragend", handleDragend);

    if (container) {
        container.appendChild(obj.container);
    }

    obj.show = () => {
        obj.container.classList.add(`${CLASSNAME}-drag-handle-open`);
    }

    obj.hide = () => {
        obj.container.classList.remove(`${CLASSNAME}-drag-handle-open`);
    }

    obj.destroy = () => {
        obj.container.removeEventListener("click", handleClick);
        obj.container.removeEventListener("mousedown", handleMousedown);
        obj.container.removeEventListener("dragstart", handleDragstart);
        obj.container.removeEventListener("drag", handleDrag);
        obj.container.removeEventListener("dragend", handleDragend);
        // obj.container.removeEventListener('mouseover', handleMouseOver);
        // obj.container.removeEventListener('mouseleave', handleMouseLeave);
    }

    if (!view.editable) {
        obj.hide();
    } else {
        obj.show();
    }

    return obj;
}