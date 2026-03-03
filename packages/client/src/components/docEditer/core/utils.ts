import { NodeSelection } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import {
    CellSelection,
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
// export const findCellRectClosestToPos = ($pos: any) => {
//     // 1. 寻找最近的单元格 (td 或 th)
//     const cell = findParentNodeClosestToPos($pos, node =>
//         node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell'
//     );
//     if (!cell) {
//         return null;
//     }

//     // 2. 寻找所属的表格 (table)
//     const table = findParentNodeClosestToPos($pos, node =>
//         node.type.spec.tableRole === 'table'
//     );
//     if (!table) {
//         return null;
//     }

//     const map = TableMap.get(table.node);
//     // 3. 计算相对于表格内容的偏移量
//     // cell.pos 是 <td> 的起点，table.start 是第一个 <tr> 的起点
//     const relativeOffset = cell.pos - table.start;

//     // 4. 返回 Rect 坐标
//     return map.findCell(relativeOffset);
// }

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
 * 修正索引：防止切断合并块
 * @param {number} rawIndex 初始判定的索引
 * @param {string} type 'col' | 'row'
 */
export const getSafeInfo = (mousePos: any, axis: any, matrix: any, type: 'col' | 'row' = 'row') => {
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

    const rowCount = matrix.length;
    const colCount = matrix[0] ? matrix[0].length : 0;
    const checkLimit = type === 'col' ? rowCount : colCount;

    // 3. 扫描该“线”是否切开了任何合并单元格
    let isBlock = false;
    let blockedCellRange = null;

    for (let i = 0; i < checkLimit; i++) {
        const cellBefore = type === 'col' ? matrix[i][closestIndex - 1] : matrix[closestIndex - 1][i];
        const cellAfter = type === 'col' ? matrix[i][closestIndex] : matrix[closestIndex][i];

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

export const getNodeRect = (view: EditorView, cellPos: number) => {
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

export const selectCellDimension = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row') => {
    if (!cell) {
        return null;
    }
    const { state, dispatch } = view;
    const cellPos = view.posAtDOM(cell, 0);
    const $cellPos = state.doc.resolve(cellPos);
    const tableNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
    if (!tableNodeInfo) {
        return;
    }
    const map = TableMap.get(tableNodeInfo.node);
    const cellNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
    const matrix = getTableNodeMatrix(tableNodeInfo.node);
    const cellSpanInfo = getCellSpanInfoByCellNode(cellNodeInfo.node, matrix);
    const sourceRange = getExtendedRange(type === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow, matrix, type);
    const { start, end } = sourceRange;
    let anchorOffset: number;
    let headOffset: number;
    const startPos = tableNodeInfo.start;

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

        const tr = state.tr.setSelection(selection);

        // 如果是 Notion 风格，通常点击按钮选中后不希望干扰历史记录
        tr.setMeta('addToHistory', false);

        dispatch(tr);

        // 只有在非拖拽开始的情况下才 focus，防止干扰 HTML5 DragEvents
        // view.focus(); 
    } catch (e) {
        console.error('CellSelection creation failed. Table structure might be corrupted.', e);
    }
}

export const getCellDimensionDoms = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row') => {
    if (!cell) {
        return null;
    }

    const { state } = view;
    // 1. 获取单元格在文档中的绝对位置
    const cellPos = view.posAtDOM(cell, 0);
    const $cellPos = state.doc.resolve(cellPos);

    // 2. 找到所属的 Table 节点及其起始位置
    const tableNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
    if (!tableNodeInfo) return null;

    // 3. 获取 Table 内部内容的起始偏移量 (tableStart)
    // 这是将 matrix 中的相对 pos 转换为绝对 pos 的关键
    const tableStart = tableNodeInfo.start;

    // 4. 获取矩阵和当前单元格的 Span 信息
    const matrix = getTableNodeMatrix(tableNodeInfo.node);
    const cellNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
    if (!cellNodeInfo) {
        return null;
    }

    const cellSpanInfo = getCellSpanInfoByCellNode(cellNodeInfo.node, matrix);

    // 5. 获取需要选中的行/列索引范围 (考虑了合并单元格的扩展)
    const sourceRange = getExtendedRange(
        type === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow,
        matrix,
        type
    );
    const { start, end } = sourceRange;

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
                    const dom = view.nodeDOM(tableStart + cellData.pos) as HTMLTableCellElement;
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
                    const dom = view.nodeDOM(tableStart + cellData.pos) as HTMLTableCellElement;
                    if (dom) {
                        doms.push(dom);
                    }
                }
            }
        }
    }
    return doms;
}

export const getCellDimensionRect = (view: EditorView, cell: HTMLTableCellElement, type: 'col' | 'row' = 'row', container?: HTMLDivElement) => {
    if (!cell) {
        return null;
    }

    const { state } = view;
    // 1. 將 DOM 座標轉為 ProseMirror 絕對位置
    const cellPos = view.posAtDOM(cell, 0);
    const $cellPos = state.doc.resolve(cellPos);
    
    // 2. 獲取表格節點及內容起始點 (tableStart)
    const tableNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'table');
    if (!tableNodeInfo) {
        return null;
    }

    const tableStart = tableNodeInfo.start; 
    const matrix = getTableNodeMatrix(tableNodeInfo.node);
    
    // 3. 獲取單元格在矩陣中的 Span 信息
    const cellNodeInfo = findParentNodeClosestToPos($cellPos, n => n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell');
    if (!cellNodeInfo) {
        return null;
    }

    const cellSpanInfo = getCellSpanInfoByCellNode(cellNodeInfo.node, matrix);
    
    // 4. 根據合併單元格擴展範圍 (防止切斷合併單元格)
    const sourceRange = getExtendedRange(
        type === 'col' ? cellSpanInfo.startCol : cellSpanInfo.startRow, 
        matrix, 
        type
    );
    const { start, end } = sourceRange;

    // 5. 初始化邊界變量
    let minTop = Infinity, minLeft = Infinity;
    let maxBottom = -Infinity, maxRight = -Infinity;
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
    const seen = {};

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

export const getCellSpanInfoByCellNode = (cellNode: Node, matrix: any) => {
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
            if (matrix[r][c].node === cellNode) {
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