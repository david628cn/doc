import { Plugin, PluginKey } from 'prosemirror-state';
import { Slice, Fragment } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

export const basicKey = new PluginKey('basic');

export const basic = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: basicKey,
        props: {
            handleDOMEvents: {
                focus(view: EditorView, event: Event): boolean {
                    editor.isFocused = true;
                    const transaction = editor.view.state.tr.setMeta('focus', { event }).setMeta('addToHistory', false);
                    view.dispatch(transaction);
                    return false;
                },
                blur(view: EditorView, event: Event): boolean {
                    editor.isFocused = false;
                    const transaction = editor.view.state.tr.setMeta('blur', { event }).setMeta('addToHistory', false);
                    view.dispatch(transaction);
                    return false;
                }
                // mouseup(view: EditorView, event: Event) {
                //     const transaction = editor.view.state.tr.setMeta('selection', { event }).setMeta('addToHistory', false);
                //     view.dispatch(transaction);
                // },
                // touchend(view: EditorView, event: Event) {

                // },
                // touchcancel(view: EditorView, event: Event) {

                // }
            },
            // transformPasted(slice, view) {
            //     const { schema } = view.state;
            //     const wrapperType = schema.nodes.wrapper; // 假设你的包裹节点叫 wrapper

            //     // 1. 如果粘贴的内容已经包含在 wrapper 里，则不重复包裹
            //     if (slice.content.firstChild?.type === wrapperType) {
            //         return slice;
            //     }

            //     // 2. 创建包裹节点，并将粘贴的片段（Fragment）作为其内容
            //     // 注意：Fragment.from(slice.content) 保证了所有粘贴的 block 都在一个容器内
            //     const wrappedNode = wrapperType.create(null, slice.content);
            //     // 3. 返回一个新的 Slice，openStart 和 openEnd 通常设为 0 
            //     // 这样可以确保包裹节点是一个完整的闭合结构
            //     return new Slice(Fragment.from(wrappedNode), 0, 0);
            // }
        }
    });
    return plugin;
}