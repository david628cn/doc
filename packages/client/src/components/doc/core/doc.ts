
import { type Transaction, EditorState, NodeSelection } from 'prosemirror-state';
// import { addListNodes } from 'prosemirror-schema-list';
// import { schema } from 'prosemirror-schema-basic';
import {
    type Node,
    // type Slice,
    // type Mark,
    // type MarkType,
    Schema,
    DOMParser
} from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
// import type { Transform } from 'prosemirror-transform';
import {
    // splitBlock, 
    // newlineInCode, 
    baseKeymap,
    // toggleMark
    deleteSelection
} from 'prosemirror-commands';
// import { insertSoftBreak } from 'prosemirror-transform';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import {
    splitListItem,
    liftListItem,
    sinkListItem,
    wrapInList
} from "prosemirror-schema-list";
// import { gapCursor } from 'prosemirror-gapcursor';
import {
    // tableNodes,
    // tableEditing,
    // columnResizing,
    goToNextCell
} from 'prosemirror-tables';

//   import { inputRules, wrappingInputRule } from "prosemirror-inputrules";


// import { exampleSetup } from 'prosemirror-example-setup';

import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
    ySyncPlugin,
    yCursorPlugin,
    yUndoPlugin,
    // undo,
    // redo,
} from 'y-prosemirror';

import { EventEmitter } from './eventEmitter';
import { gapCursor } from 'prosemirror-gapcursor';
import {
    // basic,
    uniqueID,
    // keymaps, 
    link,
    dragHandle,
    suggestion,
    // placeholder,
    selection,
    shiki,
    table,
    columns,
    image
} from './plugins';
// import { CodeBlock } from './nodeViews';
import schema from './schema';
import { CLASSNAME } from '@/global';
// import { contextPath } from '@/api';
import './doc.less';



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

export type DocOptions = {
    element?: HTMLElement | null | undefined;
    content?: JSONContent | JSONContent[] | Node | string | null | undefined;
    isFocused?: boolean;
    autofocus?: boolean;
    editable?: boolean;
    onBeforeCreate?: Function;
    onCreate?: Function;
    onMount?: Function;
    onUnmount?: Function;
    onUpdate?: Function;
    // onSelectionUpdate?: Function;
    onTransaction?: Function;
    // onFocus?: Function;
    // onBlur?: Function;
    // onInput?: Function;
    onDestroy?: Function;
    onContentError?: Function;
    onPaste?: Function;
    onAction?: Function;
    // onDrop?: Function;
    // onDelete?: Function;
    // onSuggestion?: Function;
    // onSelection?: Function;
}

export class Doc extends EventEmitter {
    // element: any;
    public view!: EditorView;
    // public ydoc: any;
    // private provider: any;
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
    public options: DocOptions = {
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
        // onSelectionUpdate: () => null,
        onTransaction: () => null,
        // onFocus: () => null,
        // onBlur: () => null,
        // onInput: () => { },
        onDestroy: () => null,
        onContentError: (error: Error) => {
            throw error;
        },
        onPaste: () => null,
        onAction: () => null
        // onDrop: () => null,
        // onDelete: () => null
        // onSuggestion: () => null,
        // onSelection: () => null
    };
    constructor(options?: DocOptions) {
        super();
        if (options && options.element) {
            const element = typeof options.element === 'string' ? document.getElementById(options.element) : options.element;
            this.element = element || document.body;
        }
        this.setOptions(options);

        const schema: any = this.createSchema();


        // --- 2. InputRules 配置 (Markdown 触发) ---
        // const rules: any = inputRules({
        //     rules: [
        //     // 输入 "* " 或 "- " 触发无序列表
        //     wrappingInputRule(/^\s*([-*+])\s$/, mySchema.nodes.bullet_list),
        //     // 输入 "1. " 触发有序列表
        //     wrappingInputRule(/^(\d+)\.\s$/, mySchema.nodes.ordered_list, match => ({order: +match[1]}),
        //         (match, node) => node.childCount + node.attrs.order === +match[1])
        //     ]
        // });

        // --- 3. Keymap 配置 (快捷键与 Tab 缩进) ---
        // const listKeys = keymap({
        //     'Enter': splitListItem(schema.nodes.list_item),
        //     'Tab': sinkListItem(schema.nodes.list_item),
        //     'Shift-Tab': liftListItem(schema.nodes.list_item),
        //     'Mod-Shift-8': wrapInList(schema.nodes.bullet_list),
        //     'Mod-Shift-9': wrapInList(schema.nodes.ordered_list)
        // });


        let plugins = [
            shiki,
            history(),
            gapCursor(),
            selection({
                editor: this
            }),
            suggestion({
                editor: this
            }),
            link({
                editor: this
            }),
            image({
                editor: this
            }),
            // columnResizing(),
            // tableEditing(),
            // gapCursor(),
            ...table({
                editor: this
            }),
            columns({
                editor: this
            }),
            uniqueID({
                editor: this
            }),
            keymap({
                ...baseKeymap,
                'Mod-z': undo,
                'Mod-y': redo,
                'Mod-Shift-z': redo
            }),
            keymap({
                'Enter': splitListItem(schema.nodes.list_item),
                'Tab': sinkListItem(schema.nodes.list_item),
                'Shift-Tab': liftListItem(schema.nodes.list_item),
                'Mod-Shift-8': wrapInList(schema.nodes.bullet_list),
                'Mod-Shift-9': wrapInList(schema.nodes.ordered_list)
            }),
            keymap({
                'Tab': goToNextCell(1),
                'Shift-Tab': goToNextCell(-1)
            })
        ];

        if (true) {
            const ydoc = new Y.Doc();
            // const serverUrl = `ws://0.0.0.0:1234/docWs?userId=${new Date().getTime()}&roomId=200`;
            // const provider = new WebsocketProvider(serverUrl, '100', this.ydoc, {
            //     // resyncInterval: 2000
            // });
            const provider = new HocuspocusProvider({
                url: 'ws://127.0.0.1:1234',
                name: '200', // 关键：这是 Redis 空间隔离的唯一标识
                document: ydoc,
                token: 'valid-token'
            });
            const type = ydoc.getXmlFragment('prosemirror');
            // win.provider = provider;
            // console.log('ydoc.clientID', this.ydoc.clientID);
            plugins = plugins.concat([
                ySyncPlugin(type),
                yCursorPlugin(provider.awareness),
                yUndoPlugin()
            ]);
            // 监听远程数据更新
            ydoc.on('update', (update: any, origin: any) => {
                // console.log("收到更新数据，来源:", origin); // 如果 origin 为空，通常是远程更新
            });
            provider.on('sync', (isSynced: any) => {
                // console.log('同步状态:', isSynced);
                // if (isSynced && type.length === 0) {
                // 如果同步完成后发现文档完全为空（违反 Schema），则初始化一个段落
                // const initialContent = this.view.state.schema.nodes.paragraph.create();
                // 此时不建议手动操作 ydoc，而是通过 view 执行一个 transaction
                // 这样 ID 插件会自动为新节点分配 ID 并同步给对端
                // }
            });
        }
        // plugins = plugins.concat([
        //     // dragHandle({
        //     //     editor: this,
        //     //     container: this.element
        //     // }),
        //     // placeholder({
        //     //     editor: this
        //     // }),
        //     // selection({
        //     //     editor: this
        //     // }),
        //     // suggestion({
        //     //     editor: this
        //     // })
        //     // ...suggestion({
        //     //     reducer: (action: any) => {
        //     //         console.log('action', action);
        //     //         return true;
        //     //     },
        //     //     triggers: [
        //     //         // For demo purposes, make the `#` and `@` easier to create
        //     //         { name: 'hashtag', trigger: /(#)$/ },
        //     //         { name: 'mention', trigger: /(@)$/ },
        //     //         { name: 'emoji', trigger: ':' },
        //     //         { name: 'link', trigger: '[[', cancelOnFirstSpace: false },
        //     //         { name: 'jinja', trigger: '{{', cancelOnFirstSpace: false },
        //     //         { name: 'command', trigger: '/', decorationAttrs: { class: 'command' } },
        //     //         { name: 'variable', trigger: /((?:^[a-zA-Z0-9_]+)\s?=)$/, cancelOnFirstSpace: false },
        //     //         { name: 'code', trigger: /((?:[a-zA-Z0-9_]+)\.)$/ },
        //     //     ],
        //     // }),
        // ]);
        const doc = this.createDoc(schema);
        let state = EditorState.create({
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
            // nodeViews: {
            //     // tableView: (node: Node, view: EditorView, getPos: any): any => new TableView(node, view, getPos)
            //     code_block: (node: Node, view: EditorView, getPos: any): any => new CodeBlock(node, view, getPos)
            // } as any,
            // handleDOMEvents: {
            //     blur: (view: EditorView, event: Event) => {
            //         editor.isFocused = true;
            //         const transaction = editor.view.state.tr.setMeta('focus', { event }).setMeta('addToHistory', false);
            //         view.dispatch(transaction);
            //         return false;
            //     },
            //     focus: (view: EditorView) => {
            //         editor.isFocused = false;
            //         const transaction = editor.view.state.tr.setMeta('blur', { event }).setMeta('addToHistory', false);
            //         view.dispatch(transaction);
            //         return false;
            //     }
            // },
            // handleTextInput: (view: EditorView, from: number, to: number, text: string) => {
            //     console.log('handleTextInput>>>', text);
            //     this.emit('selection', {
            //         rect: null,
            //         text: null
            //     });
            //     if (text === "/") {
            //         const { $from } = view.state.selection;
            //         // 性能优化：检查前一个字符是否为空格或是否在行首
            //         const prevChar = $from.nodeBefore ? $from.nodeBefore.textContent.slice(-1) : "";

            //         if (!prevChar || prevChar === " ") {
            //             const coords = view.coordsAtPos(from);
            //             // this.openSlashMenu({
            //             //     pos: from,
            //             //     left: coords.left,
            //             //     top: coords.bottom
            //             // });
            //         }
            //     }


            //     // 2. 执行选中的命令
            //     //     当用户从菜单点击“标题 1”或“代码块”时，你需要删除 / 并执行对应的 ProseMirror Commands。
            //     //     javascript
            //     //     // 示例：将当前行转为 H1
            //     //     function selectItem(view, pos) {
            //     //     const { tr, schema } = view.state;

            //     //     // 1. 删除刚输入的 "/"
            //     //     tr.delete(pos, pos + 1);

            //     //     // 2. 执行转换逻辑 (这里以转为 Heading 为例)
            //     //     const command = setBlockType(schema.nodes.heading, { level: 1 });
            //     //     command(view.state, (t) => tr.setSelection(t.selection)); 

            //     //     view.dispatch(tr);
            //     //     }


            //     //     3. 处理后续搜索
            //     //     如果用户输入 /img，你可能需要过滤菜单列表。可以通过监听 onSelectionChange 或在 dispatchTransaction 中解析当前光标前的文本：
            //     //     javascript
            //     //     const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            //     //     const match = textBefore.match(/\/(\w+)$/);
            //     //     if (match) {
            //     //     const query = match[1]; // 得到 "img"，用于过滤菜单内容
            //     //     }

            //     return false;
            // },
            // 更新
            dispatchTransaction: (tr: Transaction) => {
                if (this.view) {
                    const prevState = this.view.state;
                    const { state, transactions } = prevState.applyTransaction(tr);
                    // const { from, to } = state.selection;
                    // const selectionHasChanged = !prevState.selection.eq(state.selection);
                    const lastFoucusTr = transactions['findLast']((tr: Transaction) => tr.getMeta('focus') || tr.getMeta('blur'))
                    const focus = lastFoucusTr?.getMeta?.('focus');
                    const blur = lastFoucusTr?.getMeta?.('blur');
                    if (focus) {
                        this.emit('focus', {
                            editor: this,
                            event: focus.event,
                            transaction: lastFoucusTr
                        });
                    }
                    if (blur) {
                        this.emit('blur', {
                            editor: this,
                            event: blur.event,
                            transaction: lastFoucusTr
                        });
                    }

                    // console.log('selectionHasChanged>>>', selectionHasChanged, from, to);

                    // if (!selectionHasChanged || from === to) {
                    //     this.selectioned = false;
                    //     // this.emit('onSelectionChange', {
                    //     //     change: false
                    //     // });
                    //     // this.emit('selection', {
                    //     //     rect: null,
                    //     //     text: null
                    //     // });
                    // } else {
                    //     this.selectioned = true;
                    //     // this.emit('onSelectionChange', {
                    //     //     change: true
                    //     // });
                    // }
                    this.view.updateState(state);
                    // if (selectionHasChanged) {
                    // this.selectioned = selectionHasChanged;
                    // this.emit('selectionUpdate', {
                    //     editor: this
                    // });
                    // }
                }

            }
        } as any);
        this.view.dom.classList.add(`${CLASSNAME}-editor`);
    }
    setOptions(options: DocOptions = {}) {
        this.options = {
            ...this.options,
            ...options
        };
        this.content = this.options.content;
        this.editable = this.options.editable || false;
        // if (typeof this.options.onSuggestion === 'function') {
        //     this.on('suggestion', this.options.onSuggestion);
        // }
        // if (typeof this.options.onSelectionUpdate === 'function') {
        //     this.on('selectionUpdate', this.options.onSelectionUpdate);
        // }
        // if (typeof this.options.onSelection === 'function') {
        //     this.on('selection', this.options.onSelection);
        // }
        // if (typeof this.options.onFocus === 'function') {
        //     this.on('focus', this.options.onFocus);
        // }
        // if (typeof this.options.onBlur === 'function') {
        //     this.on('blur', this.options.onBlur);
        // }
        if (typeof this.options.onAction === 'function') {
            this.on('action', this.options.onAction);
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
        return new Schema(schema);
    }
    // toggleMark(name: string, style?: any) {
    //     if (this.view.state.selection.empty) {
    //         return;
    //     }
    //     let markType: any = this.view.state.schema.marks[name]
    //     let mark = markType.create(style);
    //     console.log(markType, style);
    //     if (markType) {
    //         toggleMark(markType, style)(this.view.state, this.view.dispatch);
    //     }
    // }
    addMark(type: string, style?: any) {
        const { state, dispatch } = this.view;
        const { from, to } = state.selection;

        // 创建mark
        const markType = state.schema.marks[type].create(style);

        // 应用mark到选中区域
        const tr = state.tr.addMark(from, to, markType);
        dispatch(tr);
    }
    removeMark(type: string) {
        const { state, dispatch } = this.view;
        const { from, to } = state.selection;
        // 移除mark
        const tr = state.tr.removeMark(from, to, state.schema.marks[type]);
        dispatch(tr);
    }
    setMark(type: string, style?: any) {
        if (style) {
            if (style === true) {
                this.addMark(type);
            } else {
                this.addMark(type, style);
            }
        } else {
            this.removeMark(type);
        }
    }
    setTextAlign(textAlign: string) {
        const { state, dispatch } = this.view;
        const { selection, tr } = state;
        // 遍历选区内的 block 节点并更新其 align 属性
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                tr.setNodeMarkup(pos, null, { ...node.attrs, textAlign });
            }
        });
        if (dispatch) {
            dispatch(tr);
        }
    }
    getTextAlign() {
        const { state } = this.view;
        const { selection, tr } = state;
        let value = null;
        state.doc.nodesBetween(selection.from, selection.to, (node, pos): any => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {

                if (node.attrs.textAlign) {
                    value = node.attrs.textAlign;
                    return false;
                }
            }
        });
        return value;
    }
    getTextStyle(name: string) {
        const { state } = this.view;
        const { from, to, empty, $from } = state.selection;
        const type = state.schema.marks.textStyle;
        if (!type) {
            return null;
        }
        // 1. 光标状态：直接从 storedMarks 或位置 marks 获取
        if (empty) {
            const mark = type.isInSet(state.storedMarks || $from.marks());
            return mark ? mark.attrs[name] : null;
        }
        // 2. 选区状态：获取选区第一个包含该属性的 mark
        let value = null;
        state.doc.nodesBetween(from, to, (node: any): any => {
            const mark = node.marks.find((m: any) => m.type === type);
            if (mark && mark.attrs[name]) {
                value = mark.attrs[name];
                return false; // 找到后停止遍历
            }
        });
        return value;
    }
    hasMark(type: string) {
        const { state } = this.view;
        let { from, $from, to, empty } = this.view.state.selection;
        const markType = state.schema.marks[type];
        if (empty) {
            return !!markType.isInSet(state.storedMarks || $from.marks());
        }
        return state.doc.rangeHasMark(from, to, markType);
        // const { state } = this.view;
        // const { from, $from, to, empty } = state.selection;
        // // 创建mark
        // const markType = state.schema.marks[type];
        // console.log('hasMark>>>>>>>>', markType, state.doc.rangeHasMark(from, to, markType));
        // if (empty) {
        //     // 情况 A: 光标选区。
        //     // 检查 storedMarks (用户点击工具栏后尚未打字的 mark) 
        //     // 或当前光标所在位置已有的 marks。
        //     return !!markType.isInSet(state.storedMarks || $from.marks());
        // } else {
        //     // 情况 B: 范围选区。
        //     // 检查文档在该范围内是否包含指定的 mark。
        //     return state.doc.rangeHasMark(from, to, markType);
        // }
    }
    destroy() {
        if (this.view) {
            this.view.destroy?.();
        }
        this.removeAllListeners();
    }
}