import { type EditorState, type Transaction, Plugin, PluginKey, NodeSelection, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Selection } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';
import { posToDOMRect } from '@/components/docEditer/core/utils';
import { getPosition, isValidPosition } from '@/components/utils/align';
// import { CLASSNAME } from '@/global';
import './index.less';

// const getSelectionBoundingRect = () => {
//     const { selection } = this.view.state;
//     const { ranges } = selection;

//     const from = Math.min(...ranges.map((range: any) => range.$from.pos));
//     const to = Math.max(...ranges.map((range: any) => range.$to.pos));

//     if (selection instanceof NodeSelection) {
//         const node = this.view.nodeDOM(from) as HTMLElement;
//         if (node) {
//             return node.getBoundingClientRect();
//         }
//     }
//     return this.posToDOMRect(from, to);
// }

// const posToDOMRect(from: number, to: number): DOMRect = () => {
//     const minPos = 0
//     const maxPos = this.view.state.doc.content.size;
//     const resolvedFrom = Math.min(Math.max(from, minPos), maxPos);
//     const resolvedEnd = Math.min(Math.max(to, minPos), maxPos);
//     const start = this.view.coordsAtPos(resolvedFrom);
//     const end = this.view.coordsAtPos(resolvedEnd, -1);
//     const top = Math.min(start.top, end.top);
//     const bottom = Math.max(start.bottom, end.bottom);
//     const left = Math.min(start.left, end.left);
//     const right = Math.max(start.right, end.right);
//     const width = right - left;
//     const height = bottom - top;
//     const x = left;
//     const y = top;
//     const data = {
//         top,
//         bottom,
//         left,
//         right,
//         width,
//         height,
//         x,
//         y
//     };

//     return {
//         ...data,
//         toJSON: () => data
//     };
// }

export const selection = ({ editor }: any) => {
    // let is: any = null;
    const onMouseDown = (e: any) => {
        if (e.button !== 0 || !editor.view.dom.contains(e.target)) {
            // if (is === false) {
            //     is = true;
            // }
            // editor.emit('selection', {
            //     rect: null
            // });
            return;
        }
        const { left, top } = getPosition(e);
        const posCoords = editor.view.posAtCoords({
            left,
            top
        })

        if (!posCoords || !isValidPosition(posCoords.pos)) {
            return;
        }
        const { state } = editor.view;
        const $pos = state.doc.resolve(posCoords.pos);
        const nodeBefore = $pos.nodeBefore;
        if (!nodeBefore || nodeBefore.isBlock) {
            return;
        }
        const tr = state.tr.setSelection(
            Selection.near(state.doc.resolve(posCoords.pos))
        )
        editor.view.dispatch(tr);
    }
    const onMouseUp = (e: Event) => {
        let timer: any;
        timer = setTimeout(() => {
            clearTimeout(timer);
            const { state } = editor.view;
            const { doc, selection } = state;
            const { node, from, to, empty, $from } = selection;
            // const cotent = state.doc.textBetween(from, to);
            // const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, null, '\0')
            
            const isEmptyTextBlock = !doc.textBetween(from, to).length && selection instanceof TextSelection;
            const isCodeBlock = $from.parent.type.spec.code || (selection instanceof NodeSelection && node.type.spec.code);
            const isExcludedNode = selection instanceof NodeSelection && ['imageUpload', 'horizontalRule'].includes(node.type.name);
            const isTableCell = selection instanceof CellSelection;
            let rect = null;
            if (from !== to && (!isEmptyTextBlock && !isCodeBlock && !isExcludedNode && !isTableCell)) {
                rect = posToDOMRect(editor.view, from, to);
                if (!editor.view.hasFocus()) {
                    rect = null;
                }
            }
            editor.emit('selection', {
                rect
            });
        }, 10);
        
    }

    const addEvent = () => {
        const addEvent = document.addEventListener;
        addEvent('mousedown', onMouseDown, false);
        addEvent('touchstart', onMouseDown, { passive: false });

        addEvent('mouseup', onMouseUp, false);
        addEvent('touchend', onMouseUp, { passive: false });
        addEvent('touchcancel', onMouseUp, { passive: false });
    }

    const clearEvents = () => {
        const removeEvent = document.removeEventListener;
        removeEvent('mousedown', onMouseDown);
        removeEvent('touchstart', onMouseDown);

        removeEvent('mouseup', onMouseUp);
        removeEvent('touchend', onMouseUp);
        removeEvent('touchcancel', onMouseUp);
    }

    const plugin: Plugin = new Plugin({
        key: new PluginKey('selection'),
        view(view: EditorView) {
            clearEvents();
            addEvent();
            return {
                update(view: EditorView, prevState: EditorState) {

                },
                destroy() {
                    clearEvents();
                }
            };
        },
        state: {
            init(config: any, instance: EditorState) {
                return {
                    text: null,
                    rect: null
                }
            },
            apply(tr: Transaction, preValue: any, oldState: EditorState, newState: EditorState) {
                const newValue = {
                    ...preValue
                };

                return newValue;
            }
        },
        props: {
            decorations(state: EditorState) {
                // console.log('selection', state.selection.empty, state.selection instanceof NodeSelection);
                return null;

                // if (
                //     state.selection.empty ||
                //     state.selection instanceof NodeSelection
                // ) {
                //     return null;
                // }
                // return DecorationSet.create(state.doc, [
                //     Decoration.inline(state.selection.from, state.selection.to, {
                //         class: `${CLASSNAME}-selection`
                //     })
                // ]);
            }
        }
    });
    return plugin;
}