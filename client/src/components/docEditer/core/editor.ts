
import { type Transaction, EditorState } from 'prosemirror-state';
// import { addListNodes } from 'prosemirror-schema-list';
// import { schema } from 'prosemirror-schema-basic';
import {
    type Node,
    type Slice,
    type Mark,
    type MarkType,
    Schema,
    DOMParser
} from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
// import type { Transform } from 'prosemirror-transform';
import {
    // splitBlock, 
    // newlineInCode, 
    baseKeymap,
    toggleMark
} from 'prosemirror-commands';
// import { insertSoftBreak } from 'prosemirror-transform';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
// import { exampleSetup } from 'prosemirror-example-setup';

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket';
import {
    ySyncPlugin,
    yCursorPlugin,
    yUndoPlugin,
    // undo,
    // redo,
} from 'y-prosemirror';

import { EventEmitter } from './eventEmitter';
import {
    // keymaps, 
    link,
    dragHandle,
    suggestion,
    placeholder,
    selection
} from './plugins';
import TableView from './nodeViews/tableView';
import { default as schemaBase } from './schema';
import { CLASSNAME } from '@/global';
import './editor.less';

// export type Range = {
//     from: number;
//     to: number;
// }

// export type HTMLContent = string;

export type JSONContent = {
    type?: string
    attrs?: Record<string, any> | undefined
    content?: JSONContent[]
    marks?: {
        type: string
        attrs?: Record<string, any>
        [key: string]: any
    }[]
    text?: string
    [key: string]: any
}

// export type Content = string | JSONContent | JSONContent[] | null;

export type EditorOptions = {
    element?: HTMLElement | null | undefined;
    content?: JSONContent | JSONContent[] | Node | string | null | undefined;
    autofocus?: boolean;
    editable?: boolean;
    onBeforeCreate?: Function;
    onCreate?: Function;
    onMount?: Function;
    onUnmount?: Function;
    onUpdate?: Function;
    onSelectionUpdate?: Function;
    onTransaction?: Function;
    onFocus?: Function;
    onBlur?: Function;
    onDestroy?: Function;
    onContentError?: Function;
    onPaste?: Function;
    onDrop?: Function;
    onDelete?: Function;
    onSuggestion?: Function;
    onSelectionEnd?: Function;
}

const removeWhitespaces = (node: HTMLElement) => {
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i -= 1) {
        const child = children[i];
        if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) {
            node.removeChild(child);
        } else if (child.nodeType === 1) {
            removeWhitespaces(child as HTMLElement);
        }
    }
    return node;
}

const elementFromString = (value: string): any => {
    if (typeof window === 'undefined') {
        // throw new Error('[tiptap error]: there is no window object available, so this function cannot be used')
        return null;
    }
    // add a wrapper to preserve leading and trailing whitespace
    const wrappedValue = `<body>${value}</body>`;
    const html = new window.DOMParser().parseFromString(wrappedValue, 'text/html').body;
    // console.log('html', value, html);
    return removeWhitespaces(html);
}

export class Editor extends EventEmitter {
    // element: any;
    public view!: EditorView;
    // public state!: EditorState;
    // public schema!: Schema;
    public element: HTMLElement = document.body;
    private _content: any;
    private _editable: boolean = false;
    public params: any = {
        user: {
            id: '0001',
            name: 'admin'
        },
        roomId: 'room-01'
    };
    // plugins: Array<any> | undefined;
    public options: EditorOptions = {
        // element: typeof document !== 'undefined' ? document.createElement('div') : null,
        element: document.body,
        content: '',
        autofocus: false,
        editable: false,
        onBeforeCreate: () => null,
        onCreate: () => null,
        onMount: () => null,
        onUnmount: () => null,
        onUpdate: () => null,
        onSelectionUpdate: () => null,
        onTransaction: () => null,
        onFocus: () => null,
        onBlur: () => null,
        onDestroy: () => null,
        onContentError: (error: Error) => {
            throw error;
        },
        onPaste: () => null,
        onDrop: () => null,
        onDelete: () => null,
        onSuggestion: () => null,
        onSelectionEnd: () => null
    };
    constructor(options?: EditorOptions) {
        super();
        if (options && options.element) {
            const element = typeof options.element === 'string' ? document.getElementById(options.element) : options.element;
            this.element = element || document.body;
        }
        this.setOptions(options);
        let plugins = [
            history(),
            keymap({
                ...baseKeymap,
                'Mod-z': undo,
                'Mod-y': redo,
                'Mod-Shift-z': redo
            }),
            link({
                editor: this
            })
        ];
        if (false) {
            const ydoc = new Y.Doc()
            const serverUrl = `ws://127.0.0.1:8000/docWs?userId=${this.params.user.id}&roomId=${this.params.docId}`;
            const provider = new WebsocketProvider(serverUrl, this.params.docId, ydoc);
            const type = ydoc.getXmlFragment('prosemirror');
            plugins = plugins.concat([
                ySyncPlugin(type),
                yCursorPlugin(provider.awareness, {
                    selectionBuilder: (user) => {
                        const curUser = {
                            ...user,
                            color: '#a5f3fc'
                        };
                        return {
                            // style: `background-color: ${user.color}70`,
                            class: 'ProseMirror-yjs-selection',
                            style: `background-color: ${curUser.color}70`,
                            // style: `background-color: #a5f3fc`
                        }
                    },
                    cursorBuilder: (user) => {
                        const curUser = {
                            ...user,
                            color: '#a5f3fc'
                        };
                        const cursor = document.createElement('span');
                        cursor.classList.add('ProseMirror-yjs-cursor');
                        cursor.setAttribute('style', `border-color: ${curUser.color}`);
                        const userDiv = document.createElement('div');
                        userDiv.setAttribute('style', `background-color: ${curUser.color}`);
                        userDiv.insertBefore(document.createTextNode(curUser.name), null);
                        const nonbreakingSpace1 = document.createTextNode('\u2060');
                        const nonbreakingSpace2 = document.createTextNode('\u2060');
                        cursor.insertBefore(nonbreakingSpace1, null);
                        cursor.insertBefore(userDiv, null);
                        cursor.insertBefore(nonbreakingSpace2, null);
                        return cursor;
                    }
                    // awarenessStateFilter: defaultAwarenessStateFilter,
                    // getSelection = (state) => state.selection
                }),
                yUndoPlugin()
            ]);
        }
        plugins = plugins.concat([
            // dragHandle({
            //     editor: this
            // }),
            placeholder({
                editor: this
            }),
            suggestion({
                editor: this
            }),
            selection({
                editor: this
            })
        ]);

        const schema = this.createSchema();
        const doc = this.createDoc(schema);

        const state = EditorState.create({
            doc,
            schema,
            // selection: undefined,
            plugins
        });

        this.view = new EditorView(this.element, {
            state,
            editable: () => {
                return this.editable;
            },
            attributes: {
                spellcheck: false,
                // contenteditable: this.options.editable
            } as any,
            nodeViews: {
                tableView: (node: Node, view: EditorView, getPos: number): any => new TableView(node, view, getPos)
            } as any,
            // 更新
            dispatchTransaction: (tr: Transaction) => {
                if (this.view && this.view.state) {
                    const prevState = this.view.state;
                    const { state, transactions } = prevState.applyTransaction(tr);
                    const selectionHasChanged = !prevState.selection.eq(state.selection);
                    // console.log('dispatchTransaction', newState);
                    this.view.updateState(state);
                    // if (selectionHasChanged) {
                    //     this.emit('selectionUpdate', {
                    //         editor: this
                    //     })
                    // }
                }
                // this.view.updateState(newState);
            }
        } as any);

        this.view.dom.classList.add(`${CLASSNAME}-editor`);
        // this.view.root.addEventListener('mousedown', this.options.onMouseDown, false);
        // this.view.root.addEventListener('touchstart', this.options.onMouseDown, { passive: false });

        // this.view.root.addEventListener('mousemove', this.options.onMouseMove, false);
        // this.view.root.addEventListener('touchmove', this.options.onMouseMove, { passive: false });

        // this.view.root.addEventListener('mouseup', this.options.onMouseUp, false);
        // this.view.root.addEventListener('touchend', this.options.onMouseUp, { passive: false });
        // this.view.root.addEventListener('touchcancel', this.options.onMouseUp, { passive: false });
        // this.view.dom.addEventListener('dragstart', (e) => e.preventDefault());
        // this.view.dom.addEventListener('dragover', (e) => e.preventDefault());
        // this.view.dom.addEventListener('drop', (e) => e.preventDefault());
    }
    setOptions(options: EditorOptions = {}) {
        this.options = {
            ...this.options,
            ...options
        };
        this.content = this.options.content;
        this.editable = this.options.editable || false;
        if (typeof this.options.onSuggestion === 'function') {
            this.on('suggestion', this.options.onSuggestion);
        }
        if (typeof this.options.onSelectionUpdate === 'function') {
            this.on('selectionUpdate', this.options.onSelectionUpdate);
        }
        if (typeof this.options.onSelectionEnd === 'function') {
            this.on('selectionEnd', this.options.onSelectionEnd);
        }
    }
    set content(content: any) {
        this._content = content;
        if (this.view) {
            const schema = this.view.state.schema;
            const parser = DOMParser.fromSchema(schema);
            const newDoc = parser.parse(elementFromString(content));
            const tr = this.view.state.tr.replaceWith(0, this.view.state.doc.content.size, newDoc.content);
            this.view.dispatch(tr);
        }
    }
    get content() {
        return this._content;
    }
    set editable(is: boolean) {
        this._editable = is || false;
    }
    get editable() {
        return this._editable;
    }
    createDoc(schema: Schema) {
        // const schema = this.createSchema();
        // const doc = this.schema.nodeFromJSON({
        //     type: "doc",
        //     content: this.options.content
        // });
        const doc = DOMParser.fromSchema(schema).parse(elementFromString(this.content));
        return doc;
    }
    createSchema() {
        const schema = new Schema(schemaBase);
        return schema;
        // this.schema = new Schema({
        //     nodes: {
        //         // 文档根节点
        //         doc: {
        //             content: "block+"
        //         },
        //         // 段落节点 - 回车时默认分割为两个段落
        //         paragraph: {
        //             content: "inline*",
        //             group: "block",
        //             parseDOM: [{ tag: "p" }],
        //             toDOM: (node) => ["p", 0]
        //             // draggable: true
        //         },
        //         heading: {
        //             attrs: {
        //                 level: {
        //                     default: 1
        //                 }
        //             },
        //             content: "inline*",
        //             group: "block",
        //             // defining: true,
        //             parseDOM: [
        //                 { tag: "h1", attrs: { level: 1 } },
        //                 { tag: "h2", attrs: { level: 2 } },
        //                 { tag: "h3", attrs: { level: 3 } },
        //                 { tag: "h4", attrs: { level: 4 } }
        //             ],
        //             toDOM: (node) => [`h${node.attrs.level}`, 0]
        //         },
        //         // 代码块节点 - 回车时插入换行符
        //         codeBlock: {
        //             content: "inline*",
        //             marks: "",
        //             group: "block",
        //             code: true,
        //             defining: true,
        //             parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
        //             toDOM: () => ["pre", ["code", 0]]
        //         },
        //         tableView: {
        //             content: "inline*",
        //             marks: "",
        //             group: "block",
        //             parseDOM: [{ tag: 'div.custom-table' }],
        //             toDOM: () => {
        //                 return ['div', { class: 'custom-table' }, 0]; // 0 is a placeholder for content
        //             }
        //         },
        //         // slash: {
        //         //     content: "inline*",
        //         //     group: "block",
        //         //     parseDOM: [{ tag: "p" }],
        //         //     toDOM: (node) => {
        //         //         return ["p", { 
        //         //             class: `${ CLASSNAME }-editor-empty`, 
        //         //             // 'data-decoration-content-before': 'Write, type / for commands…',
        //         //             // 'data-decoration-content-after': 'Filter...'
        //         //             placeholder: 'Write, type / for commands…'
        //         //         }, 0];
        //         //     }
        //         // },
        //         // slash: {
        //         //     content: "inline*",
        //         //     group: "block",
        //         //     parseDOM: [{ tag: "zf-collapse" }],
        //         //     toDOM: (node) => {
        //         //         return ["zf-collapse", { 
        //         //             // class: 'docEditer-editor-empty', 
        //         //             // 'data-decoration-content-before': 'Write, type / for commands…',
        //         //             // 'data-decoration-content-after': 'Filter...'
        //         //             // placeholder: 'Write, type / for commands…'
        //         //         }, 0];
        //         //     }
        //         // },
        //         // slash: {
        //         //     content: "inline*",
        //         //     group: "block",
        //         //     parseDOM: [{ tag: "p" }],
        //         //     toDOM: (node) => {
        //         //         console.log('slash node', node);
        //         //         return ["p", 0];
        //         //     }
        //         // },
        //         // // 硬换行节点
        //         // hard_break: {
        //         //     inline: true,
        //         //     group: "inline",
        //         //     selectable: false,
        //         //     parseDOM: [{ tag: "br" }],
        //         //     toDOM: () => ["br"]
        //         // },
        //         // 文本节点
        //         text: {
        //             group: "inline"
        //         },
        //         // blockquote: {
        //         //     content: "block+",
        //         //     group: "block",
        //         //     toDOM: () => ["blockquote", { class: "custom-quote" }, 0]
        //         // },
        //         // customNode: {
        //         //     attrs: { id: { default: null }, type: { default: "info" } },
        //         //     toDOM: (node) => {
        //         //         const classes = ["custom-node", `type-${node.attrs.type}`];
        //         //         return ["div", { id: node.attrs.id, class: classes.join(" ") }, 0];
        //         //     }
        //         // }
        //     },
        //     marks: {
        //         // 强调标记
        //         em: {
        //             parseDOM: [{ tag: "i" }, { tag: "em" }],
        //             toDOM: () => ["em", 0]
        //         }
        //     },
        // });
    }
    // createExtensionManager() {

    // }
    markActive(state: EditorState, type: MarkType) {
        let { from, $from, to, empty } = this.view.state.selection;
        if (empty) {
            return !!type.isInSet(state.storedMarks || $from.marks());
        }
        return state.doc.rangeHasMark(from, to, type);
    }
    toggleMark(markType: string, value?: any) {
        const { state } = this.view;
        let mark: any = state.schema.marks[markType];
        if (mark) {
            toggleMark(mark, value)(state, this.view.dispatch, this.view);
        }
    }
    addMark(markType: string) {
        const { state, dispatch } = this.view;
        const { from, to } = state.selection;

        // 创建mark
        const mark = state.schema.marks[markType].create();

        // 应用mark到选中区域
        const tr = state.tr.addMark(from, to, mark);
        dispatch(tr);
    }
    removeMark(markType: string) {
        const { state, dispatch } = this.view;
        const { from, to } = state.selection;
        // 移除mark
        const tr = state.tr.removeMark(from, to, state.schema.marks[markType]);
        dispatch(tr);
    }
    destroy() {
        if (this.view) {
            this.view.destroy?.();
        }
        this.removeAllListeners();
    }
}