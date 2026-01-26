import { type EditorState, type Transaction, Plugin, PluginKey, NodeSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Selection } from "prosemirror-state";
import { CLASSNAME } from '@/global';
import './index.less';

const posToDOMRect = (view: EditorView, from: number, to: number): DOMRect => {
    const minPos = 0
    const maxPos = view.state.doc.content.size;
    const resolvedFrom = Math.min(Math.max(from, minPos), maxPos);
    const resolvedEnd = Math.min(Math.max(to, minPos), maxPos);
    const start = view.coordsAtPos(resolvedFrom);
    const end = view.coordsAtPos(resolvedEnd, -1);
    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    const width = right - left;
    const height = bottom - top;
    const x = left;
    const y = top;
    const data = {
        top,
        bottom,
        left,
        right,
        width,
        height,
        x,
        y
    };

    return {
        ...data,
        toJSON: () => data
    };
}

const getSelectionBoundingRect = (view: EditorView): DOMRect | null => {
    const { selection } = view.state;
    const { ranges } = selection;

    const from = Math.min(...ranges.map((range: any) => range.$from.pos));
    const to = Math.max(...ranges.map((range: any) => range.$to.pos));

    if (selection instanceof NodeSelection) {
        const node = view.nodeDOM(from) as HTMLElement;
        if (node) {
            return node.getBoundingClientRect();
        }
    }

    return posToDOMRect(view, from, to);
}

const getPosition = (event: any) => {
    if (event.touches && event.touches.length) {
        return {
            x: event.touches[0].pageX,
            y: event.touches[0].pageY
        };
    } else if (event.changedTouches && event.changedTouches.length) {
        return {
            x: event.changedTouches[0].pageX,
            y: event.changedTouches[0].pageY
        };
    } else {
        return {
            x: event.pageX,
            y: event.pageY
        };
    }
}

export const pluginKeyRef = new PluginKey('selection');

const selection = ({ editor }: any) => {
    // let preData: any = {};
    let startPos = [0, 0];
    let endPos = [0, 0];

    const onMouseDown = (e: any) => {
        // if (e.button !== 0) {
        //     return;
        // }
        const { x, y } = getPosition(e);
        startPos[0] = x;
        startPos[1] = y;
        // const view = editor.view;
        // const state = view.state;
        // const posCoords = view.posAtCoords({
        //     left: x,
        //     top: y
        // });
        // if (!posCoords) {
        //     return;
        // }
        // const $pos = state.doc.resolve(posCoords.pos);
        // const nodeBefore = $pos.nodeBefore;

        // if (!nodeBefore || nodeBefore.isBlock) {
        //     return;
        // }
        // const tr = state.tr.setSelection(
        //     Selection.near(state.doc.resolve(posCoords.pos))
        // )
        // view.dispatch(tr);
        // console.log('selection onMouseDown');
        // editor.view.dispatch(editor.view.state.tr.setMeta(pluginKeyRef, 'onMouseDown'));
    }

    const onMouseUp = (e: any) => {
        const { x, y } = getPosition(e);
        endPos[0] = x;
        endPos[1] = y;

        if (startPos[0] === endPos[0] && startPos[1] === endPos[1]) {
            return;
        }

        const view = editor.view;
        const state = view.state;

        const { selection: nextSelection } = state.tr;
        const { ranges, empty, from, to } = nextSelection;

        const text = state.doc.textBetween(from, to);
        const rect = getSelectionBoundingRect(editor.view);
        if (!empty && text.length > 0) {
            editor.emit('selectionEnd', {
                text,
                visible: true,
                rect
            });
        }
        console.log('selection onMouseUp', text);
    }

    const addAllListeners = () => {
        document.addEventListener('mousedown', onMouseDown, false);
        document.addEventListener('touchstart', onMouseDown, { passive: false });

        document.addEventListener('mouseup', onMouseUp, false);
        document.addEventListener('touchend', onMouseUp, { passive: false });
        document.addEventListener('touchcancel', onMouseUp, { passive: false });
    }

    const removeAllListeners = () => {
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('touchstart', onMouseDown);

        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onMouseUp);
        document.removeEventListener('touchcancel', onMouseUp);
    }

    const plugin: Plugin = new Plugin({
        key: pluginKeyRef,
        view(view: EditorView) {
            removeAllListeners();
            addAllListeners();
            return {
                update(view: EditorView, prevState: EditorState) {
                    const prev = plugin.getState(prevState);
                    const next = plugin.getState(view.state);
                    console.log('selection update');
                },
                destroy() {
                    removeAllListeners();
                    console.log('selection destroy');
                }
            };
        },
        state: {
            init(config: any, instance: EditorState) {
                return {
                    id: `id_${Math.floor(Math.random() * 0xffffffff)}_${new Date().getTime()}`,
                    text: null,
                    // rect: null,
                    // visible: false,
                    changed: false
                }
            },
            apply(tr: Transaction, value: any, oldState: EditorState, newState: EditorState) {
                // editor.emit('selectionEnd', {
                //     rect: null,
                //     visible: false
                // });
                const prevSelection = oldState.selection;
                const newSelection = newState.selection;
                const changed = !prevSelection.eq(newSelection);
                const newValue = {
                    ...value,
                    changed
                };
                const { empty, from, to, } = newSelection;
                const text = newState.doc.textBetween(from, to);
                if (!empty && text.length > 0) {
                    // newValue.rect = getSelectionBoundingRect(editor.view);
                    newValue.text = text;
                } else {
                    // newValue.rect = null;
                    newValue.text = null;
                }
                newValue.id = `id_${Math.floor(Math.random() * 0xffffffff)}_${new Date().getTime()}`;
                console.log('selection apply', newValue);
                // removeAllListeners();
                // addAllListeners();
                // // const { state } = editor.view;
                // // const state = editor.view.state;
                // // const { selection } = state.tr;
                // // const { empty, from, to, } = selection;
                // // const text = state.doc.textBetween(from, to);
                // const prev = plugin.getState(prevState);
                // console.log('selection update', prev, selectionHasChanged);
                // return {
                //     ...prev,
                //     selectionHasChanged
                // }
                return newValue;
            }
        },
        props: {
            handleDOMEvents: {
                // selectstart(view: EditorView, e: any) {
                //     console.log('selectstart');
                //     return false;
                // },
                // select(view: EditorView, e: any) {
                //     console.log('select');
                //     return false;
                // },
                // mousedown(view: EditorView, e: any) {
                //     console.log('mousedown');
                //     return false;
                // },
                // mouseup(view: EditorView, e: any) {
                //     const state = editor.view.state;
                //     const { empty } = state;
                //     const stateValue = plugin.getState(state);
                //     const result = {
                //         ...stateValue
                //     };
                //     console.log('mouseup', stateValue);
                //     return false;
                // }
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
export default selection;