import { type EditorState, type Transaction, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { type Node, type Schema, Fragment } from 'prosemirror-model';
// import { type ResolvedPos } from 'prosemirror-model';
// import { getRect } from '@/components/utils/align';
import { findSuggestionMatch } from '@/components/doc/core/utils';
import { CLASSNAME } from '@/global';
import './index.less';

// class ZfCollapse extends HTMLElement {
//     constructor() {
//         super();
//         const shadow = this.attachShadow({ mode: 'open' });
//         shadow.innerHTML = `
//           <style>button{background:#4CAF50;color:white;padding:10px}</style>
//           <button><slot>默认按钮</slot></button>
//         `;
//     }

//     render() {
//     //     this.shadowRoot.innerHTML = `
//     //     <style>
//     //       :host {
//     //         display: block;
//     //         border: 2px solid #e0e0e0;
//     //         border-radius: 8px;
//     //         overflow: hidden;
//     //         background: #fafafa;
//     //       }
//     //       .collapse-container {
//     //         width: 100%;
//     //       }
//     //     </style>
//     //     <div class="collapse-container">
//     //       <slot></slot>
//     //     </div>
//     //   `;
//     }
// }


// // 注册自定义元素
// customElements.define('zf-collapse', ZfCollapse);

export const createTable = (schema: Schema, rows: number = 3, cols: number = 3) => {
    const { table, table_row, table_cell, paragraph } = schema.nodes;
    const rowsArr = [];

    for (let i = 0; i < rows; i++) {
        const cells = [];
        for (let j = 0; j < cols; j++) {
            // 每个单元格内部必须至少有一个基础块节点（通常是 paragraph）
            const cell = table_cell.createAndFill(null, Fragment.from(paragraph.create()));
            cells.push(cell);
        }
        rowsArr.push(table_row.create(null, Fragment.from(cells)));
    }

    return table.create(null, Fragment.from(rowsArr));
}

export const calculateStartPosition = (
    cursorPosition: number,
    previousNode: Node | null | undefined,
    triggerChar?: string
): number => {
    if (!previousNode?.text || !triggerChar) {
        return cursorPosition;
    }
    const commandText = previousNode.text;
    const triggerCharIndex = commandText.lastIndexOf(triggerChar);
    if (triggerCharIndex === -1) {
        return cursorPosition;
    }
    const textLength = commandText.substring(triggerCharIndex).length;
    return cursorPosition - textLength;
}

// if (!isMention) {
//     const cursorPosition = selection.$from.pos
//     const previousNode = selection.$head?.nodeBefore

//     const startPosition = previousNode
//         ? calculateStartPosition(
//             cursorPosition,
//             previousNode,
//             internalSuggestionPropsRef.current.char
//         )
//         : selection.$from.start()

//     const transaction = state.tr.deleteRange(
//         startPosition,
//         cursorPosition
//     )
//     view.dispatch(transaction)
// }

// const nodeAfter = view.state.selection.$to.nodeAfter
// const overrideSpace = nodeAfter?.text?.startsWith(" ")

// const rangeToUse = { ...range }

// if (overrideSpace) {
//     rangeToUse.to += 1
// }


// interface Trigger {
//     char?: string;
//     allowSpaces?: boolean;
//     allowToIncludeChar?: boolean;
//     allowedPrefixes?: string[];
//     startOfLine?: boolean;
//     $position: ResolvedPos;
// }

// type Range = {
//     from: number;
//     to: number;
// }

// type SuggestionMatch = {
//     range: Range;
//     query: string;
//     text: string;
// } | null;

export const suggestionPluginKey = new PluginKey('suggestion');

export const suggestion = ({
    editor,
    trigger = '/'
    // triggers = [
    //     { name: 'command', trigger: '/' },
    //     { name: 'mention', trigger: '@' }
    // ]
}: any) => {

    // 使用正則匹配：空格 + / 或 行首 + /
    // 使用你之前的 RegExp 邏輯
    // const regex = new RegExp(`\\s*${char}$`);
    const regex = new RegExp(`\\s*${trigger}$`);
    // /(?:^)?\/[^\s\/]*/gm   /
    // /(?:^)?@[^\s@]*/gm    @
    // /(?:^)?:[^\s:]*/gm    :

    const plugin: Plugin = new Plugin({
        key: suggestionPluginKey,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    // const prev = plugin.getState(prevState);
                    const next = plugin.getState(view.state);

                    // // See how the state changed
                    // const moved = prev.active && next.active && prev.range.from !== next.range.from;
                    // const started = !prev.active && next.active;
                    // const stopped = prev.active && !next.active;
                    // const changed = !started && !stopped && prev.query !== next.query;

                    // const handleStart = started || (moved && changed);
                    // const handleChange = changed || moved;
                    // const handleExit = stopped || (moved && changed);

                    // // Cancel when suggestion isn't active
                    // if (!handleStart && !handleChange && !handleExit) {
                    //     return
                    // }
                    // const state = handleExit && !handleStart ? prev : next;
                    let active = next.active;
                    let params = {
                        editor,
                        command: (ds: any) => {
                            let tr = editor.view.state.tr.setMeta('suggestion', {
                                active: ds.active,
                            });
                            const cursorPosition = editor.view.state.selection.$from.pos;
                            const previousNode = editor.view.state.selection.$head?.nodeBefore;

                            const startPosition = previousNode
                                ? calculateStartPosition(cursorPosition, previousNode, '/')
                                : editor.view.state.selection.$from.start();

                            tr = tr.deleteRange(startPosition, cursorPosition);

                            const $startPosition = tr.doc.resolve(startPosition);
                            // const isParentEmpty = $startPosition.parent.content.size === 0 || $startPosition.parent.textContent.trim() === '';
                            const isParentEmpty = $startPosition.parent.content.size === 0 || $startPosition.parent.textContent === '';

                            const nodeType = editor.view.state.schema.nodes[ds.nodeType];
                            let newNode: Node;
                            if (ds.nodeType === 'table') {
                                newNode = createTable(editor.view.state.schema, 3, 3);
                            } else if (ds.nodeType === 'columns') {
                                let { columns, column, paragraph } = editor.view.state.schema.nodes;
                                // 创建两个空的栏位，每个栏位包含一个初始段落
                                newNode = columns.create(null, [
                                    column.create({
                                        ratio: 30
                                    }, paragraph.create()),
                                    column.create({
                                        ratio: 30
                                    }, paragraph.create()),
                                    column.create({
                                        ratio: 40
                                    }, paragraph.create())
                                ]);
                            } else {
                                console.log('ds.nodeAttr', ds);
                                newNode = nodeType.createAndFill(ds.nodeAttr || {});
                            }

                            if (isParentEmpty) {
                                // 逻辑 A：如果为空，直接 setBlockType 转换整行
                                console.log('替换');
                                // 【核心修正】：计算父节点在 doc 中的绝对坐标
                                // $from.start() 是内容起点，$from.start() - 1 是节点开启标签位置
                                const startOfParent = $startPosition.start() - 1;
                                const endOfParent = startOfParent + $startPosition.parent.nodeSize;

                                // 直接用 table 替换掉整个 paragraph 节点范围
                                // 这一步会物理抹除旧行，原地放入新块
                                tr = tr.replaceWith(startOfParent, endOfParent, newNode);
                                const resolvedPos = tr.doc.resolve(startOfParent);
                                const selection = TextSelection.near(resolvedPos);
                                tr = tr.setSelection(selection);
                            } else {
                                // 逻辑 B：如果不为空，在当前位置插入块（会自动切断行）
                                console.log('插入');
                                tr = tr.replaceWith(startPosition, startPosition, newNode);
                                const resolvedPos = tr.doc.resolve(startPosition + 1);
                                const selection = TextSelection.near(resolvedPos);
                                tr = tr.setSelection(selection);
                            }
                            // const nodeAfter = view.state.selection.$to.nodeAfter;
                            // const overrideSpace = nodeAfter?.text?.startsWith(" ");
                            editor.view.dispatch(tr.scrollIntoView());
                            editor.view.focus();
                        },
                        active,
                        range: { from: 0, to: 0 },
                        query: null,
                        text: null,
                        rect: null
                    };
                    if (!editor.view.hasFocus()) {
                        active = false;
                    }

                    if (active) {
                        const { left, top } = view.coordsAtPos(next.range.from);
                        params.active = active;
                        params.range = next.range;
                        params.query = next.query;
                        params.text = next.text;
                        params.rect = {
                            width: 100,
                            height: 24,
                            left,
                            top
                        };
                    }
                    editor.emit('action', {
                        type: 'suggestion',
                        data: params
                    });
                },
                destroy() {

                }
            };
        },
        state: {
            init() {
                return {
                    active: false,
                    // deco: DecorationSet.empty,
                    range: {
                        from: 0,
                        to: 0
                    },
                    query: null,
                    text: null,
                    decorationId: null
                };
            },
            apply(tr: Transaction, prevValue: any, prevState: EditorState, state: EditorState) {
                const { composing } = editor.view;
                const { selection } = tr;
                const { empty, from } = selection;
                if (!editor.editable || !editor.view.hasFocus() || !(empty || composing)) {
                    return {
                        ...prevValue,
                        active: false,
                        range: {
                            from: 0,
                            to: 0
                        },
                        query: null,
                        text: null
                    };;
                }
                const mate = tr.getMeta('suggestion');
                const next = {
                    ...prevValue,
                    composing
                };
                if (mate) {
                    // const cotent = state.doc.textBetween(from - 1, from);
                    // console.log('mate>>>', [from - 1, from], [cotent]);
                    // const deco = DecorationSet.create(state.doc, [
                    //     Decoration.inline(from - 1, from, {
                    //         nodeName: 'span',
                    //         class: `${CLASSNAME}-suggestion`
                    //     }, {
                    //         inclusiveEnd: false,
                    //         inclusiveStart: false
                    //     })
                    // ]);
                    if (!mate.active) {
                        return {
                            ...next,
                            active: false,
                            composing: prevValue.composing,
                            range: {
                                from: 0,
                                to: 0
                            },
                            query: null,
                            text: null
                        };
                    }
                    const match = findSuggestionMatch({
                        trigger,
                        $position: selection.$from
                    });
                    if (!match) {
                        return {
                            ...next,
                            active: false,
                            range: {
                                from: 0,
                                to: 0
                            },
                            query: null,
                            text: null
                        };
                    }
                    return {
                        ...next,
                        active: true,
                        range: {
                            from: match.range.from,
                            to: match.range.to
                        },
                        query: match.query,
                        text: match.text
                    };
                }

                // if (next.deco) {
                // next.deco = next.deco.map(tr.mapping, tr.doc);
                // console.log('newFrom newTo>>>', next.deco);
                // }
                // if (!editor.view.hasFocus()) {
                //     return {
                //         ...next,
                //         active: false,
                //         range: {
                //             from: 0,
                //             to: 0
                //         },
                //         query: null,
                //         text: null
                //     };
                // }
                if (next.active) {
                    if ((from < next.range.from || from > next.range.to) && !composing && !next.composing) {
                        // return {
                        //     ...next,
                        //     active: false,
                        //     range: {
                        //         from: 0,
                        //         to: 0
                        //     },
                        //     query: null,
                        //     text: null
                        // };
                        next.active = false;
                    }
                    const match = findSuggestionMatch({
                        trigger,
                        $position: selection.$from
                    });
                    if (!match) {
                        return {
                            ...next,
                            active: false,
                            range: {
                                from: 0,
                                to: 0
                            },
                            query: null,
                            text: null
                        };
                    } else {
                        next.active = true;
                    }
                    if (!next.active) {
                        return {
                            ...next,
                            active: false,
                            range: {
                                from: 0,
                                to: 0
                            },
                            query: null,
                            text: null
                        };
                    }
                    // console.log('match>>>', next.decorationId);
                    // next.decorationId = `id-${Math.floor(Math.random() * 0xffffffff)}`;
                    next.active = true;
                    next.range.from = match.range.from;
                    next.range.to = match.range.to;
                    next.query = match.query;
                    next.text = match.text;
                }
                return next;
            }
        },
        props: {
            handleTextInput(view: EditorView, from: number, to: number, text: string) {
                // const $from = view.state.doc.resolve(from);
                // const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, null, '\0') + text;
                if (regex.test(text)) {
                    let timer: any;
                    timer = setTimeout(() => {
                        clearTimeout(timer);
                        const { state } = view;
                        // 計算觸發位置：這裡 from 是斜線插入後的位置
                        // const start = from - (textBefore.length - textBefore.trim().length) - (text.length - 1);
                        // const end = to + text.length;

                        // const textLen = text.length;
                        // let start = from;
                        // let end = to + 1;
                        // if (textLen > 1) {
                        //     start += 1;
                        // }

                        // 創建一個帶有唯一標記的 Inline Decoration
                        // const decoration = Decoration.inline(start, end, {
                        //     class: `${CLASSNAME}-suggestion`,
                        //     // style: 'background: rgba(0, 0, 255, 0.1);' // 調試用
                        // });

                        // 通過 Meta 數據更新插件狀態，避開 apply 的自動邏輯
                        const tr = state.tr.setMeta('suggestion', { active: true });

                        // 手動觸發狀態更新
                        view.dispatch(tr);
                    }, 0);

                }
                return false; // 返回 false 以便文字能正常插入文檔
            },
            handleKeyDown(view: EditorView, event: any) {
                const state = suggestionPluginKey.getState(view.state);
                if (!state.active) {
                    return false; // 我不活跃，放行给后面的插件
                }
                if (event.key === 'Escape' || event.key === 'Esc') {
                    const tr = view.state.tr.setMeta('suggestion', {
                        active: false,
                        // deco: DecorationSet.empty,
                        range: {
                            from: 0,
                            to: 0
                        },
                        query: null,
                        text: null
                    });
                    view.dispatch(tr);
                    return true;
                }
                return false;
            },
            decorations(state: EditorState) {
                const pluginState = plugin.getState(state);
                if (!pluginState.active) {
                    return null;
                }

                // if (pluginState.deco && pluginState.deco.find().length > 0) {
                //     return pluginState.deco;
                // }

                const isEmpty = !pluginState.query?.length;
                const classNames = [`${CLASSNAME}-suggestion`];

                if (isEmpty) {
                    classNames.push(`${CLASSNAME}-suggestion-empty`)
                }

                return DecorationSet.create(state.doc, [
                    Decoration.inline(pluginState.range.from, pluginState.range.to, {
                        nodeName: 'span',
                        class: classNames.join(' '),
                        'data-decoration-id': pluginState.decorationId,
                        placeholder: '搜索...'
                    })
                ]);

                // return pluginState.deco;
            }
        }
    });
    return plugin;
}