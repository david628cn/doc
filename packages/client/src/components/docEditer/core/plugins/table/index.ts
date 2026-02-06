import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    columnResizing,
    tableEditing,
    CellSelection,
    cellAround
} from 'prosemirror-tables';
import { TableEx } from './tableEx';

import './index.less';

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
            init(_, state) {
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
                return next;
            },
        },
        props: {
            // nodeViews: {
            //     table: (node: Node, view: EditorView, getPos: () => number) => {
            //         console.log(['1']);
            //         return new TableEx(node, 100, view, getPos);
            //     }
            // } as any,
            handleDOMEvents: {
                mousemove: (view, event) => {

                },
                mouseleave: (view) => {

                },
                mousedown: (view, event) => {

                }
            },
            decorations: (state) => {
                return null;
            }
        }
    });
    const columnResize = columnResizing({
        View: TableEx as any,
        // handleWidth: 10
    });
    return [columnResize, tableEditing(), plugin];
}