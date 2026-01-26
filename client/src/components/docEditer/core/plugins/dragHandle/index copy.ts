import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node } from 'prosemirror-model';
import { Editor } from '@/components/docEditer/core/editor';
import './index.less';

type FindElementNextToCoords = {
    x: number
    y: number
    view: EditorView
}

// const getRelativePos = (state: EditorState, absolutePos: number) => {
//     const ystate = ySyncPluginKey.getState(state)

//     if (!ystate) {
//         return null
//     }

//     return absolutePositionToRelativePosition(absolutePos, ystate.type, ystate.binding.mapping)
// }

const removeNode = (node: HTMLElement) => {
    node.parentNode?.removeChild(node);
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

const getOuterDomNode = (view: EditorView, domNode: HTMLElement) => {
    let tmpDomNode = domNode;

    // Traverse to top level node.
    while (tmpDomNode?.parentNode) {
        if (tmpDomNode.parentNode === view.dom) {
            break;
        }

        tmpDomNode = tmpDomNode.parentNode as HTMLElement;
    }

    return tmpDomNode;
}

const clampToContent = (view: EditorView, x: number, y: number, inset = 5): { x: number; y: number } => {
    const container = view.dom;
    const firstBlock = container.firstElementChild;
    const lastBlock = container.lastElementChild;

    if (!firstBlock || !lastBlock) {
        // this condition will never be met, as the first child element will be treated as last child element too
        return { x, y };
    }

    // Clamp Y between first and last block
    const topRect = firstBlock.getBoundingClientRect();
    const botRect = lastBlock.getBoundingClientRect();
    const clampedY = Math.min(Math.max(topRect.top + inset, y), botRect.bottom - inset);

    const epsilon = 0.5;
    const sameLeft = Math.abs(topRect.left - botRect.left) < epsilon;
    const sameRight = Math.abs(topRect.right - botRect.right) < epsilon;

    let rowRect: DOMRect = topRect;

    if (sameLeft && sameRight) {
        // Most of the time, every block has the same width
        rowRect = topRect;
    } else {
        // TODO
        // find the actual block at the clamped Y
        // This case is rare, avoid for now
    }

    // Clamp X to the chosen block’s bounds
    const clampedX = Math.min(Math.max(rowRect.left + inset, x), rowRect.right - inset);

    return { x: clampedX, y: clampedY };
}

const findClosestTopLevelBlock = (element: Element, view: EditorView): HTMLElement | undefined => {
    let current: Element | null = element;

    while (current?.parentElement && current.parentElement !== view.dom) {
        current = current.parentElement;
    }

    return current?.parentElement === view.dom ? (current as HTMLElement) : undefined;
}

const findElementNextToCoords = (
    options: FindElementNextToCoords,
): {
    resultElement: HTMLElement | null
    resultNode: Node | null
    pos: number | null
} => {
    const { x, y, view } = options;
    const state = view.state;

    const { x: clampedX, y: clampedY } = clampToContent(view, x, y, 5);

    const elements = view.root.elementsFromPoint(clampedX, clampedY);

    let block: HTMLElement | undefined;

    Array.prototype.some.call(elements, (el: Element) => {
        if (!view.dom.contains(el)) {
            return false;
        }
        const candidate = findClosestTopLevelBlock(el, view);
        if (candidate) {
            block = candidate;
            return true;
        }
        return false;
    })

    if (!block) {
        return { resultElement: null, resultNode: null, pos: null };
    }

    let pos: number;
    try {
        pos = view.posAtDOM(block, 0);
    } catch {
        return { resultElement: null, resultNode: null, pos: null };
    }

    const node = state.doc.nodeAt(pos);

    return {
        resultElement: block,
        resultNode: node,
        pos
    };
}

type PluginState = {
    locked: boolean
}

const DragHandlePlugin = (config?: any) => {
    let locked = false;
    let pendingMouseCoords = {
        x: 0,
        y: 0
    };
    let currentNode: Node | null = null;
    let currentNodePos = -1;
    let currentNodeRelPos: any;

    const showHandle = () => {
        if (!el) {
            return;
        }

        // if (!editor.isEditable) {
        //     hideHandle()
        //     return
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

    const repositionDragHandle = (dom: Element) => {
        const rect = dom.getBoundingClientRect();
        el.style.left = `${rect.x}px`;
        el.style.top = `${rect.y}px`;
        // const virtualElement = getReferencedVirtualElement?.() || {
        //     getBoundingClientRect: () => dom.getBoundingClientRect(),
        // };

        // computePosition(virtualElement, element, computePositionConfig).then(val => {
        //     Object.assign(el.style, {
        //         position: val.strategy,
        //         left: `${val.x}px`,
        //         top: `${val.y}px`,
        //     });
        // })
    }

    const wrap = document.createElement('div');
    wrap.className = 'drag-handle-wrap';
    const el = document.createElement('div');
    el.className = 'drag-handle';
    el.innerHTML = `
                <div class="drag-handle-button-group">
                    <button class="drag-handle-button">
                        <svg width="24" height="24" class="drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z" fill="currentColor"></path></svg>
                    </button>
                    <button class="drag-handle-button">
                        <svg width="24" height="24" class="drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" fill="currentColor"></path><path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" fill="currentColor"></path><path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" fill="currentColor"></path><path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" fill="currentColor"></path><path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" fill="currentColor"></path><path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" fill="currentColor"></path></svg>
                    </button>
                </div>`;
    wrap.appendChild(el);

    return new Plugin({
        key: new PluginKey('dragHandle'),
        view: (view: EditorView) => {
            console.log('init view', view.dom);
            view.dom.parentElement?.appendChild(wrap);
            hideHandle();
            return {
                update(_, oldState) {
                    console.log('update');
                },
                destroy() {
                    if (el) {
                        removeNode(wrap);
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
            apply(tr: Transaction, value: PluginState, oldState: EditorState, state: EditorState) {
                console.log('apply', tr.getMeta('lockDragHandle'))
                return value;
            }
        },
        props: {
            handleDOMEvents: {
                mousemove(view, e) {
                    if (!el || locked) {
                        return false;
                    }
                    pendingMouseCoords = { x: e.clientX, y: e.clientY };

                    const nodeData = findElementNextToCoords({
                        x: pendingMouseCoords.x,
                        y: pendingMouseCoords.y,
                        view
                    });

                    if (!nodeData.resultElement) {
                        return false;
                    }

                    let domNode = nodeData.resultElement;
                    domNode = getOuterDomNode(view, domNode);

                    // Skip if domNode is editor dom.
                    if (domNode === view.dom) {
                        return false;
                    }

                    // We only want `Element`.
                    if (domNode?.nodeType !== 1) {
                        return false;
                    }

                    const domNodePos = view.posAtDOM(domNode, 0);
                    const outerNode = getOuterNode(view.state.doc, domNodePos)
                    const outerNodePos = getOuterNodePos(view.state.doc, domNodePos) // TODO: needed?

                    currentNode = outerNode;
                    currentNodePos = outerNodePos;

                    // Memorize relative position to retrieve absolute position in case of collaboration
                    // currentNodeRelPos = getRelativePos(view.state, currentNodePos);

                    repositionDragHandle(domNode);
                    showHandle();
                    console.log('domNode?.nodeType', domNode?.nodeType);

                    return false;
                },
                mouseleave(view, e) {
                    if (e.target && !wrap.contains(e.relatedTarget as HTMLElement)) {
                        hideHandle();
                        currentNode = null;
                        currentNodePos = -1;
                    }
                }
            }
        }
    });
}
export default DragHandlePlugin;