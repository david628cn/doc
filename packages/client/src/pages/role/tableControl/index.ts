import { CLASSNAME } from '@/global';
import './index.less';

export const getTableMap = (table: HTMLTableElement) => {
    if (!table || table.nodeName !== 'TABLE') return null;

    const rows = table.rows;
    const matrix: any[][] = [];

    // 1. 建立物理矩阵
    for (let r = 0; r < rows.length; r++) {
        if (!matrix[r]) matrix[r] = [];
        const cells = rows[r].cells;
        let visualCol = 0;

        for (let c = 0; c < cells.length; c++) {
            const cell = cells[c];
            const rowSpan = cell.rowSpan || 1;
            const colSpan = cell.colSpan || 1;

            // 获取物理尺寸（包含 padding 和 border）
            const rect = cell.getBoundingClientRect();
            // const text = cell.textContent || "0";
            // const val = parseFloat(text.replace(/,/g, '')) || 0;

            while (matrix[r][visualCol] !== undefined) {
                visualCol++;
            }

            for (let rs = 0; rs < rowSpan; rs++) {
                const targetRow = r + rs;
                if (!matrix[targetRow]) matrix[targetRow] = [];
                for (let cs = 0; cs < colSpan; cs++) {
                    matrix[targetRow][visualCol + cs] = {
                        // value: val,
                        cell: cell,
                        // 如果是合并单元格，我们将单个逻辑格子的平均宽度/高度存入，
                        // 或者存储物理尺寸。这里建议存储物理尺寸，但在计算行列宽时去重。
                        width: rect.width,
                        height: rect.height
                    };
                }
            }
            visualCol += colSpan;
        }
    }

    // 2. 计算行总数及行高 (Row Totals & Heights)
    const rowTotals = matrix.map((row, rIdx) => {
        const total = row.reduce((sum, item) => sum + (item ? item.value : 0), 0);
        // 行高直接取 TR 的物理高度最为准确
        const rowHeight = rows[rIdx].getBoundingClientRect().height;

        return {
            // total,
            height: rowHeight, // 该行的物理高度
            rowDOM: rows[rIdx],
            cells: Array.from(new Set(row.map(item => item?.cell))) // 去重后的物理单元格
        };
    });

    // 3. 计算列总数及列宽 (Column Totals & Widths)
    const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
    const colTotals = Array.from({ length: maxCols }).map((_, colIdx) => {
        let total = 0;
        const columnCells: HTMLTableCellElement[] = [];
        
        // 计算列宽：取该列中没有 colspan（或 colspan 为 1）的单元格宽度作为基准
        // 如果全都有 colspan，则取该列逻辑宽度的最小值
        let colWidth = 0;

        for (let r = 0; r < matrix.length; r++) {
            const item = matrix[r][colIdx];
            if (item) {
                total += item.value;
                columnCells.push(item.cell);

                // 只有当单元格不跨列时，其宽度才最具代表性
                if (item.cell.colSpan === 1 && colWidth === 0) {
                    colWidth = item.cell.getBoundingClientRect().width;
                }
            }
        }

        // 兜底逻辑：如果该列全是合并单元格，取第一个格子宽度除以其跨度
        if (colWidth === 0 && matrix[0][colIdx]) {
            const firstItem = matrix[0][colIdx];
            colWidth = firstItem.cell.getBoundingClientRect().width / firstItem.cell.colSpan;
        }

        return {
            // total,
            width: colWidth, // 估算的列宽
            index: colIdx,
            headerCell: matrix[0][colIdx]?.cell,
            cellsInColumn: Array.from(new Set(columnCells))
        };
    });

    return { 
        map: matrix, 
        rows: rowTotals, 
        cols: colTotals 
    };
}


export const createTableControl = (table: HTMLTableElement, container: HTMLElement = document.body) => {
    if (!table || table.nodeName !== 'TABLE') {
        return null;
    }
    const tableMap = getTableMap(table);
    // const rowTools = document.createElement('div');
    // rowTools.className = 'dui-doc-table-view-row-toolbar';
    // let offset = 0;
    // let pointer = document.createElement('div');
    // pointer.style.width = '10px';
    // pointer.style.height = '10px';
    // pointer.style.position = 'absolute';
    // pointer.style.left = '0px';
    // pointer.style.top = `${ offset }px`;
    // pointer.style.transform = 'translate(0, -50%)';
    // pointer.style.borderRadius = '100%';
    // pointer.style.background = 'blue';
    // rowTools.appendChild(pointer);
    // const rows: any = tableMap.rows;
    // for (let i = 0; i < rows.length; i++) {
    //     pointer = document.createElement('div');
    //     pointer.style.width = '10px';
    //     pointer.style.height = '10px';
    //     pointer.style.position = 'absolute';
    //     pointer.style.left = '0px';
    //     pointer.style.top = `${ offset + rows[i].height }px`;
    //     pointer.style.transform = 'translate(0, -50%)';
    //     pointer.style.borderRadius = '100%';
    //     pointer.style.background = 'blue';
    //     offset += rows[i].height;
    //     rowTools.appendChild(pointer);
    // }
    // container.appendChild(rowTools);

    // const colTools = document.createElement('div');
    // colTools.className = 'dui-doc-table-view-col-toolbar';
    // container.appendChild(colTools);

    // offset = 0;
    // pointer = document.createElement('div');
    // pointer.style.width = '10px';
    // pointer.style.height = '10px';
    // pointer.style.position = 'absolute';
    // pointer.style.top = '0px';
    // pointer.style.left = `${ offset }px`;
    // pointer.style.transform = 'translate(-50%, 0)';
    // pointer.style.borderRadius = '100%';
    // pointer.style.background = 'blue';
    // colTools.appendChild(pointer);
    // const cols: any = tableMap.cols;
    // for (let i = 0; i < cols.length; i++) {
    //     pointer = document.createElement('div');
    //     pointer.style.width = '10px';
    //     pointer.style.height = '10px';
    //     pointer.style.position = 'absolute';
    //     pointer.style.top = '0px';
    //     pointer.style.left = `${ offset + cols[i].width }px`;
    //     pointer.style.transform = 'translate(-50%, 0)';
    //     pointer.style.borderRadius = '100%';
    //     pointer.style.background = 'blue';
    //     offset += cols[i].width;
    //     colTools.appendChild(pointer);
    // }
    console.log('tableMap', tableMap);
}

export type TableControlProps = {

};

export class TableControl {
    table: HTMLTableElement;
    container: HTMLElement;
    el: HTMLElement;
    constructor(props: TableControlProps = {}) {
        this.el = document.createElement('div');
        this.el.className = `${CLASSNAME}-table-control`;
    }
    load(table: HTMLTableElement, container: HTMLElement = document.body) {
        this.table = table;
        this.container = container;
        this.container.appendChild(this.el);
        const tableMap = getTableMap(table);
        if (!tableMap) {
            return;
        }
        
        this.createRowBar(tableMap.rows);
        this.createColBar(tableMap.cols);
        
    }
    createRowBar(rows: any) {
        const dom = document.createElement('div');
        dom.className = `${CLASSNAME}-table-control-rows`;
        // let offset = 0;
        // const point = document.createElement('div');
        // point.className = `${CLASSNAME}-table-control-row-point`;
        // point.style.top = `${offset}px`;
        // point.style.transform = 'translate(0, -50%)';
        // dom.appendChild(point);
        rows.forEach((item: any, index: number) => {
            const div = document.createElement('div');
            div.className = `${CLASSNAME}-table-control-row`;
            div.style.height = `${item.height}px`;
            dom.appendChild(div);

            // const point = document.createElement('div');
            // point.className = `${CLASSNAME}-table-control-row-point`;
            // point.style.top = `${offset += item.height}px`;
            // point.style.transform = 'translate(-50%, -50%)';
            // dom.appendChild(point);
        });
        this.el.appendChild(dom);
    }
    createColBar(rows: any) {
        const dom = document.createElement('div');
        dom.className = `${CLASSNAME}-table-control-cols`;
        // let offset = 0;
        // const point = document.createElement('div');
        // point.className = `${CLASSNAME}-table-control-col-point`;
        // point.style.left = `${offset}px`;
        // point.style.transform = 'translate(-50%, 0)';
        // dom.appendChild(point);
        rows.forEach((item: any, index: number) => {
            const div = document.createElement('div');
            div.className = `${CLASSNAME}-table-control-col`;
            div.style.width = `${item.width}px`;
            dom.appendChild(div);

            // const point = document.createElement('div');
            // point.className = `${CLASSNAME}-table-control-col-point`;
            // point.style.left = `${offset += item.width}px`;
            // point.style.transform = 'translate(-50%, -50%)';
            // dom.appendChild(point);
        });
        this.el.appendChild(dom);
    }
}