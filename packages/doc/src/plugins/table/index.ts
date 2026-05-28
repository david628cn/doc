import { type EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
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
    // getSelectionCellsRect,
    getTableInfo
} from '../../utils';
import { CtrolPanel } from './ctrolPanel';
// import { CLASSNAME } from '../../config';
import './index.less';

export const tablePluginKey = new PluginKey('table');
// export const prosemirrorTableSelectionFixPlugin = () => {
//     return new Plugin({
//         props: {
//             handleKeyDown(view, event) {
//                 // 1. 拦截目标按键：退格键（Backspace）或 删除键（Delete）
//                 if (event.key !== "Backspace" && event.key !== "Delete") {
//                     return false;
//                 }

//                 const { state } = view;
//                 const { selection } = state;

//                 // 2. 精准判定是否处于截图中的【全选单元格】状态
//                 const isCellSel = selection instanceof CellSelection ||
//                     selection.constructor.name === "CellSelection" ||
//                     (selection as any).isCellSelection;

//                 if (isCellSel) {
//                     const cellSel = selection as any;
//                     try {
//                         // 利用官方原装 API 组合判断是否行列全选
//                         const isFullySelected = cellSel.isRowSelection() && cellSel.isColSelection();

//                         if (isFullySelected) {
//                             // 3. 💥 绝杀：抢在 prosemirror-tables 之前执行最底层的物理删除事务
//                             let tableDepth = -1;
//                             const anchorCell = cellSel.$anchorCell;

//                             // 向上检索 table 的真实绝对深度
//                             for (let d = anchorCell.depth; d > 0; d--) {
//                                 if (anchorCell.node(d).type.name === "table") {
//                                     tableDepth = d;
//                                     break;
//                                 }
//                             }

//                             if (tableDepth > -1) {
//                                 const tr = state.tr;
//                                 const tableStartPos = anchorCell.before(tableDepth);
//                                 const tableEndPos = tableStartPos + anchorCell.node(tableDepth).nodeSize;

//                                 // 跨越外壳闭合标签，1 帧内物理粉碎整张表格
//                                 const nextTr = tr.delete(tableStartPos, tableEndPos);
//                                 view.dispatch(nextTr.scrollIntoView());

//                                 // 4. 关键：强行阻止浏览器和第三方插件（tableEditing）的后续冒泡，彻底闭环
//                                 event.preventDefault();
//                                 return true;
//                             }
//                         }
//                     } catch (e) {
//                         return false;
//                     }
//                 }
//                 return false;
//             },
//             handleDOMEvents: {
//                 mousedown: (view: EditorView, event: any) => {
//                     const target = event.target as HTMLElement;

//                     // 关键盘查：检查用户按下的地方是不是你的段落/标题自定义操作柄
//                     const isHandle = target.classList.contains(`${CLASSNAME}-drag-block-handle`) || target.closest(`.${CLASSNAME}-drag-block-handle`);

//                     if (isHandle) {
//                         // 强行阻止事件继续向上冒泡，不给官方 columnResizing 插件任何感知并拦截的机会！
//                         // event.stopPropagation();

//                         // 注意：千万不要在这里写 event.preventDefault()，写了原生 drag 就会死掉
//                         return true; // 返回 false 告诉 ProseMirror：允许当前事件继续触发浏览器的默认原生拖拽行为
//                     }

//                     return false;
//                 }
//             }
//         }
//     });
// };

export const table = ({
    editor
}: any) => {
    const ctrolPanelMap: WeakMap<HTMLElement, any> = new WeakMap();
    let ctrolPanel: any;

    const plugin: Plugin = new Plugin({
        key: tablePluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    // const pluginState = pluginKey.getState(view.state);
                    // if (prevState && prevState.selection.eq(view.state.selection)) {
                    //     return;
                    // }
                    if (!view.editable) {
                        return;
                    }
                    if (ctrolPanel) {
                        ctrolPanel.showSelectionCells(view);
                    }
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
                    if (!view.editable) {
                        return;
                    }
                    const columnResizingPlugState: any = columnResizingPluginKey.getState(view.state);
                    if (columnResizingPlugState.dragging) {
                        if (ctrolPanel) {
                            ctrolPanel.showSelectionCells(view);
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
                                editor,
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