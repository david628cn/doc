import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
// import { type ResolvedPos } from 'prosemirror-model';
// import { getRect } from '@/components/utils/align';
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

const findSuggestionMatch = (config: any) => {
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
    const matchPrefixIsAllowed = new RegExp(`^[${allowedPrefixes?.join('')}\0]?$`).test(matchPrefix);

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
        key: new PluginKey('suggestion'),
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    const prev = plugin.getState(prevState);
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

                    const state = next;
                    const { left, top } = view.coordsAtPos(state.range.from);
                    let active = state.active;
                    if (!editor.view.hasFocus()) {
                        active = false;
                    }
                    const params = {
                        editor,
                        active,
                        range: active ? state.range : {from: 0, to: 0},
                        query: active ? state.query : null,
                        text: active ? state.text : null,
                        // items: [],
                        command: (commandProps: any) => {
                            // return command({
                            //     editor,
                            //     range: state.range,
                            //     props: commandProps,
                            // })
                        },
                        // decorationNode,
                        rect: active ? {
                            width: 100,
                            height: 24,
                            left,
                            top
                        } : null
                    };

                    console.log('update', params);
                    editor.emit('suggestion', params);
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
                    text: null
                };
            },
            apply(tr: Transaction, prevValue: any, prevState: EditorState, state: EditorState) {
                const { composing } = editor.view;
                const { selection } = tr;
                const { empty, from } = selection;
                if (!editor.editable || !(empty || composing)) {
                    return prevValue;
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
                if (event.key === 'Escape' || event.key === 'Esc') {

                }
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
                        placeholder: '筛选...'
                    })
                ]);

                // return pluginState.deco;
            }
        }
    });
    return plugin;
}