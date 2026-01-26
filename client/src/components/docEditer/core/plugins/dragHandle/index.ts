import { Plugin, PluginKey } from 'prosemirror-state';
import { 
    // NodeSelection, 
    TextSelection 
} from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { setAlignPos } from '@/components/utils/align';
import type { Node } from 'prosemirror-model';
import {
    // newlineInCode,
    // createParagraphNear,
    // liftEmptyBlock,
    splitBlock
} from 'prosemirror-commands';
// import Editor from '../../editor';
import { CLASSNAME } from '@/global';
import './index.less';

const getOuterNode = (doc: Node, pos: number): Node | null => {
    const node = doc.nodeAt(pos);
    const resolvedPos = doc.resolve(pos);

    let { depth } = resolvedPos;
    let parent = node;

    while (depth > 0) {
        const currentNode = resolvedPos.node(depth);

        depth -= 1;

        if (depth === 0) {
            parent = currentNode;
        }
    }
    return parent;
}

const getOuterNodePos = (doc: Node, pos: number): number => {
    const resolvedPos = doc.resolve(pos);
    const { depth } = resolvedPos;

    if (depth === 0) {
        return pos;
    }

    const a = resolvedPos.pos - resolvedPos.parentOffset;

    return a - 1;
}

const removeNode = (node: HTMLElement) => {
    node.parentNode?.removeChild(node);
}

const findClosestTopLevelBlock = (element: any, view: EditorView): HTMLElement | undefined => {
    let current: Element | null = element;
    while (current?.parentElement && current.parentElement !== view.dom) {
        current = current.parentElement;
    }
    return current?.parentElement === view.dom ? (current as HTMLElement) : undefined;
}

const dragHandle = ({ editor }: any) => {
    let activeNode: any;
    let activeNodePos: any;
    let locked: boolean = false;
    let pendingMouseCoords: any = {
        x: 0,
        y: 0
    };
    // let currentNode: Node | null = null;
    // let currentNodePos = -1;
    // let currentNodeRelPos: any;

    const showHandle = () => {
        if (!el) {
            return;
        }

        // if (!editor.isEditable) {
        //     hideHandle();
        //     return;
        // }

        el.style.visibility = '';
        el.style.pointerEvents = 'auto';
    }

    const hideHandle = () => {
        if (!el) {
            return;
        }

        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
    }

    const el = document.createElement('div');
    el.className = `${ CLASSNAME }-drag-handle`;
    el.innerHTML = `
                <div class="${ CLASSNAME }-drag-handle-button-group">
                    <button class="${ CLASSNAME }-drag-handle-button add">
                        <svg width="24" height="24" class="${ CLASSNAME }-drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z" fill="currentColor"></path></svg>
                    </button>
                    <button class="${ CLASSNAME }-drag-handle-button drag" draggable=true>
                        <svg width="24" height="24" class="${ CLASSNAME }-drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" fill="currentColor"></path><path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" fill="currentColor"></path><path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" fill="currentColor"></path><path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" fill="currentColor"></path><path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" fill="currentColor"></path><path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" fill="currentColor"></path></svg>
                    </button>
                </div>`;
    const plugin: Plugin = new Plugin({
        key: new PluginKey('dragHandle'),
        view(view: EditorView) {
            // console.log('init view', view.dom);
            // const { state, dispatch } = view;
            // const { tr, doc, schema, selection } = state;
            document.body.appendChild(el);
            el.querySelector('.add')?.addEventListener('click', () => {
                const { state, dispatch } = view;
                const tr = state.tr;
                const pos = activeNodePos + activeNode.nodeSize;
                const newSelection = TextSelection.create(tr.doc, pos - 1);
                const newTr = tr.setSelection(newSelection);
                view.focus();
                // const newState = state.applyTransaction(tr);

                // if (newlineInCode(state, dispatch, view)) {
                //     return true;
                // }
                // if (createParagraphNear(state, dispatch, view)) {
                //     return true;
                // }
                // if (liftEmptyBlock(state, dispatch, view)) {
                //     return true;
                // }
                console.log('view', view);
                splitBlock({
                    selection: newSelection,
                    tr: newTr
                } as any, dispatch);
                // // console.log('...add', activeNode, view, view.state.selection);
                // const tr = view.state.tr;
                // const newNode = view.state.schema.nodes.slash.create();
                // const pos = activeNodePos + activeNode.nodeSize;
                // tr.insert(pos, newNode);
                // tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                // view.focus();
                // view.dispatch(tr);
                // // tr.setSelection(TextSelection.create(tr.doc, pos));
                // // view.focus();
            }, false);
            el.querySelector('.drag')?.addEventListener('click', () => {
                console.log('...drag');
            }, false);
            hideHandle();
            return {
                update(view: EditorView, prevState: EditorState) {
                    // console.log('update dragHandle');
                    // if (!editor.isEditable) {
                    //     hideHandle();
                    //     return;
                    // }
                },
                destroy() {
                    if (el) {
                        removeNode(el);
                    }
                }
            };
        },
        state: {
            init() {
                return {
                    locked: false
                };
            },
            apply(tr: Transaction, value: any, prevState: EditorState, state: EditorState) {
                // console.log('apply dragHandle', tr.getMeta('lockDragHandle'))
                return value;
            }
        },
        props: {
            handleDOMEvents: {
                // dragstart: (view, event) => {
                //     event.preventDefault();
                //     event.stopPropagation();
                //     return true;
                // },
                mousemove(view, e) {
                    if (!el || locked) {
                        return false;
                    }
                    pendingMouseCoords = { x: e.clientX, y: e.clientY };
                    const block = findClosestTopLevelBlock(e.target, view);
                    // console.log('findClosestTopLevelBlock', el);
                    if (block) {
                        const domNodePos = view.posAtDOM(block, 0);
                        const outerNode = getOuterNode(view.state.doc, domNodePos);
                        const outerNodePos = getOuterNodePos(view.state.doc, domNodePos); // TODO: needed?
                        activeNode = outerNode;
                        activeNodePos = outerNodePos;
                        setAlignPos(el, block, 'tr-tl');
                        showHandle();
                    }
                    // console.log('mousemove', pendingMouseCoords);
                    return false;
                },
                mouseleave(view, e) {
                    if (e.target && !el.contains(e.relatedTarget as HTMLElement)) {
                        hideHandle();
                    }
                }
            }
        }
    });
    return plugin;
}
export default dragHandle;