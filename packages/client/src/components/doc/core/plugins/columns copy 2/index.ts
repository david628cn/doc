import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { CLASSNAME } from '@/global';
import './index.less';

// 1. 定义插件状态接口
// type ColumnsState = {
//     resizingPos: number | null;     // 正在拖拽的 columns 节点位置
//     activeRatios: number[] | null;  // 拖拽中的临时比例数组
// }

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

    console.log('finalLeftRatio', [finalLeftRatio, finalRightRatio]);

    const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaRatio = deltaX / containerWidth;

        finalLeftRatio = Math.max(0.1, startLeftRatio + deltaRatio);
        finalRightRatio = combinedRatio - (finalLeftRatio - startLeftRatio);

        console.log('move', [deltaX, finalLeftRatio]);

        if (finalRightRatio < 0.1) {
            finalRightRatio = 0.1;
            finalLeftRatio = combinedRatio - 0.1;
        }
        
        // 构造当前 columns 的全量临时比例
        const activeRatios: number[] = [];
        parentNode.forEach((child, _, i) => {
            if (i === index) {
                activeRatios.push(finalLeftRatio);
            } else if (i === index + 1) {
                activeRatios.push(finalRightRatio);
            } else {
                activeRatios.push(child.attrs.ratio);
            }
        });

        // 【关键】更新插件状态但不改文档数据
        // setMeta(columnsPluginKey, ...) 会触发 state.apply，从而触发 props.decorations 重新渲染
        view.dispatch(view.state.tr
            .setMeta(columnsPluginKey, { resizingPos: parentPos, activeRatios })
            .setMeta('addToHistory', false)
        );
    };

    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        // 1. 清除拖拽中的临时状态
        view.dispatch(view.state.tr.setMeta(columnsPluginKey, { resizingPos: null, activeRatios: null }));

        // 2. 正式提交文档事务（此时会产生历史记录）
        const tr = view.state.tr;
        let leftPos = parentPos + 1;
        for (let i = 0; i < index; i++) {
            leftPos += parentNode.child(i).nodeSize;
        }
        const rightPos = leftPos + parentNode.child(index).nodeSize;

        tr.setNodeMarkup(leftPos, null, { ratio: finalLeftRatio });
        tr.setNodeMarkup(rightPos, null, { ratio: finalRightRatio });
        view.dispatch(tr);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

export const columnsPluginKey = new PluginKey('columns');

export const columns = ({
    editor
}: any) => {
    const plugin: Plugin = new Plugin({
        key: columnsPluginKey,
        state: {
            init: () => ({ 
                resizingPos: null, 
                activeRatios: null 
            }),
            apply(tr, value) {
                // 处理来自 startResizing 的临时状态更新
                const meta = tr.getMeta(columnsPluginKey);
                if (meta) {
                    return meta;
                }
                // 如果文档变了（非拖拽产生的），且正在拖拽，需要映射位置
                if (tr.docChanged && value.resizingPos !== null) {
                    return { 
                        ...value, 
                        resizingPos: tr.mapping.map(value.resizingPos) 
                    };
                }
                return value;
            }
        },
        props: {
            decorations: (state: EditorState) => {
                const decos = [];
                const pluginState = columnsPluginKey.getState(state);

                state.doc.descendants((node: Node, pos: number) => {
                    if (node.type.name === 'columns') {
                        const isThisResizing = pluginState?.resizingPos === pos;
                        let currentPos = pos + 1;

                        for (let i = 0; i < node.childCount; i++) {
                            const child = node.child(i);
                            
                            // 【渲染逻辑】如果正在拖拽该组，取临时值，否则取 attrs
                            const displayRatio = (isThisResizing && pluginState?.activeRatios)
                                ? pluginState.activeRatios[i]
                                : (child.attrs.ratio || 1 / node.childCount);

                            decos.push(
                                Decoration.node(currentPos, currentPos + child.nodeSize, {
                                    style: `flex-grow: ${displayRatio};flex-basis: 0;`
                                })
                            );

                            // 渲染手柄
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
        appendTransaction(transactions: Transaction[], oldState: EditorState, state: EditorState) {
            // 1. 仅当文档内容或 Meta 数据变化时触发
            if (!transactions.some(tr => tr.docChanged || tr.getMeta(columnsPluginKey))) {
                return null;
            }

            const tr = state.tr;
            let modified = false;

            state.doc.descendants((node, pos) => {
                if (node.type.name === 'columns') {
                    const n = node.childCount;
                    if (n === 0) return;

                    // 2. 计算当前所有子项的 ratio 总和
                    let totalRatio = 0;
                    node.forEach(child => {
                        // 如果新插入的列没有 ratio，默认给 0（触发后续平分）
                        totalRatio += child.attrs.ratio || 0;
                    });

                    // 3. 自愈判断：如果总和偏离 1 (Notion 的核心逻辑)
                    if (Math.abs(totalRatio - 1) > 0.0001) {
                        const multiplier = totalRatio > 0 ? (1 / totalRatio) : (1 / n);
                        let childOffset = 1;

                        node.forEach((child) => {
                            // 如果 totalRatio 为 0，则强制平分 1/n
                            const oldRatio = child.attrs.ratio || (1 / n);
                            const newRatio = oldRatio * multiplier;

                            // 只有真正需要更新时才操作，防止死循环
                            if (Math.abs(child.attrs.ratio - newRatio) > 0.0001) {
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
            });

            return modified ? tr : null;
        }
    });

    return plugin;
}