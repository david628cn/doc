import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { EditorView, DecorationSet, Decoration } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    columnResizingPluginKey,
    columnResizing,
    tableEditing,
    CellSelection,
    cellAround
} from 'prosemirror-tables';
import { TableViewEx } from './tableViewEx';
// import { TableCell } from './tableCell';

import './index.less';

/**
 * 查找最近的父节点
 * @param {ResolvedPos} $pos - ProseMirror 的 ResolvedPos
 * @param {Function} predicate - 条件函数 (node) => boolean
 */
const findParentNodeClosestToPos = ($pos, predicate) => {
    for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (predicate(node)) {
            return {
                pos: $pos.before(d),
                start: $pos.start(d),
                depth: d,
                node,
            };
        }
    }
    return undefined;
};

const getTableFromEvent = (event: any) => {
    let node = event.target;

    // 向上遍历直到找到 TABLE 标签或到达根节点
    while (node && node.nodeName !== 'TABLE') {
        // 如果到了编辑器容器外还没找到，就停止
        if (node.classList && node.classList.contains('ProseMirror')) {
            break;
        }
        node = node.parentNode;
    }

    return (node && node.nodeName === 'TABLE') ? node : null;
}

const getMaxCellRect = (
    view: EditorView,
    selection: any
) => {
    if (selection instanceof CellSelection) {
        const cells: Element[] = []
        selection.forEachCell((node: Node, pos: number) => {
            const dom: any = view.nodeDOM(pos);
            if (dom) {
                cells.push(dom);
            }
        });
        if (cells.length > 0) {
            const maxRect = {
                left: Infinity,
                top: Infinity,
                right: -Infinity,
                bottom: -Infinity,
            }

            cells.forEach((cell) => {
                const rect: any = cell.getBoundingClientRect();
                maxRect.left = Math.min(maxRect.left, rect.left);
                maxRect.top = Math.min(maxRect.top, rect.top);
                maxRect.right = Math.max(maxRect.right, rect.right);
                maxRect.bottom = Math.max(maxRect.bottom, rect.bottom);
            });

            return {
                width: maxRect.right - maxRect.left,
                height: maxRect.bottom - maxRect.top,
                left: maxRect.left,
                top: maxRect.top,
                right: maxRect.right,
                bottom: maxRect.bottom
            };
        }
    }
    return null;
}

const getCellRect = (
    view: EditorView,
    cellPos: number
) => {
    const cell: any = view.nodeDOM(cellPos);
    const rect = cell?.getBoundingClientRect();
    if (rect) {
        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom
        };
    }
    return null;
}

// const calculateTableTotals = (tableElement: any) => {
//     if (!tableElement || tableElement.nodeName !== 'TABLE') {
//         return { rowTotals: [], colTotals: [] };
//     }

//     const rows = tableElement.rows;
//     const matrix = []; // 虛擬矩陣，存儲每個格點的數值

//     // 1. 填充虛擬矩陣
//     for (let r = 0; r < rows.length; r++) {
//         if (!matrix[r]) matrix[r] = [];

//         const cells = rows[r].cells;
//         let visualCol = 0; // 當前行在矩陣中的實際列索引

//         for (let c = 0; c < cells.length; c++) {
//             const cell = cells[c];
//             const rowSpan = cell.rowSpan || 1;
//             const colSpan = cell.colSpan || 1;

//             // 提取數值：去掉逗號，轉為浮點數
//             const val = parseFloat(cell.textContent.replace(/,/g, '')) || 0;

//             // 核心邏輯：跳過已被上方 rowspan 佔用的位置
//             while (matrix[r][visualCol] !== undefined) {
//                 visualCol++;
//             }

//             // 將當前儲存格的值填入其跨越的所有虛擬點
//             for (let rs = 0; rs < rowSpan; rs++) {
//                 const targetRow = r + rs;
//                 if (!matrix[targetRow]) matrix[targetRow] = [];
//                 for (let cs = 0; cs < colSpan; cs++) {
//                     matrix[targetRow][visualCol + cs] = val;
//                 }
//             }

//             // 填完後，指針向右移動
//             visualCol += colSpan;
//         }
//     }

//     // 2. 計算每行總數 (Row Totals)
//     const rowTotals = matrix.map(row =>
//         row.reduce((sum, val) => sum + (val || 0), 0)
//     );

//     // 3. 計算每列總數 (Column Totals)
//     // 找出矩陣中最寬的一行作為列基準
//     const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
//     const colTotals = Array.from({ length: maxCols }).map((_, colIdx) => {
//         return matrix.reduce((sum, row) => sum + (row[colIdx] || 0), 0);
//     });

//     return { rowTotals, colTotals, matrix };
// }

/**
 * 基於原生 DOM 表格，將數值與 cell 引用同時存入矩陣
 */
// const calculateTable = (tableElement: any) => {
//     if (!tableElement || tableElement.nodeName !== 'TABLE') return null;

//     const rows = tableElement.rows;
//     const matrix = []; // 存儲結構: { value: number, cell: HTMLTableCellElement }[][]

//     // 1. 構建物理矩陣
//     for (let r = 0; r < rows.length; r++) {
//         if (!matrix[r]) matrix[r] = [];
//         const cells = rows[r].cells;
//         let visualCol = 0;

//         for (let c = 0; c < cells.length; c++) {
//             const cell = cells[c];
//             const rowSpan = cell.rowSpan || 1;
//             const colSpan = cell.colSpan || 1;

//             // 清理數值
//             const text = cell.textContent || "0";
//             const val = parseFloat(text.replace(/,/g, '')) || 0;

//             // 跳過被上方 rowspan 佔用的位置
//             while (matrix[r][visualCol] !== undefined) {
//                 visualCol++;
//             }

//             // 填充虛擬點：每個點都指向同一個 cell 實體
//             for (let rs = 0; rs < rowSpan; rs++) {
//                 const targetRow = r + rs;
//                 if (!matrix[targetRow]) matrix[targetRow] = [];
//                 for (let cs = 0; cs < colSpan; cs++) {
//                     matrix[targetRow][visualCol + cs] = {
//                         value: val,
//                         cell: cell // 存入 DOM 引用
//                     };
//                 }
//             }
//             visualCol += colSpan;
//         }
//     }

//     // 2. 計算行總數 (Row Totals)
//     const rowTotals = matrix.map((row, index) => {
//         const total = row.reduce((sum, item) => sum + (item ? item.value : 0), 0);
//         return {
//             total,
//             rowDOM: rows[index], // 該行對應的 TR
//             cells: row.map(item => item?.cell) // 該行包含的所有物理 cell (含重複)
//         };
//     });

//     // 3. 計算列總數 (Column Totals)
//     const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
//     const colTotals = Array.from({ length: maxCols }).map((_, colIdx) => {
//         let total = 0;
//         const columnCells = [];

//         for (let r = 0; r < matrix.length; r++) {
//             const item = matrix[r][colIdx];
//             if (item) {
//                 total += item.value;
//                 columnCells.push(item.cell);
//             }
//         }

//         return {
//             total,
//             index: colIdx,
//             // 該列對應的第一個單元格，通常用於定位列標題
//             headerCell: matrix[0][colIdx]?.cell,
//             allCellsInColumn: columnCells
//         };
//     });

//     return { matrix, rowTotals, colTotals };
// }

// const mousemove = (view, event) => {
//     let curr = event.target;

//     // 1. 向上找 TD (替代 closest)
//     while (curr && curr !== view.dom && curr.nodeName !== 'TD' && curr.nodeName !== 'TH') {
//         curr = curr.parentNode;
//     }
//     const td = curr;

//     // 2. 向上再找 TABLE
//     while (curr && curr !== view.dom && curr.nodeName !== 'TABLE') {
//         curr = curr.parentNode;
//     }
//     const table = curr;

//     if (table && td) {
//         const result = calculateTableTotalsWithDOM(table);
//         if (!result) return false;

//         // 3. 如何知道當前 TD 是「物理第幾列」？
//         // 我們可以遍歷矩陣的第一行，找到與當前 TD 座標重合的索引
//         const { colTotalsData, rowTotals, rows } = result;

//         // 獲取當前行在表格中的索引
//         const rowIndex = td.parentNode.rowIndex;
//         const currentRowMatrix = result.matrix[rowIndex];

//         // 找到鼠標下這個 TD 在矩陣中的起始位置 (考慮 colspan)
//         // 遍歷當前行矩陣，匹配數值或標識（建議在填充 matrix 時存儲 cell 引用）
//         // ... 優化：在 matrix 裡直接存對象 { val, cell } 最好
//     }
//     return false;
// }


// mousemove(view, event) {
//     // 1. 手動向上找 TD (替代 closest)
//     let target = event.target;
//     while (target && target.nodeName !== 'TD' && target.nodeName !== 'TH' && target !== view.dom) {
//         target = target.parentNode;
//     }
//     if (!target || (target.nodeName !== 'TD' && target.nodeName !== 'TH')) return false;

//     // 2. 向上找 TABLE
//     let table = target.parentNode;
//     while (table && table.nodeName !== 'TABLE' && table !== view.dom) {
//         table = table.parentNode;
//     }
//     if (!table || table.nodeName !== 'TABLE') return false;

//     // 3. 獲取矩陣數據
//     const result = calculateTableMatrix(table);
//     if (!result) return false;

//     const { matrix, rowTotals, colTotals } = result;

//     // 4. 定位當前鼠標所在的「矩陣座標」
//     const rowIndex = target.parentNode.rowIndex;
//     const currentRow = matrix[rowIndex];
    
//     // 在當前行矩陣中，找到第一個與當前 target DOM 匹配的列索引
//     const colIndex = currentRow.findIndex(item => item && item.cell === target);

//     if (colIndex !== -1) {
//         const currentColTotal = colTotals[colIndex];
//         const currentRowTotal = rowTotals[rowIndex];

//         console.log(`位置: 行 ${rowIndex}, 列 ${colIndex}`);
//         console.log(`行總計: ${currentRowTotal.total}`, `列總計: ${currentColTotal.total}`);
        
//         // 你現在擁有了 currentRowTotal.rowDOM 和 currentColTotal.headerCell
//         // 可以直接給它們添加 class 或顯示浮層
//     }

//     return false;
// }


// mousemove(view, event) {
//     let target = event.target;
//     // 快速向上查找 TD/TH
//     while (target && target.nodeName !== 'TD' && target.nodeName !== 'TH' && target !== view.dom) {
//         target = target.parentNode;
//     }
//     if (!target || (target.nodeName !== 'TD' && target.nodeName !== 'TH')) return false;

//     // 快速向上查找 TABLE
//     let table = target.parentNode;
//     while (table && table.nodeName !== 'TABLE' && table !== view.dom) {
//         table = table.parentNode;
//     }
//     if (!table) return false;

//     // 1. 獲取數據（O(1) 命中快取）
//     const data = getTableDataOptimized(table);
//     if (!data) return false;

//     // 2. 獲取當前單元格的精確矩陣坐標
//     const rIndex = target.parentNode.rowIndex;
//     // 在當前行快速找到對應列
//     const colIndex = data.cellMatrix[rIndex].indexOf(target);

//     if (colIndex !== -1) {
//         // 直接獲取預計算好的總數
//         const rSum = data.rowTotals[rIndex];
//         const cSum = data.colTotals[colIndex];
        
//         // 3. 獲取對應列的第一個 DOM (headerCell) 用於定位
//         const headerCell = data.cellMatrix[0][colIndex];
        
//         // 執行極簡的 UI 更新
//         updateFloatingUI(rSum, cSum, target, headerCell);
//     }
//     return false;
// }


export const pluginKey = new PluginKey('table');

export const table = ({
    editor
}: any) => {
    const plugin: Plugin = new Plugin({
        key: pluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {

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
                    rect: null
                    // decoration: DecorationSet.empty
                }
            },
            apply(tr: Transaction, prev: any, prevState: EditorState, state: EditorState) {
                const selection: any = state.selection;
                if (prevState && prevState.selection.eq(selection)) {
                    return prev;
                }
                const next = {
                    ...prev
                };
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

                let rect;
                if (selection instanceof CellSelection) {
                    rect = getMaxCellRect(editor.view, selection);
                } else {
                    const { $anchor } = selection;
                    const cell = cellAround($anchor);
                    if (cell) {
                        rect = getCellRect(editor.view, cell.pos)
                    }
                }

                console.log('apply', rect);
                next.rect = rect;


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
                return next;
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
                    // const columnResizingPlugState = columnResizingPluginKey.getState(view.state);
                    // if (columnResizingPlugState.dragging) {
                    //     // console.log('mousemove>>>', columnResizingPlugState);
                    // }
                    // console.log('mousemove>>>', columnResizingPlugState);
                    // 1. 获取最近的 table 元素
                    const tableDOM = getTableFromEvent(event);
                    if (tableDOM) {
                        // const rs = calculateTable(tableDOM);
                        console.log('tableDOM', tableDOM)
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
        View: TableViewEx as any,
        // handleWidth: 10
    });
    return [columnResize, tableEditing(), plugin];
}