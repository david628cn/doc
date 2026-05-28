import { type EditorView } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';

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
export const findParentNodeClosestToPos = ($pos: any, predicate: any) => {
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
    return closest(dom, (node: any) => node.getAttribute('data-block-id'));
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

export const getPosRect = (view: EditorView, pos: number) => {
    let coords;
    try {
        coords = view.coordsAtPos(pos);
    } catch(err) {
        return null;
    }
    return {
        // x: coords.left,
        // y: coords.top,
        width: 0, // 純位置沒有寬度
        height: coords.bottom - coords.top, // 該行的高度
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        right: coords.right
    };
};