import { NodeSelection } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import {
    CellSelection,
    cellAround,
    TableMap
} from 'prosemirror-tables';
import { CLASSNAME } from '@/global';

export const isNodeEmpty = (node: Node, {
    checkChildren = true,
    ignoreWhitespace = false,
}: {
    /**
     * When true (default), it will also check if all children are empty.
     */
    checkChildren?: boolean
    /**
     * When true, it will ignore whitespace when checking for emptiness.
     */
    ignoreWhitespace?: boolean
} = {},
): boolean => {
    if (ignoreWhitespace) {
        if (node.type.name === 'hardBreak') {
            // Hard breaks are considered empty
            return true;
        }
        if (node.isText) {
            return /^\s*$/m.test(node.text ?? '');
        }
    }

    if (node.isText) {
        return !node.text;
    }

    if (node.isAtom || node.isLeaf) {
        return false;
    }

    if (node.content.childCount === 0) {
        return true;
    }

    if (checkChildren) {
        let isContentEmpty = true;

        node.content.forEach(childNode => {
            if (isContentEmpty === false) {
                // Exit early for perf
                return;
            }

            if (!isNodeEmpty(childNode, { ignoreWhitespace, checkChildren })) {
                isContentEmpty = false;
            }
        })

        return isContentEmpty;
    }

    return false;
}

export const posToDOMRect = (view: EditorView, from: number, to: number): DOMRect => {
    const minPos = 0
    const maxPos = view.state.doc.content.size;
    const resolvedFrom = Math.min(Math.max(from, minPos), maxPos);
    const resolvedEnd = Math.min(Math.max(to, minPos), maxPos);
    const start = view.coordsAtPos(resolvedFrom);
    const end = view.coordsAtPos(resolvedEnd, -1);
    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    const width = right - left;
    const height = bottom - top;
    const x = left;
    const y = top;
    const data = {
        top,
        bottom,
        left,
        right,
        width,
        height,
        x,
        y
    };

    return {
        ...data,
        toJSON: () => data
    };
}

export const getSelectionBoundingRect = (view: EditorView): DOMRect | null => {
    const { selection } = view.state;
    const { ranges } = selection;

    const from = Math.min(...ranges.map((range: any) => range.$from.pos));
    const to = Math.max(...ranges.map((range: any) => range.$to.pos));

    if (selection instanceof NodeSelection) {
        const node = view.nodeDOM(from) as HTMLElement;
        if (node) {
            return node.getBoundingClientRect();
        }
    }

    return posToDOMRect(view, from, to);
}

export const findSuggestionMatch = (config: any) => {
    const {
        char = '/',
        startOfLine = false,
        allowSpaces = false,
        allowToIncludeChar = false,
        allowedPrefixes = [' '],
        $position
    } = config;
    let text: any = $position.nodeBefore?.isText && $position.nodeBefore.text;
    // if (text === null || text === undefined) {
    //     return null;
    // }
    if (!text) {
        return null;
    }
    const textFrom = $position.pos - text.length;
    const escapedChar = char.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const suffix = new RegExp(`\\s${escapedChar}$`);
    const prefix = startOfLine ? '^' : '';
    const finalEscapedChar = allowToIncludeChar ? '' : escapedChar;
    const regexp = allowSpaces
        ? new RegExp(`${prefix}${escapedChar}.*?(?=\\s${finalEscapedChar}|$)`, 'gm')
        : new RegExp(`${prefix}(?:^)?${escapedChar}[^\\s${finalEscapedChar}]*`, 'gm');
    const match: any = Array.from(text.matchAll(regexp)).pop();
    if (!match || match.input === undefined || match.index === undefined) {
        return null;
    }
    const matchPrefix = match.input.slice(Math.max(0, match.index - 1), match.index);
    let matchPrefixIsAllowed = new RegExp(`^[${allowedPrefixes?.join('')}+\0]?$`).test(matchPrefix);
    if (matchPrefix.length > 0 && matchPrefix.trim() === '') {
        matchPrefixIsAllowed = true;
    }
    // const matchPrefixIsAllowed = new RegExp(`\\s*$`).test(matchPrefix);


    if (allowedPrefixes !== null && !matchPrefixIsAllowed) {
        return null;
    }

    const from = textFrom + match.index;
    let to = from + match[0].length;

    if (allowSpaces && suffix.test(text.slice(to - 1, to + 1))) {
        match[0] += ' ';
        to += 1;
    }

    if (from < $position.pos && to >= $position.pos) {
        return {
            range: {
                from,
                to
            },
            query: match[0].slice(char.length),
            text: match[0]
        }
    }
    return null;
}

export const closest = (dom: any, fn: Function) => {
    let node = dom;
    // 向上遍历直到找到 TABLE 标签或到达根节点
    while (node && !(node.classList && node.classList.contains('ProseMirror'))) {
        if (fn(node)) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

// export const closetElement = (dom: any) => {
//     let node = dom;
//     // 向上遍历直到找到 TABLE 标签或到达根节点
//     while (node && node.nodeName !== 'TABLE') {
//         // 如果到了编辑器容器外还没找到，就停止
//         if (node.classList && node.classList.contains('ProseMirror')) {
//             break;
//         }
//         node = node.parentNode;
//     }
//     return (node && node.nodeName === 'TABLE') ? node : null;
// }


/**
 * 寻找距离指定位置最近的符合条件的父节点
 * @param {ResolvedPos} $pos - ProseMirror 的 ResolvedPos
 * @param {Function} predicate - 条件函数 (node) => boolean
 */
export const findParentNodeClosestToPos = ($pos, predicate) => {
    for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (predicate(node)) {
            return {
                pos: $pos.before(d), // 节点在文档中的绝对起点
                start: $pos.start(d), // 节点内容（子节点）的绝对起点
                depth: d,
                node,
            };
        }
    }
    return null;
};

/**
 * 获取指定位置所属单元格在表格中的矩形坐标 (top, left, bottom, right)
 * @param $pos ResolvedPos 对象
 */
export const findCellRectClosestToPos = ($pos: any) => {
    // 1. 寻找最近的单元格 (td 或 th)
    const cell = findParentNodeClosestToPos($pos, node =>
        node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell'
    );
    if (!cell) {
        return null;
    }

    // 2. 寻找所属的表格 (table)
    const table = findParentNodeClosestToPos($pos, node =>
        node.type.spec.tableRole === 'table'
    );
    if (!table) {
        return null;
    }

    const map = TableMap.get(table.node);
    // 3. 计算相对于表格内容的偏移量
    // cell.pos 是 <td> 的起点，table.start 是第一个 <tr> 的起点
    const relativeOffset = cell.pos - table.start;

    // 4. 返回 Rect 坐标
    return map.findCell(relativeOffset);
}

export const getOuterNode = (doc: Node, pos: number): Node | null => {
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

export const getOuterNodePos = (doc: Node, pos: number): number => {
    const resolvedPos = doc.resolve(pos);
    const { depth } = resolvedPos;

    if (depth === 0) {
        return pos;
    }

    const a = resolvedPos.pos - resolvedPos.parentOffset;

    return a - 1;
}

// const getTableFromEvent = (event: any) => {
//     let node = event.target;

//     // 向上遍历直到找到 TABLE 标签或到达根节点
//     while (node && node.nodeName !== 'TABLE') {
//         // 如果到了编辑器容器外还没找到，就停止
//         if (node.classList && node.classList.contains('ProseMirror')) {
//             break;
//         }
//         node = node.parentNode;
//     }

//     return (node && node.nodeName === 'TABLE') ? node : null;
// }

export const closestBlock = (dom: any) => {
    return closest(dom, node => node.getAttribute('data-block-id'));
}

export const closestTableView = (dom: any) => {
    return closest(dom, (dom: any) => dom.classList && dom.classList.contains(`${CLASSNAME}-table-view`));
}

export const closestTable = (dom: any) => {
    return closest(dom, node => node.tagName === 'TABLE');
}

export const closestCell = (dom: any) => {
    return closest(dom, node => node.tagName === 'TH' || node.tagName === 'TD');
}

export const closestTr = (dom: any) => {
    return closest(dom, node => node.tagName === 'TR');
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

export const getTableCellMatrix = (tableElement: HTMLTableElement) => {
    if (!tableElement || tableElement.nodeName !== 'TABLE') {
        return null;
    }
    const matrix = [];
    Array.from(tableElement.rows).forEach((tr, rowIndex) => {
        matrix[rowIndex] = matrix[rowIndex] || [];
        let colOffset = 0;
        Array.from(tr.cells).forEach(td => {
            // 寻找当前行第一个空位
            while (matrix[rowIndex][colOffset]) {
                colOffset++;
            }
            const rs = td.rowSpan || 1;
            const cs = td.colSpan || 1;
            // 填充逻辑矩阵，所有跨度内的位置都指向这个 td
            for (let r = 0; r < rs; r++) {
                for (let c = 0; c < cs; c++) {
                    matrix[rowIndex + r] = matrix[rowIndex + r] || [];
                    matrix[rowIndex + r][colOffset + c] = td;
                }
            }
        });
    });
    return matrix;
}

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
export const getCellSpanInfo = (cell: HTMLTableCellElement, matrix: any) => {
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

/**
 * 獲取點擊單元格（或柄所在的單元格）所屬的完整合併塊範圍
 */
// export const getSourceRange = (cell: HTMLTableCellElement, matrix: any, type: 'col' | 'row' = 'row') => {
//     let min = Infinity;
//     let max = -Infinity;

//     // 遍歷矩陣尋找該 cell 佔據的所有邏輯位置
//     for (let r = 0; r < matrix.length; r++) {
//         for (let c = 0; c < matrix[r].length; c++) {
//             // 檢查當前格子的 cell 引用是否一致
//             if (matrix[r][c]?.cell === cell) {
//                 const index = type === 'col' ? c : r;
//                 if (index < min) {
//                     min = index;
//                 }
//                 if (index > max) {
//                     max = index;
//                 }
//             }
//         }
//     }

//     // 如果沒找到（理論上不會），返回 0,0
//     if (min === Infinity) {
//         return { start: 0, end: 0 };
//     }

//     return { start: min, end: max };
// }

/**
 * 获取包含合并单元格的完整列范围
 * @param {Array} matrix 逻辑矩阵（由第一步 getTableMatrix 生成）
 * @param {number} colIndex 用户点击/拖拽的起始列索引
 * @returns {Object} { start, end } 完整的列区间
 */
// export const getExtendedColRange = (colIndex: number, matrix: any) => {
//     if (!matrix || !matrix.length) {
//         return null;
//     }
//     let start = colIndex;
//     let end = colIndex;
//     let changed = true;

//     // 只要范围还在扩大，就继续扫描，确保不会切断任何合并单元格
//     while (changed) {
//         changed = false;

//         // 遍历当前确定的 [start, end] 范围内每一行的单元格
//         for (let r = 0; r < matrix.length; r++) {
//             for (let c = start; c <= end; c++) {
//                 const cell = matrix[r][c].cell;
//                 if (!cell) {
//                     continue;
//                 }

//                 // 【核心调用点】：获取该单元格在矩阵中的真实占据位置
//                 const info = getCellSpanInfo(cell, matrix);
//                 if (!info) {
//                     continue;
//                 }

//                 // 如果该单元格的左边界比当前 start 还小，向左扩充
//                 if (info.startCol < start) {
//                     start = info.startCol;
//                     changed = true; // 标记已改变，需要重新完整扫描新范围
//                 }
//                 // 如果该单元格的右边界比当前 end 还大，向右扩充
//                 if (info.endCol > end) {
//                     end = info.endCol;
//                     changed = true;
//                 }
//             }
//         }
//     }
//     return { start, end };
// }

// export const getExtendedRowRange = (rowIndex: number, matrix: any) => {
//     let start = rowIndex;
//     let end = rowIndex;
//     let changed = true;

//     while (changed) {
//         changed = false;
//         // 扫描当前确定的 [start, end] 范围内所有列
//         for (let r = start; r <= end; r++) {
//             for (let c = 0; c < matrix[r].length; c++) {
//                 const cell = matrix[r][c].cell;
//                 if (!cell) {
//                     continue;
//                 }

//                 // 获取该单元格在矩阵中的真实占据位置
//                 const info = getCellSpanInfo(cell, matrix);
//                 if (!info) {
//                     continue;
//                 }

//                 // 如果单元格的顶端超出了当前 start，向上扩充
//                 if (info.startRow < start) {
//                     start = info.startRow;
//                     changed = true; // 范围变大，需要重新扫描整个新范围
//                 }
//                 // 如果单元格的底端超出了当前 end，向下扩充
//                 if (info.endRow > end) {
//                     end = info.endRow;
//                     changed = true;
//                 }
//             }
//         }
//     }
//     return { start, end };
// }

/**
 * 获取包含合并单元格的完整行或列范围
 */
export const getExtendedRange = (index: number, matrix: any, type: 'col' | 'row' = 'row') => {
    let start = index;
    let end = index;
    let changed = true;

    // 只要範圍在擴大，就持續掃描
    while (changed) {
        changed = false;

        // 根據是「行拖拽」還是「列拖拽」決定掃描的主軸範圍
        const rStart = type === 'col' ? 0 : start;
        const rLimit = type === 'col' ? matrix.length : end + 1;

        for (let r = rStart; r < rLimit; r++) {
            const rowData = matrix[r];
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
 * 获取包含合并单元格的完整行或列范围
 */
// export const getExtendedRange = (index: number, matrix: any, type: 'col' | 'row' = 'row') => {
//     let start = index;
//     let end = index;
//     let changed = true;

//     while (changed) {
//         changed = false;

//         // 根據類型決定掃描範圍
//         const rowStart = type === 'col' ? 0 : start;
//         const rowLimit = type === 'col' ? matrix.length : end + 1;

//         for (let r = rowStart; r < rowLimit; r++) {
//             if (!matrix[r]) continue;

//             const colStart = type === 'col' ? start : 0;
//             const colLimit = type === 'col' ? end + 1 : matrix[r].length;

//             for (let c = colStart; c < colLimit; c++) {
//                 const node = matrix[r][c];
//                 if (!node) continue;

//                 if (type === 'col') {
//                     // 利用你的 cs (colSpan) 屬性計算實際結束列
//                     const nodeEndCol = node.startCol + node.cs - 1;
                    
//                     if (node.startCol < start) {
//                         start = node.startCol;
//                         changed = true;
//                     }
//                     if (nodeEndCol > end) {
//                         end = nodeEndCol;
//                         changed = true;
//                     }
//                 } else {
//                     // 利用你的 rs (rowSpan) 屬性計算實際結束行
//                     const nodeEndRow = node.startRow + node.rs - 1;
                    
//                     if (node.startRow < start) {
//                         start = node.startRow;
//                         changed = true;
//                     }
//                     if (nodeEndRow > end) {
//                         end = nodeEndRow;
//                         changed = true;
//                     }
//                 }
//             }
//         }
//     }
//     return { start, end };
// };

// export const getTableCellSizes = (tableElement: HTMLTableElement) => {
//     if (!tableElement || tableElement.nodeName !== 'TABLE') {
//         return null;
//     }

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
//                         height: rect.height,
//                         left: rect.left,
//                         top: rect.top,
//                         right: rect.right,
//                         bottom: rect.bottom
//                     };
//                 }
//             }
//             visualCol += colSpan;
//         }
//     }

//     return matrix;
// }

export const getTableMatrix = (tableElement: HTMLTableElement) => {
    if (!tableElement || tableElement.nodeName !== 'TABLE') {
        return null;
    }
    const matrix = [];
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

/**
 * 核心判定：输入鼠标坐标，输出逻辑索引
 */
// export const getLogicIndex = (pos: number, lines: number[]) => {
//     // 寻找鼠标落在哪个区间
//     // 例如：pos = 150, lines = [100, 200, 300] -> 返回索引 1 (代表在第0和第1列之间)
//     for (let i = 0; i < lines.length - 1; i++) {
//         const midPoint = (lines[i] + lines[i + 1]) / 2;
//         if (pos < midPoint) {
//             return i;
//         }
//     }
//     return lines.length - 1;
//     // 示例：在 mousemove 中调用
//     // let targetCol = getLogicIndex(e.clientX, xLines);
//     // let targetRow = getLogicIndex(e.clientY, yLines);

//     // 1. Mousedown (拖动柄):
//     // 调用 getAxisMap(table) 缓存刻度。
//     // 调用 getTableCellSizes(table) 拿到 tableMatrix。
//     // 确定源范围 sourceRange（比如你拖动的是第 2 行到第 3 行的合并块）。
//     // 2. Mousemove:
//     // rawCol = getLogicIndex(e.clientX, xLines)。
//     // safeCol = getSafeIndex(rawCol, 'col')。
//     // UI 反馈：在 xLines[safeCol] 位置显示一根垂直线。这根线会随着鼠标移动，但在遇到合并单元格时会“跳过去”。
//     // 3. Mouseup:
//     // 根据 safeCol 执行最终的 DOM 移动逻辑。
// }

/**
 * 修正索引：防止切断合并块
 * @param {number} rawIndex 初始判定的索引
 * @param {string} type 'col' | 'row'
 */
export const getSafeIndex = (rawIndex: number, lines: number[], matrix: any, type: 'col' | 'row' = 'row') => {
    // 1. 寻找最近的线索引
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < lines.length; i++) {
        const diff = Math.abs(rawIndex - lines[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }

    // 2. 边界保护：如果是第一根线(0)或最后一根线，不需要检查“切断”，直接返回
    if (closestIndex <= 0 || closestIndex >= lines.length - 1) {
        return closestIndex;
    }

    // 3. 核心判定：检查这一线是否切断了合并单元格
    const rowCount = matrix.length;
    const colCount = matrix[0] ? matrix[0].length : 0;

    // 根据是行拖拽还是列拖拽，决定扫描方向
    const checkLimit = type === 'col' ? rowCount : colCount;

    for (let i = 0; i < checkLimit; i++) {
        // 关键修正：增加对 matrix[i] 和 matrix[i][index] 的存在性检查
        const lineBefore = type === 'col' ? matrix[i][closestIndex - 1] : matrix[closestIndex - 1][i];
        const lineAfter = type === 'col' ? matrix[i][closestIndex] : matrix[closestIndex][i];

        // 只有当线的前后都有单元格数据时，才进行比对
        if (lineBefore && lineAfter && lineBefore.cell === lineAfter.cell) {
            // 命中合并块内部，计算该合并块的起止逻辑位置
            const start = type === 'col' ? lineBefore.startCol : lineBefore.startRow;
            const span = type === 'col' ? lineBefore.cs : lineBefore.rs;
            const end = start + span;

            // 自动吸附：判断鼠标离合并块的哪一端更近
            const distToStart = Math.abs(rawIndex - lines[start]);
            const distToEnd = Math.abs(rawIndex - lines[end]);

            return distToStart < distToEnd ? start : end;
        }
    }

    return closestIndex;

}

/**
  * 4. 判定是否為原地 (無效移動)
  */
export const isStay = (toIndex: number, sourceRange: any): boolean => {
    // const sourceRange = getExtendedRange(fromIndex, matrix, type);
    // 技巧：落在源塊的起始索引或結束索引(start+1...end)都算原地
    return toIndex > sourceRange.start && toIndex <= sourceRange.end + 1;
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

// /**
//  * 当只有 $anchor (普通光标选区) 时，获取表格信息
//  * @param {EditorView} view 
//  */
// export const getTableInfoFromAnchor = (view: EditorView) => {
//     const { $anchor } = view.state.selection;

//     // 1. 向上遍历所有的父节点深度
//     // 从当前深度 ($anchor.depth) 一直往上找，直到根节点 (0)
//     for (let d = $anchor.depth; d > 0; d--) {
//         const node = $anchor.node(d);

//         // 2. 检查该节点是否定义了 tableRole 为 "table"
//         // 这是 prosemirror-tables 插件标记表格节点的标准方式
//         if (node.type.spec.tableRole === "table") {
//             const tablePos = $anchor.before(d); // 获取表格在文档中的起始位置
//             const tableDOM = view.nodeDOM(tablePos); // 映射到 <table> DOM

//             return {
//                 tableNode: node,
//                 tablePos: tablePos,
//                 tableDOM: tableDOM,
//                 // 如果外层有 prosemirror-tables 自动生成的 wrapper
//                 tableWrapper: tableDOM ? closestTableView : null,
//                 depth: d
//             };
//         }
//     }

//     return null; // 光标不在表格内

//     // --- 使用方法 ---
//     // const info = getTableInfoFromAnchor(view);
//     // if (info) {
//     //     console.log("光标所在的表格位置:", info.tablePos);
//     //     console.log("表格 DOM 节点:", info.tableDOM);
//     // }

//     // 1. $anchor.node(d)：
//     // 获取在深度 d 处的节点。例如，深度 d 可能是 table_cell，d - 1 可能是 table_row，d - 2 才是 table。
//     // 2. node.type.spec.tableRole：
//     // 这是最稳妥的判断方式。不要直接判断 node.type.name === 'table'，因为不同 Schema 里的表格命名可能不同（如 my_table），但 prosemirror - tables 要求必须设置 tableRole 属性。
//     // 3. $anchor.before(d)：
//     // 获取第 d 层节点之前的位置。这正是 view.nodeDOM 所需要的准确索引。

//     // 这种场景与 CellSelection 的区别
//     // 1. CellSelection：表示用户选中了格子（通常背景变蓝）。此时 $anchor 实际上是选区的一个端点单元格位置。
//     // 2. 普通 $anchor：表示用户只是把光标点进了格子。此时 $anchor 指向的是单元格内部的文本节点（如 paragraph）。

//     // 注意事项
//     // 如果你在 table_cell 中使用了自定义的 NodeView：
//     // 1. 只要 NodeView 没有破坏 ProseMirror 的文档树深度（即依然保持 table > row > cell > content），上述逻辑依然 100 % 有效。
//     // 2. view.nodeDOM(tablePos) 会返回你为表格定义的 NodeView 的根 DOM。

// }


// /**
// * 仅在当前选区为 CellSelection 时提取表格完整信息
// * @param {EditorView} view - ProseMirror 编辑器实例
// */
// export const getTableInfoFromCellSelection = (view: EditorView) => {
//     const { selection } = view.state;

//     // 1. 严格检查是否为单元格选区
//     if (!(selection instanceof CellSelection)) {
//         return null;
//     }

//     // 2. 通过选区内部的 $anchorCell 找到表格节点
//     // $anchorCell 是选区开始位置的单元格，-1 代表其父级（即 table）
//     const tableNode = selection.$anchorCell.node(-1);
//     const tablePos = selection.$anchorCell.before(-1);

//     // 3. 根据位置获取原生的 DOM 节点
//     const tableDOM = view.nodeDOM(tablePos); // 得到 <table> 标签
//     const tableWrapper = tableDOM ? tableDOM.parentElement : null; // 得到 .tableWrapper

//     // 4. 统计选中单元格
//     let selectedCells = [];
//     selection.forEachCell((node, pos) => {
//         selectedCells.push({
//             node: node, // td 节点
//             pos: pos,   // td 在文档中的位置
//             dom: view.nodeDOM(pos) // td 的 DOM 元素（如果是 NodeView 则返回 NodeView 的 dom）
//         });
//     });

//     return {
//         tableNode,          // 表格的 Node 对象
//         tablePos,           // 表格在文档中的起始位置 (number)
//         tableDOM,           // <table> 原生 DOM
//         tableWrapper,       // .tableWrapper 原生 DOM
//         selectedCells,      // 选中单元格的数组
//         count: selectedCells.length // 选中数量
//     };
//     // console.log("找到表格 Wrapper:", info.tableWrapper);
//     // console.log("选中了几个格子:", info.count);
//     // console.log("第一个格子的内容:", info.selectedCells[0].node.textContent);
//     // 1. selection.$anchorCell.before(-1)：
//     // 这是最直接获取表格位置的方法。-1 指向当前单元格的直接父级（即 Table）。这比手动 while 循环 DOM 要快且准确。
//     // 2. view.nodeDOM(tablePos)：
//     // 这是 ProseMirror 视图层的核心方法，它能根据文档位置直接返回编辑器中渲染的 DOM。
//     // 3. forEachCell 的参数：
//     // 回调函数中的 pos 是每个单元格的准确位置。如果你要在单元格上做视觉标记（比如弹出一个悬浮菜单），使用这个 pos 配合 view.coordsAtPos(pos) 是标准做法。
// }

export const getMaxCellRect = (view: EditorView, selection: any) => {
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

export const getCellRect = (view: EditorView, cellPos: number) => {
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

/**
 * 统一处理：无论是单元格选区还是普通光标，获取所属表格信息
 * @param {EditorView} view 
 */
export const getTableInfoByAnySelection = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    let $cellPos = null;
    let rect = null;

    // 1. 确定单元格解析位置
    if (selection instanceof CellSelection) {
        $cellPos = selection.$anchorCell;
        rect = getMaxCellRect(view, selection);
    } else {
        // 兼容光标在表格边缘的情况
        $cellPos = cellAround(selection.$anchor);
        const cell = cellAround(selection.$anchor);
        if (cell) {
            rect = getCellRect(view, cell.pos);
        }
    }

    // 如果依然找不到单元格位置，彻底说明不在表格内
    if (!$cellPos) {
        return null;
    }

    // 2. 向上寻找 Table 节点（使用 tableRole 匹配，无视 NodeView 增加的深度）
    let tableNode = null;
    let tablePos = -1;

    // 从当前位置向上查找直到文档根部
    for (let d = $cellPos.depth; d >= 0; d--) {
        const node = $cellPos.node(d);
        if (node.type.spec.tableRole === "table") {
            tableNode = node;
            tablePos = $cellPos.before(d);
            break;
        }
    }

    if (!tableNode || tablePos === -1) {
        return null;
    }

    // 3. 安全获取 DOM
    const tableDOM: any = view.nodeDOM(tablePos);
    if (!tableDOM) {
        return null;
    }

    // 4. 寻找 tableWrapper (兼容无 closest 的环境)
    // let tableWrapper = tableDOM;
    // while (tableWrapper && tableWrapper !== view.dom) {
    //     if (tableWrapper.classList && tableWrapper.classList.contains('tableWrapper')) {
    //         break;
    //     }
    //     tableWrapper = tableWrapper.parentNode;
    // }

    return {
        tableNode,
        tablePos,
        tableDOM: tableDOM.querySelector('table'),
        // 如果没找到 wrapper 类名，回退到 tableDOM.parentNode
        tableWrapper: closestTableView(tableDOM),
        $cellPos, // 保留此引用以便后续操作单元格
        rect
    };
}

// export const getTableNodeByCell = (view: EditorView, cell: any) => {
//     if (!cell) {
//         return null;
//     }
//     const pos = view.posAtDOM(cell, 0);
//     const $pos = view.state.doc.resolve(pos);

//     let tableNode = null;
//     let tablePos = -1;

//     // 向上遍历文档树层级
//     for (let d = $pos.depth; d >= 0; d--) {
//         const node = $pos.node(d);
//         if (node.type.spec.tableRole === 'table') {
//             tableNode = node;
//             tablePos = $pos.before(d); // 获取 table 节点在文档中的绝对起点
//             break;
//         }
//     }
//     if (!tableNode) {
//         return null;
//     }
//     return {
//         tableNode,
//         tablePos
//     };
// }

export const getDimensionByCell = (view: EditorView, cell: any) => {
    if (!cell) {
        return null;
    }

    try {
        const { state } = view;

        // 2. 将 DOM 转换为文档位置
        const cellPos = view.posAtDOM(cell, 0);
        const $cellPos = state.doc.resolve(cellPos);

        // 3. 找到所属的 Table 节点
        const tableData = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
        // 4. 【核心修复】使用 utils 直接获取单元格的矩形信息
        // 这个方法比手动 map.findCell(pos - start) 稳健得多，它会自动对齐偏移量
        const rect = findCellRectClosestToPos($cellPos);

        if (!tableData || !rect) {
            return null;
        }
        // 3. 定義 tableStart
        // table.pos 是 <table> 標籤之前
        // table.start 通常是 table.pos + 1，即內容開始處
        const tableStart = tableData.start;

        return {
            tableNode: tableData.node,
            tablePos: tableData.pos, // <table> 節點的起始絕對位置
            tableStart, // 表格內容（第一個 tr）的起始絕對位置
            map: TableMap.get(tableData.node),
            rowIndex: rect.top,    // 这就是 fromIndex (行)
            colIndex: rect.left,   // 这就是 fromIndex (列)
            rect             // 包含 top, left, bottom, right
        };
    } catch (e) {
        console.error("Failed to get table context:", e);
        return null;
    }
}

export const selectDimensionByCell = (view: EditorView, cell: any, axis = 'row') => {
    // 1. 确保拿到 td/th 元素，防止传入内部文本节点导致 posAtDOM 偏移
    if (!cell) {
        return null;
    }

    const { state, dispatch } = view;
    const cellPos = view.posAtDOM(cell, 0);
    const $cellPos = state.doc.resolve(cellPos);

    // 2. 使用你封装的工具函数
    const tableData = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
    if (!tableData) {
        return null;
    }

    const tableStart = tableData.start; // 使用封装好的 start (即 table.pos + 1)
    const map = TableMap.get(tableData.node);

    // 3. 获取当前单元格的逻辑坐标
    const rect = findCellRectClosestToPos($cellPos);
    if (!rect) {
        return null;
    }

    let anchorOffset: number;
    let headOffset: number;

    // 4. 计算逻辑首尾
    if (axis === 'row') {
        // 选中整行：从该行逻辑第 0 列到最后一列
        anchorOffset = map.map[rect.top * map.width + 0];
        headOffset = map.map[rect.top * map.width + (map.width - 1)];
    } else {
        // 选中整列：从逻辑第 0 行到最后一行
        anchorOffset = map.map[0 * map.width + rect.left];
        headOffset = map.map[(map.height - 1) * map.width + rect.left];
    }

    try {
        // 5. 构造 CellSelection
        // 注意：CellSelection 的构造函数会自动处理 anchor 和 head 属于同一个表格的校验
        const selection = new CellSelection(
            state.doc.resolve(tableStart + anchorOffset),
            state.doc.resolve(tableStart + headOffset)
        );

        const tr = state.tr.setSelection(selection);

        // 如果是 Notion 风格，通常点击按钮选中后不希望干扰历史记录
        tr.setMeta("addToHistory", false);

        dispatch(tr);

        // 只有在非拖拽开始的情况下才 focus，防止干扰 HTML5 DragEvents
        // view.focus(); 
    } catch (e) {
        console.error('CellSelection creation failed. Table structure might be corrupted.', e);
    }
}

/**
 * 根據行/列索引獲取真實的單元格 DOM 列表（非選區場景）
 * @param view 
 * @param ctx 之前 getTableCtx 返回的上下文 (包含 map, tableStart 等)
 * @param axis 'row' | 'col'
 */
export const getDimensionDOM = (view: EditorView, dimension: any, axis: 'row' | 'col' = 'row'): HTMLElement[] => {
    const { map, tableStart, rect } = dimension;
    const doms: HTMLElement[] = [];
    const seenOffsets = new Set<number>();

    if (axis === 'col') {
        // --- 模式：獲取「列」區域 ---
        // 遍歷當前單元格橫跨的所有邏輯列 (rect.left -> rect.right)
        for (let col = rect.left; col < rect.right; col++) {
            for (let row = 0; row < map.height; row++) {
                const offset = map.map[row * map.width + col];
                if (!seenOffsets.has(offset)) {
                    const absPos = tableStart + offset;
                    const dom = view.nodeDOM(absPos) as HTMLElement;
                    if (dom) {
                        doms.push(dom);
                        seenOffsets.add(offset);
                    }
                }
            }
        }
    } else {
        // --- 模式：獲取「行」區域 ---
        // 遍歷當前單元格橫跨的所有邏輯行 (rect.top -> rect.bottom)
        // 如果單元格是 rowspan="2"，則會掃描這兩行內的所有單元格
        for (let row = rect.top; row < rect.bottom; row++) {
            for (let col = 0; col < map.width; col++) {
                const offset = map.map[row * map.width + col];
                if (!seenOffsets.has(offset)) {
                    const absPos = tableStart + offset;
                    const dom = view.nodeDOM(absPos) as HTMLElement;
                    if (dom) {
                        doms.push(dom);
                        seenOffsets.add(offset);
                    }
                }
            }
        }
    }

    // console.log(`Axis: ${axis}, 區域範圍: ${axis === 'row' ? (rect.top + '-' + rect.bottom) : (rect.left + '-' + rect.right)}, 獲取到單元格數量: ${doms.length}`);
    return doms;
}