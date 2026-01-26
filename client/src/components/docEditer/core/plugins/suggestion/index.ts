import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { type ResolvedPos } from 'prosemirror-model';
import { getRect } from '@/components/utils/align';
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


interface Trigger {
    char?: string;
    allowSpaces?: boolean;
    allowToIncludeChar?: boolean;
    allowedPrefixes?: string[];
    startOfLine?: boolean;
    $position: ResolvedPos;
}

type Range = {
    from: number;
    to: number;
}

type SuggestionMatch = {
    range: Range;
    query: string;
    text: string;
} | null;

const findSuggestionMatch = (config: Trigger): SuggestionMatch => {
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

export const pluginKeyRef = new PluginKey('suggestion');

const suggestion = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: pluginKeyRef,
        view(view: EditorView) {
            return {
                update(view: EditorView, prevState: EditorState) {
                    const prev = plugin.getState(prevState);
                    const next = plugin.getState(view.state);
                    const moved = prev.active && next.active && prev.range.from !== next.range.from;
                    const started = !prev.active && next.active;
                    const stopped = prev.active && !next.active;
                    const changed = !started && !stopped && prev.query !== next.query;

                    const handleStart = started || (moved && changed);
                    const handleChange = changed || moved;
                    const handleExit = stopped || (moved && changed);

                    // console.log(!handleStart && !handleChange && !handleExit);

                    if (!handleStart && !handleChange && !handleExit) {
                        // const props = {
                        //     range: prev.range,
                        //     query: prev.query,
                        //     text: prev.text,
                        //     rect: prev.decorationNode ? getRect(prev.decorationNode) : null,
                        //     visible: false
                        // };
                        // editor.emit('suggestion', props);
                        return;
                    }

                    const state = handleExit && !handleStart ? prev : next;
                    console.log('suggestion update', handleExit && !handleStart, prev, next);
                    const decorationNode: any = state?.decorationId ? view.dom.querySelector(`[data-decoration-id="${state.decorationId}"]`) : null;
                    const props = {
                        range: state.range,
                        query: state.query,
                        text: state.text,
                        rect: decorationNode ? getRect(decorationNode) : null,
                        visible: decorationNode ? true : false
                    };
                    editor.emit('suggestion', props);
                },
                destroy() {

                }
            };
        },
        state: {
            init() {
                return {
                    active: false,
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
                const { empty, from, $from } = selection;
                let newValue = {
                    ...prevValue
                };
                newValue.composing = composing;
                if (editor.editable && (empty || editor.view.composing)) {
                    if ((from < prevValue.range.from || from > prevValue.range.to) && !composing && !prevValue.composing) {
                        newValue.active = false;
                    }
                    const match: any = findSuggestionMatch({
                        char: '/',
                        $position: $from
                    });
                    const decorationId = `id_${Math.floor(Math.random() * 0xffffffff)}_${new Date().getTime()}`;
                    if (match) {
                        newValue.active = true;
                        newValue.decorationId = prevValue.decorationId ? prevValue.decorationId : decorationId;
                        newValue.range = match.range;
                        newValue.query = match.query;
                        newValue.text = match.text;
                    } else {
                        newValue.active = false;
                    }
                } else {
                    newValue.active = false;
                }

                if (!newValue.active) {
                    newValue.decorationId = null;
                    newValue.range = { from: 0, to: 0 };
                    newValue.query = null;
                    newValue.text = null;
                }
                return newValue;
            }
        },
        props: {
            decorations(state: EditorState) {
                const { active, range, query, decorationId } = plugin.getState(state);

                if (!active) {
                    return null;
                }
                const isEmpty = !query?.length
                const classNames = [`${CLASSNAME}-suggestion`];

                if (isEmpty) {
                    classNames.push(`${CLASSNAME}-suggestion-is-empty`);
                }

                return DecorationSet.create(state.doc, [
                    Decoration.inline(range.from, range.to, {
                        nodeName: 'span',
                        'data-decoration-id': decorationId,
                        class: classNames.join(' '),
                        'placeholder': '输入关键字...',
                    }),
                ])
            }
        }
    });
    return plugin;
}
export default suggestion;