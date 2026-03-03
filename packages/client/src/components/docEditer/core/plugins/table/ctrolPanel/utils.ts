import {
    // type EditorState,
    type Transaction,
    type Selection
} from 'prosemirror-state';
import {
    TableMap,
    findTable,
    CellSelection
} from 'prosemirror-tables';

export const getCellsInColumn = (
    columnIndex: number,
    selection: Selection
) => {
    const table = findTable(selection.$from);
    if (!table) {
        return;
    }

    const map = TableMap.get(table.node);

    if (columnIndex < 0 || columnIndex > map.width - 1) {
        return;
    }

    const cells = map.cellsInRect({
        left: columnIndex,
        right: columnIndex + 1,
        top: 0,
        bottom: map.height,
    });

    return cells.map((nodePos) => {
        const node = table.node.nodeAt(nodePos)!;
        const pos = nodePos + table.start;
        return { pos, start: pos + 1, node, depth: table.depth + 2 };
    });
}

export const getCellsInRow = (
    rowIndex: number,
    selection: Selection
) => {
    const table = findTable(selection.$from);
    if (!table) {
        return;
    }

    const map = TableMap.get(table.node);

    if (rowIndex < 0 || rowIndex > map.height - 1) {
        return;
    }

    const cells = map.cellsInRect({
        left: 0,
        right: map.width,
        top: rowIndex,
        bottom: rowIndex + 1,
    });

    return cells.map((nodePos) => {
        const node = table.node.nodeAt(nodePos)!;
        const pos = nodePos + table.start;
        return { pos, start: pos + 1, node, depth: table.depth + 2 };
    });
}

export const transpose = (array: any) => {
    return array[0].map((_, i) => {
        return array.map((column) => column[i]);
    });
}

export const convertTableNodeToArrayOfRows = (tableNode: any) => {
    const map = TableMap.get(tableNode);
    const rows: (Node | null)[][] = [];
    const rowCount = map.height;
    const colCount = map.width;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const row: (Node | null)[] = [];
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            const cellIndex = rowIndex * colCount + colIndex;
            const cellPos = map.map[cellIndex];
            if (rowIndex > 0) {
                const topCellIndex = cellIndex - colCount;
                const topCellPos = map.map[topCellIndex];
                if (cellPos === topCellPos) {
                    row.push(null);
                    continue;
                }
            }
            if (colIndex > 0) {
                const leftCellIndex = cellIndex - 1;
                const leftCellPos = map.map[leftCellIndex];
                if (cellPos === leftCellPos) {
                    row.push(null);
                    continue;
                }
            }
            row.push(tableNode.nodeAt(cellPos));
        }
        rows.push(row);
    }

    return rows;
}

export const convertArrayOfRowsToTableNode = (tableNode: any, arrayOfNodes: (Node | null)[][]): Node => {
    const newRows: Node[] = [];
    const map = TableMap.get(tableNode);
    const rowCount = map.height;
    const colCount = map.width;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const oldRow: any = tableNode.child(rowIndex);
        const newCells: Node[] = [];

        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            const cell: any = arrayOfNodes[rowIndex][colIndex];
            if (!cell) {
                continue;
            }

            const cellPos = map.map[rowIndex * map.width + colIndex];
            const oldCell = tableNode.nodeAt(cellPos);
            if (!oldCell) {
                continue;
            }

            const newCell = oldCell.type.createChecked(
                cell.attrs,
                cell.content,
                cell.marks,
            );
            newCells.push(newCell);
        }

        const newRow = oldRow.type.createChecked(
            oldRow.attrs,
            newCells,
            oldRow.marks,
        );
        newRows.push(newRow);
    }

    const newTable = tableNode.type.createChecked(
        tableNode.attrs,
        newRows,
        tableNode.marks,
    );
    return newTable;
}

export const moveRowInArrayOfRows = (
    rows: any,
    indexesOrigin: number[],
    indexesTarget: number[],
    directionOverride: -1 | 1 | 0
) => {
    const direction = indexesOrigin[0] > indexesTarget[0] ? -1 : 1;

    const rowsExtracted = rows.splice(indexesOrigin[0], indexesOrigin.length);
    const positionOffset = rowsExtracted.length % 2 === 0 ? 1 : 0;
    let target: number;

    if (directionOverride === -1 && direction === 1) {
        target = indexesTarget[0] - 1;
    } else if (directionOverride === 1 && direction === -1) {
        target = indexesTarget[indexesTarget.length - 1] - positionOffset + 1;
    } else {
        target =
            direction === -1
                ? indexesTarget[0]
                : indexesTarget[indexesTarget.length - 1] - positionOffset;
    }

    rows.splice(target, 0, ...rowsExtracted);
    return rows;
}

export const moveTableColumn = (
    table: Node,
    indexesOrigin: number[],
    indexesTarget: number[],
    direction: -1 | 1 | 0
) => {
    let rows = transpose(convertTableNodeToArrayOfRows(table));

    rows = moveRowInArrayOfRows(rows, indexesOrigin, indexesTarget, direction);
    rows = transpose(rows);

    return convertArrayOfRowsToTableNode(table, rows);
}

export function getSelectionRangeInColumn(
    tr: Transaction,
    startColIndex: number,
    endColIndex: number = startColIndex
) {
    let startIndex = startColIndex;
    let endIndex = endColIndex;

    // looking for selection start column (startIndex)
    for (let i = startColIndex; i >= 0; i--) {
        const cells = getCellsInColumn(i, tr.selection);
        if (cells) {
            cells.forEach((cell) => {
                const maybeEndIndex = cell.node.attrs.colspan + i - 1;
                if (maybeEndIndex >= startIndex) {
                    startIndex = i;
                }
                if (maybeEndIndex > endIndex) {
                    endIndex = maybeEndIndex;
                }
            });
        }
    }
    // looking for selection end column (endIndex)
    for (let i = startColIndex; i <= endIndex; i++) {
        const cells = getCellsInColumn(i, tr.selection);
        if (cells) {
            cells.forEach((cell) => {
                const maybeEndIndex = cell.node.attrs.colspan + i - 1;
                if (cell.node.attrs.colspan > 1 && maybeEndIndex > endIndex) {
                    endIndex = maybeEndIndex;
                }
            });
        }
    }

    // filter out columns without cells (where all rows have colspan > 1 in the same column)
    const indexes = [];
    for (let i = startIndex; i <= endIndex; i++) {
        const maybeCells = getCellsInColumn(i, tr.selection);
        if (maybeCells && maybeCells.length > 0) {
            indexes.push(i);
        }
    }
    startIndex = indexes[0];
    endIndex = indexes[indexes.length - 1];

    const firstSelectedColumnCells = getCellsInColumn(startIndex, tr.selection);
    const firstRowCells = getCellsInRow(0, tr.selection);
    if (!firstSelectedColumnCells || !firstRowCells) {
        return;
    }

    const $anchor = tr.doc.resolve(
        firstSelectedColumnCells[firstSelectedColumnCells.length - 1].pos,
    );

    let headCell;
    for (let i = endIndex; i >= startIndex; i--) {
        const columnCells = getCellsInColumn(i, tr.selection);
        if (columnCells && columnCells.length > 0) {
            for (let j = firstRowCells.length - 1; j >= 0; j--) {
                if (firstRowCells[j].pos === columnCells[0].pos) {
                    headCell = columnCells[0];
                    break;
                }
            }
            if (headCell) {
                break;
            }
        }
    }
    if (!headCell) {
        return;
    }

    const $head = tr.doc.resolve(headCell.pos);
    return { $anchor, $head, indexes };
}

export const moveColumn = (moveColParams: any): boolean => {
    const { tr, originIndex, targetIndex, select, pos } = moveColParams;
    const $pos = tr.doc.resolve(pos);
    const table: any = findTable($pos);
    if (!table) {
        return false;
    }

    const indexesOriginColumn = getSelectionRangeInColumn(
        tr,
        originIndex,
    )?.indexes;
    const indexesTargetColumn = getSelectionRangeInColumn(
        tr,
        targetIndex,
    )?.indexes;

    if (!indexesOriginColumn || !indexesTargetColumn) return false;

    if (indexesOriginColumn.includes(targetIndex)) return false;

    const newTable: any = moveTableColumn(
        table.node,
        indexesOriginColumn,
        indexesTargetColumn,
        0,
    );

    tr.replaceWith(table.pos, table.pos + table.node.nodeSize, newTable);

    if (!select) return true;

    const map = TableMap.get(newTable);
    const start = table.start;
    const index = targetIndex;
    const lastCell = map.positionAt(map.height - 1, index, newTable);
    const $lastCell = tr.doc.resolve(start + lastCell);

    const firstCell = map.positionAt(0, index, newTable);
    const $firstCell = tr.doc.resolve(start + firstCell);

    tr.setSelection(CellSelection.colSelection($lastCell, $firstCell));
    return true;
}

export const getSelectionRangeInRow = (
    tr: Transaction,
    startRowIndex: number,
    endRowIndex: number = startRowIndex
) => {
    let startIndex = startRowIndex;
    let endIndex = endRowIndex;

    // looking for selection start row (startIndex)
    for (let i = startRowIndex; i >= 0; i--) {
        const cells = getCellsInRow(i, tr.selection);
        if (cells) {
            cells.forEach((cell) => {
                const maybeEndIndex = cell.node.attrs.rowspan + i - 1;
                if (maybeEndIndex >= startIndex) {
                    startIndex = i;
                }
                if (maybeEndIndex > endIndex) {
                    endIndex = maybeEndIndex;
                }
            });
        }
    }
    // looking for selection end row (endIndex)
    for (let i = startRowIndex; i <= endIndex; i++) {
        const cells = getCellsInRow(i, tr.selection);
        if (cells) {
            cells.forEach((cell) => {
                const maybeEndIndex = cell.node.attrs.rowspan + i - 1;
                if (cell.node.attrs.rowspan > 1 && maybeEndIndex > endIndex) {
                    endIndex = maybeEndIndex;
                }
            });
        }
    }

    // filter out rows without cells (where all columns have rowspan > 1 in the same row)
    const indexes = [];
    for (let i = startIndex; i <= endIndex; i++) {
        const maybeCells = getCellsInRow(i, tr.selection);
        if (maybeCells && maybeCells.length > 0) {
            indexes.push(i);
        }
    }
    startIndex = indexes[0];
    endIndex = indexes[indexes.length - 1];

    const firstSelectedRowCells = getCellsInRow(startIndex, tr.selection);
    const firstColumnCells = getCellsInColumn(0, tr.selection);
    if (!firstSelectedRowCells || !firstColumnCells) {
        return;
    }

    const $anchor = tr.doc.resolve(
        firstSelectedRowCells[firstSelectedRowCells.length - 1].pos,
    );

    let headCell;
    for (let i = endIndex; i >= startIndex; i--) {
        const rowCells = getCellsInRow(i, tr.selection);
        if (rowCells && rowCells.length > 0) {
            for (let j = firstColumnCells.length - 1; j >= 0; j--) {
                if (firstColumnCells[j].pos === rowCells[0].pos) {
                    headCell = rowCells[0];
                    break;
                }
            }
            if (headCell) {
                break;
            }
        }
    }
    if (!headCell) {
        return;
    }

    const $head = tr.doc.resolve(headCell.pos);
    return { $anchor, $head, indexes };
}

export const moveRow = (moveRowParams: any): boolean => {
    const { tr, originIndex, targetIndex, select, pos } = moveRowParams;
    const $pos = tr.doc.resolve(pos);
    const table: any = findTable($pos);
    if (!table) return false;

    const indexesOriginRow = getSelectionRangeInRow(tr, originIndex)?.indexes;
    const indexesTargetRow = getSelectionRangeInRow(tr, targetIndex)?.indexes;

    if (!indexesOriginRow || !indexesTargetRow) return false;

    if (indexesOriginRow.includes(targetIndex)) return false;

    const newTable: any = moveTableRow(
        table.node,
        indexesOriginRow,
        indexesTargetRow,
        0,
    );

    tr.replaceWith(table.pos, table.pos + table.node.nodeSize, newTable);

    if (!select) return true;

    const map = TableMap.get(newTable);
    const start = table.start;
    const index = targetIndex;
    const lastCell = map.positionAt(index, map.width - 1, newTable);
    const $lastCell = tr.doc.resolve(start + lastCell);

    const firstCell = map.positionAt(index, 0, newTable);
    const $firstCell = tr.doc.resolve(start + firstCell);

    tr.setSelection(CellSelection.rowSelection($lastCell, $firstCell));
    return true;
}

export const moveTableRow = (
    table: Node,
    indexesOrigin: number[],
    indexesTarget: number[],
    direction: -1 | 1 | 0
) => {
    let rows = convertTableNodeToArrayOfRows(table);

    rows = moveRowInArrayOfRows(rows, indexesOrigin, indexesTarget, direction);

    return convertArrayOfRowsToTableNode(table, rows);
}

export const moveTableColumnEx = (options: any) => {
    return (state, dispatch) => {
        const {
            from: originIndex,
            to: targetIndex,
            select = true,
            pos = state.selection.from,
        } = options;
        const tr = state.tr;
        if (moveColumn({ tr, originIndex, targetIndex, select, pos })) {
            dispatch?.(tr);
            return true;
        }
        return false;
    };
}

export const moveTableRowEx = (options: any) => {
    return (state, dispatch) => {
        const {
            from: originIndex,
            to: targetIndex,
            select = true,
            pos = state.selection.from,
        } = options;
        const tr = state.tr;
        if (moveRow({ tr, originIndex, targetIndex, select, pos })) {
            dispatch?.(tr);
            return true;
        }
        return false;
    };
}