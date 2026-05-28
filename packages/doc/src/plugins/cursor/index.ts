import { type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { CLASSNAME } from '../../config';
import './index.less';

export const cursorKey = new PluginKey('basic');

export const cursor = ({ editor }: any) => {
    // 建议定义单例 DOM，避免重复创建
    const cursorDom = document.createElement('span');
    cursorDom.className = `${CLASSNAME}-cursor`;

    const plugin: Plugin = new Plugin({
        key: cursorKey,
        state: {
            init: () => ({
                pos: null
            }),
            // 在插件 state 中存一个布尔值 isActive
            apply(tr: Transaction, preValue: any) {
                const meta = tr.getMeta('cursor');
                if (meta === true) {
                    return {
                        pos: tr.selection.from
                    };
                }
                if (meta === false) {
                    return {
                        pos: null
                    };
                }
                if (meta) {
                    return {
                        pos: typeof meta.pos === 'number' ? tr.mapping.map(meta.pos) : null
                    };
                }
                return preValue;
            }
        },
        props: {
            handleDOMEvents: {
                focus(view: EditorView): boolean {
                    // const pos = view.state.selection.from;
                    const transaction = editor.view.state.tr.setMeta('cursor', { 
                        pos: null
                    }).setMeta('addToHistory', false);
                    view.dispatch(transaction);
                    return false;
                },
                blur(view: EditorView): boolean {
                    const pos = view.state.selection.from;
                    const transaction = editor.view.state.tr.setMeta('cursor', {
                        pos
                    }).setMeta('addToHistory', false);
                    view.dispatch(transaction);
                    return false;
                }
            },
            decorations(state) {
                const { pos } = this.getState(state);
                if (typeof pos !== 'number') {
                    return null;
                }
                return DecorationSet.create(state.doc, [ Decoration.widget(pos, cursorDom) ]);
            }
            // decorations(state) {
            //     // 1. 判断编辑器是否失去焦点（通常模拟光标只在失去焦点时显示）
            //     // 如果你想一直显示，可以去掉这个判断
            //     // const isFocused = view.hasFocus(); 

            //     const { selection } = state;
                
            //     // 2. 只有在“光标”（TextSelection）且未选中范围时显示
            //     if (!selection.empty) {
            //         return DecorationSet.empty;
            //     }

            //     const pos = selection.from;

            //     // 3. 健壮性检查：确保位置在文档范围内
            //     if (pos < 0 || pos > state.doc.content.size) {
            //         return DecorationSet.empty;
            //     }

            //     // 使用 Widget 避免 inline(pos, pos+1) 的越界崩溃问题
            //     return DecorationSet.create(state.doc, [
            //         Decoration.widget(pos, cursorDom, { 
            //             key: 'dynamic-fake-cursor',
            //             side: -1 
            //         })
            //     ]);
            // }
        }
    });
    return plugin;
}