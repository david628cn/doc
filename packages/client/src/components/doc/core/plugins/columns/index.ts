import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { CLASSNAME } from '@/global';
import './index.less';

export const columnsPluginKey = new PluginKey('columns');

export const columns = ({
    editor
}: any) => {
    const plugin: Plugin = new Plugin({
        key: columnsPluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {

                },
                destroy() {

                }
            };
        },
        props: {
            // nodeViews: {
            //     columns: (node: Node, view: EditorView, getPos: () => number) => new ColumnView(node, view, getPos)
            // } as any
            // const onMouseMove = (e) => {
            //     const deltaX = e.clientX - startX;
            //     const containerWidth = view.dom.offsetWidth;
            //     const deltaRatio = deltaX / containerWidth; // 核心：像素转比例

            //     const newLeftRatio = startLeftRatio + deltaRatio;
            //     const newRightRatio = startRightRatio - deltaRatio;

            //     // 实时更新 DOM 预览
            //     leftDOM.style.width = `calc(${newLeftRatio * 100}% - 5px)`;
            //     rightDOM.style.width = `calc(${newRightRatio * 100}% - 5px)`;
            // };
            decorations: (state: EditorState) => {
                const decos = [];
                state.doc.descendants((node, pos) => {
                    if (node.type.name === 'columns') {
                        let currentPos = pos + 1; // 跳向第一个子节点
                        for (let i = 0; i < node.childCount; i++) {
                            currentPos += node.child(i).nodeSize;
                            // 如果不是最后一栏，在当前位置插入 Widget
                            if (i < node.childCount - 1) {
                                decos.push(
                                    Decoration.widget(currentPos, (view: EditorView, getPos: () => number) => {
                                        const handle = document.createElement('div');
                                        handle.className = `${CLASSNAME}-resizer-handle`;
                                        // 绑定拖拽逻辑 (传入当前索引和位置)
                                        // handle.onmousedown = (e) => startResizing(e, view, getPos(), i);
                                        return handle;
                                    })
                                );
                            }
                        }
                    }
                });
                return DecorationSet.create(state.doc, decos);
            }
        }
    });

    return plugin;
}