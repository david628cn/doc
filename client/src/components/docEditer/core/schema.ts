const schema: any = {
    nodes: {
        /// NodeSpec The top level document node.
        doc: {
            content: "block+"
        },
        /// A plain paragraph textblock. Represented in the DOM
        /// as a `<p>` element.
        paragraph: {
            content: "inline*",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                },
                textAlign: {
                    default: null,
                    validate: "string|null"
                } // 定义默认对齐方式
            },
            parseDOM: [{
                tag: "p",
                getAttrs: (dom: any) => {
                    return {
                        dataBlockId: dom.getAttribute('data-block-id'),
                        // 从 style 属性中解析对齐值
                        textAlign: dom.style.textAlign
                    };
                }
            }],
            toDOM(node: any) {
                // 将属性渲染为 CSS 样式
                return (!node.attrs.textAlign || node.attrs.textAlign === 'left') ?
                    ["p", {
                        ['data-block-id']: node.attrs.dataBlockId
                    }, 0] :
                    ["p", {
                        ['data-block-id']: node.attrs.dataBlockId,
                        style: `text-align: ${node.attrs.textAlign}`
                    }, 0];
            }
        },
        /// A blockquote (`<blockquote>`) wrapping one or more blocks.
        blockquote: {
            content: "block+",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            defining: true,
            parseDOM: [
                {
                    tag: "blockquote",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id')
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["blockquote", {
                    ['data-block-id']: node.attrs.dataBlockId
                }, 0];
            }
        },
        /// A horizontal rule (`<hr>`).
        horizontal_rule: {
            group: "block",
            parseDOM: [{ tag: "hr" }],
            toDOM() {
                return ["hr"];
            }
        },
        /// A heading textblock, with a `level` attribute that
        /// should hold the number 1 to 6. Parsed and serialized as `<h1>` to
        /// `<h6>` elements.
        heading: {
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                },
                level: {
                    default: 1,
                    validate: "number"
                },
                textAlign: {
                    default: null,
                    validate: "string|null"
                }
            },
            content: "inline*",
            group: "block",
            defining: true,
            parseDOM: [
                {
                    tag: "h1",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 1,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h2",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 2,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h3",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 3,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h4",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 4,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h5",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 5,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h6",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute('data-block-id'),
                        level: 6,
                        textAlign: dom.style.textAlign
                    }),
                }
            ],
            toDOM(node: any) {
                return (!node.attrs.textAlign || node.attrs.textAlign === 'left') ?
                    ["h" + node.attrs.level, { ['data-block-id']: node.attrs.dataBlockId }, 0] :
                    ["h" + node.attrs.level, {
                        ['data-block-id']: node.attrs.dataBlockId,
                        style: `text-align: ${node.attrs.textAlign}`
                    }, 0];

            }
        },
        /// A code listing. Disallows marks or non-text inline
        /// nodes by default. Represented as a `<pre>` element with a
        /// `<code>` element inside of it.
        code_block: {
            content: "text*",
            marks: "",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            code: true,
            defining: true,
            parseDOM: [
                {
                    tag: "pre",
                    preserveWhitespace: "full",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id')
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["pre", { ['data-block-id']: node.attrs.dataBlockId }, ["code", 0]];
            }
        },
        /// The text node.
        text: {
            group: "inline"
        },
        /// An inline image (`<img>`) node. Supports `src`,
        /// `alt`, and `href` attributes. The latter two default to the empty
        /// string.
        image: {
            inline: true,
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                },
                src: { validate: "string" },
                alt: { default: null, validate: "string|null" },
                title: { default: null, validate: "string|null" }
            },
            group: "inline",
            draggable: true,
            parseDOM: [{
                tag: "img[src]", getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute('data-block-id'),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt")
                    }
                }
            }],
            toDOM(node: any) {
                const { src, alt, title } = node.attrs;
                return ["img", { ['data-block-id']: node.attrs.dataBlockId, src, alt, title }];
            }
        },
        /// A hard line break, represented in the DOM as `<br>`.
        hard_break: {
            inline: true,
            group: "inline",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            selectable: false,
            parseDOM: [{
                tag: "br",
                getAttrs: (dom: any) => {
                    return {
                        dataBlockId: dom.getAttribute('data-block-id')
                    };
                }
            }],
            toDOM(node: any) {
                return ["br", { ['data-block-id']: node.attrs.dataBlockId }];
            }
        },
        ordered_list: {
            content: "list_item+",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                },
                order: {
                    default: 1,
                    validate: "number"
                }
            },
            parseDOM: [{
                tag: "ol",
                getAttrs(dom: HTMLElement) {
                    return {
                        dataBlockId: dom.getAttribute('data-block-id'),
                        order: dom.hasAttribute("start") ? +dom.getAttribute("start")! : 1
                    };
                }
            }],
            toDOM(node: any) {
                return node.attrs.order == 1 ? ["ul", { ['data-block-id']: node.attrs.dataBlockId }, 0] : ["ol", { ['data-block-id']: node.attrs.dataBlockId, start: node.attrs.order }, 0];
            }
        },
        bullet_list: {
            content: "list_item+",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            parseDOM: [
                {
                    tag: "ul",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id')
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["ul", { ['data-block-id']: node.attrs.dataBlockId }, 0];
            }
        },
        list_item: {
            content: "paragraph block*",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            parseDOM: [
                {
                    tag: "li",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id')
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["li", { ['data-block-id']: node.attrs.dataBlockId }, 0]
            },
            defining: true
        },
        // 多栏容器
        columns: {
            content: "column+", // 内部只能包含 column 节点
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                }
            },
            parseDOM: [
                {
                    tag: "div.columns-layout",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id')
                        };
                    }
                }
            ],
            toDOM: (node: any) => ["div", {
                ['data-block-id']: node.attrs.dataBlockId,
                class: "columns-layout",
                style: "display: flex;gap: 1rem;"
            }, 0]
        },
        // 单个列
        column: {
            content: "block+", // 列内部可以包含段落、列表等
            isolating: true,   // 重要：防止 Backspace 删掉列结构导致不同步
            attrs: {
                dataBlockId: {
                    default: null,
                    validate: "string|null"
                },
                width: { default: "50%" }
            },
            parseDOM: [
                {
                    tag: "div.column",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute('data-block-id'),
                            width: dom.style.width || "50%"
                        };
                    }
                }
            ],
            toDOM: (node: any) => ["div", {
                ['data-block-id']: node.attrs.dataBlockId,
                class: "column",
                style: `flex: 1; width: ${node.attrs.width};border: 1px inset #eee;padding: 5px;`
            }, 0]

            // function insertColumns(state, dispatch) {
            //     const { schema } = state;
            //     // 创建一个包含两列，每列各有一个空段落的结构
            //     const para = schema.nodes.paragraph.create();
            //     const col = schema.nodes.column.create(null, [para]);
            //     const columns = schema.nodes.columns.create(null, [col, col]);

            //     const columnNode = schema.nodes.column.create(null, schema.nodes.paragraph.create());
            //     const columnsNode = schema.nodes.columns.create(null, [columnNode, columnNode]);

            //     if (dispatch) {
            //       dispatch(state.tr.replaceSelectionWith(columnsNode).scrollIntoView());
            //     }
            //     return true;
            //   }

            // .columns-layout { display: flex; gap: 10px; }
            // .column { flex: 1; border: 1px dashed #ccc; min-height: 50px; }

            /* 确保列在空内容时也可点击，防止同步状态在 UI 层卡死 */
            // .column {
            //     min-height: 50px;
            //     outline: none;
            // }

            // .column:empty::before {
            //     content: ' ';
            //     display: inline-block;
            // }

            // .columns-layout {
            //     margin: 1em 0;
            // }
        },
        mention: {
            inline: true,
            group: "inline",
            atom: true, // 关键：设置为原子节点，光标无法进入其内部
            attrs: {
                id: {},
                label: {}
            },
            // 渲染成 DOM
            toDOM: (node: any) => ["span", {
                "class": "mention",
                "data-id": node.attrs.id
            }, `@${node.attrs.label}`],
            // 解析 DOM
            parseDOM: [{
                tag: "span[data-id]",
                getAttrs: (dom: any) => ({
                    id: dom.getAttribute("data-id"),
                    label: dom.innerText.replace(/^@/, "")
                })
            }]
        }
    },
    marks: {
        /// A link. Has `href` and `title` attributes. `title`
        /// defaults to the empty string. Rendered and parsed as an `<a>`
        /// element.
        link: {
            attrs: {
                href: {
                    validate: "string"
                },
                title: {
                    default: null,
                    validate: "string|null"
                },
                target: {
                    default: null,
                    validate: "string|null"
                }
            },
            inclusive: false,
            parseDOM: [{
                tag: "a[href]",
                getAttrs(dom: any) {
                    return {
                        href: dom.getAttribute("href"),
                        title: dom.getAttribute("title"),
                        target: dom.getAttribute("target") || '_blank'
                    };
                }
            }],
            toDOM(node: any) {
                const { href, title, target } = node.attrs;
                return ["a", { href, title, target }, 0];
            }
        },
        /// An emphasis mark. Rendered as an `<em>` element. Has parse rules
        /// that also match `<i>` and `font-style: italic`.
        em: {
            parseDOM: [
                { tag: "i" }, { tag: "em" },
                { style: "font-style=italic" },
                {
                    style: "font-style=normal",
                    clearMark: (m: any) => m.type.name == "em"
                }
            ],
            toDOM() {
                return ["em", 0];
            }
        },
        /// A strong mark. Rendered as `<strong>`, parse rules also match
        /// `<b>` and `font-weight: bold`.
        strong: {
            parseDOM: [
                { tag: "strong" },
                // This works around a Google Docs misbehavior where
                // pasted content will be inexplicably wrapped in `<b>`
                // tags with a font-weight normal.
                {
                    tag: "b",
                    getAttrs: (node: any) => node.style.fontWeight != "normal" && null
                },
                {
                    style: "font-weight=400",
                    clearMark: (m: any) => m.type.name == "strong"
                },
                {
                    style: "font-weight",
                    getAttrs: (value: any) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
                },
            ],
            toDOM() {
                return ["strong", 0];
            }
        },
        // 删除线
        s: {
            parseDOM: [
                { tag: "s" },
                { style: "text-decoration=line-through" }
            ],
            toDOM() {
                return ["s", 0];
            }
        },
        // 下划线
        u: {
            parseDOM: [
                { tag: "u" },
                { style: "text-decoration=underline" }
            ],
            toDOM() {
                return ["u", 0];
            }
        },
        sup: {
            parseDOM: [
                { tag: "sup" }
            ],
            toDOM() {
                return ["sup", 0];
            }
        },
        sub: {
            parseDOM: [
                { tag: "sub" }
            ],
            toDOM() {
                return ["sub", 0];
            }
        },
        textStyle: {
            attrs: {
                color: { default: null, validate: "string|null" },
                backgroundColor: { default: null, validate: "string|null" }
            },
            parseDOM: [
                { style: 'color', getAttrs: (value: string) => ({ color: value }) },
                { style: 'background-color', getAttrs: (value: string) => ({ backgroundColor: value }) }
            ],
            toDOM: (node: any) => ['span', { style: `color: ${node.attrs.color};background-color: ${node.attrs.backgroundColor}` }, 0]
        },
        /// Code font mark. Represented as a `<code>` element.
        code: {
            code: true,
            parseDOM: [
                { tag: "code" }
            ],
            toDOM() {
                return ["code", 0];
            }
        }
    }
}

export default schema;