import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
// import { type Node } from 'prosemirror-model';
import {
    columnResizingPluginKey,
    columnResizing,
    tableEditing
    // CellSelection,
    // cellAround
} from 'prosemirror-tables';
import { TableNode } from './tableNode';
// import { TableCell } from './tableCell';
import { 
    closestElement, 
    // findParentNodeClosestToPos, 
    getTableInfoByAnySelection
    // getMaxCellRect,
    // getCellRect
} from '@/components/docEditer/core/utils';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';

export const pluginKey = new PluginKey('table');

export const table = ({
    editor
}: any) => {
    const selectionRectDom = document.createElement('div');
    selectionRectDom.className = `${CLASSNAME}-table-view-cell-selection-rect`;
    const showSelectRect = (tableWrapper: HTMLElement, rect: any) => {
        // const node = tableWrapper.querySelector(`.${CLASSNAME}-table-view-cell-selection`);
        let node;
        for (let i = 0; i < tableWrapper.childNodes.length; i++) {
            const child: any = tableWrapper.childNodes[i];
            if (child.classList.contains(`${CLASSNAME}-table-view-cell-selection`)) {
                node = child;
                break;
            }
        }
        console.log('node', node, tableWrapper.childNodes);
        if (node) {
            if (selectionRectDom.parentNode && node !== selectionRectDom.parentNode) {
                selectionRectDom.parentNode.removeChild(selectionRectDom);
            }
            selectionRectDom.style.width = `${rect.width}px`;
            selectionRectDom.style.height = `${rect.height}px`;
            node.appendChild(selectionRectDom);
            setAlignPos(selectionRectDom, rect, {
                placement: 'tl-tl',
                container: node
            });
        }
    }
    const hideSelectRect = () => {
        if (selectionRectDom.parentNode) {
            selectionRectDom.parentNode.removeChild(selectionRectDom);
        }
    }

    const plugin: Plugin = new Plugin({
        key: pluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    // const pluginState = pluginKey.getState(view.state);
                    if (prevState && prevState.selection.eq(view.state.selection)) {
                        return;
                    }
                    const tableInfo = getTableInfoByAnySelection(editor.view);
                    console.log('tableInfo', tableInfo);
                    if (tableInfo) {
                        showSelectRect(tableInfo.tableWrapper, tableInfo.rect);
                    } else {
                        hideSelectRect();
                    }
                    
                    // if (tableInfo) {
                    //     const cellSection: any = tableInfo.tableWrapper.querySelector(`.${CLASSNAME}-table-view-cell-selection`);
                    //     cellSection.style.width = `${tableInfo.rect.width}px`;
                    //     cellSection.style.height = `${tableInfo.rect.height}px`;
                    //     console.log('tableInfo', cellSection, tableInfo.rect);
                    //     setAlignPos(cellSection, tableInfo.rect, {
                    //         placement: 'tl-tl',
                    //         container: tableInfo.tableWrapper
                    //     });
                    // }
                    
                    
                },
                destroy() {

                }
            };
        },
        state: {
            init(config: EditorStateConfig, state: EditorState) {
                // const nodeViews = plugin.spec?.props?.nodeViews;
                // const tableName = tableNodeTypes(state.schema).table.name;
                // if (View && nodeViews) {
                //     nodeViews[tableName] = (node, view) => {
                //         return new View(node, defaultCellMinWidth, view);
                //     };
                // }
                // return new ResizeState(-1, false);
                return {
                    // table: null,
                    rect: null
                    // decoration: DecorationSet.empty
                }
            },
            apply(tr: Transaction, prev: any, prevState: EditorState, state: EditorState) {
                const selection: any = state.selection;
                if (prevState && prevState.selection.eq(selection)) {
                    return prev;
                }
                // const next = {
                //     ...prev
                // };
                // 2. 检测逻辑：是否在表格内
                // const isTable = selection.node?.type.spec.tableRole === 'table';
                // const cell = findParentNodeClosestToPos(selection.$anchor, n => n.type.spec.tableRole === 'cell');

                // if (isTable || cell) {
                //     // 3. 计算坐标
                //     const pos = isTable ? selection.from : cell.pos;
                //     const coords = view.coordsAtPos(pos);
                //     console.log('coords>>>', coords);
                //     // 4. 调用 UI 层的显隐/定位函数
                //     // myFloatingMenu.show(coords);
                // } else {
                //     console.log('coords hide>>>');
                //     // myFloatingMenu.hide();
                // }

                // let rect;
                // if (selection instanceof CellSelection) {
                //     rect = getMaxCellRect(editor.view, selection);
                // } else {
                //     const { $anchor } = selection;
                //     const cell = cellAround($anchor);
                //     if (cell) {
                //         rect = getCellRect(editor.view, cell.pos)
                //     }
                // }
                // next.rect = rect;

                

                // const decorations = [];
                // state.doc.descendants((node: any, pos: number) => {
                //     if (node.type.name === 'table') {
                //         // 1. 调用之前写好的矩阵计算逻辑（需适配 Node 结构）
                //         const { rowTotals, colTotals } = calculateTableTotals(node);

                //         // 2. 为 Table Node 绑定装饰器，携带计算结果
                //         decorations.push(
                //             Decoration.node(pos, pos + node.nodeSize, {}, {
                //                 totals: new Date().getTime() // 这里的 spec 会传给 NodeView
                //             })
                //         );
                //     }
                // });

                // next.decoration = DecorationSet.create(state.doc, decorations);
                return prev;
            },
        },
        props: {
            // nodeViews: {
            //     table_cell: (node: Node, view: EditorView, getPos: () => number) => {
            //         return new TableCell(node, view, getPos);
            //     }
            // } as any,
            handleDOMEvents: {
                mousemove: (view: EditorView, event: Event) => {
                    // // const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                    // // if (columnResizingPlugState.dragging) {
                    // //     // console.log('mousemove>>>', columnResizingPlugState);
                    // // }
                    // // console.log('mousemove>>>', columnResizingPlugState);
                    // // 1. 获取最近的 table 元素
                    // const tableDOM = closestElement(event.target, (dom: any) => {
                    //     return dom && dom.nodeName === 'TABLE';
                    // });
                    // if (tableDOM) {
                    //     const tableContainer = closestElement(tableDOM, (dom: any) => {
                    //         return dom.classList && dom.classList.contains(`${CLASSNAME}-table-view`);
                    //     });
                    //     const ctrolpanel = tableContainer.querySelector(`.${CLASSNAME}-table-view-ctrolpanel`);
                    //     // console.log('tableDOM', ctrolpanel);
                    // }
                    const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                    if (columnResizingPlugState.dragging) {
                        const tableInfo = getTableInfoByAnySelection(editor.view);
                        showSelectRect(tableInfo.tableWrapper, tableInfo.rect);
                    }
                    

                },
                mouseleave: (view) => {

                },
                mousedown: (view, event) => {

                }
            }
            // decorations: (state: EditorState) => {
            //     return pluginKey.getState(state).decoration;
            // }
        }
    });
    const columnResize = columnResizing({
        View: TableNode as any,
        // handleWidth: 10
    });
    return [columnResize, tableEditing(), plugin];
}