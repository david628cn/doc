import { type EditorState, type Transaction, Plugin, PluginKey, NodeSelection, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Selection } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';
import { posToDOMRect } from '@/components/doc/core/utils';
import { getPosition, isValidPosition } from '@/components/utils/align';
// import { CLASSNAME } from '@/global';
import './index.less';

export const pluginKey = new PluginKey('selection');

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
        ).setMeta('selection', { active: false });
        editor.view.dispatch(tr);
    }
    const onMouseUp = (e: Event) => {
        let timer: any;
        timer = setTimeout(() => {
            clearTimeout(timer);
            const { state } = editor.view;
            const { doc, selection } = state;
            const { node, from, to, $from, empty } = selection;
            // const cotent = state.doc.textBetween(from, to);
            // const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, null, '\0')
            const isEmptyTextBlock = !doc.textBetween(from, to).length && selection instanceof TextSelection;
            const isCodeBlock = $from.parent.type.spec.code || (selection instanceof NodeSelection && node.type.spec.code);
            const isExcludedNode = selection instanceof NodeSelection && ['imageUpload', 'horizontalRule'].includes(node.type.name);
            const isTableCell = selection instanceof CellSelection;
            let tr: Transaction;
            // console.log('editor.view.hasFocus()', from, to);
            if (editor.view.hasFocus() && !empty && from !== to && !isEmptyTextBlock && !isCodeBlock && !isExcludedNode && !isTableCell) {
                tr = state.tr.setMeta('selection', { active: true });
            } else {
                tr = state.tr.setMeta('selection', { active: false });
            }
            editor.view.dispatch(tr);
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
        key: pluginKey,
        view(view: EditorView) {
            clearEvents();
            addEvent();
            return {
                update(view: EditorView, prevState: EditorState) {
                    const next = plugin.getState(view.state);
                    const { from, to } = view.state.selection;
                    let rect = null;
                    let active = next.active;
                    if (from === to) {
                        active = false;
                    }
                    if (active) {
                        rect = posToDOMRect(view, from, to);
                    }
                    editor.emit('action', {
                        type: 'selection',
                        data: {
                            active: next.active,
                            rect
                        }
                    });
                },
                destroy() {
                    clearEvents();
                }
            };
        },
        state: {
            init(config: any, instance: EditorState) {
                return {
                    active: false
                }
            },
            apply(tr: Transaction, preValue: any, oldState: EditorState, newState: EditorState) {
                const meta = tr.getMeta('selection');
                if (meta) {
                    return meta;
                }
                const { selection } = tr;
                const { from, to } = selection;
                const newValue = {
                    ...preValue
                };
                if (!editor.editable || from === to || !editor.view.hasFocus()) {
                    newValue.active = false;
                }
                return newValue;
            }
        },
        props: {
            handleKeyDown(view: EditorView, event: any) {
                const { state } = view;
                let tr: Transaction;
                tr = state.tr.setMeta('selection', { active: true });
                editor.view.dispatch(tr);
            },
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