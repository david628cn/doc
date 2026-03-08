import { type EditorState, type Transaction, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
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

                            // const { view } = editor;
                            // const { state } = view;
                            // const { $from } = state.selection;
                            // const parent = $from.parent;

                            // // 1. 获取当前指令文字的长度 (例如 "/table" 的长度)
                            // const commandLength = ds.range.to - ds.range.from;

                            // // 2. 核心修正：获取除去“指令”外，父节点剩余的所有文本内容
                            // // 这里通过 replace 直接把指令部分删掉，看剩下的是不是全是空白
                            // const fullText = parent.textContent;
                            // const commandText = fullText.slice($from.parentOffset, $from.parentOffset + commandLength);
                            // const remainingText = fullText.replace(commandText, '');

                            // // 只要剩余内容全为空白（包括指令前的空格），就视为“替换模式”
                            // const isEffectivelyEmpty = remainingText.trim() === '';

                            // let targetSelectionPos;

                            // if (isEffectivelyEmpty) {
                            //     // 【替换模式】：强制清理全行并转换
                            //     // 获取当前 Parent 节点在文档中的绝对起始和终点位置
                            //     const startOfParent = ds.range.from - $from.parentOffset;
                            //     const endOfParent = startOfParent + parent.nodeSize; // 使用 nodeSize 覆盖整个节点范围

                            //     const nodeType = state.schema.nodes[ds.nodeType];

                            //     // 规范：先用 deleteRange 彻底抹除包括空格在内的旧节点
                            //     // 然后在原位置 setBlockType
                            //     tr = tr.delete(startOfParent, startOfParent + parent.content.size)
                            //         .setBlockType(startOfParent, startOfParent, nodeType, ds.nodeAttr || {});

                            //     targetSelectionPos = startOfParent;
                            // } else {
                            //     // 【插入模式】：前面有实质文字，仅替换指令本身
                            //     const nodeType = state.schema.nodes[ds.nodeType];
                            //     const newNode = nodeType.createAndFill(ds.nodeAttr || {});

                            //     tr = tr.replaceWith(ds.range.from, ds.range.to, newNode);
                            //     targetSelectionPos = ds.range.from + 1;
                            // }

                            // // 后续 Selection 恢复逻辑保持不变...
                            // const selection = TextSelection.near(tr.doc.resolve(targetSelectionPos));
                            // view.dispatch(tr.setSelection(selection).scrollIntoView());
                            // view.focus();
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