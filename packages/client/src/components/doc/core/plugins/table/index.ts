import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
// import { type Node } from 'prosemirror-model';
import {
    // TableMap,
    columnResizingPluginKey,
    columnResizing,
    tableEditing,
    // RowSelection, 
    // ColumnSelection, 
    // CellSelection,
    // cellAround,
    // addColumnAfter,
    // deleteColumn,
    // addRowAfter,
    // deleteRow
} from 'prosemirror-tables';
import { TableNode } from './tableNode';
// import { TableCell } from './tableCell';
import {
    getSelectionCellsRect,
    getTableInfo
} from '@/components/doc/core/utils';
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

    const plugin: Plugin = new Plugin({
        key: pluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    // const pluginState = pluginKey.getState(view.state);
                    // if (prevState && prevState.selection.eq(view.state.selection)) {
                    //     return;
                    // }
                    CtrolPanel.showSelectionCells(view);
                },
                destroy() {
                    if (ctrolPanel) {
                        ctrolPanel.destroy();
                    }
                }
            };
        },
        props: {
            handleDOMEvents: {
                mousemove: (view: EditorView, event: any) => {
                    const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                    if (columnResizingPlugState.dragging) {
                        if (ctrolPanel) {
                            CtrolPanel.showSelectionCells(view);
                            ctrolPanel.hideColPanel();
                            ctrolPanel.hideRowPanel();
                        }
                        return;
                    }
                    if (ctrolPanel) {
                        if (ctrolPanel.moving) {
                            return;
                        }
                    }
                    const tableInfo = getTableInfo(event.target);
                    if (tableInfo) {
                        const { cell, tableContainer } = tableInfo;
                        if (!cell) {
                            return;
                        }
                        if (ctrolPanel) {
                            ctrolPanel.hideColPanel();
                            ctrolPanel.hideRowPanel();
                        }
                        if (!ctrolPanelMap.has(tableContainer)) {
                            ctrolPanelMap.set(tableContainer, new CtrolPanel({
                                view,
                                tableContainer
                                // container: tableContainer.childNodes[1]
                            }));
                            // ctrolPanelMap.set(tableContainer, new CtrolPanel({
                            //     container: tableContainer.childNodes[1],
                            //     onClickPanel(e: MouseEvent, type: 'col' | 'row') {
                            //         e.preventDefault();
                            //         // e.stopPropagation();
                            //         selectDimensionByCell(view, ctrolPanel.cell, type);
                            //     },
                            //     onStart(e: MouseEvent, type: 'col' | 'row') {
                            //         e.preventDefault();

                            //         // 1. 将 DOM 转换为文档位置
                            //         const cellPos = view.posAtDOM(ctrolPanel.cell, 0);
                            //         const $cellPos = view.state.doc.resolve(cellPos);

                            //         // 2. 找到所属的 Table 节点
                            //         const tableData = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === "table");
                            //         if (!tableData) return null;

                            //         // 3. 利用 TableMap 计算坐标
                            //         const tableStart = tableData.pos + 1;
                            //         const map = TableMap.get(tableData.node);

                            //         // findCell 返回 {top, left, bottom, right}
                            //         // top 就是行索引 (rowIndex)，left 就是列索引 (colIndex)
                            //         const rect = map.findCell(cellPos - (tableStart + 1));
                            //         const rowIndex = rect.top;
                            //         const colIndex = rect.left;
                            //         const tablePos = tableData.pos;

                            //         // console.log({
                            //         //     rowIndex: rect.top,
                            //         //     colIndex: rect.left,
                            //         //     tablePos: tableData.pos
                            //         // });

                            //         // const previewTable = document.createElement('table');
                            //         // previewTable.style.width = '100px'; // 给个固定宽度
                            //         // previewTable.style.borderCollapse = 'collapse';
                            //         // previewTable.style.position = 'absolute';
                            //         // previewTable.style.top = '-1000px'; // 隐藏在屏幕外

                            //         // // 2. 提取该列每一行的单元格 DOM
                            //         // for (let row = 0; row < map.height; row++) {
                            //         //     const cellOffset = map.map[row * map.width + colIndex];
                            //         //     // 通过 view.nodeDOM 找到实际的单元格 DOM 节点
                            //         //     const cellDom = view.nodeDOM(tableStart + cellOffset);

                            //         //     if (cellDom) {
                            //         //         const tr = document.createElement('tr');
                            //         //         const clonedCell: any = cellDom.cloneNode(true);
                            //         //         // 保持原始单元格的样式（高度等）
                            //         //         clonedCell.style.border = '1px solid #ddd';
                            //         //         tr.appendChild(clonedCell);
                            //         //         previewTable.appendChild(tr);
                            //         //     }
                            //         // }
                            //         // previewTable.style.borderSpacing = '0';
                            //         // previewTable.style.borderCollapse = 'collapse';
                            //         // previewTable.style.tableLayout = 'fixed';
                            //         // previewTable.style.width = `${ctrolPanel.cell.offsetWidth}px`;
                            //         // previewTable.style.height = `${table.offsetHeight}px`;
                            //         // setAlignPos(previewTable, ctrolPanel.cell, {
                            //         //     placement: 'tl-tl'
                            //         // });
                            //         // document.body.appendChild(previewTable);
                            //     },
                            //     onMove(e: MouseEvent, type: 'col' | 'row') {
                            //         e.preventDefault();

                            //     }
                            // }));
                        }
                        ctrolPanel = ctrolPanelMap.get(tableContainer);
                        ctrolPanel.cell = cell;
                        ctrolPanel.showColPanel();
                        ctrolPanel.showRowPanel();
                    } else {
                        if (ctrolPanel) {
                            ctrolPanel.hideColPanel();
                            ctrolPanel.hideRowPanel();
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
                //     // console.log('mouseleave>>>', ctrolPanel.tableContainer.contains(event.target));
                //     // if (ctrolPanel && !ctrolPanel.tableContainer.contains(event.target)) {
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