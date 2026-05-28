export const CLASSNAME = 'carve-doc';

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
                    default: null
                },
                textAlign: {
                    default: null
                } // 定义默认对齐方式
            },
            parseDOM: [{
                tag: "p",
                getAttrs: (dom: any) => {
                    // 外部粘贴的内容如果带有背景色，即便你没在 attrs 定义，
                    // 某些情况下 ProseMirror 会将其视为残留样式。
                    // 我们可以直接操作 dom 移除背景色，或者只返回你关心的字段。
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        // 仅保留对齐方式，忽略其他任何 style（如 background-color）
                        textAlign: dom.style.textAlign || null
                    };
                }
            }],
            toDOM(node: any) {
                // 将属性渲染为 CSS 样式
                return (!node.attrs.textAlign || node.attrs.textAlign === 'left') ?
                    ["p", {
                        ["data-block-id"]: node.attrs.dataBlockId
                    }, 0] :
                    ["p", {
                        ["data-block-id"]: node.attrs.dataBlockId,
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
                    default: null
                }
            },
            defining: true,
            parseDOM: [
                {
                    tag: "blockquote",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute("data-block-id")
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["blockquote", {
                    ["data-block-id"]: node.attrs.dataBlockId
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
                    default: null
                },
                level: {
                    default: 1,
                    validate: "number"
                },
                textAlign: {
                    default: null
                }
            },
            content: "inline*",
            group: "block",
            defining: true,
            parseDOM: [
                {
                    tag: "h1",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 1,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h2",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 2,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h3",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 3,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h4",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 4,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h5",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 5,
                        textAlign: dom.style.textAlign
                    }),
                }, {
                    tag: "h6",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        level: 6,
                        textAlign: dom.style.textAlign
                    }),
                }
            ],
            toDOM(node: any) {
                return (!node.attrs.textAlign || node.attrs.textAlign === 'left') ?
                    ["h" + node.attrs.level, { ["data-block-id"]: node.attrs.dataBlockId }, 0] :
                    ["h" + node.attrs.level, {
                        ["data-block-id"]: node.attrs.dataBlockId,
                        style: `text-align: ${node.attrs.textAlign}`
                    }, 0];

            }
        },
        /// A code listing. Disallows marks or non-text inline
        /// nodes by default. Represented as a `<pre>` element with a
        /// `<code>` element inside of it.
        code_block: {
            attrs: { language: { default: 'javascript' } }, // 默认语言
            content: "text*",
            marks: "",
            group: "block",
            code: true,
            defining: true,
            parseDOM: [{
                tag: "pre",
                preserveWhitespace: "full",
                // 从 HTML 的 class 中提取语言，例如 class="language-typescript"
                getAttrs: (node: any) => ({
                    language: node.getAttribute("data-language") || 'javascript'
                })
            }],
            toDOM: (node: any) => ["pre", { "data-language": node.attrs.language }, ["code", 0]]
            // 2. 动态切换语言 (逻辑层)
            // 你需要一个方法来修改当前代码块的属性。可以通过一个简单的命令实现：
            // javascript
            // function setLanguage(view, lang) {
            //     const { selection, tr } = view.state;
            //     // 找到当前选区所在的 code_block 节点位置
            //     const pos = selection.$from.before(); 
            //     // 修改属性
            //     view.dispatch(tr.setNodeMarkup(pos, null, { language: lang }));
            // }
        },

        // code_block: {
        //     content: "text*",
        //     marks: "",
        //     group: "block",
        //     attrs: {
        //         dataBlockId: {
        //             default: null
        //         }
        //     },
        //     code: true,
        //     defining: true,
        //     parseDOM: [
        //         {
        //             tag: "pre",
        //             preserveWhitespace: "full",
        //             getAttrs: (dom: any) => {
        //                 return {
        //                     dataBlockId: dom.getAttribute("data-block-id")
        //                 };
        //             }
        //         }
        //     ],
        //     toDOM(node: any) {
        //         return ["pre", { ["data-block-id"]: node.attrs.dataBlockId }, ["code", 0]];
        //     }
        // },
        /// The text node.
        text: {
            group: "inline"
        },
        /// An inline image (`<img>`) node. Supports `src`,
        /// `alt`, and `href` attributes. The latter two default to the empty
        /// string.
        file: {
            attrs: {
                dataBlockId: {
                    default: null
                },
                src: { default: null },
                title: { default: '' }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: `div.${CLASSNAME}-file`, 
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title")
                    }
                }
            }],
            toDOM(node: any) {
                const { src, title } = node.attrs;
                return ["div",
                    {
                        class: `${CLASSNAME}-file-view`,
                        style: "position: relative;display: inline-block;"
                    },
                    [
                        "div", {
                            class: `${CLASSNAME}-file-view-content`,
                            style: "position: relative;display: flex;"
                        }, [
                            "div", {
                                ["data-block-id"]: node.attrs.dataBlockId,
                                class: `${CLASSNAME}-file`,
                                src,
                                title
                            }
                        ]
                    ]
                ];
            }
        },
        bookmark: {
            attrs: {
                dataBlockId: {
                    default: null
                },
                src: { default: null },
                title: { default: '' }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: `div.${CLASSNAME}-bookmark`, 
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title")
                    }
                }
            }],
            toDOM(node: any) {
                const { src, title } = node.attrs;
                return ["div",
                    {
                        class: `${CLASSNAME}-bookmark-view`,
                        style: "position: relative;display: inline-block;"
                    },
                    [
                        "div", {
                            class: `${CLASSNAME}-bookmark-view-content`,
                            style: "position: relative;display: flex;"
                        }, [
                            "div", {
                                ["data-block-id"]: node.attrs.dataBlockId,
                                class: `${CLASSNAME}-bookmark`,
                                src,
                                title
                            }
                        ]
                    ]
                ];
            }
        },
        image: {
            attrs: {
                dataBlockId: {
                    default: null
                },
                src: { default: null },
                alt: { default: '' },
                title: { default: '' },
                width: { default: null },
                height: { default: null },
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: "img[src]", 
                getAttrs(dom: any) {
                    let style: any = [];
                    if (dom.getAttribute("width")) {
                        style.push(`${dom.getAttribute("width")}px`);
                    }
                    if (dom.getAttribute("height")) {
                        style.push(`${dom.getAttribute("height")}px`);
                    }
                    if (style.length > 0) {
                        style = style.join(';');
                    } else {
                        style = null;
                    }
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt"),
                        style
                    }
                }
            }],
            toDOM(node: any) {
                const { src, alt, title, style } = node.attrs;
                return ["div",
                    {
                        class: `${CLASSNAME}-image-view`,
                        style: "position: relative;display: inline-block;"
                    },
                    [
                        "div", {
                            class: `${CLASSNAME}-image-view-content`,
                            style: "position: relative;display: flex;"
                        }, [
                            "img", {
                                ["data-block-id"]: node.attrs.dataBlockId,
                                src,
                                alt,
                                title,
                                style
                            }
                        ]
                    ]
                ];
            }
        },
        video: {
            attrs: {
                dataBlockId: {
                    default: null
                },
                src: { default: null },
                title: { default: '' },
                // controls: { default: true },
                width: { default: null },
                height: { default: null },
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: "video[src]", 
                getAttrs(dom: any) {
                    let style: any = [];
                    if (dom.getAttribute("width")) {
                        style.push(`${dom.getAttribute("width")}px`);
                    }
                    if (dom.getAttribute("height")) {
                        style.push(`${dom.getAttribute("height")}px`);
                    }
                    if (style.length > 0) {
                        style = style.join(';');
                    } else {
                        style = null;
                    }
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        // controls: dom.getAttribute("controls"),
                        style
                    }
                }
            }],
            toDOM(node: any) {
                const { src, title, style } = node.attrs;
                return ["div",
                    {
                        class: `${CLASSNAME}-video-view`,
                        style: "position: relative;display: inline-block;"
                    },
                    [
                        "div", {
                            class: `${CLASSNAME}-video-view-content`,
                            style: "position: relative;display: flex;"
                        }, [
                            "video", {
                                ["data-block-id"]: node.attrs.dataBlockId,
                                src,
                                controls: true,
                                title,
                                style
                            }
                        ]
                    ]
                ];
            }
        },
        audio: {
            attrs: {
                dataBlockId: {
                    default: null
                },
                src: { default: null },
                title: { default: '' },
                // controls: { default: true },
                width: { default: null }
                // height: { default: null },
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: "audio[src]", 
                getAttrs(dom: any) {
                    let style: any = [];
                    if (dom.getAttribute("width")) {
                        style.push(`${dom.getAttribute("width")}px`);
                    }
                    // if (dom.getAttribute("height")) {
                    //     style.push(`${dom.getAttribute("height")}px`);
                    // }
                    if (style.length > 0) {
                        style = style.join(';');
                    } else {
                        style = null;
                    }
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        // controls: dom.getAttribute("controls"),
                        style
                    }
                }
            }],
            toDOM(node: any) {
                const { src, title, style } = node.attrs;
                return ["div",
                    {
                        class: `${CLASSNAME}-audio-view`,
                        style: "position: relative;display: inline-block;"
                    },
                    [
                        "div", {
                            class: `${CLASSNAME}-audio-view-content`,
                            style: "position: relative;display: flex;"
                        }, [
                            "audio", {
                                ["data-block-id"]: node.attrs.dataBlockId,
                                src,
                                title,
                                controls: true,
                                style
                            }
                        ]
                    ]
                ];
            }
        },
        /// A hard line break, represented in the DOM as `<br>`.
        hard_line_break: {
            inline: true,
            group: "inline",
            // attrs: {
            //     dataBlockId: {
            //         default: null
            //     }
            // },
            selectable: false,
            parseDOM: [{
                tag: "br",
                // getAttrs: (dom: any) => {
                //     return {
                //         dataBlockId: dom.getAttribute("data-block-id")
                //     };
                // }
            }],
            toDOM(node: any) {
                return ["br"];
            }
        },
        ordered_list: {
            content: "list_item+",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null
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
                        dataBlockId: dom.getAttribute("data-block-id"),
                        order: dom.hasAttribute("start") ? +dom.getAttribute("start")! : 1
                    };
                }
            }],
            toDOM(node: any) {
                return node.attrs.order == 1 ? ["ol", { ["data-block-id"]: node.attrs.dataBlockId }, 0] : ["ol", { ["data-block-id"]: node.attrs.dataBlockId, start: node.attrs.order }, 0];
            }
        },
        bullet_list: {
            content: "list_item+",
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null
                }
            },
            parseDOM: [
                {
                    tag: "ul",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute("data-block-id")
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["ul", { ["data-block-id"]: node.attrs.dataBlockId }, 0];
            }
        },
        list_item: {
            // content: "paragraph block*",
            content: "paragraph block*",
            // content: "block+", 
            attrs: {
                dataBlockId: {
                    default: null
                }
            },
            parseDOM: [
                {
                    tag: "li",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute("data-block-id")
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["li", { ["data-block-id"]: node.attrs.dataBlockId }, 0]
            },
            defining: true
        },
        // 多栏容器
        columns: {
            content: "column+", // 内部只能包含 column 节点
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null
                }
                // gap: {
                //     default: 12
                // }
            },
            parseDOM: [
                {
                    tag: `div.${CLASSNAME}-columns`,
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute("data-block-id")
                        };
                    }
                }
            ],
            toDOM: (node: any) => ["div", {
                ["data-block-id"]: node.attrs.dataBlockId,
                class: `${CLASSNAME}-columns`,
                style: `width: 100%;position: relative;display: flex;box-sizing: border-box;`
            }, 0]
        },
        // 单个列
        column: {
            content: "block+", // 列内部可以包含段落、列表等
            isolating: true,   // 重要：防止 Backspace 删掉列结构导致不同步
            attrs: {
                // dataBlockId: {
                //     default: null
                // },
                ratio: {
                    default: 0
                }
            },
            parseDOM: [
                {
                    tag: `div.${CLASSNAME}-column`,
                    getAttrs: (dom: any) => {
                        return {
                            // dataBlockId: dom.getAttribute("data-block-id"),
                            width: dom.style.width
                        };
                    }
                }
            ],
            toDOM: (node: any) => {
                return ["div", {
                    ["data-block-id"]: node.attrs.dataBlockId,
                    class: `${CLASSNAME}-column`,
                    style: `width: calc(${node.attrs.ratio}% - 6px);padding: 6px;border-radius: 10px;border: 1px solid #ddd;`
                }, 0]
            }
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
        },
        table: {
            content: "table_row+",
            tableRole: "table",
            isolating: true,
            selectable: true,
            allowGapCursor: true, // 某些版本插件需要此显式标记
            group: "block",
            attrs: {
                dataBlockId: {
                    default: null
                }
            },
            parseDOM: [{
                tag: "table"
            }],
            toDOM() {
                return ["table", ["tbody", 0]];
            }
        },
        table_row: {
            content: "(table_cell | table_header)*",
            tableRole: "row",
            parseDOM: [{
                tag: "tr"
            }],
            toDOM() {
                return ["tr", 0];
            }
        },
        table_cell: {
            content: "block+",
            attrs: {
                colspan: { default: 1, validate: 'number' },
                rowspan: { default: 1, validate: 'number' },
                colwidth: {
                    default: null,
                    validate(value: any) {
                        if (value === null) {
                            return;
                        }
                        if (!Array.isArray(value)) {
                            throw new TypeError('colwidth must be null or an array');
                        }
                        for (const item of value) {
                            if (typeof item !== 'number') {
                                throw new TypeError('colwidth must be null or an array of numbers');
                            }
                        }
                    }
                },
                background: { default: null }
            },
            tableRole: "cell",
            isolating: true,
            parseDOM: [{
                tag: "td",
                getAttrs(dom: any) {
                    if (typeof dom === 'string') {
                        return {};
                    }
                    const widthAttr = dom.getAttribute('data-colwidth');
                    const widths =
                        widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
                            ? widthAttr.split(',').map((s: string) => Number(s))
                            : null;
                    const colspan = Number(dom.getAttribute('colspan') || 1);
                    const result = {
                        colspan,
                        rowspan: Number(dom.getAttribute('rowspan') || 1),
                        colwidth: widths && widths.length == colspan ? widths : null
                    };
                    // const extraAttrs = {
                    //     background: { default: null }
                    // };
                    // for (const prop in extraAttrs) {
                    //     const getter = extraAttrs[prop].getFromDOM;
                    //     const value = getter && getter(dom);
                    //     if (value != null) {
                    //         result[prop] = value;
                    //     }
                    // }
                    return result;
                }
            }],
            toDOM(node: any) {
                const attrs: any = {};
                if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan;
                if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan;
                if (node.attrs.colwidth) {
                    attrs['data-colwidth'] = node.attrs.colwidth.join(',');
                }
                return ["td", attrs, 0];
            }
        },
        table_header: {
            content: "block+",
            attrs: {
                colspan: { default: 1, validate: 'number' },
                rowspan: { default: 1, validate: 'number' },
                colwidth: {
                    default: null,
                    validate(value: any) {
                        if (value === null) {
                            return;
                        }
                        if (!Array.isArray(value)) {
                            throw new TypeError('colwidth must be null or an array');
                        }
                        for (const item of value) {
                            if (typeof item !== 'number') {
                                throw new TypeError('colwidth must be null or an array of numbers');
                            }
                        }
                    }
                },
                background: { default: null }
            },
            tableRole: "header_cell",
            isolating: true,
            parseDOM: [{
                tag: "th",
                getAttrs(dom: any) {
                    if (typeof dom === 'string') {
                        return {};
                    }
                    const widthAttr = dom.getAttribute('data-colwidth');
                    const widths =
                        widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
                            ? widthAttr.split(',').map((s: string) => Number(s))
                            : null;
                    const colspan = Number(dom.getAttribute('colspan') || 1);
                    const result = {
                        colspan,
                        rowspan: Number(dom.getAttribute('rowspan') || 1),
                        colwidth: widths && widths.length == colspan ? widths : null
                    };
                    // const extraAttrs = {
                    //     background: { default: null }
                    // };
                    // for (const prop in extraAttrs) {
                    //     const getter = extraAttrs[prop].getFromDOM;
                    //     const value = getter && getter(dom);
                    //     if (value != null) {
                    //         result[prop] = value;
                    //     }
                    // }
                    return result;
                }
            }],
            toDOM(node: any) {
                const attrs: any = {};
                if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan;
                if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan;
                if (node.attrs.colwidth) {
                    attrs['data-colwidth'] = node.attrs.colwidth.join(',');
                }
                return ["th", attrs, 0];
            }
        },
        // suggestion: {
        //     inline: true,
        //     content: "text*", // 🌟 重要：允許內部包含文本
        //     group: "inline",
        //     attrs: {
        //         id: { default: null },
        //         label: { default: "" },
        //         type: { default: "mention" }, // 'mention' (@) 或 'command' (/)
        //         isPicking: { default: false } // 新增屬性：標示是否正在選單中
        //     },
        //     parseDOM: [{ tag: "span.suggestion" }],
        //     toDOM: node => ["span", {
        //         class: `${CLASSNAME}-suggestion typing ${node.attrs.type}`,
        //         "data-picking": node.attrs.isPicking
        //     }, 0] // 0 代表內容渲染位置
        //     // leaf: true, // 原子节点，内部不可编辑
        //     // parseDOM: [{
        //     //     tag: `span.${CLASSNAME}-suggestion`,
        //     //     getAttrs: dom => ({ id: dom.dataset.id, label: dom.innerText })
        //     // }],
        //     // toDOM: node => ["span", { class: `${CLASSNAME}-suggestion`, "data-id": node.attrs.id }, node.attrs.label]
        // }
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
                    default: null
                },
                target: {
                    default: null
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
                color: { default: null },
                backgroundColor: { default: null }
            },
            parseDOM: [
                { style: 'color', getAttrs: (value: string) => ({ color: value }) },
                { style: 'background-color', getAttrs: (value: string) => ({ backgroundColor: value }) }
            ],
            toDOM: (node: any) => ['span', { 
                style: `color: ${node.attrs.color};background-color: ${node.attrs.backgroundColor}` 
            }, 0]
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