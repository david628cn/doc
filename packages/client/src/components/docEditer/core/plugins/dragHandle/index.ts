import { Plugin, PluginKey } from 'prosemirror-state';
import {
    NodeSelection,
    TextSelection
} from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { getPosition, getRect, setAlignPos } from '@/components/utils/align';
import { AutoScroller } from '@/components/dragDrop';
import type { Node } from 'prosemirror-model';
// import {
//     // newlineInCode,
//     // createParagraphNear,
//     // liftEmptyBlock,
//     splitBlock
// } from 'prosemirror-commands';
// import Editor from '../../editor';
import { getOuterNode, getOuterNodePos, closestBlock } from '@/components/docEditer/core/utils';
import { CLASSNAME } from '@/global';
import './index.less';



// const findClosestTopLevelBlock = (element: any, view: EditorView): HTMLElement | undefined => {
//     let current: Element | null = element;
//     while (current?.parentElement && current.parentElement !== view.dom) {
//         current = current.parentElement;
//     }
//     return current?.parentElement === view.dom ? (current as HTMLElement) : undefined;
// }

// const findClosestTopLevelBlock = (dom: any, view: EditorView) => {
//     let curDom = dom;
//     while (curDom && curDom !== view.dom) {
//         if (curDom.getAttribute('data-block-id')) {
//             return curDom;
//         }
//         curDom = curDom.parentElement;
//     }
//     return null;
// }

const handleFactory: any = ({
    container,
    onAdd,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onAutoScroll
}: any) => {

    const rs: any = {
        isShow: false
    };

    const handleAdd = onAdd?.bind?.(rs);
    const handleDragStart = onDragStart?.bind?.(rs);
    const handleDragEnd = onDragEnd?.bind?.(rs);
    const handleDrop = onDrop?.bind?.(rs);
    const handleDragOver = onDragOver?.bind?.(rs);
    const handleAutoScroll = onAutoScroll?.bind?.(rs);

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
    document.addEventListener('dragover', handleDragOver);
    rs.dragBtn.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    rs.el = el;

    const spaceEl = document.createElement('div');
    spaceEl.className = `${CLASSNAME}-drag-space`;
    container.appendChild(spaceEl);
    rs.spaceEl = spaceEl;

    console.log('container.parentElement', container.parentElement);

    rs.autoScroller = new AutoScroller(
        container.parentElement,
        handleAutoScroll
    );

    rs.spaceShow = (block: any) => {
        if (!rs.spaceEl) {
            return;
        }
        rs.spaceEl.style.display = 'block';
    }

    rs.spaceHide = () => {
        if (!rs.spaceEl) {
            return;
        }
        rs.spaceEl.style.display = 'none';
    }

    rs.show = (block: any) => {
        rs.isShow = true;
        if (!rs.el) {
            return;
        }
        // if (!editor.isEditable) {
        //     hideHandle();
        //     return;
        // }

        rs.el.style.display = 'block';
        rs.el.style.pointerEvents = 'auto';

        setAlignPos(el, block, {
            placement: 'tr-tl',
            gap: 0,
            container
        });
    }

    rs.hide = () => {
        rs.isShow = false;
        if (!rs.el) {
            return;
        }

        rs.el.style.display = 'none';
        rs.el.style.pointerEvents = 'none';
    }

    rs.destroy = () => {
        rs.addBtn.removeEventListener('click', handleAdd, false);
        rs.dragBtn.removeEventListener('dragstart', handleDragStart);
        document.removeEventListener('dragover', handleDragOver);
        rs.dragBtn.removeEventListener('dragend', handleDragEnd);
        document.removeEventListener('drop', handleDrop);
    }

    return rs;
}

export const dragHandle = ({ editor, container }: any) => {
    let activeDom: HTMLElement;
    let activeNode: Node;
    let activeNodePos: number;
    let placeNode: Node;
    let placeNodePos: number;
    let direction: string;
    let wrapper: HTMLElement;

    const handle = handleFactory({
        container,
        onDragStart(e: any) {
            const clonedElement = activeDom.cloneNode(true);
            if (wrapper) {
                document.body.removeChild(wrapper);
            }
            wrapper = document.createElement('div');
            wrapper.append(clonedElement);
            wrapper.style.position = 'absolute';
            wrapper.style.top = '-10000px';
            wrapper.style.maxWidth = '700px';
            document.body.append(wrapper);
            e.dataTransfer.clearData();
            e.dataTransfer.setDragImage(wrapper, 0, 0);
            if (this.autoScroller) {
                this.autoScroller.clear();
            }
        },
        onDragOver(e: any) {
            e.preventDefault();
            this.hide();
            this.spaceShow();
            if (editor.editable) {
                const view = editor.view;
                const state = view.state;
                const block = closestBlock(e.target);
                const rect = getRect(block);
                const eventPos = getPosition(e);
                if (block) {
                    const domNodePos = view.posAtDOM(block, 0);
                    const outerNode = getOuterNode(view.state.doc, domNodePos);
                    const outerNodePos = getOuterNodePos(view.state.doc, domNodePos);
                    placeNode = outerNode;
                    placeNodePos = outerNodePos;
                    if (eventPos.left < rect.left + rect.width * 0.25) {
                        // 左
                        this.direction = 'left';
                        this.spaceEl.style.width = '2px';
                        this.spaceEl.style.height = `${block.offsetHeight}px`;
                        setAlignPos(this.spaceEl, block, {
                            placement: 'tr-tl',
                            container
                        });
                    } else if (eventPos.left > rect.left + rect.width * 0.75) {
                        // 右
                        this.direction = 'right';
                        this.spaceEl.style.width = '2px';
                        this.spaceEl.style.height = `${block.offsetHeight}px`;
                        setAlignPos(this.spaceEl, block, {
                            placement: 'tl-tr',
                            container
                        });
                    } else if (eventPos.top < rect.top + rect.height / 2) {
                        // 上
                        this.direction = 'top';
                        this.spaceEl.style.width = `${block.offsetWidth}px`;
                        this.spaceEl.style.height = '2px';
                        setAlignPos(this.spaceEl, block, {
                            placement: 'tl-tl',
                            container
                        });
                    } else if (eventPos.top > rect.top + rect.height / 2) {
                        // 下
                        this.direction = 'bottom';
                        this.spaceEl.style.width = `${block.offsetWidth}px`;
                        this.spaceEl.style.height = '2px';
                        setAlignPos(this.spaceEl, block, {
                            placement: 'bl-bl',
                            container
                        });
                    }
                }
                const containerRect = getRect(container.parentElement);
                const minLeft = containerRect.left;
                const minTop = containerRect.top;
                const maxLeft = containerRect.right;
                const maxTop = containerRect.bottom;
                this.autoScroller.update({
                    width: containerRect.width,
                    height: 100,
                    minTranslate: {
                        x: minLeft,
                        y: minTop
                    },
                    maxTranslate: {
                        x: maxLeft,
                        y: maxTop
                    },
                    translate: {
                        x: eventPos.left,
                        y: eventPos.top
                    }
                    // translate: {
                    //     x: helperRect.left,
                    //     y: helperRect.top
                    // }

                });
            }
        },
        onDragEnd() {
            this.hide();
            this.spaceHide();
        },
        onDrop() {
            const view = editor.view;
            const state = view.state;
            let tr = state.tr;
            let insertPos: number;
            if (placeNode.type === state.schema.nodes.columns) {
                if (this.direction === 'top') {
                    insertPos = placeNodePos;
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(insertPos);
                    tr = tr.insert(mappedInsertPos, activeNode).scrollIntoView();
                } else if (this.direction === 'bottom') {
                    insertPos = placeNodePos + placeNode.nodeSize;
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(insertPos);
                    tr = tr.insert(mappedInsertPos, activeNode).scrollIntoView();
                }
            } else if (placeNode.type !== state.schema.nodes.column) {
                if (this.direction === 'top') {
                    insertPos = placeNodePos;
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(insertPos);
                    tr = tr.insert(mappedInsertPos, activeNode).scrollIntoView();
                } else if (this.direction === 'bottom') {
                    insertPos = placeNodePos + placeNode.nodeSize;
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(insertPos);
                    tr = tr.insert(mappedInsertPos, activeNode).scrollIntoView();
                } else if (this.direction === 'left') {
                    const column0 = state.schema.nodes.column.create(null, activeNode);
                    const column1 = state.schema.nodes.column.create(null, placeNode);
                    const columns = state.schema.nodes.columns.create(null, [column0, column1]);
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(placeNodePos);
                    tr = tr.replaceWith(mappedInsertPos, mappedInsertPos + placeNode.nodeSize, columns).scrollIntoView();
                } else if (this.direction === 'right') {
                    const column0 = state.schema.nodes.column.create(null, placeNode);
                    const column1 = state.schema.nodes.column.create(null, activeNode);
                    const columns = state.schema.nodes.columns.create(null, [column0, column1]);
                    tr = tr.delete(activeNodePos, activeNodePos + activeNode.nodeSize);
                    const mappedInsertPos = tr.mapping.map(placeNodePos);
                    tr = tr.replaceWith(mappedInsertPos, mappedInsertPos + placeNode.nodeSize, columns).scrollIntoView();
                }
            }
            editor.view.dispatch(tr); 
            if (this.autoScroller) {
                this.autoScroller.clear();
            }
            if (wrapper) {
                document.body.removeChild(wrapper);
                wrapper = null;
            }
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
                return value;
            }
        },
        props: {
            handleDOMEvents: {
                mousemove(view, e) {
                    if (editor.editable) {
                        // const eventPos = { x: e.clientX, y: e.clientY };
                        const block = closestBlock(e.target);
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