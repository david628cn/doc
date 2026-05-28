import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { CLASSNAME } from '../../config';
import './index.less';

// const addColumnManual = (view: EditorView, parentPos: number) => {
//     const { state } = view;
//     const parentNode = state.doc.nodeAt(parentPos)!;
//     const n = parentNode.childCount;

//     // 计算平分后的新比例
//     const newRatio = 100 / (n + 1);
//     const tr = state.tr;

//     // 1. 更新现有所有列的比例
//     let offset = 1;
//     parentNode.forEach((child) => {
//         tr.setNodeMarkup(parentPos + offset, null, {
//             ...child.attrs,
//             ratio: newRatio
//         });
//         offset += child.nodeSize;
//     });

//     // 2. 在末尾插入新列
//     const newNode = state.schema.nodes.column.create({ ratio: newRatio });
//     tr.insert(parentPos + offset, newNode);

//     view.dispatch(tr);
// };

const startResizing = (e: MouseEvent, view: EditorView, parentPos: number, index: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const parentNode = view.state.doc.nodeAt(parentPos)!;
    const containerDOM = view.nodeDOM(parentPos) as HTMLElement;
    const containerWidth = containerDOM.offsetWidth;

    // 初始数据
    const startLeftRatio = parentNode.child(index).attrs.ratio || (1 / parentNode.childCount);
    const startRightRatio = parentNode.child(index + 1).attrs.ratio || (1 / parentNode.childCount);
    const combinedRatio = startLeftRatio + startRightRatio;

    // 记录最终比例，供 MouseUp 使用
    let finalLeftRatio = startLeftRatio;
    let finalRightRatio = startRightRatio;

    const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaRatio = Math.floor((deltaX / containerWidth) * 100);

        finalLeftRatio = Math.max(10, startLeftRatio + deltaRatio);
        finalRightRatio = combinedRatio - finalLeftRatio;

        if (finalRightRatio < 10) {
            finalRightRatio = 10;
            finalLeftRatio = combinedRatio - 10;
        }

        // 构造当前 columns 的全量临时比例
        const ratios: number[] = [];
        parentNode.forEach((child, _, i) => {
            if (i === index) {
                ratios.push(finalLeftRatio);
            } else if (i === index + 1) {
                ratios.push(finalRightRatio);
            } else {
                ratios.push(child.attrs.ratio);
            }
        });

        // 【关键】更新插件状态但不改文档数据
        //  setMeta(columnsPluginKey, ...) 会触发 state.apply，从而触发 props.decorations 重新渲染
        view.dispatch(view.state.tr
            .setMeta(columnsPluginKey, { pos: parentPos, ratios })
            .setMeta('addToHistory', false)
        );
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        let tr = view.state.tr;

        // 1. 先清除插件的临时拖拽状态 (pos 和 ratios)
        tr = tr.setMeta(columnsPluginKey, { pos: null, ratios: null });

        // 2. 正确计算子节点在文档中的绝对位置
        let currentLeftPos = parentPos + 1;
        // 遍历到 index 所在的节点位置
        for (let i = 0; i < index; i++) {
            currentLeftPos += parentNode.child(i).nodeSize;
        }
        const leftNodePos = currentLeftPos;
        const rightNodePos = currentLeftPos + parentNode.child(index).nodeSize;

        // 3. 提交持久化数据 (Attrs)
        // 注意：如果 finalLeftRatio 有很多小数，建议在此处 Math.round() 或 toFixed(2)
        tr = tr.setNodeMarkup(leftNodePos, null, {
            ...parentNode.child(index).attrs,
            ratio: finalLeftRatio
        });
        tr = tr.setNodeMarkup(rightNodePos, null, {
            ...parentNode.child(index + 1).attrs,
            ratio: finalRightRatio
        });

        // 4. 一次性派发
        view.dispatch(tr);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};

export const columnsPluginKey = new PluginKey('columns');

export const columns = ({
    editor
}: any) => {
    const plugin: Plugin = new Plugin({
        key: columnsPluginKey,
        state: {
            init: () => ({
                pos: null, // 正在拖拽的 columns 节点位置
                ratios: null // 拖拽中的临时比例数组
            }),
            apply(tr: Transaction, preValue: any) {
                // 处理来自 startResizing 的临时状态更新
                const meta = tr.getMeta(columnsPluginKey);
                if (meta) {
                    return meta;
                }
                // 如果文档变了（非拖拽产生的），且正在拖拽，需要映射位置
                if (tr.docChanged && preValue.pos !== null) {
                    return {
                        ...preValue,
                        pos: tr.mapping.map(preValue.pos)
                    };
                }
                return preValue;
            }
        },
        props: {
            decorations: (state: EditorState) => {
                const decos: any[] = [];
                const pluginState = columnsPluginKey.getState(state);

                state.doc.descendants((node: Node, pos: number) => {
                    if (node.type.name === 'columns') {
                        let currentPos = pos + 1;
                        const resizing = pluginState?.pos === pos;
                        for (let i = 0; i < node.childCount; i++) {
                            const child = node.child(i);
                            const isSingleColumn = node.childCount === 1;
                            const isLast = i === node.childCount - 1;
                            let displayRatio = child.attrs.ratio;
                            if (resizing && pluginState && pluginState.ratios) {
                                displayRatio = pluginState.ratios[i];
                            }
                            const style = isSingleColumn || isLast ? `width: ${displayRatio}%;` : `width: calc(${displayRatio}% - 6px);`;
                            decos.push(
                                Decoration.node(currentPos, currentPos + child.nodeSize, {
                                    style
                                })
                            );

                            // // 渲染手柄（逻辑不变：只有 i < n-1 才有手柄）
                            if (i < node.childCount - 1) {
                                const handlePos = currentPos + child.nodeSize;
                                decos.push(
                                    Decoration.widget(handlePos, (view: EditorView) => {
                                        const handle = document.createElement('div');
                                        handle.className = `${CLASSNAME}-column-resizer-handle`;
                                        handle.onmousedown = (e) => startResizing(e, view, pos, i);
                                        return handle;
                                    }, { side: 1 })
                                );
                            }

                            currentPos += child.nodeSize;
                        }
                    }
                });
                return DecorationSet.create(state.doc, decos);
            }
        },
        appendTransaction(transactions: readonly Transaction[], _: EditorState, state: EditorState) {
            // 逻辑中，删除列后的长度重新分配是由 appendTransaction 自动完成的。这是一个“被动触发”的过程，逻辑链条如下：
            // 1. 触发机制
            // 当你删除一列时，ProseMirror 的文档发生了变化（tr.docChanged 为 true），这会触发 appendTransaction 执行。
            // 2. 重新分配的数学逻辑
            // 假设你原本有 3 列，比例分别是 [30, 40, 30]（总和 100）。
            // 当你删掉中间那列（40）后：
            // 统计剩余总和：插件遍历剩余的两列，得到 totalRatio = 30 + 30 = 60。
            // 计算缩放因子 (Multiplier)：
            // 目标是 100，当前是 60。
            // multiplier = 100 / 60 ≈ 1.6667。
            // 应用新比例：
            // 第一列新比例 = 30 * 1.6667 = 50。
            // 第二列新比例 = 30 * 1.6667 = 50。
            // 结果：剩下的两列会自动“平分”掉被删除列留下的空间，重新填满 100%。
            // 3. 特殊情况：删到只剩一列
            // 如果删到只剩一列，totalRatio 可能是 30：
            // multiplier = 100 / 30 ≈ 3.33。
            // 那一列的比例会被修正为 30 * 3.33 = 100。
            // 视觉效果：那一列会自动撑满整行。
            // 4. 为什么这样设计最好？
            // 这种方案（基于 multiplier 缩放）比简单的“平分”更聪明：
            // 保持相对比例：如果原本是一宽一窄（比如 [20, 80]），删掉 80 的那一列后，剩下的 20 会自动变 100。但如果是 [20, 20, 60] 删掉 60，剩下的两个 20 会等比放大成两个 50，维持了它们彼此之间 1:1 的关系。


            // 1. 仅当文档内容或 Meta 数据变化时触发
            if (!transactions.some(tr => tr.docChanged || tr.getMeta(columnsPluginKey))) {
                return null;
            }

            const tr: Transaction = state.tr;
            let modified = false;

            state.doc.descendants((node, pos) => {
                if (node.type.name === 'columns') {
                    const n = node.childCount;
                    if (n === 0) {
                        return;
                    }
                    if (n === 1) {
                        // 如果只剩一列，直接给 100，不需要算比例
                        const child = node.child(0);
                        if (Math.abs(child.attrs.ratio - 100) > 0.01) {
                            tr.setNodeMarkup(pos + 1, null, { ...child.attrs, ratio: 100 });
                            modified = true;
                        }
                    } else {
                        // 2. 统计当前总和（处理新列 ratio 为 undefined 的情况）
                        let totalRatio = 0;
                        node.forEach(child => {
                            // 如果是新插入的列，ratio 可能是 undefined，累加 0 触发归一化
                            totalRatio += (child.attrs.ratio || 0);
                        });

                        // 3. 判断是否偏离 100
                        // 如果 totalRatio 为 0 (全是新列) 或不等于 100，则修复
                        if (Math.abs(totalRatio - 100) > 0.01 || totalRatio === 0) {
                            const multiplier = totalRatio > 0 ? (100 / totalRatio) : (100 / n);
                            let childOffset = 1;

                            node.forEach((child) => {
                                // 如果原先没比例，则按 100/n 作为基数缩放
                                const oldRatio = child.attrs.ratio || (100 / n);
                                const newRatio = oldRatio * multiplier;

                                if (Math.abs(child.attrs.ratio - newRatio) > 0.01) {
                                    tr.setNodeMarkup(pos + childOffset, null, {
                                        ...child.attrs,
                                        ratio: newRatio
                                    });
                                    modified = true;
                                }
                                childOffset += child.nodeSize;
                            });
                        }
                    }
                }
            });
            return modified ? tr : null;
        }
    });

    return plugin;
}