import { type EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import {
    cellAround,
    CellSelection,
    TableMap
} from 'prosemirror-tables';
import { 
    closest,
    findParentNodeClosestToPos,
    getNodeRect
} from './common';
import { CLASSNAME } from '../config';

export const closestTableView = (dom: any) => {
    return closest(dom, (node: any) => node.classList && node.classList.contains(`${CLASSNAME}-table-view`));
}

export const closestTable = (dom: any) => {
    return closest(dom, (node: any) => node.tagName === 'TABLE');
}

export const closestCell = (dom: any) => {
    return closest(dom, (node: any) => node.tagName === 'TH' || node.tagName === 'TD');
}

export const closestTr = (dom: any) => {
    return closest(dom, (node: any) => node.tagName === 'TR');
}

// export const getTableMap = (tableElement: HTMLTableElement) => {
// if (!tableElement || tableElement.nodeName !== 'TABLE') {
//     return null;
// }

//     const rows = tableElement.rows;
//     const matrix: any[][] = [];

//     // 1. 建立物理矩阵
//     for (let r = 0; r < rows.length; r++) {
//         if (!matrix[r]) matrix[r] = [];
//         const cells = rows[r].cells;
//         let visualCol = 0;

//         for (let c = 0; c < cells.length; c++) {
//             const cell = cells[c];
//             const rowSpan = cell.rowSpan || 1;
//             const colSpan = cell.colSpan || 1;

//             // 获取物理尺寸（包含 padding 和 border）
//             const rect = cell.getBoundingClientRect();
//             // const text = cell.textContent || "0";
//             // const val = parseFloat(text.replace(/,/g, '')) || 0;

//             while (matrix[r][visualCol] !== undefined) {
//                 visualCol++;
//             }

//             for (let rs = 0; rs < rowSpan; rs++) {
//                 const targetRow = r + rs;
//                 if (!matrix[targetRow]) matrix[targetRow] = [];
//                 for (let cs = 0; cs < colSpan; cs++) {
//                     matrix[targetRow][visualCol + cs] = {
//                         // value: val,
//                         cell: cell,
//                         // 如果是合并单元格，我们将单个逻辑格子的平均宽度/高度存入，
//                         // 或者存储物理尺寸。这里建议存储物理尺寸，但在计算行列宽时去重。
//                         width: rect.width,
//                         height: rect.height
//                     };
//                 }
//             }
//             visualCol += colSpan;
//         }
//     }

//     // 2. 计算行总数及行高 (Row Totals & Heights)
//     const rowTotals = matrix.map((row, rIdx) => {
//         const total = row.reduce((sum, item) => sum + (item ? item.value : 0), 0);
//         // 行高直接取 TR 的物理高度最为准确
//         const rowHeight = rows[rIdx].getBoundingClientRect().height;

//         return {
//             // total,
//             height: rowHeight, // 该行的物理高度
//             rowDOM: rows[rIdx],
//             cells: Array.from(new Set(row.map(item => item?.cell))) // 去重后的物理单元格
//         };
//     });

//     // 3. 计算列总数及列宽 (Column Totals & Widths)
//     const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
//     const colTotals = Array.from({ length: maxCols }).map((_, colIdx) => {
//         let total = 0;
//         const columnCells: HTMLTableCellElement[] = [];

//         // 计算列宽：取该列中没有 colspan（或 colspan 为 1）的单元格宽度作为基准
//         // 如果全都有 colspan，则取该列逻辑宽度的最小值
//         let colWidth = 0;

//         for (let r = 0; r < matrix.length; r++) {
//             const item = matrix[r][colIdx];
//             if (item) {
//                 total += item.value;
//                 columnCells.push(item.cell);

//                 // 只有当单元格不跨列时，其宽度才最具代表性
//                 if (item.cell.colSpan === 1 && colWidth === 0) {
//                     colWidth = item.cell.getBoundingClientRect().width;
//                 }
//             }
//         }

//         // 兜底逻辑：如果该列全是合并单元格，取第一个格子宽度除以其跨度
//         if (colWidth === 0 && matrix[0][colIdx]) {
//             const firstItem = matrix[0][colIdx];
//             colWidth = firstItem.cell.getBoundingClientRect().width / firstItem.cell.colSpan;
//         }

//         return {
//             // total,
//             width: colWidth, // 估算的列宽
//             index: colIdx,
//             headerCell: matrix[0][colIdx]?.cell,
//             cellsInColumn: Array.from(new Set(columnCells))
//         };
//     });

//     return {
//         map: matrix,
//         rows: rowTotals,
//         cols: colTotals
//     };
// }

// export const getTableCellMatrix = (tableElement: HTMLTableElement) => {
//     if (!tableElement || tableElement.nodeName !== 'TABLE') {
//         return null;
//     }
//     const matrix = [];
//     Array.from(tableElement.rows).forEach((tr, rowIndex) => {
//         matrix[rowIndex] = matrix[rowIndex] || [];
//         let colOffset = 0;
//         Array.from(tr.cells).forEach(td => {
//             // 寻找当前行第一个空位
//             while (matrix[rowIndex][colOffset]) {
//                 colOffset++;
//             }
//             const rs = td.rowSpan || 1;
//             const cs = td.colSpan || 1;
//             // 填充逻辑矩阵，所有跨度内的位置都指向这个 td
//             for (let r = 0; r < rs; r++) {
//                 for (let c = 0; c < cs; c++) {
//                     matrix[rowIndex + r] = matrix[rowIndex + r] || [];
//                     matrix[rowIndex + r][colOffset + c] = td;
//                 }
//             }
//         });
//     });
//     return matrix;
// }

// 在矩阵中查找某个 TD 占据的列起止索引
// 重点：拖拽时的逻辑联动
// 你之所以会产生“是不是 {0, 1}”的疑问，可能是因为你在思考拖拽：
// 如果你拖动“单元格 c”所在的列（列 0）：
// 由于第一行的 One 单元格同时也占据了 列 1，根据“整体移动”原则，你不能单独移动列 0。
// 此时调用 getExtendedColRange(0, matrix)：
// 检查第 0 列，发现单元格 One。
// 单元格 One 的 colEnd 是 1。
// 算法会自动将范围从 [0, 0] 扩展到 [0, 1]。
// 最终结论：列 0 和 列 1 必须作为一个整体 [sStart: 0, sEnd: 1] 一起移动。
// 总结：
// getCellSpanInfo 应该只反映单个单元格的跨度；而 getExtendedColRange 会利用这些信息来告诉你整个联动块的跨度。
// 如果你修改 c 的返回值为 {0, 1}，逻辑就会认为 c 也是个合并单元格，这会导致在同步 DOM 时把 d 给覆盖掉，造成表格崩坏。
export const getCellDomSpanInfo = (cell: HTMLTableCellElement, matrix: any) => {
    if (!matrix || !matrix.length) {
        return null;
    }

    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;

    // 遍历整个矩阵寻找该 td 占据的所有坐标点
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c].cell === cell) {
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
            }
        }
    }

    return {
        startRow: minRow,
        endRow: maxRow,
        startCol: minCol,
        endCol: maxCol
    };
}

export const getTableDomMatrix = (tableElement: HTMLTableElement) => {
    if (!tableElement || tableElement.nodeName !== 'TABLE') {
        return null;
    }
    const matrix: any[][] = [];
    const rows = tableElement.rows;

    for (let r = 0; r < rows.length; r++) {
        if (!matrix[r]) matrix[r] = [];

        let visualCol = 0;
        const rowCells = rows[r].cells;

        for (let c = 0; c < rowCells.length; c++) {
            const cell = rowCells[c];
            // 尋找當前行第一個空位
            while (matrix[r][visualCol] !== undefined) {
                visualCol++;
            }

            const rs = cell.rowSpan || 1;
            const cs = cell.colSpan || 1;

            // 封裝成一個對象，矩陣中所有引用都指向同一個對象（節省內存）
            const node = {
                cell,
                rs,
                cs,
                startRow: r,
                endRow: r + rs - 1,
                startCol: visualCol,
                endCol: visualCol + cs - 1
            };

            // 填充受影響的所有矩形格
            for (let i = 0; i < rs; i++) {
                const targetRow = r + i;
                if (!matrix[targetRow]) matrix[targetRow] = [];
                for (let j = 0; j < cs; j++) {
                    matrix[targetRow][visualCol + j] = node;
                }
            }
            visualCol += cs;
        }
    }
    return matrix;
}

export const getAxisMap = (tableElement: HTMLTableElement) => {
    if (!tableElement || tableElement.nodeName !== 'TABLE') {
        return null;
    }
    const rect = tableElement.getBoundingClientRect();
    const xLines = [rect.left];
    const yLines = [rect.top];

    // X轴：取第一行（需处理colspan确保拿到所有列宽）
    const firstRow = tableElement.rows[0];
    let currentX = rect.left;
    for (let i = 0; i < firstRow.cells.length; i++) {
        const cell = firstRow.cells[i];
        const w = cell.offsetWidth / (cell.colSpan || 1);
        for (let s = 0; s < (cell.colSpan || 1); s++) {
            currentX += w;
            xLines.push(currentX);
        }
    }

    // Y轴：遍历每一行取 offsetHeight (2000行耗时约 1-2ms)
    let currentY = rect.top;
    for (let i = 0; i < tableElement.rows.length; i++) {
        currentY += tableElement.rows[i].offsetHeight;
        yLines.push(currentY);
    }
    return { xLines, yLines };
}

export const getTableInfo = (dom: any) => {
    let cell = closestCell(dom);
    // if (!cell) {
    //     return null;
    // }
    const table = closestTable(dom);
    const tableContainer = closestTableView(dom);
    // const matrix = getTableMatrix(table);
    // const info = getTableCellSizes(table);
    // const axis = getAxisMap(table);
    // console.log('matrix info', axis);

    if (!tableContainer) {
        return null;
    }
    if (!tableContainer.contains(cell)) {
        cell = null;
    }
    return {
        cell,
        table,
        tableContainer
        // tableInfo
    }
}

/**
 * 根據行/列索引獲取真實的單元格 DOM 列表（非選區場景）
 * @param view
 * @param ctx 之前 getTableCtx 返回的上下文 (包含 map, tableStart 等)
 * @param axis 'row' | 'col'
 */
// export const getDimensionDOM = (view: EditorView, dimension: any, axis: 'row' | 'col' = 'row'): HTMLElement[] => {
//     const { map, tableStart, rect } = dimension;
//     const doms: HTMLElement[] = [];
//     const seenOffsets = new Set<number>();

//     if (axis === 'col') {
//         // --- 模式：獲取「列」區域 ---
//         // 遍歷當前單元格橫跨的所有邏輯列 (rect.left -> rect.right)
//         for (let col = rect.left; col < rect.right; col++) {
//             for (let row = 0; row < map.height; row++) {
//                 const offset = map.map[row * map.width + col];
//                 if (!seenOffsets.has(offset)) {
//                     const absPos = tableStart + offset;
//                     const dom = view.nodeDOM(absPos) as HTMLElement;
//                     if (dom) {
//                         doms.push(dom);
//                         seenOffsets.add(offset);
//                     }
//                 }
//             }
//         }
//     } else {
//         // --- 模式：獲取「行」區域 ---
//         // 遍歷當前單元格橫跨的所有邏輯行 (rect.top -> rect.bottom)
//         // 如果單元格是 rowspan="2"，則會掃描這兩行內的所有單元格
//         for (let row = rect.top; row < rect.bottom; row++) {
//             for (let col = 0; col < map.width; col++) {
//                 const offset = map.map[row * map.width + col];
//                 if (!seenOffsets.has(offset)) {
//                     const absPos = tableStart + offset;
//                     const dom = view.nodeDOM(absPos) as HTMLElement;
//                     if (dom) {
//                         doms.push(dom);
//                         seenOffsets.add(offset);
//                     }
//                 }
//             }
//         }
//     }

//     // console.log(`Axis: ${axis}, 區域範圍: ${axis === 'row' ? (rect.top + '-' + rect.bottom) : (rect.left + '-' + rect.right)}, 獲取到單元格數量: ${doms.length}`);
//     return doms;
// }

export const getCellNodeInfoByCellDom = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row') => {
    if (!cell) {
        return null;
    }

    const { state } = view;
    // 1. 获取单元格在文档中的绝对位置
    const pos = view.posAtDOM(cell, 0);
    const $pos = state.doc.resolve(pos);
    const cellNodeInfo = findCell($pos);
    // 2. 找到所属的 Table 节点及其起始位置
    const tableNodeInfo = findTable($pos);
    if (!tableNodeInfo || !cellNodeInfo) {
        return null;
    }

    // 3. 获取 Table 内部内容的起始偏移量 (tableStart)
    // 这是将 matrix 中的相对 pos 转换为绝对 pos 的关键
    // const tableStart = tableNodeInfo.start;

    // 4. 获取矩阵和当前单元格的 Span 信息
    const matrix = getTableNodeMatrix(tableNodeInfo.node);
    
    const cellSpanInfo: any = getCellSpanInfoByCellNode(cellNodeInfo.node, matrix);
    const sourceRange = getExtendedRange(type === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow, matrix, type);
    const map = TableMap.get(tableNodeInfo.node);
    return {
        tableNode: tableNodeInfo,
        cellNode: cellNodeInfo,
        cellSpan: cellSpanInfo,
        cellRange: sourceRange,
        tableMap: map,
        matrix
    };
}

export const selectCellDimensionByCellNodeInfo = (view: EditorView, cellNodeInfo: any, type: 'col' | 'row' = 'row') => {
    if (!cellNodeInfo) {
        return false;
    }
    let anchorOffset: number;
    let headOffset: number;
    const startPos = cellNodeInfo.tableNode.start;
    const { start, end } = cellNodeInfo.cellRange;
    const map = cellNodeInfo.tableMap;
    const { state, dispatch } = view;

    // 1. 找到第 index 行的第一个单元格 (左上角)
    // const anchorCell = startPos + map.map[index * map.width];

    // // 2. 找到第 index + 1 行的最后一个单元格 (右下角)
    // // 公式：(当前起始行 + 选中行数) * 总宽度 - 1
    // const headCell = startPos + map.map[(index + 2) * map.width - 1];

    // // 3. 创建选区
    // const sel = CellSelection.create(state.doc, anchorCell, headCell);
    // dispatch(state.tr.setSelection(sel));


    // const map = TableMap.get(tableNode);
    // const startPos = tableResult.start;

    // // 1. 找到第 index 列的第一行单元格 (左上角)
    // const anchorCell = startPos + map.map[index];

    // // 2. 找到第 index + 1 列的最后一行单元格 (右下角)
    // // 公式：(总高度 - 1) * 总宽度 + (起始列 + 选中列数 - 1)
    // const lastRowIndex = (map.height - 1) * map.width;
    // const headCell = startPos + map.map[lastRowIndex + (index + 1)];

    // // 3. 创建选区
    // const sel = CellSelection.create(state.doc, anchorCell, headCell);
    // dispatch(state.tr.setSelection(sel));

    if (type === 'row') {
        // 逻辑：行索引 * 总宽度 = 该行第一个格子的索引
        // const rowIndex = index * map.width;
        // const anchorCell = startPos + map.map[rowIndex];

        anchorOffset = map.map[start * map.width];
        headOffset = map.map[(end + 1) * map.width - 1];
    } else {
        /// 逻辑：直接取第 index 列在第一行（row 0）的偏移量
        // const colIndex = index; 
        // const anchorCell = startPos + map.map[colIndex];

        anchorOffset = map.map[start];
        headOffset = map.map[(map.height - 1) * map.width + end];
    }

    try {
        // 5. 构造 CellSelection
        // 注意：CellSelection 的构造函数会自动处理 anchor 和 head 属于同一个表格的校验
        const selection = new CellSelection(
            state.doc.resolve(startPos + anchorOffset),
            state.doc.resolve(startPos + headOffset)
        );

        const nextTr = state.tr.setSelection(selection);

        // 如果是 Notion 风格，通常点击按钮选中后不希望干扰历史记录
        // nextTr.setMeta('addToHistory', false);

        dispatch?.(nextTr);

        // 只有在非拖拽开始的情况下才 focus，防止干扰 HTML5 DragEvents
        // view.focus(); 
        return true;
    } catch (e) {
        console.error('CellSelection creation failed. Table structure might be corrupted.', e);
        return false;
    }
}

export const getCellDimensionDomsByCellNodeInfo = (view: EditorView, cellNodeInfo: any, type: 'col' | 'row' = 'row') => {
    if (!cellNodeInfo) {
        return false;
    }
    const startPos = cellNodeInfo.tableNode.start;
    const { start, end } = cellNodeInfo.cellRange;
    const matrix = cellNodeInfo.matrix;
    // 6. 遍历矩阵获取对应的 DOM 节点
    // 使用 Set 存储 pos，防止同一个合并单元格被重复添加
    const seenPos = new Set<number>();
    const doms: HTMLTableCellElement[] = [];

    if (type === 'row') {
        // 遍历 start 到 end 之间的所有行
        for (let r = start; r <= end; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
                const cellData = matrix[r][c];
                if (cellData && !seenPos.has(cellData.pos)) {
                    seenPos.add(cellData.pos);
                    // 将相对位置转为绝对位置获取 DOM
                    const dom = view.nodeDOM(startPos + cellData.pos) as HTMLTableCellElement;
                    if (dom) {
                        doms.push(dom);
                    }
                }
            }
        }
    } else {
        // 遍历 start 到 end 之间的所有列
        for (let c = start; c <= end; c++) {
            for (let r = 0; r < matrix.length; r++) {
                const cellData = matrix[r][c];
                if (cellData && !seenPos.has(cellData.pos)) {
                    seenPos.add(cellData.pos);
                    const dom = view.nodeDOM(startPos + cellData.pos) as HTMLTableCellElement;
                    if (dom) {
                        doms.push(dom);
                    }
                }
            }
        }
    }
    return doms;
}

export const getCellDimensionRectByCellNodeInfo = (view: EditorView, cellNodeInfo: any, type: 'col' | 'row' = 'row', container?: HTMLDivElement) => {
    if (!cellNodeInfo) {
        return null;
    }
    const tableStart = cellNodeInfo.tableNode.start;
    const { start, end } = cellNodeInfo.cellRange;
    const matrix = cellNodeInfo.matrix;

    // 5. 初始化邊界變量
    let minTop = Infinity;
    let minLeft = Infinity;
    let maxBottom = -Infinity;
    let maxRight = -Infinity;
    const seenPos = new Set<number>();

    // 獲取容器的矩形和滾動量
    const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
    const scrollLeft = container ? container.scrollLeft : 0;
    const scrollTop = container ? container.scrollTop : 0;

    // 內部更新函數：獲取單元格 DOM 並計算 Viewport 邊界
    const updateRect = (relativePos: number) => {
        if (seenPos.has(relativePos)) {
            return;
        }
        seenPos.add(relativePos);
        
        // 絕對位置 = tableStart + 矩陣中的相對偏移
        const dom = view.nodeDOM(tableStart + relativePos) as HTMLElement;
        if (dom) {
            const rect = dom.getBoundingClientRect();
            minTop = Math.min(minTop, rect.top);
            minLeft = Math.min(minLeft, rect.left);
            maxBottom = Math.max(maxBottom, rect.bottom);
            maxRight = Math.max(maxRight, rect.right);
        }
    };

    // 6. 遍歷選定維度的所有邏輯格子
    if (type === 'row') {
        for (let r = start; r <= end; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                updateRect(matrix[r][c].pos);
            }
        }
    } else {
        for (let c = start; c <= end; c++) {
            for (let r = 0; r < matrix.length; r++) {
                updateRect(matrix[r][c].pos);
            }
        }
    }

    if (minTop === Infinity) {
        return null;
    }

    // 7. 返回相對於容器內容頂部的座標 (考慮滾動補償)
    // 公式：(單元格視窗座標 - 容器視窗座標) + 容器滾動偏移
    return {
        top: (minTop - containerRect.top) + scrollTop,
        left: (minLeft - containerRect.left) + scrollLeft,
        bottom: (maxBottom - containerRect.top) + scrollTop,
        right: (maxRight - containerRect.left) + scrollLeft,
        width: maxRight - minLeft,
        height: maxBottom - minTop
    };
};

export const selectCellDimension = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row') => {
    return selectCellDimensionByCellNodeInfo(view, getCellNodeInfoByCellDom(view, cell, type), type);
}

export const getCellDimensionDoms = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row') => {
    return getCellDimensionDomsByCellNodeInfo(view, getCellNodeInfoByCellDom(view, cell, type), type);
}

export const getCellDimensionRect = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row', container?: HTMLDivElement) => {
    return getCellDimensionRectByCellNodeInfo(view, getCellNodeInfoByCellDom(view, cell, type), type, container);
};

export const selectCellDimensionByIndex = (view: EditorView, index: number = 0, tableNodeInfo: any, type: 'col' | 'row' = 'row') => {
    if (!tableNodeInfo) {
        return false;
    }
    const matrix = getTableNodeMatrix(tableNodeInfo.node);
    const sourceRange = getExtendedRange(index, matrix, type);
    const map = TableMap.get(tableNodeInfo.node);
    // return {
    //     tableNode: tableNodeInfo,
    //     cellRange: sourceRange,
    //     tableMap: map,
    //     matrix
    // };
    return selectCellDimensionByCellNodeInfo(view, {
        tableNode: tableNodeInfo,
        cellRange: sourceRange,
        tableMap: map
    }, type);
}

export const findTable = ($pos: any) => {
    return findParentNodeClosestToPos($pos, (n: any) => n.type.spec.tableRole === 'table');
}

export const findCell = ($pos: any) => {
    return findParentNodeClosestToPos($pos, (n: any) => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
}
    
/**
 * 获取包含合并单元格的完整行或列范围
 */
export const getExtendedRange = (index: number, nodeMatrix: any, type: 'col' | 'row' = 'row') => {
    let start = index;
    let end = index;
    let changed = true;

    // 只要範圍在擴大，就持續掃描
    while (changed) {
        changed = false;

        // 根據是「行拖拽」還是「列拖拽」決定掃描的主軸範圍
        const rStart = type === 'col' ? 0 : start;
        const rLimit = type === 'col' ? nodeMatrix.length : end + 1;

        for (let r = rStart; r < rLimit; r++) {
            const rowData = nodeMatrix[r];
            if (!rowData) {
                continue;
            }

            // 根據類型決定掃描的交叉軸範圍
            const cStart = type === 'col' ? start : 0;
            const cLimit = type === 'col' ? end + 1 : rowData.length;

            for (let c = cStart; c < cLimit; c++) {
                const node = rowData[c]; // 這裡拿到的是你存入的對象 { cell, startRow, ... }
                if (!node) {
                    continue;
                }

                if (type === 'col') {
                    // --- 列擴展邏輯 ---
                    // 檢查該單元格的【邏輯起始列】是否在當前 start 之外
                    if (node.startCol < start) {
                        start = node.startCol;
                        changed = true;
                    }
                    // 檢查該單元格的【邏輯結束列】是否在當前 end 之外
                    if (node.endCol > end) {
                        end = node.endCol;
                        changed = true;
                    }
                } else {
                    // --- 行擴展邏輯 ---
                    // 檢查該單元格的【邏輯起始行】是否在當前 start 之外
                    if (node.startRow < start) {
                        start = node.startRow;
                        changed = true;
                    }
                    // 檢查該單元格的【邏輯結束行】是否在當前 end 之外
                    if (node.endRow > end) {
                        end = node.endRow;
                        changed = true;
                    }
                }
            }
        }
    }

    return { start, end };
};

/**
 * 修正索引：防止切断合并块
 * @param {number} rawIndex 初始判定的索引
 * @param {string} type 'col' | 'row'
 */
export const getSafeInfo = (mousePos: any, axis: any, nodeMatrix: any, type: 'col' | 'row' = 'row') => {
    const curPos = type === 'row' ? mousePos.top : mousePos.left;
    const lines = type === 'row' ? axis.yLines : axis.xLines;
    
    // 1. 寻找初步最近的线索引
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < lines.length; i++) {
        const diff = Math.abs(curPos - lines[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }

    // 2. 边界保护（表格最外围的线永远不被阻塞）
    if (closestIndex <= 0 || closestIndex >= lines.length - 1) {
        return {
            index: closestIndex,
            pos: lines[closestIndex],
            isBlock: false 
        };
    }

    const rowCount = nodeMatrix.length;
    const colCount = nodeMatrix[0] ? nodeMatrix[0].length : 0;
    const checkLimit = type === 'col' ? rowCount : colCount;

    // 3. 扫描该“线”是否切开了任何合并单元格
    let isBlock = false;
    let blockedCellRange = null;

    for (let i = 0; i < checkLimit; i++) {
        const cellBefore = type === 'col' ? nodeMatrix[i][closestIndex - 1] : nodeMatrix[closestIndex - 1][i];
        const cellAfter = type === 'col' ? nodeMatrix[i][closestIndex] : nodeMatrix[closestIndex][i];

        // 核心判断：前后两个逻辑格子物理位置相同，说明线在单元格内部
        if (cellBefore && cellAfter && cellBefore.pos === cellAfter.pos) {
            isBlock = true;
            // 记录这个导致阻塞的单元格范围
            blockedCellRange = {
                start: type === 'col' ? cellBefore.startCol : cellBefore.startRow,
                end: type === 'col' ? cellBefore.endCol + 1 : cellBefore.endRow + 1
            };
            break; // 只要有一处切断，整根线就是 Block 状态
        }
    }

    // 4. 处理阻塞：执行吸附逻辑
    if (isBlock && blockedCellRange) {
        const distToStart = Math.abs(curPos - lines[blockedCellRange.start]);
        const distToEnd = Math.abs(curPos - lines[blockedCellRange.end]);

        // 选择离鼠标最近的合法边界
        const snappedIndex = distToStart < distToEnd ? blockedCellRange.start : blockedCellRange.end;
        
        return {
            index: snappedIndex,
            pos: lines[snappedIndex],
            isBlock: true // 告诉外部，原始位置是非法的，已自动修正
        };
    }

    // 5. 正常返回
    return {
        index: closestIndex,
        pos: lines[closestIndex],
        isBlock: false
    };

}

export const getCellSelectionDOMRect = (view: EditorView, selection: CellSelection) => {

    let minTop = Infinity;
    let minLeft = Infinity;
    let maxBottom = -Infinity;
    let maxRight = -Infinity;

    selection.forEachCell((node, pos) => {
        const dom = view.nodeDOM(pos) as HTMLElement;
        if (dom) {
            const rect = dom.getBoundingClientRect();
            minTop = Math.min(minTop, rect.top);
            minLeft = Math.min(minLeft, rect.left);
            maxBottom = Math.max(maxBottom, rect.bottom);
            maxRight = Math.max(maxRight, rect.right);
        }
    });

    return {
        top: minTop,
        left: minLeft,
        width: maxRight - minLeft,
        height: maxBottom - minTop,
        right: maxRight,
        bottom: maxBottom
    };
}

/**
 * 将 TableNode 转换为二维矩阵结构
 * @param tableNode 这里的 tableNode 是 ProseMirror 的 Node 对象
 */
export const getTableNodeMatrix = (tableNode: Node) => {
    const map = TableMap.get(tableNode);
    // const tableStart = 0; // 如果是相对位置设为0，如果是绝对位置需传入 tablePos + 1
    const matrix = [];

    // 初始化空的二维数组
    for (let r = 0; r < map.height; r++) {
        matrix[r] = new Array(map.width);
    }

    // 记录已经处理过的 pos，防止重复计算同一个单元格
    const seen: { [key: number]: any } = {};

    for (let r = 0; r < map.height; r++) {
        for (let c = 0; c < map.width; c++) {
            // 获取当前逻辑格子的相对偏移量
            const mapIndex = r * map.width + c;
            const pos = map.map[mapIndex];

            // 如果这个单元格已经处理过（它是之前某个单元格的 span 部分）
            if (seen[pos]) {
                matrix[r][c] = seen[pos];
                continue;
            }

            // 这是一个新的物理单元格起始点
            const cellNode = tableNode.nodeAt(pos);
            const colspan = cellNode?.attrs.colspan || 1;
            const rowspan = cellNode?.attrs.rowspan || 1;

            const cellData = {
                cell: null,
                node: cellNode,
                pos: pos,
                startRow: r,
                startCol: c,
                endRow: r + rowspan - 1,
                endCol: c + colspan - 1,
                rs: rowspan,
                cs: colspan
            };

            // 将该单元格填充进它所占据的所有逻辑格子中
            for (let i = r; i < r + rowspan; i++) {
                for (let j = c; j < c + colspan; j++) {
                    matrix[i][j] = cellData;
                }
            }

            seen[pos] = cellData;
        }
    }

    return matrix;
}

export const getCellSpanInfoByCellNode = (cellNode: Node, nodeMatrix: any) => {
    if (!nodeMatrix || !nodeMatrix.length) {
        return null;
    }

    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;

    // 遍历整个矩阵寻找该 td 占据的所有坐标点
    for (let r = 0; r < nodeMatrix.length; r++) {
        for (let c = 0; c < nodeMatrix[r].length; c++) {
            if (nodeMatrix[r][c].node === cellNode) {
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
            }
        }
    }

    return {
        startRow: minRow,
        endRow: maxRow,
        startCol: minCol,
        endCol: maxCol
    };
}

export const getSelectionCellsRect = (view: EditorView) => {
    const { selection } = view.state;
    let rect = null;
    if (selection instanceof CellSelection) {
        rect = getCellSelectionDOMRect(view, selection);
    } else {
        const { $anchor } = selection;
        const cell = cellAround($anchor);
        if (cell) {
            rect = getNodeRect(view, cell.pos)
        }
    }
    // const tableNodeInfo = findParentNodeClosestToPos(selection.$from, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
    // const dom = view.nodeDOM(tableNodeInfo.pos); 
    // const tableContainer = closestTableView(dom);
    // const curCtolPanel = ctrolPanelMap.get(tableContainer);
    return rect;

}