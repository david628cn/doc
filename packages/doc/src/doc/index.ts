
import { type Transaction, NodeSelection, TextSelection, EditorState, Plugin } from 'prosemirror-state';
import {
    type Node,
    Schema,
    DOMParser
} from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import {
    baseKeymap,
    setBlockType
} from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import {
    inputRules,
    wrappingInputRule
} from "prosemirror-inputrules";

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
// import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from "prosemirror-dropcursor";
// import { BlockWrapper } from './blockWrapper';
import {
    // basic,
    uniqueID,
    // keymaps, 
    link,
    // dragHandle,
    trailingNode,
    suggestion,
    // placeholder,
    shiki,
    selection,
    table,
    columns,
    image,
    audio,
    video,
    file,
    bookmark,
    // customDragCursor,
    nativeDragBridge,
    ParagraphView,
    HeadingView,
    HorizontalRuleView,
    BlockquoteView,
    ListView,
    CodeBlockView
    // cursor
} from '../plugins';
import {
    // createTableNode,
    toggleBlockquote,
    toggleBlockType,
    toggleListType,
    onBackspace,
    onTab,
    onEnter,
    onShiftTab,
    onTable
} from '../command';
import {
    headingRule,
    blockquoteRule,
    tableMarkdownRule
} from '../rule';
// import { CodeBlock } from './nodeViews';
import schema from './schema';
import { CLASSNAME } from '../config';
// import { contextPath } from '@/api';
import './index.less';

const originalNodeSelectionCreate: any = NodeSelection.create;

// 改写 ProseMirror 核心类的静态方法
NodeSelection.create = (doc: any, pos: any, bias?: any) => {
    // 1. 先进行前置非空防御：如果 doc 为空，或者 pos 越界，直接拦截降级
    if (!doc || pos < 0 || pos > doc.content.size) {
        return TextSelection.atStart(doc || { content: { size: 0 } });
    }

    // 2. 检查该位置是否存在合法节点，如果已经是空或非原子节点，提前规避
    try {
        const node = doc.nodeAt(pos);
        if (!node) {
            return TextSelection.atStart(doc);
        }

        // 3. 执行原生逻辑
        return originalNodeSelectionCreate.call(this, doc, pos, bias);
    } catch (error) {
        console.warn("[Yjs Selection Safety Patch] 协同选区恢复避空成功，已转换为文本光标");
        // 确保返回一个绝对安全的、绑定了当前 doc 实例的合法文本选区
        return TextSelection.create(doc, TextSelection.atStart(doc).from);
    }
};

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
    showToolbar?: boolean;
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
    showToolbar: boolean = true;
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
        showToolbar: true,
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
            // dragHandle({
            //     editor: this,
            //     container: this.element
            // }),
            trailingNode(),
            shiki,
            history(),
            // cursor({
            //     editor: this
            // }),
            nativeDragBridge,
            dropCursor({ color: "#0066cc", width: 2 }),
            // gapCursor(),
            // customDragCursor(),
            selection({
                editor: this
            }),
            suggestion({
                editor: this
            }),
            link({
                editor: this
            }),
            file({
                editor: this
            }),
            bookmark({
                editor: this
            }),
            audio({
                editor: this
            }),
            video({
                editor: this
            }),
            image({
                editor: this
            }),
            // columnResizing(),
            // tableEditing(),
            // gapCursor(),
            keymap({
                ...baseKeymap,
                'Mod-z': undo,
                'Mod-y': redo,
                'Mod-Shift-z': redo,
                'Enter': onEnter,
                'Backspace': onBackspace,
                'Tab': onTab,
                'Shift-Tab': onShiftTab,
                // 'Mod-Shift-8': wrapInList(schema.nodes.bullet_list),
                // 'Ctrl-Shift-8': wrapInList(schema.nodes.bullet_list),
                // 'Mod-Shift-9': wrapInList(schema.nodes.ordered_list),
                // 'Ctrl-Shift-9': wrapInList(schema.nodes.ordered_list),

                // 👇 在这里新增切换为正文（段落）的快捷键
                'Ctrl-Alt-0': setBlockType(schema.nodes.paragraph),  // 针对 Windows/Linux
                'Cmd-Alt-0': setBlockType(schema.nodes.paragraph),    // 针对 macOS
                // 1. 正文 (Ctrl+Alt+0 或 Cmd+Alt+0)
                // 'Ctrl-Alt-0': turnIntoParagraph,
                // 'Cmd-Alt-0': turnIntoParagraph,

                // 2. 1~4级标题 (Ctrl+Alt+1 ~ 4 或 Cmd+Alt+1 ~ 4)
                // 提示：ProseMirror 的 heading 节点通常需要指定 level 属性
                'Ctrl-Alt-1': toggleBlockType(schema.nodes.heading, { level: 1 }),
                'Cmd-Alt-1': toggleBlockType(schema.nodes.heading, { level: 1 }),

                'Ctrl-Alt-2': toggleBlockType(schema.nodes.heading, { level: 2 }),
                'Cmd-Alt-2': toggleBlockType(schema.nodes.heading, { level: 2 }),

                'Ctrl-Alt-3': toggleBlockType(schema.nodes.heading, { level: 3 }),
                'Cmd-Alt-3': toggleBlockType(schema.nodes.heading, { level: 3 }),

                'Ctrl-Alt-4': toggleBlockType(schema.nodes.heading, { level: 4 }),
                'Cmd-Alt-4': toggleBlockType(schema.nodes.heading, { level: 4 }),

                // 3. 引用块 Blockquote (主流习惯为 Ctrl+Shift+B 或 Ctrl+Alt+5)
                // 使用 wrapIn 将选中块包裹进 blockquote 节点
                'Ctrl-Shift-b': toggleBlockquote(schema.nodes.blockquote),
                'Cmd-Shift-b': toggleBlockquote(schema.nodes.blockquote),
                'Ctrl-Alt-5': toggleBlockquote(schema.nodes.blockquote),
                'Cmd-Alt-5': toggleBlockquote(schema.nodes.blockquote),

                // ======= 列表快捷键 =======
                'Ctrl-Shift-8': toggleListType(schema.nodes.bullet_list, schema.nodes.list_item),
                'Cmd-Shift-8': toggleListType(schema.nodes.bullet_list, schema.nodes.list_item),
                'Ctrl-Shift-9': toggleListType(schema.nodes.ordered_list, schema.nodes.list_item),
                'Cmd-Shift-9': toggleListType(schema.nodes.ordered_list, schema.nodes.list_item),

                // 👇 新增：一键插入 3x3 表格的快捷键
                'Ctrl-Alt-t': onTable,
                'Cmd-Alt-t': onTable,
                // 👇 当用户在刚生成的标题/引用块里按退格键时，自动撤销 Markdown 效果，变回普通正文
                // "Backspace": (state, dispatch) => {
                //     const { selection, tr } = state;
                //     const { empty, $from, $to } = selection;

                //     // 1. 🚨 完美支持 Ctrl+A 全选删除或选中文本删除
                //     // 如果选区不为空（选中了任何文本、多个节点、或全选），直接交由系统原生逻辑删除选区，绝不拦截
                //     if (!empty) {
                //         return false;
                //     }

                //     // 2. 🚨 边界防御：如果已经在整个文档的绝对开头，按退格无处可删，直接返回
                //     if ($from.pos <= 1) {
                //         return false;
                //     }

                //     // 3. 🎯 【关键修复】针对表格和分隔线的“选区区间直接擦除法”
                //     // 无论当前是普通光标、还是 GapCursor（在表格下方闪烁的特殊光标）
                //     // 只要光标前一个位置（$from.pos - 1）处于非文本块（表格、HR）的范围内，就执行擦除
                //     const posBefore = $from.pos - 1;
                //     const nodeBefore = state.doc.nodeAt(posBefore) || $from.nodeBefore;

                //     // 如果成功探测到前方的节点
                //     if (nodeBefore) {
                //         const typeName = nodeBefore.type.name;
                //         const isTable = typeName.includes('table');
                //         const isHr = typeName === 'horizontal_rule' || typeName === 'hr';

                //         if (isTable || isHr) {
                //             if (dispatch) {
                //                 // 计算该节点在全局文档树中的绝对精确起始位置
                //                 // 这样可以避开所有 NodeView（外壳 DOM）的干扰，直接抹除整个节点数据
                //                 const startPos = $from.pos - nodeBefore.nodeSize;

                //                 // 执行安全删除
                //                 const nextTr = tr.delete(startPos, $from.pos).scrollIntoView();
                //                 dispatch(nextTr);
                //             }
                //             return true; // 成功拦截并销毁表格/分隔线
                //         }
                //     }

                //     // 4. 🚀 【穿透修复】应对光标卡在深度嵌套（如列表或某些特殊布局）行首的场景
                //     if ($from.parentOffset === 0) {
                //         // 场景 A：如果当前在列表项行首，按退格键减少缩进或变回正文
                //         if ($from.parent.type === schema.nodes.list_item) {
                //             if (liftListItem(schema.nodes.list_item)(state, dispatch)) return true;
                //         }

                //         // 场景 B：如果当前在标题行首，按退格键直接变回普通正文
                //         if ($from.parent.type === schema.nodes.heading) {
                //             if (dispatch && $from.depth > 0) {
                //                 const nextTr = tr.setBlockType($from.before($from.depth), $from.after($from.depth), schema.nodes.paragraph);
                //                 dispatch(nextTr.scrollIntoView());
                //                 return true;
                //             }
                //         }

                //         // 场景 C：如果当前在引用块（Blockquote）行首，按退格键解除包裹
                //         if ($from.depth > 1 && $from.node($from.depth - 1).type === schema.nodes.blockquote) {
                //             let range = $from.blockRange();
                //             if (range) {
                //                 let target = liftTarget(range);
                //                 if (target !== null && target !== undefined) {
                //                     if (dispatch) dispatch(tr.lift(range, target).scrollIntoView());
                //                     return true;
                //                 }
                //             }
                //         }
                //     }

                //     // 5. 🛡️ 【终极保底】如果没有触发上述任何特殊节点的删除逻辑，直接交回给系统的底层进行行合并
                //     // 优先采用传入的参数 view，如果没有则尝试使用 this.view
                //     // const currentView = view || this.view;
                //     // if (currentView) {
                //     //     return joinBackward(state, dispatch, currentView);
                //     // }

                //     return false;
                // }
            }),
            ...table({
                editor: this
            }),
            columns({
                editor: this
            }),
            uniqueID({
                editor: this
            }),
            // keymap({
            //     ...baseKeymap,
            //     'Mod-z': undo,
            //     'Mod-y': redo,
            //     'Mod-Shift-z': redo
            // }),
            // keymap({
            //     'Enter': splitListItem(schema.nodes.list_item),
            //     'Tab': sinkListItem(schema.nodes.list_item),
            //     'Shift-Tab': liftListItem(schema.nodes.list_item),
            //     'Mod-Shift-8': wrapInList(schema.nodes.bullet_list),
            //     'Mod-Shift-9': wrapInList(schema.nodes.ordered_list)
            // }),
            // keymap({
            //     'Tab': goToNextCell(1),
            //     'Shift-Tab': goToNextCell(-1)
            // })
            // 👇 在这里新增 Markdown 自动转换输入规则插件
            inputRules({
                rules: [
                    // 输入 "# " 到 "#### " 自动转为 1~4 级标题
                    headingRule(schema.nodes.heading, 4),
                    // 输入 "> " 自动转为引用块 Blockquote
                    blockquoteRule(schema.nodes.blockquote),
                    // 如果你也想支持无序列表 "- " 或 "* " 自动转换，可解开下方注释：
                    wrappingInputRule(/^\s*([-*+])\s$/, schema.nodes.bullet_list),
                    // 如果想支持有序列表 "1. " 自动转换：
                    wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, match => ({ order: +match[1] })),
                    tableMarkdownRule
                ]
            })
        ];

        let provider: any = null;
        let ydoc: Y.Doc | null = null;

        if (true) {
            ydoc = new Y.Doc();
            // const serverUrl = `ws://0.0.0.0:1234/docWs?userId=${new Date().getTime()}&roomId=200`;
            // const provider = new WebsocketProvider(serverUrl, '100', this.ydoc, {
            //     // resyncInterval: 2000
            // });
            provider = new HocuspocusProvider({
                url: 'ws://127.0.0.1:1234',
                name: '0f410ebf-ef50-41e2-b2a9-bd4d941b8826', // 关键：这是 Redis 空间隔离的唯一标识
                document: ydoc,
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA0NzY1OTAsImlhdCI6MTc3OTg3MTc5MCwiaWQiOiIwMTlkZmEwOS1mYjgyLTc0ZWQtYTZiMi04NzBjNTQxMDVkOGIiLCJuYW1lIjoiZHciLCJwd2RfdmVyc2lvbiI6IjEifQ.wZLG2MvsirKiaz2cazNTKYnQhet5E2D65gsYO_GIvm4'
            });
            const type = ydoc.getXmlFragment('prosemirror');
            // win.provider = provider;
            // console.log('ydoc.clientID', this.ydoc.clientID);
            plugins = plugins.concat([
                ySyncPlugin(type),
                yCursorPlugin(provider.awareness
                    // {
                    //     /**
                    //      * 🌟 核心绝杀：自定义协同光标构建器
                    //      * @param user 远程协作者的用户状态数据（包含 id, name, color 等）
                    //      */
                    //     cursorBuilder: (user: any) => {
                    //         // // 1. 创建最外层的光标定位器
                    //         // const cursor = document.createElement("span");
                    //         // cursor.classList.add("prosemirror-yjs-cursor");

                    //         // // 🚨【第一道铁闸】：强制让光标外壳不可编辑！
                    //         // // 告诉浏览器这是一块死铁，打字焦点绝不能坠入其中，必须留在代码块/文本的底层轨道上。
                    //         // cursor.setAttribute("contenteditable", "false");

                    //         // // 2. 创建竖线光标（闪烁的那个物理光标）
                    //         // const caret = document.createElement("span");
                    //         // caret.classList.add("yjs-cursor-caret");
                    //         // // 动态设置远程用户的专属辨识颜色
                    //         // caret.style.borderColor = user.color || "#ffc107";
                    //         // caret.style.backgroundColor = user.color || "#ffc107";
                    //         // cursor.appendChild(caret);

                    //         // // 3. 创建带有用户名字/ID 的悬浮标签（即你截图中黄色的 User: 3959832341）
                    //         // const label = document.createElement("div");
                    //         // label.classList.add("yjs-cursor-label");
                    //         // label.style.backgroundColor = user.color || "#ffc107";
                    //         // label.textContent = user.name || `User: ${user.id || '匿名'}`;

                    //         // // 🚨【第二道铁闸】：强制让文字标签也完全不可编辑，双重断绝输入法抢焦
                    //         // label.setAttribute("contenteditable", "false");
                    //         // cursor.appendChild(label);
                    //         const cursor = document.createElement("span");
                    //         cursor.className = 'ProseMirror-yjs-cursor';
                    //         cursor.setAttribute("contenteditable", "false");
                    //         const inner = document.createElement("div");
                    //         inner.setAttribute("contenteditable", "false");
                    //         inner.innerHTML = user.name;
                    //         cursor.appendChild(inner);
                    //         return cursor;
                    //     },

                    //     // 🌟 选区高亮配置（可选）：当远程用户全选或拉蓝色选区时的颜色，同样不能影响打字
                    //     selectionBuilder: (user: any) => {
                    //         return {
                    //             style: `background-color: ${user.color || "#ffc107"}33`, // 33 代表 20% 的透明度遮罩
                    //             class: "prosemirror-yjs-selection"
                    //         };
                    //     }
                    // }
                ),
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
            nodeViews: {
                // paragraph: (node: Node, view: EditorView, getPos: any) => new ParagraphView(node, view, getPos),
                // heading: (node: Node, view: EditorView, getPos: any) => new HeadingView(node, view, getPos),
                // horizontal_rule: (node: Node, view: EditorView, getPos: any) => new HorizontalRuleView(node, view, getPos),
                // blockquote: (node: Node, view: EditorView, getPos: any) => new BlockquoteView(node, view, getPos),
                // ordered_list: (node: Node, view: EditorView, getPos: any) => new ListView(node, view, getPos),
                // bullet_list: (node: Node, view: EditorView, getPos: any) => new ListView(node, view, getPos),
                // list_item(node: Node, view: EditorView, getPos: any) { return new ListItemView(node, view, getPos); }
                code_block: (node: Node, view: EditorView, getPos: any) => new CodeBlockView(node, view, getPos),

            },
            // nodeViews: {
            // paragraph: (node: Node, view: EditorView, getPos: any) => new BlockWrapper(node, view, getPos, 'paragraph', 'p'),
            // horizontal_rule: (node: Node, view: EditorView, getPos: any) => new BlockWrapper(node, view, getPos, 'horizontal_rule', 'hr'),
            // heading: (node: Node, view: EditorView, getPos: any) => new BlockWrapper(node, view, getPos, 'heading', 'div'),
            // table: blockWrapper('table', 'table') // 🌟 大表格整体完美套上手柄，内部单元格绝不产生任何位置冲突！
            // },
            // nodeViews: {
            //     // tableView: (node: Node, view: EditorView, getPos: any): any => new TableView(node, view, getPos)
            //     code_block: (node: Node, view: EditorView, getPos: any): any => new CodeBlock(node, view, getPos)
            // } as any,
            // handleevents: {
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
                    const { state, transactions }: any = prevState.applyTransaction(tr);
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
        this.showToolbar = this.options.showToolbar || this.showToolbar;
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
        // this.view.on('editableChanged', this.handleEditableToggle);
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
        if (!this.view || this.view.isDestroyed) {
            // console.warn("Editor view is already destroyed. Skiped setProps.");
            return;
        }
        try {
            // 1. 更新只读状态
            // this.view.setProps({
            //     editable: () => is
            // });
            // 2. 【核心】直接向编辑器的根 DOM 派发原生事件
            // 这绝对不会走 dispatchTransaction，完美绕过 doc 比对拦截，对协同 100% 隐形
            // this.emit("editableChanged", is);
            if (is) {
                this.view.dom.classList.remove(`${CLASSNAME}-editor-readonly`);
            } else {
                this.view.dom.classList.add(`${CLASSNAME}-editor-readonly`);
            }
            this.view.dom.dispatchEvent(new CustomEvent('editableChanged', {
                detail: is
            }));
            // if (is) {
            //     this.view.focus();
            // }
        } catch (error) {
            console.error("Failed to setEditable:", error);
        }
    }
    get editable() {
        return this._editable;
    }
    // handleEditableToggle = (isEditable: boolean) => {
    //     if (this.select) {
    //         console.log('CodeBlockView 监听到 Doc 状态改变:', isEditable);
    //         this.select.setDisabled(!isEditable);
    //     }
    // };
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
    getMarkAttribute(markName: string, attrName?: string) {
        const { state } = this.view;
        const { from, to, empty, $from } = state.selection;

        // 动态获取对应的 Mark Type (例如 'textStyle' 或 'link')
        const type = state.schema.marks[markName];
        if (!type) {
            return null;
        }

        // 核心转换拦截：如果是空对象 {} 则转换为 true 返回，其余原样返回
        const checkEmptyObject = (val: any) => {
            if (val && typeof val === 'object' && Object.keys(val).length === 0) {
                return true;
            }
            return val;
        };

        // 1. 光标状态：直接从 storedMarks 或当前位置的 marks 获取
        if (empty) {
            const mark = type.isInSet(state.storedMarks || $from.marks());
            if (!mark) return null;

            // 获取原始要返回的值（指定属性或整个 attrs）
            const rawValue = attrName ? mark.attrs[attrName] : mark.attrs;
            return checkEmptyObject(rawValue);
        }

        // 2. 选区状态：获取选区内第一个有效的 mark
        let value: any = null;
        state.doc.nodesBetween(from, to, (node: any): any => {
            // 性能优化：如果已经找到了，或者节点不包含 marks，直接跳过子节点遍历
            if (value !== null || !node.marks || node.marks.length === 0) return true;

            const mark = node.marks.find((m: any) => m.type === type);

            if (mark && mark.attrs) {
                if (attrName) {
                    // 情况 A：指定了具体的属性名
                    if (mark.attrs[attrName] !== undefined && mark.attrs[attrName] !== null) {
                        value = checkEmptyObject(mark.attrs[attrName]);
                        return false; // 🎯 找到后立即停止后续遍历
                    }
                } else {
                    // 情况 B：没有传 attrName，返回整个 attrs 对象（经过 {} 检查）
                    value = checkEmptyObject(mark.attrs);
                    return false; // 🎯 找到后立即停止后续遍历
                }
            }
            return true;
        });

        return value;
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
        const { selection } = state;
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
    getCaption() {
         const { state } = this.view;
        const { selection } = state;
        let value = false;
        state.doc.nodesBetween(selection.from, selection.to, (node, pos): any => {
            // if (node.type.name === 'paragraph') {
                if (node.attrs.caption) {
                    value = node.attrs.caption;
                    return false;
                }
            // }
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