import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
// import { type Node } from 'prosemirror-model';
import {
    TableMap,
    columnResizingPluginKey,
    columnResizing,
    tableEditing,
    // RowSelection, 
    // ColumnSelection, 
    CellSelection,
    addColumnAfter,
    deleteColumn,
    addRowAfter,
    deleteRow
} from 'prosemirror-tables';
import { TableNode } from './tableNode';
// import { TableCell } from './tableCell';
import {
    closest,
    closestTableView,
    getTableInfo,
    // findParentNodeClosestToPos, 
    getTableInfoByAnySelection
    // getMaxCellRect,
    // getCellRect
} from '@/components/docEditer/core/utils';
import { CtrolPanel } from './ctrolPanel';
// import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import './index.less';

export const pluginKey = new PluginKey('table');

export const table = ({
    editor
}: any) => {
    const ctrolPanelMap: WeakMap<HTMLElement, any> = new WeakMap();
    let ctrolPanel: any;
    // let colpanel: any;
    // let rowpanel: any;
    // const selectionRectDom = document.createElement('div');
    // selectionRectDom.className = `${CLASSNAME}-table-view-cell-selection-rect`;
    // const showSelectRect = (tableWrapper: HTMLElement, rect: any) => {
    //     // const node = tableWrapper.querySelector(`.${CLASSNAME}-table-view-cell-selection`);
    //     let node;
    //     for (let i = 0; i < tableWrapper.childNodes.length; i++) {
    //         const child: any = tableWrapper.childNodes[i];
    //         if (child.classList.contains(`${CLASSNAME}-table-view-cell-selection`)) {
    //             node = child;
    //             break;
    //         }
    //     }
    //     if (node) {
    //         if (selectionRectDom.parentNode && node !== selectionRectDom.parentNode) {
    //             selectionRectDom.parentNode.removeChild(selectionRectDom);
    //         }
    //         // setTimeout(() => {
    //         node.appendChild(selectionRectDom);
    //         selectionRectDom.style.width = `${rect.width}px`;
    //         selectionRectDom.style.height = `${rect.height}px`;

    //         setAlignPos(selectionRectDom, rect, {
    //             placement: 'tl-tl',
    //             container: node
    //         });
    //         // }, 100);

    //     }
    // }
    // const hideSelectRect = () => {
    //     if (selectionRectDom.parentNode) {
    //         selectionRectDom.parentNode.removeChild(selectionRectDom);
    //     }
    // }

    // const colHandle = document.createElement('div');
    // colHandle.className = `${CLASSNAME}-table-view-cell-col-handle`;
    // const showColHandle = () => {

    // }

    const plugin: Plugin = new Plugin({
        key: pluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    // const pluginState = pluginKey.getState(view.state);
                    if (prevState && prevState.selection.eq(view.state.selection)) {
                        return;
                    }
                    // const tableInfo = getTableInfoByAnySelection(editor.view);
                    // console.log('tableInfo', tableInfo);
                    // if (tableInfo) {
                    //     showSelectRect(tableInfo.tableWrapper, tableInfo.rect);
                    // } else {
                    //     hideSelectRect();
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
                click(view, event) {
                    // const target = event.target as HTMLElement;

                    // // 1. 识别点击目标（列手柄或行手柄）
                    // const isColHandle = target.closest('.table-col-handle-btn');
                    // const isRowHandle = target.closest('.table-row-handle-btn');

                    // if (!isColHandle && !isRowHandle) return false;

                    // event.preventDefault();

                    // // 2. 核心：动态定位表格在文档中的最新位置
                    // // 即使有协同操作导致偏移，posAtDOM 也能找到正确的内存节点位置
                    // const tableDOM = target.closest("table");
                    // if (!tableDOM) return false;

                    // const tablePos = view.posAtDOM(tableDOM, 0) - 1; // -1 是为了移动到 table 节点开始处
                    // const $pos = view.state.doc.resolve(tablePos);
                    // const table = $pos.nodeAfter;

                    // if (!table || table.type.name !== "table") return false;

                    // const map = TableMap.get(table);
                    // const { state, dispatch } = view;

                    // // 3. 处理列操作
                    // if (isColHandle) {
                    //     const colIndex = parseInt((isColHandle as HTMLElement).dataset.col!);

                    //     // 找到第一行和最后一行在该列的单元格位置
                    //     const anchor = map.positionAt(0, colIndex, table);
                    //     const head = map.positionAt(map.height - 1, colIndex, table);

                    //     // 使用 CellSelection 创建选区
                    //     // 注意：tablePos + anchor + 1 指向的是单元格节点开始的位置
                    //     const sel = new CellSelection(
                    //         state.doc.resolve(tablePos + anchor + 1),
                    //         state.doc.resolve(tablePos + head + 1)
                    //     );

                    //     dispatch(state.tr.setSelection(sel));
                    //     return true;
                    // }

                    // // 4. 处理行操作
                    // if (isRowHandle) {
                    //     const rowIndex = parseInt((isRowHandle as HTMLElement).dataset.row!);

                    //     const anchor = map.positionAt(rowIndex, 0, table);
                    //     const head = map.positionAt(rowIndex, map.width - 1, table);

                    //     const sel = new CellSelection(
                    //         state.doc.resolve(tablePos + anchor + 1),
                    //         state.doc.resolve(tablePos + head + 1)
                    //     );

                    //     dispatch(state.tr.setSelection(sel));
                    //     return true;
                    // }

                    // return false;
                },
                mousemove: (view: EditorView, event: any) => {
                    const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                    if (columnResizingPlugState.dragging) {
                    //     const tableInfo = getTableInfoByAnySelection(editor.view);
                    //     if (tableInfo) {
                    //         showSelectRect(tableInfo.tableWrapper, tableInfo.rect);
                    //     }
                        if (ctrolPanel) {
                            ctrolPanel.hideColPanel();
                            ctrolPanel.hideRowPanel();
                        }
                        return;
                    }
                    const tableInfo = getTableInfo(event.target);
                    if (tableInfo) {
                        if (ctrolPanel) {
                            ctrolPanel.hideColPanel();
                            ctrolPanel.hideRowPanel();
                        }
                        const { cell, tableView } = tableInfo;
                        if (!ctrolPanelMap.has(tableView)) {
                            ctrolPanelMap.set(tableView, new CtrolPanel({
                                container: tableView.childNodes[1]
                            }));
                            // ctrolPanelMap.set(tableView, new CtrolPanel({
                            //     tableView
                            // }));
                        }
                        ctrolPanel = ctrolPanelMap.get(tableView);
                        ctrolPanel.showColPanel(cell);
                        ctrolPanel.showRowPanel(cell);
                    } else {
                        if (ctrolPanel) {
                            if (ctrolPanel.colPanel && !ctrolPanel.colPanel.contains(event.target)) {
                                ctrolPanel.hideColPanel();
                            }
                            if (ctrolPanel.rowPanel && !ctrolPanel.rowPanel.contains(event.target)) {
                                ctrolPanel.hideRowPanel();
                            }
                        }
                    }
                },
                // mouseup: (view: EditorView, event: Event) => {
                //     const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                //     if (columnResizingPlugState.dragging) {
                //         const tableInfo = getTableInfoByAnySelection(editor.view);
                //         showSelectRect(tableInfo.tableWrapper, tableInfo.rect);
                //     }
                // },
                // mouseleave: (view: EditorView, event: any) => {
                //     // console.log('mouseleave>>>', ctrolPanel.tableView.contains(event.target));
                //     // if (ctrolPanel && !ctrolPanel.tableView.contains(event.target)) {
                //     //     ctrolPanel.hideColPanel();
                //     // }
                //     // if (ctrolPanel.colPanel && !ctrolPanel.colPanel.contains(event.target)) {
                //     //     ctrolPanel.hideColPanel();
                //     // }
                //     // if (ctrolPanel.rowPanel && !ctrolPanel.rowPanel.contains(event.target)) {
                //     //     ctrolPanel.hideRowPanel();
                //     // }
                // },
                // mousedown: (view, event) => {

                // }
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