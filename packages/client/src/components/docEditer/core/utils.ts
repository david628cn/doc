import { NodeSelection } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import {
    CellSelection,
    cellAround
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

export const closestElement = (dom: any, fn: Function) => {
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
 * 查找最近的父节点
 * @param {ResolvedPos} $pos - ProseMirror 的 ResolvedPos
 * @param {Function} predicate - 条件函数 (node) => boolean
 */
export const findParentNodeClosestToPos = ($pos, predicate) => {
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

export const closestBlock = (dom: any) => {
    return closestElement(dom, node => node.getAttribute('data-block-id'));
}

export const closestTableView = (dom: any) => {
    return closestElement(dom, (dom: any) => dom.classList && dom.classList.contains(`${CLASSNAME}-table-view`));
}

export const getMaxCellRect = (
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

export const getCellRect = (
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
    const tableDOM = view.nodeDOM(tablePos);
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
        tableDOM,
        // 如果没找到 wrapper 类名，回退到 tableDOM.parentNode
        tableWrapper: closestTableView(tableDOM),
        $cellPos, // 保留此引用以便后续操作单元格
        rect
    };
}