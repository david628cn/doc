import { Plugin, PluginKey } from 'prosemirror-state';
import {
    NodeSelection, 
    TextSelection
} from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { setAlignPos } from '@/components/utils/align';
import type { Node } from 'prosemirror-model';
// import {
//     // newlineInCode,
//     // createParagraphNear,
//     // liftEmptyBlock,
//     splitBlock
// } from 'prosemirror-commands';
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

// const findClosestTopLevelBlock = (element: any, view: EditorView): HTMLElement | undefined => {
//     let current: Element | null = element;
//     while (current?.parentElement && current.parentElement !== view.dom) {
//         current = current.parentElement;
//     }
//     return current?.parentElement === view.dom ? (current as HTMLElement) : undefined;
// }

const findClosestTopLevelBlock = (dom: any, view: EditorView) => {
    let curDom = dom;
    while (curDom && curDom !== view.dom) {
        if (curDom.getAttribute('data-block-id')) {
            return curDom;
        }
        curDom = curDom.parentElement;
    }
    return null;
}

const handleFactory: any = ({
    container,
    onAdd,
    onDragStart,
    onDragEnd,
    onDrop
}: any) => {

    const rs: any = {};

    const handleAdd = onAdd?.bind?.(rs);
    const handleDragStart = onDragStart?.bind?.(rs);
    const handleDragEnd = onDragEnd?.bind?.(rs);
    const handleDrop = onDrop?.bind?.(rs);

    const el = document.createElement('div');
    el.className = `${CLASSNAME}-drag-handle`;
    el.innerHTML = `
                <div class="${CLASSNAME}-drag-handle-button-group">
                    <button class="${CLASSNAME}-drag-handle-button add">
                        <svg width="24" height="24" class="${CLASSNAME}-drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z" fill="currentColor"></path></svg>
                    </button>
                    <button class="${CLASSNAME}-drag-handle-button drag" draggable=true>
                        <svg width="24" height="24" class="${CLASSNAME}-drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" fill="currentColor"></path><path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" fill="currentColor"></path><path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" fill="currentColor"></path><path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" fill="currentColor"></path><path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" fill="currentColor"></path><path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" fill="currentColor"></path></svg>
                    </button>
                </div>`;
    container.appendChild(el);
    rs.addBtn = el.querySelector('.add');
    rs.dragBtn = el.querySelector('.drag');
    rs.addBtn.addEventListener('click', handleAdd, false);
    rs.dragBtn.addEventListener('dragstart', handleDragStart);
    rs.dragBtn.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    rs.el = el;
    rs.show = (block: any) => {
        if (!rs.el) {
            return;
        }

        // if (!editor.isEditable) {
        //     hideHandle();
        //     return;
        // }

        rs.el.style.visibility = '';
        rs.el.style.pointerEvents = 'auto';

        setAlignPos(el, block, {
            placement: 'tr-tl',
            container: container
        });
    }

    rs.hide = () => {
        if (!rs.el) {
            return;
        }

        rs.el.style.visibility = 'hidden';
        rs.el.style.pointerEvents = 'none';
    }

    rs.destroy = () => {
        rs.addBtn.removeEventListener('click', handleAdd, false);
        rs.dragBtn.removeEventListener('dragstart', handleDragStart);
        rs.dragBtn.removeEventListener('dragend', handleDragEnd);
        document.removeEventListener('drop', handleDrop);
    }

    return rs;
}

export const dragHandle = ({ editor, container }: any) => {
    let activeDom: any;
    let activeNode: any;
    let activeNodePos: any;
    let wrapper: any;
    // let locked: boolean = false;
    // let pendingMouseCoords: any = {
    //     x: 0,
    //     y: 0
    // };

    const handle = handleFactory({
        container,
        onDragStart(e: any) {
            console.log('onDragEnd');
            // const { empty, $from, $to } = editor.view.state.selection;
            // const dragHandleRanges = getDragHandleRanges(event, editor, nestedOptions, dragContext)
            // const selection = NodeSelection.create(editor.view.state.tr.doc, activeNodePos);
            // editor.view.dispatch(editor.view.state.tr.setSelection(selection).scrollIntoView());
            // editor.view.focus();
            const clonedElement = activeDom.cloneNode(true);
            if (wrapper) {
                document.body.removeChild(wrapper);
            }
            wrapper = document.createElement('div');
            wrapper.append(clonedElement);
            // wrapper.className = 'ProseMirror';
            wrapper.style.position = 'absolute';
            wrapper.style.top = '-10000px';
            wrapper.style.maxWidth = '700px';
            // wrapper.style.transform = 'scale(0.2)';
            // wrapper.style.whitespace = 'break-spaces';
            // wrapper.style.wordWrap = 'break-word';
            // wrapper.style.borderRadius = '10px';
            // wrapper.style.backgroundColor = 'rgba(157,138,255,0.2)';
            document.body.append(wrapper);
            e.dataTransfer.clearData()
            e.dataTransfer.setDragImage(wrapper, 0, 0)    
            // let self = this;
            // let timer = setTimeout(() => {
            //     clearTimeout(timer);
            //     self.el.style.pointerEvents = 'none';
            // }, 0);
        },
        onDragEnd() {
            console.log('onDragEnd');
            this.hide();
        },
        onDrop() {
            console.log('onDrop');
            if (wrapper) {
                document.body.removeChild(wrapper);
                wrapper = null;
            }
            // this.el.style.pointerEvents = 'auto';
        }
    });
    
    const plugin: Plugin = new Plugin({
        key: new PluginKey('dragHandle'),
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    
                },
                destroy() {
                    handle.destroy();
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
                    
                    
                    if (editor.editable) {
                        // const eventPos = { x: e.clientX, y: e.clientY };
                        const block = findClosestTopLevelBlock(e.target, view);
                        if (block) {
                            const domNodePos = view.posAtDOM(block, 0);
                            const outerNode = getOuterNode(view.state.doc, domNodePos);
                            const outerNodePos = getOuterNodePos(view.state.doc, domNodePos);
                            activeDom = block;
                            activeNode = outerNode;
                            activeNodePos = outerNodePos;
                            handle.show(block);
                            // console.log('block>>>', outerNode, outerNodePos);
                        }
                    }
                    return false;
                },
                mouseleave(view, e) {
                    if (e.target && !handle.el.contains(e.relatedTarget as HTMLElement)) {
                        handle.hide();
                    }
                }
            }
        }
    });
    return plugin;
}