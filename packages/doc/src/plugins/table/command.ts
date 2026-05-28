import { type EditorState, type Transaction } from 'prosemirror-state';
import { Slice, Fragment, DOMSerializer } from 'prosemirror-model';
import {
    selectionCell,
    CellSelection,
    deleteRow,
    deleteColumn,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
    addColumnBefore,
    addColumnAfter,
    addRowBefore,
    addRowAfter,
    TableMap,
    selectedRect,
    addRow,
    isInTable,
    addColumn
} from 'prosemirror-tables';

export {
    deleteRow,
    deleteColumn,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
    addColumnBefore,
    addColumnAfter,
    addRowBefore,
    addRowAfter
};


export const isRowHeader = (state: EditorState) => {
    const selection = state.selection;

    // 1. 如果是单元格多选（CellSelection）
    if (selection instanceof CellSelection) {
        let allHeader = true;
        selection.forEachCell((node) => {
            // 检查被遍历到的单元格类型名称
            if (node.type.name !== 'table_header') {
                allHeader = false;
            }
        });
        return allHeader;
    }

    // 2. 如果是普通文本光标（在某个单元格内部）
    const $pos = state.selection.$from;
    for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === 'table_cell') return false;
        if (node.type.name === 'table_header') return true;
    }

    return false;
}

export const isColumnHeader = (state: EditorState) => {
    const selection = state.selection;

    // 1. 如果是单元格多选状态 (CellSelection)
    if (selection instanceof CellSelection) {
        let allHeader = true;
        selection.forEachCell((node) => {
            if (node.type.name !== 'table_header') {
                allHeader = false;
            }
        });
        return allHeader;
    }

    // 2. 如果是普通文本光标（在单个单元格内部）
    const $pos = selection.$from;
    let cellPos = null;
    let tableNode = null;
    let tableStart = 0;

    // 向上寻找当前单元格和表格节点
    for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
            cellPos = $pos.start(d) - 1; // 记录当前单元格的绝对位置
        }
        if (node.type.name === 'table') {
            tableNode = node;
            tableStart = $pos.start(d);
            break;
        }
    }

    // 如果找不到表格或单元格，直接返回 false
    if (!tableNode || cellPos === null) return false;

    // 3. 核心：通过 TableMap 获取当前单元格所在的列索引 (Col Index)
    const map = TableMap.get(tableNode);
    const cellOffset = cellPos - tableStart;
    const rect = map.findCell(cellOffset); // 获取当前单元格的区域矩形 (left, top, right, bottom)

    const currentColIndex = rect.left; // 当前单元格所在的列索引

    // 4. 检查该列中的所有行，看对应的单元格是否都是 table_header
    for (let row = 0; row < map.height; row++) {
        const cellIndex = map.map[row * map.width + currentColIndex];
        const node = tableNode.nodeAt(cellIndex);

        if (node && node.type.name !== 'table_header') {
            return false; // 只要有一行这一列不是表头，就判定当前列不是表头列
        }
    }

    return true;
}

export const checkTableStyle = (state: EditorState) => {
    return {
        textAlign: getTableAttrActive(state, 'textAlign'),
        verticalAlign: getTableAttrActive(state, 'verticalAlign'),
        textStyle: { color: getTableAttrActive(state, 'textColor'), backgroundColor: getTableAttrActive(state, 'backgroundColor') },
        toggleHeaderRow: isRowHeader(state),
        toggleHeaderColumn: isColumnHeader(state),
    }
}

export const checkTableStatus = (state: EditorState) => {
    const { selection } = state;
    const isCellSel = selection instanceof CellSelection;

    // 1. 广义基础拦截：判断当前光标位置是否在任意 <table> 节点内部
    const $pos = state.doc.resolve(selection.from);
    let isInTable = isCellSel;
    for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === 'table') {
            isInTable = true;
            break;
        }
    }

    // 🚨 兜底情况：如果光标甚至都不在表格里，一键禁用全盘所有表格相关操作按钮
    if (!isInTable) {
        return {
            // 对齐与颜色通常不属于表格纯属控制，在此不设兜底拦截

            // 头部控制与核心逻辑
            toggleHeaderRow: true,
            toggleHeaderColumn: true,
            mergeCells: true,
            splitCell: true,

            // 四向插入
            insertRowBefore: true,
            insertRowAfter: true,
            insertColumnBefore: true,
            insertColumnAfter: true,

            // 复制系列
            copyRow: true,
            copyColumn: true,
            copyTable: true,

            // 清空系列与自适应
            clearRow: true,
            clearColumn: true,
            clearCell: true,
            autofitWidth: true,

            // 删除系列
            deleteRow: true,
            deleteColumn: true,
            deleteTable: true
        };
    }

    // 2. 📢 深度精细拦截判定：调用官方原生的非 dispatch 测算机制，将其转化为工具栏的 disabled(取反)
    // 如果官方函数命令执行结果返回 true（代表能跑），取反后 disabled 即为 false（按钮亮起，不置灰）
    const cannotDeleteRow = !deleteRow(state);
    const cannotDeleteColumn = !deleteColumn(state);
    const cannotDeleteTable = !deleteTable(state);

    return {
        // ==========================================
        // A. 标题行、标题列与合并/拆分逻辑控制区
        // ==========================================
        // toggleHeaderRow: isRowHeader(state),
        // toggleHeaderColumn: isColumnHeader(state),
        mergeCells: !mergeCells(state), // 只有同时选了 2 个及以上格子时才会亮起
        splitCell: !splitCell(state),   // 只有当前格子是个合并过的大格子时才会亮起

        // ==========================================
        // B. 四向行/列插入操作区（底层自动计算合并格子的树跨度边界）
        // ==========================================
        insertRowBefore: !addRowBefore(state),
        insertRowAfter: !addRowAfter(state),
        insertColumnBefore: !addColumnBefore(state),
        insertColumnAfter: !addColumnAfter(state),

        // ==========================================
        // C. 复制系列动作区
        // ==========================================
        copyRow: cannotDeleteRow,       // 只要当前这一行能被删除，说明就可以被整行复制
        copyColumn: cannotDeleteColumn, // 只要当前这一列能被删除，说明就可以被整列复制
        copyTable: cannotDeleteTable,   // 表格有效存在即可复制

        // ==========================================
        // D. 清空系列动作与布局适配区
        // ==========================================
        clearRow: cannotDeleteRow,
        clearColumn: cannotDeleteColumn,
        clearCell: false,               // 在表格内任何地方点击，都天生允许直接清空当前所在单元格的文本
        autofitWidth: false,            // 表格有效存在即可执行自适应宽度

        // ==========================================
        // E. 官方原生三大核心删除区域
        // ==========================================
        deleteRow: cannotDeleteRow,
        deleteColumn: cannotDeleteColumn,
        deleteTable: cannotDeleteTable
    };
}

export const copyAndInsertRowAfter = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        const rect = selectedRect(state);
        const { table, tableStart, bottom, map } = rect;

        const sourceRowIndex = bottom - 1;
        const targetRowIndex = bottom;

        // 1. 备份源行数据（🎯 修改：同时备份 attrs 样式属性）
        const sourceCellsData: { colIndex: number; content: any; attrs: any }[] = [];
        for (let col = 0; col < map.width; col++) {
            const cellIndex = sourceRowIndex * map.width + col;
            const cellPos = map.map[cellIndex];
            if (col > 0 && map.map[cellIndex - 1] === cellPos) continue;

            const cellNode = table.nodeAt(cellPos);
            if (cellNode) {
                sourceCellsData.push({
                    colIndex: col,
                    content: cellNode.content,
                    attrs: cellNode.attrs // 💡 保存源单元格所有的自定义样式属性
                });
            }
        }

        // 2. 插入空行外壳
        let tr = addRow(state.tr, rect, targetRowIndex);

        // 3. 重新获取扩容后的最新表格数据
        let updatedTableNode = tr.doc.nodeAt(tableStart - 1);
        if (!updatedTableNode) return false;
        let updatedMap = TableMap.get(updatedTableNode);

        // 4. 倒序填充内容与样式
        const targetCellsPos: { colIndex: number; posInDoc: number }[] = [];
        for (let col = 0; col < updatedMap.width; col++) {
            const cellIndex = targetRowIndex * updatedMap.width + col;
            const cellPos = updatedMap.map[cellIndex];
            if (col > 0 && updatedMap.map[cellIndex - 1] === cellPos) continue;
            targetCellsPos.push({ colIndex: col, posInDoc: tableStart + cellPos });
        }

        for (let i = targetCellsPos.length - 1; i >= 0; i--) {
            const targetCell = targetCellsPos[i];
            const sourceCell = sourceCellsData.find(c => c.colIndex === targetCell.colIndex);

            if (sourceCell) {
                const targetCellNode = tr.doc.nodeAt(targetCell.posInDoc);
                if (targetCellNode) {
                    // 🎯 核心修复：混合源样式与目标结构属性
                    // 必须保留目标单元格自动生成的 colspan/rowspan（防止在含有合并格的行复制时表格崩塌）
                    // 同时把源单元格的 backgroundColor, textColor, textAlign, verticalAlign 强行覆盖进去
                    const mergedAttrs = {
                        ...sourceCell.attrs,                // 继承源节点的所有自定义样式
                        colspan: targetCellNode.attrs.colspan, // 强制保持新行自带的跨度结构
                        rowspan: targetCellNode.attrs.rowspan  // 强制保持新行自带的跨度结构
                    };

                    // 传入合并后的 mergedAttrs 重新创建单元格节点
                    const newCellNode = targetCellNode.type.create(mergedAttrs, sourceCell.content);
                    tr = tr.replaceWith(targetCell.posInDoc, targetCell.posInDoc + targetCellNode.nodeSize, newCellNode);
                }
            }
        }

        // 5. 让选区自动高亮新插入的这一行
        updatedTableNode = tr.doc.nodeAt(tableStart - 1);
        if (updatedTableNode) {
            updatedMap = TableMap.get(updatedTableNode);
            const anchorCellPos = tableStart + updatedMap.map[targetRowIndex * updatedMap.width];
            const headCellPos = tableStart + updatedMap.map[targetRowIndex * updatedMap.width + (updatedMap.width - 1)];

            const newSelection = new CellSelection(tr.doc.resolve(anchorCellPos), tr.doc.resolve(headCellPos));
            tr = tr.setSelection(newSelection);
        }

        dispatch(tr);
        return true;
    }
    return true;
}

export const copyAndInsertColumnAfter = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        const rect = selectedRect(state);
        const { table, tableStart, right, map } = rect;

        const sourceColIndex = right - 1;
        const targetColIndex = right;

        // 1. 备份源列数据及样式（🎯 修改：同时备份 attrs 样式属性）
        const sourceCellsData: { rowIndex: number; content: any; attrs: any }[] = [];
        for (let row = 0; row < map.height; row++) {
            const cellIndex = row * map.width + sourceColIndex;
            const cellPos = map.map[cellIndex];
            if (row > 0 && map.map[(row - 1) * map.width + sourceColIndex] === cellPos) continue;

            const cellNode = table.nodeAt(cellPos);
            if (cellNode) {
                sourceCellsData.push({
                    rowIndex: row,
                    content: cellNode.content,
                    attrs: cellNode.attrs // 💡 保存源单元格所有的自定义样式属性
                });
            }
        }

        // 2. 插入空列外壳
        let tr = addColumn(state.tr, rect, targetColIndex);

        // 3. 重新获取最新数据
        let updatedTableNode = tr.doc.nodeAt(tableStart - 1);
        if (!updatedTableNode) return false;
        let updatedMap = TableMap.get(updatedTableNode);

        // 4. 倒序填充内容与样式
        const targetCellsPos: { rowIndex: number; posInDoc: number }[] = [];
        for (let row = 0; row < updatedMap.height; row++) {
            const cellIndex = row * updatedMap.width + targetColIndex;
            const cellPos = updatedMap.map[cellIndex];
            if (row > 0 && map.map[(row - 1) * updatedMap.width + targetColIndex] === cellPos) continue;
            targetCellsPos.push({ rowIndex: row, posInDoc: tableStart + cellPos });
        }

        for (let i = targetCellsPos.length - 1; i >= 0; i--) {
            const targetCell = targetCellsPos[i];
            const sourceCell = sourceCellsData.find(c => c.rowIndex === targetCell.rowIndex);

            if (sourceCell) {
                const targetCellNode = tr.doc.nodeAt(targetCell.posInDoc);
                if (targetCellNode) {
                    // 🎯 核心修复：混合源样式与目标结构属性
                    const mergedAttrs = {
                        ...sourceCell.attrs,
                        colspan: targetCellNode.attrs.colspan,
                        rowspan: targetCellNode.attrs.rowspan
                    };

                    const newCellNode = targetCellNode.type.create(mergedAttrs, sourceCell.content);
                    tr = tr.replaceWith(targetCell.posInDoc, targetCell.posInDoc + targetCellNode.nodeSize, newCellNode);
                }
            }
        }

        // 5. 让选区自动高亮新插入的这一列
        updatedTableNode = tr.doc.nodeAt(tableStart - 1);
        if (updatedTableNode) {
            updatedMap = TableMap.get(updatedTableNode);
            const anchorCellPos = tableStart + updatedMap.map[targetColIndex];
            const headCellPos = tableStart + updatedMap.map[(updatedMap.height - 1) * updatedMap.width + targetColIndex];

            const newSelection = new CellSelection(tr.doc.resolve(anchorCellPos), tr.doc.resolve(headCellPos));
            tr = tr.setSelection(newSelection);
        }

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearSelectedCellsContent = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { table, tableStart, map } = rect;

        // 1. 收集当前选区覆盖的所有单元格的绝对坐标
        const cellsToClear: number[] = [];

        // 遍历选区矩形范围内的行和列
        for (let row = rect.top; row < rect.bottom; row++) {
            for (let col = rect.left; col < rect.right; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];

                // 避免合并单元格重复处理
                if (cellsToClear.includes(cellPos)) continue;
                cellsToClear.push(cellPos);
            }
        }

        // 2. 从后往前（倒序）清空内容，防止位置偏移
        // 排序确保位置大的先被处理
        cellsToClear.sort((a, b) => b - a);

        cellsToClear.forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);

            if (cellNode) {
                // 创建一个带有相同属性（如 colspan, rowspan, background 等）但内容完全为空的新单元格
                // 使用 createAndFill 会自动根据 Schema 填入必要的默认子节点（通常是一个空段落 <p></p>）
                const emptyCellNode = cellNode.type.createAndFill(cellNode.attrs);

                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearCurrentRowContent = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { table, tableStart, map, top, bottom } = rect;

        // 获取当前聚焦的行范围（如果是多选，就清空选中的那几行）
        const cellsToClear: number[] = [];

        for (let row = top; row < bottom; row++) {
            for (let col = 0; col < map.width; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];
                if (!cellsToClear.includes(cellPos)) {
                    cellsToClear.push(cellPos);
                }
            }
        }

        // 倒序替换
        cellsToClear.sort((a, b) => b - a).forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);
            if (cellNode) {
                const emptyCellNode = cellNode.type.createAndFill(cellNode.attrs);
                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearCurrentColumnContent = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { table, tableStart, map, left, right } = rect;

        // 获取当前聚焦的列范围
        const cellsToClear: number[] = [];

        for (let row = 0; row < map.height; row++) {
            for (let col = left; col < right; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];
                if (!cellsToClear.includes(cellPos)) {
                    cellsToClear.push(cellPos);
                }
            }
        }

        // 倒序替换
        cellsToClear.sort((a, b) => b - a).forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);
            if (cellNode) {
                const emptyCellNode = cellNode.type.createAndFill(cellNode.attrs);
                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearSelectedCellsContentAndStyle = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { tableStart, map } = rect;

        // 1. 收集当前选区覆盖的所有单元格的绝对坐标
        const cellsToClear: number[] = [];
        for (let row = rect.top; row < rect.bottom; row++) {
            for (let col = rect.left; col < rect.right; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];

                if (cellsToClear.includes(cellPos)) continue;
                cellsToClear.push(cellPos);
            }
        }

        // 2. 从后往前（倒序）替换，防止位置偏移
        cellsToClear.sort((a, b) => b - a);

        cellsToClear.forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);

            if (cellNode) {
                // 🎯 核心修复：重置自定义样式属性，但必须死守保留 colspan 和 rowspan 结构属性
                const resetAttrs = {
                    ...cellNode.attrs,            // 先继承原始属性（包括 colwidth 等）
                    textAlign: 'left',            // 恢复默认左对齐
                    verticalAlign: 'top',          // 恢复默认上对齐
                    backgroundColor: null,        // 清空背景色
                    textColor: null               // 清空文字颜色
                };

                // 使用重置后的属性填入干净的空壳节点（自动填入符合 Schema 校验的空 <p>）
                const emptyCellNode = cellNode.type.createAndFill(resetAttrs);

                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearCurrentRowContentAndStyle = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { tableStart, map, top, bottom } = rect;

        const cellsToClear: number[] = [];
        for (let row = top; row < bottom; row++) {
            for (let col = 0; col < map.width; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];
                if (!cellsToClear.includes(cellPos)) {
                    cellsToClear.push(cellPos);
                }
            }
        }

        // 倒序替换
        cellsToClear.sort((a, b) => b - a).forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);

            if (cellNode) {
                const resetAttrs = {
                    ...cellNode.attrs,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    backgroundColor: null,
                    textColor: null
                };

                const emptyCellNode = cellNode.type.createAndFill(resetAttrs);
                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const clearCurrentColumnContentAndStyle = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { tableStart, map, left, right } = rect;

        const cellsToClear: number[] = [];
        for (let row = 0; row < map.height; row++) {
            for (let col = left; col < right; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];
                if (!cellsToClear.includes(cellPos)) {
                    cellsToClear.push(cellPos);
                }
            }
        }

        // 倒序替换
        cellsToClear.sort((a, b) => b - a).forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);

            if (cellNode) {
                const resetAttrs = {
                    ...cellNode.attrs,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    backgroundColor: null,
                    textColor: null
                };

                const emptyCellNode = cellNode.type.createAndFill(resetAttrs);
                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        dispatch(tr);
        return true;
    }
    return true;
}

/**
 * 清空整个表格的内容与全部自定义样式
 */
export const clearWholeTableContentAndStyle = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    // 1. 安全拦截：如果当前选区不在表格内，拒绝执行
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const rect = selectedRect(state);
        const { table, tableStart, map } = rect;

        // 2. 收集整张表格所有单元格的相对坐标 (去重)
        const allCellsPos: number[] = [];
        for (let row = 0; row < map.height; row++) {
            for (let col = 0; col < map.width; col++) {
                const cellIndex = row * map.width + col;
                const cellPos = map.map[cellIndex];

                if (!allCellsPos.includes(cellPos)) {
                    allCellsPos.push(cellPos);
                }
            }
        }

        // 3. 🎯 核心核心：必须从后往前（倒序排序）进行节点替换
        // 防止前面的单元格内容清空导致文档 nodeSize 变小，进而使后面单元格的 pos 坐标全部漂移错位
        allCellsPos.sort((a, b) => b - a);

        // 4. 遍历并批量清洗单元格数据与样式
        allCellsPos.forEach((cellPos) => {
            const posInDoc = tableStart + cellPos;
            const cellNode = tr.doc.nodeAt(posInDoc);

            if (cellNode) {
                // 构建样式重置对象，保留骨架属性（colspan、rowspan、colwidth），彻底擦除视觉样式
                const resetAttrs = {
                    ...cellNode.attrs,            // 继承原有属性（主要保护 colwidth 避免列宽塌陷）
                    textAlign: 'left',            // 恢复默认左对齐
                    verticalAlign: 'top',          // 恢复默认上对齐
                    backgroundColor: null,        // 清空背景色
                    textColor: null               // 清空文字颜色
                };

                // 创建一个带有重置属性的全新空单元格节点（会自动填充符合 Schema 校验的空段落 <p></p>）
                const emptyCellNode = cellNode.type.createAndFill(resetAttrs);

                if (emptyCellNode) {
                    tr = tr.replaceWith(posInDoc, posInDoc + cellNode.nodeSize, emptyCellNode);
                }
            }
        });

        // 5. 派发事务，整体重绘视图
        dispatch(tr);
        return true;
    }
    return true;
}

export const copyWholeTable = (state: EditorState): boolean => {
    if (!isInTable(state)) return false;

    const rect = selectedRect(state);
    const { table } = rect;

    // 1. 将整个 table 节点的内容包装进一个闭合的 Slice 片段中
    const slice = new Slice(table.content, 0, 0);

    // 2. 🎯 修复：使用 serializeFragment 正确序列化 Slice 的内容
    const serializer = DOMSerializer.fromSchema(state.schema);
    const domFragment = serializer.serializeFragment(slice.content);

    // 3. 将生成的 DOM 节点挂载到临时容器中，提取 HTML 和纯文本
    const div = document.createElement("div");
    div.appendChild(domFragment);

    // 必须把包裹的 table 标签本身也加进去，否则复制出来的只有行和单元格
    const tableWrapper = document.createElement("table");
    tableWrapper.innerHTML = div.innerHTML;

    const htmlContent = tableWrapper.outerHTML;
    const textContent = tableWrapper.innerText || table.textContent;

    // 4. 使用标准的 Clipboard API 双通道写入
    if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: "text/html" });
        const textBlob = new Blob([textContent], { type: "text/plain" });

        const item = new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob
        });

        navigator.clipboard.write([item])
            .then(() => {
                console.log("表格已成功复制到剪贴板");
            })
            .catch((err) => {
                console.error("复制表格失败:", err);
            });

        return true;
    } else {
        // 降级兼容旧版浏览器
        const textArea = document.createElement("textarea");
        textArea.value = textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        return true;
    }
}

/**
 * 复制当前表格节点，并在当前表格后面紧随插入一个一模一样的克隆表格
 */
export const duplicateTableAfter = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    // 1. 安全拦截：如果当前光标或选区不在表格内部，直接拒绝执行
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;

        // 2. 获取当前表格的相关矩形和坐标信息
        const rect = selectedRect(state);
        const { table, tableStart } = rect;

        // 3. 深拷贝（克隆）当前的表格节点
        // 使用 copy 并传入其原本的 content，可以完美保留表格的所有属性（如自定义颜色、宽度）及内部所有行和单元格
        const clonedTableNode = table.copy(table.content);

        // 4. 计算当前表格在整个文档（Doc）中的绝对结束位置
        // tableStart 是表格第一个子节点（第一行）的起始位置，减去 1 就是 <table> 标签的起始位置
        // 因此，表格的真正物理结束位置就是：起始位置 - 1 + 表格节点自身的总大小（nodeSize）
        const tableEndPos = tableStart - 1 + table.nodeSize;

        // 5. 🎯 在当前表格后面插入克隆出来的全新表格节点
        tr = tr.insert(tableEndPos, clonedTableNode);

        // 6. 提交事务，更新编辑器视图
        dispatch(tr);
        return true;
    }
    return true;
}

export const makeTableAutoWidth = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!isInTable(state)) return false;

    if (dispatch) {
        let tr = state.tr;
        const { table, tableStart } = selectedRect(state);

        // 遍历整个表格，重置所有单元格的 colwidth
        table.descendants((node, pos) => {
            if (node.type.name === "table_cell" || node.type.name === "table_header") {
                if (node.attrs.colwidth) {
                    const absPos = tableStart + pos;
                    // 清空 colwidth 属性
                    tr = tr.setNodeAttribute(absPos, "colwidth", null);
                }
            }
            return true;
        });

        dispatch(tr);
        return true;
    }
    return true;
}

export const moveRow = (dir: "up" | "down") => {
    return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
        if (!isInTable(state)) return false;

        const rect = selectedRect(state);
        const { table, tableStart, top, bottom } = rect;

        if (dir === "up" && top === 0) return false;
        if (dir === "down" && bottom >= table.childCount) return false;

        if (dispatch) {
            const rows: any[] = [];
            table.forEach((row) => rows.push(row));

            const moveCount = bottom - top;
            const movedRows = rows.splice(top, moveCount);

            const insertAt = dir === "up" ? top - 1 : bottom - moveCount + 1;
            rows.splice(insertAt, 0, ...movedRows);

            const newTable = table.type.create(table.attrs, Fragment.from(rows));
            let tr = state.tr.replaceWith(tableStart - 1, tableStart + table.nodeSize - 1, newTable);

            // 🎯 核心增强：追踪移动后的新行位置，重新建立选区，支持无限连击上移/下移
            const updatedTableNode = tr.doc.nodeAt(tableStart - 1);
            if (updatedTableNode) {
                const updatedMap = TableMap.get(updatedTableNode);
                // 新的起始行索引
                const newTopRowIndex = insertAt;
                // 新的结束行索引
                const newBottomRowIndex = insertAt + moveCount - 1;

                const anchorCellPos = tableStart + updatedMap.map[newTopRowIndex * updatedMap.width];
                const headCellPos = tableStart + updatedMap.map[newBottomRowIndex * updatedMap.width + (updatedMap.width - 1)];

                const newSelection = new CellSelection(tr.doc.resolve(anchorCellPos), tr.doc.resolve(headCellPos));
                tr = tr.setSelection(newSelection);
            }
            dispatch(tr);
            return true;
        }
        return true;
    };
}

export const moveColumn = (dir: "left" | "right") => {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        if (!isInTable(state)) return false;

        const rect = selectedRect(state);
        const { table, tableStart, left, right } = rect;
        const map = TableMap.get(table);

        if (dir === "left" && left === 0) return false;
        if (dir === "right" && right >= map.width) return false;

        if (dispatch) {
            const newRows: any[] = [];

            for (let r = 0; r < map.height; r++) {
                const rowNode = table.child(r);
                const cellsInRow: any[] = [];
                rowNode.forEach((cell: any) => cellsInRow.push(cell));

                const moveCount = right - left;
                const movedCells = cellsInRow.splice(left, moveCount);
                const insertAt = dir === "left" ? left - 1 : right - moveCount + 1;

                cellsInRow.splice(insertAt, 0, ...movedCells);
                newRows.push(rowNode.type.create(rowNode.attrs, Fragment.from(cellsInRow)));
            }

            const newTable = table.type.create(table.attrs, Fragment.from(newRows));
            let tr = state.tr.replaceWith(tableStart - 1, tableStart + table.nodeSize - 1, newTable);

            // 🎯 核心增强：追踪移动后的新列位置，恢复框选
            const updatedTableNode = tr.doc.nodeAt(tableStart - 1);
            if (updatedTableNode) {
                const updatedMap = TableMap.get(updatedTableNode);
                const moveCount = right - left;
                const newLeftColIndex = dir === "left" ? left - 1 : right - moveCount + 1;
                const newRightColIndex = newLeftColIndex + moveCount - 1;

                const anchorCellPos = tableStart + updatedMap.map[newLeftColIndex];
                const headCellPos = tableStart + updatedMap.map[(updatedMap.height - 1) * updatedMap.width + newRightColIndex];

                const newSelection = new CellSelection(tr.doc.resolve(anchorCellPos), tr.doc.resolve(headCellPos));
                tr = tr.setSelection(newSelection);
            }

            dispatch(tr);
            return true;
        }
        return true;
    };
}

export const setCellAttribute = (attrName: string, value: string) => {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        if (!isInTable(state)) return false;

        if (dispatch) {
            let tr = state.tr;
            const { tableStart, map, top, bottom, left, right } = selectedRect(state);

            const seenPos: number[] = [];
            // 遍历当前鼠标圈选的矩形区间
            for (let r = top; r < bottom; r++) {
                for (let c = left; c < right; c++) {
                    const cellPos = map.map[r * map.width + c];
                    if (seenPos.includes(cellPos)) continue;
                    seenPos.push(cellPos);

                    const absPos = tableStart + cellPos;
                    // 动态为单元格节点赋属性值
                    tr = tr.setNodeAttribute(absPos, attrName, value);
                }
            }

            dispatch(tr);
            return true;
        }
        return true;
    };
}

export const setTableMultipleAttributes = (attrsObj: Record<string, any>) => {
    return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
        // 1. 拦截安全校验：如果当前光标或选区不在表格内部，直接拒绝执行
        if (!isInTable(state)) return false;

        if (dispatch) {
            let tr = state.tr;

            // 2. 获取当前选区所覆盖的表格矩形范围（包括选区在 TableMap 中的上下左右边界）
            const rect = selectedRect(state);
            const { tableStart, map, top, bottom, left, right } = rect;

            // 用于记录已经处理过的单元格绝对坐标，防止因合并单元格（colspan/rowspan）导致重复执行
            const seenPos: number[] = [];

            // 3. 遍历当前鼠标框选或光标所在的矩形区间
            for (let r = top; r < bottom; r++) {
                for (let c = left; c < right; c++) {
                    // 通过 TableMap 计算当前行列交叉点对应的单元格在表格内部的相对位置
                    const cellPos = map.map[r * map.width + c];

                    // 如果这个单元格已经处理过，直接跳过
                    if (seenPos.includes(cellPos)) continue;
                    seenPos.push(cellPos);

                    // 转换为文档级绝对坐标
                    const absPos = tableStart + cellPos;

                    // 4. 在同一个单元格节点上，批量将所有传入的样式属性打标写入
                    for (const [attrName, attrValue] of Object.entries(attrsObj)) {
                        // 确保传入的值有效（允许为 null 以便执行清除恢复默认值的操作）
                        if (attrValue !== undefined) {
                            tr = tr.setNodeAttribute(absPos, attrName, attrValue);
                        }
                    }
                }
            }

            // 5. 提交事务，让编辑器整体派发并实时渲染视图
            dispatch(tr);
            return true;
        }
        return true;
    };
}

// 导出包装后的三大样式设置命令：
// A. 设置对齐方式 (textAlign: 'left' | 'center' | 'right')
export const setTableTextAlign = (align: "left" | "center" | "right") => setCellAttribute("textAlign", align);

export const setTableVerticalAlign = (align: "top" | "middle" | "bottom") => setCellAttribute("verticalAlign", align);

// B. 设置单元格背景色 (bgColor: '#ff0000', 'transparent' 等)
export const setTableBackgroundColor = (color: string) => setCellAttribute("backgroundColor", color);

// C. 设置文字字体颜色 (textColor: '#333333' 等)
export const setTableTextColor = (color: string) => setCellAttribute("textColor", color);


type TableCellAttrName = 'textAlign' | 'backgroundColor' | 'textColor' | 'verticalAlign';
/**
 * 通用查询当前选中单元格属性状态的方法（已支持垂直对齐）
 */
export const getTableAttrActive = (state: EditorState, attrName: TableCellAttrName): any => {
    if (!isInTable(state)) return null;

    const rect = selectedRect(state);
    const { map, tableStart, top, bottom, left, right } = rect;

    let unifiedValue: any = undefined;
    const seenPos: number[] = [];

    for (let r = top; r < bottom; r++) {
        for (let c = left; c < right; c++) {
            const cellPos = map.map[r * map.width + c];
            if (seenPos.includes(cellPos)) continue;
            seenPos.push(cellPos);

            const cellNode = state.tr.doc.nodeAt(tableStart + cellPos);
            if (cellNode) {
                let currentAttrsValue = cellNode.attrs[attrName];

                // 💡 针对 textAlign 的默认值兜底
                if (attrName === 'textAlign' && !currentAttrsValue) {
                    currentAttrsValue = 'left';
                }

                // 💡 针对 verticalAlign 的默认值兜底
                if (attrName === 'verticalAlign' && !currentAttrsValue) {
                    currentAttrsValue = 'top';
                }

                if (unifiedValue === undefined) {
                    unifiedValue = currentAttrsValue;
                } else if (unifiedValue !== currentAttrsValue) {
                    return null; // 存在混合状态，不亮起任何按钮
                }
            }
        }
    }

    return unifiedValue === undefined ? null : unifiedValue;
}
/**
 * 1. 获取当前选区单元格的文字对齐方式 (textAlign)
 * 返回值：'left' | 'center' | 'right' | null
 */
export const getTableTextAlignActive = (state: EditorState): "left" | "center" | "right" | null => {
    if (!isInTable(state)) return null;

    const { map, tableStart, top, bottom, left, right } = selectedRect(state);
    let currentAlign: string | null = null;
    const seenPos: number[] = [];

    for (let r = top; r < bottom; r++) {
        for (let c = left; c < right; c++) {
            const cellPos = map.map[r * map.width + c];
            if (seenPos.includes(cellPos)) continue;
            seenPos.push(cellPos);

            const cellNode = state.tr.doc.nodeAt(tableStart + cellPos);
            if (cellNode) {
                // 获取当前单元格的 textAlign 属性（默认为 'left'）
                const align = cellNode.attrs.textAlign || "left";

                if (currentAlign === null) {
                    currentAlign = align; // 记录第一个单元格的对齐方式
                } else if (currentAlign !== align) {
                    return null; // 💡 如果选区内存在多种对齐方式，UI 不高亮任何一个
                }
            }
        }
    }
    return currentAlign as "left" | "center" | "right" | null;
}

/**
 * 2. 获取当前选区单元格的背景颜色 (backgroundColor)
 * 返回值：十六进制颜色字符串（如 '#ffffff'）或 null
 */
export const getTableBackgroundColorActive = (state: EditorState): string | null => {
    if (!isInTable(state)) return null;

    const { map, tableStart, top, bottom, left, right } = selectedRect(state);
    let currentBg: any = undefined; // 用 undefined 区分未初始化
    const seenPos: number[] = [];

    for (let r = top; r < bottom; r++) {
        for (let c = left; c < right; c++) {
            const cellPos = map.map[r * map.width + c];
            if (seenPos.includes(cellPos)) continue;
            seenPos.push(cellPos);

            const cellNode = state.tr.doc.nodeAt(tableStart + cellPos);
            if (cellNode) {
                const bg = cellNode.attrs.backgroundColor || null;

                if (currentBg === undefined) {
                    currentBg = bg;
                } else if (currentBg !== bg) {
                    return null; // 选区内存在多种背景色，返回 null 
                }
            }
        }
    }
    return currentBg;
}

/**
 * 3. 获取当前选区单元格的字体颜色 (textColor)
 * 返回值：十六进制颜色字符串 或 null
 */
export const getTableTextColorActive = (state: EditorState): string | null => {
    if (!isInTable(state)) return null;

    const { map, tableStart, top, bottom, left, right } = selectedRect(state);
    let currentTextColor: any = undefined;
    const seenPos: number[] = [];

    for (let r = top; r < bottom; r++) {
        for (let c = left; c < right; c++) {
            const cellPos = map.map[r * map.width + c];
            if (seenPos.includes(cellPos)) continue;
            seenPos.push(cellPos);

            const cellNode = state.tr.doc.nodeAt(tableStart + cellPos);
            if (cellNode) {
                const color = cellNode.attrs.textColor || null;

                if (currentTextColor === undefined) {
                    currentTextColor = color;
                } else if (currentTextColor !== color) {
                    return null; // 选区内存在多种字体颜色
                }
            }
        }
    }
    return currentTextColor;
}