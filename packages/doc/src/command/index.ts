import { Fragment, Slice } from "prosemirror-model";
import { EditorState, Selection, NodeSelection } from "prosemirror-state";
import { setBlockType, wrapIn, joinBackward, selectNodeBackward, deleteSelection, newlineInCode, splitBlock, createParagraphNear, chainCommands } from "prosemirror-commands";
import { liftListItem, sinkListItem, splitListItem, } from "prosemirror-schema-list";
import { findWrapping, liftTarget } from "prosemirror-transform";
import { deleteTable, goToNextCell, CellSelection } from 'prosemirror-tables';

export const isTableFullySelected = (state: EditorState) => {
  const { selection } = state

  // 1. 确保当前是单元格选区
  if (!(selection instanceof CellSelection)) {
    return false;
  }

  // 2. 同时满足全行选中和全列选中，即为全选
  return selection.isRowSelection() && selection.isColSelection();
}

export const onBackspace = (state: EditorState, dispatch: any, view: any) => {
    const { selection, tr } = state;
    const { $from, empty } = selection;
    const currentView = view;

    if (isTableFullySelected(state)) {
        if (deleteTable(state, dispatch)) {
            return true; // 拦截成功，斩断原生清空文字的保护层
        }
    }

    // 🌟 1. 彻底复活 Ctrl+A 全选删除
    if (!empty) {
        // if (deleteTable(state, dispatch)) {
        //     return true; // 拦截成功，斩断原生清空文字的保护层
        // }
        // 默认的其他文本选区删除
        return deleteSelection(state, dispatch);
    }

    // 🌟 2. 纯净业务前置：处理标题、列表行首的基础排版样式回退变正文
    if ($from.parentOffset === 0) {
        const currentBlock = $from.parent;
        // 场景 A：1~4级标题变正文
        if (currentBlock.type === state.schema.nodes.heading) {
            if (dispatch) {
                const depth = $from.depth;
                dispatch(state.tr.setBlockType($from.before(depth), $from.after(depth), state.schema.nodes.paragraph));
            }
            return true;
        }

        // 场景 B：列表减少缩进或退出列表
        if (currentBlock.type === state.schema.nodes.list_item || $from.node($from.depth - 1).type.name === 'list_item') {
            if (liftListItem(state.schema.nodes.list_item)(state, dispatch)) {
                return true;
            }
        }

        // if (currentBlock.type === state.schema.nodes.paragraph) {
        //     const currentDepth = $from.depth;
        //     const parent = $from.node(currentDepth); // 顶层 doc 节点
        //     const index = $from.index(currentDepth); // 当前段落在 doc 中的索引
        //     if (index > 0) {
        //         const prevNode = parent.child(index - 1);
        //         // 🎯 判定：如果前一个紧挨着的兄弟节点是表格 (table)
        //         if (prevNode.type.name === 'table' || prevNode.type === state.schema.nodes.table) {
        //             // 1. 获取当前光标所在父节点（如当前段落）的深度 (通常是 1)                    
        //             // 2. 获取当前父节点在文档中的起始绝对位置
        //             const currentBlockStart = $from.start(currentDepth);
        //             const currentBlockPos = currentBlockStart - 1;
        //             // 当前块的真正起始位置（包含左边界 `token`）
        //             const prevNodePos = currentBlockPos - prevNode.nodeSize;
        //             if (dispatch) {
        //                 const selection = NodeSelection.create(state.doc, prevNodePos);
        //                 const nextTr = tr.setSelection(selection);
        //                 dispatch(nextTr);
        //             }
        //             return true; // 💥 强制就地熔断！阻止光标直接和表格内部发生恶性内容合并
        //         }
        //     }
        // }

        // =========================================================================
        // 🔒 场景 D：【绝杀核心修复】解决光标在列表下方空行行首，退格反而变成 4. 的问题
        // =========================================================================
        if (currentBlock.type === state.schema.nodes.paragraph && $from.depth === 1) {
            // 拿到前一个紧挨着的兄弟节点
            const parent = $from.node(0); // 顶层 doc 节点
            const index = $from.index(0); // 当前段落在 doc 中的索引

            if (index > 0) {
                const prevNode = parent.child(index - 1);
                // 🎯 判定：如果前一个紧挨着的兄弟节点是表格 (table)
                if (prevNode.type.name === 'table' || prevNode.type === state.schema.nodes.table) {
                    // 1. 获取当前光标所在父节点（如当前段落）的深度 (通常是 1)
                    const currentDepth = $from.depth;
                    
                    // 2. 获取当前父节点在文档中的起始绝对位置
                    const currentBlockStart = $from.start(currentDepth);
                    const currentBlockPos = currentBlockStart - 1;
                    // 当前块的真正起始位置（包含左边界 `token`）
                    const prevNodePos = currentBlockPos - prevNode.nodeSize;
                    if (dispatch) {
                        const selection = NodeSelection.create(state.doc, prevNodePos);
                        const nextTr = tr.setSelection(selection);
                        dispatch(nextTr);
                    }
                    return true; // 💥 强制就地熔断！阻止光标直接和表格内部发生恶性内容合并
                }

                // 如果前一个节点是列表容器（有序列表或无序列表）
                if (prevNode.type === state.schema.nodes.ordered_list || prevNode.type === state.schema.nodes.bullet_list) {
                    if (dispatch) {
                        const currentBlockStart = $from.before(1);
                        const currentBlockEnd = $from.after(1);

                        // 1. 如果当前行本身就是个空行，直接物理干掉它，把选区吸附回列表最后一行文本的末尾
                        if (currentBlock.content.size === 0) {
                            const prevListEndPos = currentBlockStart - 1; // 跨过闭合标签，指向列表最后一行的最末尾
                            const nextTr = tr.delete(currentBlockStart, currentBlockEnd);
                            nextTr.setSelection(Selection.near(nextTr.doc.resolve(prevListEndPos), -1));
                            dispatch(nextTr.scrollIntoView());
                        } else {
                            // 2. 如果行内有文字，执行高精度跨块物理内容合并（ReplaceStep 强融）
                            const targetMergePos = currentBlockStart - 2; // 跳过 </li> 和 </ul> 标记，直砸上一个文字尾部
                            tr.replaceRange(targetMergePos, currentBlockStart + 1, Slice.empty);
                            dispatch(tr.scrollIntoView());
                        }
                    }
                    return true; // 💥 强制就地熔断，绝对不允许事件滑落到下方的 joinBackward 导致其越权异化出 4.
                }
                
            }
        }
    }
    // 🌟 3. 核心防爆加固（按需保持注释或开启）
    // if (dispatch) {
    //     state.tr.setMeta("y-sync-plugin", { skipPropagation: true });
    //     state.tr.setMeta("addToHistory", true);
    // }

    // 🌟 4. 100% 还原官方 Demo 黄金命令双子星
    return joinBackward(state, dispatch, currentView)
        || selectNodeBackward(state, dispatch, currentView);
}

export const onTab = (state: EditorState, dispatch: any, view: any) => {
    return chainCommands(
        // 1. 表格单元格切换优先（如果不需要可注释掉）
        goToNextCell(1),
        // 2. 核心：使用当前运行时最纯净的 state.schema 节点指针
        // 在第二行及以下按 Tab 时，这里会成功向右缩进并返回 true 拦截
        sinkListItem(state.schema.nodes.list_item),
        // () => {
        //     const { $from } = state.selection;
        //     const isInList = $from.node($from.depth).type === state.schema.nodes.list_item;
        //     if (isInList) {
        //         if (dispatch) {
        //             dispatch(state.tr.insertText("    ")); // 🌟 第一行强制用 4 个空格代替缩进
        //         }
        //         return true; // 强行就地熔断，绝对不让焦点跳走
        //     }
        //     return false;
        // },
        (state, dispatch) => {
            if (dispatch) {
                // 物理向当前光标处灌入 4 个标准空格（或者可以根据你项目习惯改为 "\t" 制表符）
                dispatch(state.tr.insertText("    ").scrollIntoView());
            }
            return true; // 💥 终极卡死：由于普通正文也返回了 true，浏览器彻底失去了接管 Tab 键的机会，焦点永远逃不出编辑器！
        }
    )(state, dispatch, view);
}

/**
 * 辅助函数：手动组装一个用于 ProseMirror 插入的合法表格数据树
 * @param schema 编辑器的 schema 实例
 * @param rowsCount 默认生成的行数
 * @param colsCount 默认生成的列数
 */
export const createTableNode = (schema: any, rowsCount = 3, colsCount = 3) => {
    const cells = [];
    for (let i = 0; i < colsCount; i++) {
        // 自动创建一个内部包含空段落 <p><br></p> 的标准单元格
        cells.push(schema.nodes.table_cell.createAndFill());
    }

    const rows = [];
    for (let i = 0; i < rowsCount; i++) {
        // 将一整行的单元格数据片段（Fragment）塞入行节点中
        rows.push(schema.nodes.table_row.create(null, Fragment.from(cells)));
    }

    // 最终将所有行组装并返回一个完整的 table 节点
    return schema.nodes.table.create(null, Fragment.from(rows));
}

export const onEnter = (state: EditorState, dispatch: any, view: any) => {
    return chainCommands(
        newlineInCode,
        // 2. 🎯 核心修正：直接使用当前 state 实例自带的 schema.nodes.list_item 
        // 这样可以 100% 确保节点类型引用绝对一致，官方原装命令在行尾就能精准识别并长出 2.
        splitListItem(state.schema.nodes.list_item),
        // 1. 如果有引用块逻辑优先放这
        onEnterInBlockquote,
        // 3. 兜底常规换行
        createParagraphNear,
        splitBlock
    )(state, dispatch, view);
};


export const onShiftTab = (state: EditorState, dispatch: any, view: any) => {
    if (goToNextCell(-1)(state, dispatch)) return true;
    if (liftListItem(state.schema.nodes.list_item)(state, dispatch)) return true;
    return false;
}

export const onTable = (state: EditorState, dispatch: any, view: any) => {
    if (dispatch) {
        const tableNode = createTableNode(state.schema, 3, 3);
        // 在当前光标位置直接用表格替换
        dispatch(state.tr.replaceSelectionWith(tableNode).scrollIntoView());
    }
    return true;
}


// 2. 编写一个智能切换正文的命令
export const turnIntoParagraph = (state: EditorState, dispatch: () => void) => {
    // 如果当前在列表条目内部，先尝试将其提升（解除列表嵌套）
    if (liftListItem(state.schema.nodes.list_item)(state, dispatch)) {
        return true;
    }
    // 否则，直接强制把当前块转换为 paragraph 节点
    return setBlockType(state.schema.nodes.paragraph)(state, dispatch);
};


// 统一定义一个通用的解包引用命令（给快捷键用）
export const toggleBlockquote = (blockquoteType: any) => (state: any, dispatch: any) => {
    const { $from } = state.selection;
    let isInside = false;
    for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type === blockquoteType) { isInside = true; break; }
    }

    // 如果已经在引用里，再次按下快捷键就跳出引用变正文
    if (isInside) {
        let range = $from.blockRange();
        let target = range && liftTarget(range);
        if (target !== null && target !== undefined) {
            if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView());
            return true;
        }
    }
    // 否则执行正常的包裹逻辑
    return wrapIn(blockquoteType)(state, dispatch);
};

export const onEnterInBlockquote = (state: any, dispatch: any) => {
    const { $from, empty } = state.selection;

    // 1. 严格防御：只有在纯闪烁光标（无文本选中）时才触发
    if (!empty) return false;

    // 2. 核心层级定位：探测光标是否处于 blockquote 的内部段落中
    // $from.depth 代表当前普通段落（paragraph）的深度，其上一层 (depth - 1) 应该是 blockquote
    const parentDepth = $from.depth - 1;
    if ($from.depth > 1 && $from.node(parentDepth).type.name === 'blockquote') {
        const blockquoteNode = $from.node(parentDepth);
        const currentParagraph = $from.parent;

        // 条件 A：当前行必须是绝对空行（没有任何文本内容）
        const isCurrentLineEmpty = currentParagraph.content.size === 0;

        // 条件 B：当前段落必须是整个引用块（blockquote）里的最后一个子节点
        // $from.index(parentDepth) 能够拿到当前段落在 blockquote 内部的索引位置
        const isLastChildOfBlockquote = $from.index(parentDepth) === (blockquoteNode.childCount - 1);

        // 只有同时满足这两个条件，才被认定为“在尾部进行第二次回车”
        if (isCurrentLineEmpty && isLastChildOfBlockquote) {
            if (dispatch) {
                let range = $from.blockRange();
                if (range) {
                    let target = liftTarget(range);
                    if (target !== null && target !== undefined) {
                        let tr = state.tr;

                        // 1. 将最后一个空行段落从引用块的外壳里解包提取出来
                        tr.lift(range, target);

                        // 2. 重新解析该行在全局文档树中的位置，并强制恢复成干净的普通正文样式
                        const currentPos = tr.mapping.map($from.pos);
                        const $newPos = tr.doc.resolve(currentPos);
                        tr.setBlockType($newPos.before($newPos.depth), $newPos.after($newPos.depth), state.schema.nodes.paragraph);

                        dispatch(tr.scrollIntoView());
                        return true; // 完美拦截并跳出
                    }
                }
            }
        }
    }
    return false;
};

/**
 * 智能块级样式切换器 (支持 1~4级标题与其自身的开启/反转)
 */
export const toggleBlockType = (nodeType: any, attrs: any = null) => (state: EditorState, dispatch: any) => {
    const { $from } = state.selection;
    const currentBlock = $from.parent;
    const isCurrentType = currentBlock.type === nodeType &&
        (!attrs || Object.keys(attrs).every(key => currentBlock.attrs[key] === attrs[key]));

    if (isCurrentType) {
        return setBlockType(state.schema.nodes.paragraph)(state, dispatch);
    }
    return setBlockType(nodeType, attrs)(state, dispatch);
};


/**
 * 工业级列表类型置换器 (解决无序/有序互转、标题转列表、列表还原正文的全部内容校验报错)
 */
export const toggleListType = (listType: any, itemType: any) => (state: EditorState, dispatch: any) => {
    const { $from, $to } = state.selection;
    const range = $from.blockRange($to);
    if (!range) return false;

    let currentList = null;
    let listDepth = -1;
    for (let d = range.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name.includes('list') && node.type.name !== itemType.name) {
            currentList = node; listDepth = d; break;
        }
    }

    // 场景 A：当前处于列表内部，进行互转或取消
    if (currentList) {
        if (currentList.type === listType) return liftListItem(itemType)(state, dispatch);
        if (dispatch) {
            const tr = state.tr;
            const listPos = $from.before(listDepth);
            const targetAttrs = listType.name === 'ordered_list' ? { order: 1 } : {};
            const newListBlock = listType.create(targetAttrs, currentList.content);
            dispatch(tr.replaceWith(listPos, listPos + currentList.nodeSize, newListBlock).scrollIntoView());
        }
        return true;
    }

    // 场景 B：不在列表内部 (支持 H1~H4 标题一键原子降级并包裹列表)
    const tr = state.tr;
    const currentBlock = $from.parent;
    if (currentBlock.type.name === 'heading') {
        const blockPos = $from.before($from.depth);
        tr.setBlockType(blockPos, blockPos + currentBlock.nodeSize, state.schema.nodes.paragraph);
    }

    const $newFrom = tr.doc.resolve($from.pos);
    const $newTo = tr.doc.resolve($to.pos);
    const newRange = $newFrom.blockRange($newTo);
    const attrs = listType.name === 'ordered_list' ? { order: 1 } : {};
    const wrapping = newRange && findWrapping(newRange, listType, attrs);

    if (wrapping) {
        if (dispatch) dispatch(tr.wrap(newRange, wrapping).scrollIntoView());
        return true;
    }
    return false;
};
