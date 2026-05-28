import { CLASSNAME } from '../config';

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
            // draggable: false,
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "paragraph" },
                textAlign: { default: null } // 定义默认对齐方式
            },
            parseDOM: [{
                tag: "p, [data-block-type='paragraph']",
                getAttrs: (dom: any) => {
                    // 外部粘贴的内容如果带有背景色，即便你没在 attrs 定义，
                    // 某些情况下 ProseMirror 会将其视为残留样式。
                    // 我们可以直接操作 dom 移除背景色，或者只返回你关心的字段。
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        // 仅保留对齐方式，忽略其他任何 style（如 background-color）
                        dataBlockType: "paragraph",
                        textAlign: dom.style.textAlign || null
                    };
                }
            }],
            toDOM(node: any) {
                const attrs: any = {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType
                };
                if (node.attrs.textAlign && node.attrs.textAlign !== 'left') {
                    attrs.style = `text-align: ${node.attrs.textAlign}`;
                }
                return ["p", attrs, 0];
            }
        },
        /// A blockquote (`<blockquote>`) wrapping one or more blocks.
        blockquote: {
            content: "block+",
            group: "block",
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "blockquote" }
            },
            defining: true,
            parseDOM: [
                {
                    tag: "blockquote, [data-block-type='blockquote']",
                    getAttrs: (dom: any) => {
                        return {
                            dataBlockId: dom.getAttribute("data-block-id"),
                            dataBlockType: "blockquote"
                        };
                    }
                }
            ],
            toDOM(node: any) {
                return ["blockquote", {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType
                }, 0];
            }
        },
        /// A horizontal rule (`<hr>`).
        horizontal_rule: {
            group: "block",
            inline: false,
            // draggable: true,
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
                dataBlockId: { default: null },
                dataBlockType: { default: "heading" },
                level: { default: 1, validate: "number" },
                textAlign: { default: null }
            },
            content: "inline*",
            group: "block",
            defining: true,
            // draggable: true,
            parseDOM: [
                ...[1, 2, 3, 4, 5, 6].map(level => ({
                    tag: `h${level}`,
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "heading",
                        level: level,
                        textAlign: dom.style.textAlign
                    })
                })),
                {
                    tag: "[data-block-type='heading']",
                    getAttrs: (dom: any) => ({
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "heading",
                        level: parseInt(dom.getAttribute("data-level") || "1", 10),
                        textAlign: dom.style.textAlign
                    })
                }
            ],
            toDOM(node: any) {
                const attrs: any = {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType,
                    "data-level": node.attrs.level
                };
                if (node.attrs.textAlign && node.attrs.textAlign !== 'left') {
                    attrs.style = `text-align: ${node.attrs.textAlign}`;
                }
                return ["h" + node.attrs.level, attrs, 0];
            }
        },
        /// A code listing. Disallows marks or non-text inline
        /// nodes by default. Represented as a `<pre>` element with a
        /// `<code>` element inside of it.
        code_block: {
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "code_block" },
                language: { default: 'javascript' },
                wrap: { default: false } // 用于支持自动换行状态的持久化 
            }, // 默认语言
            content: "text*",
            marks: "",
            group: "block",
            code: true,
            defining: true,
            isolating: true,
            // draggable: true,
            parseDOM: [{
                tag: "pre, [data-block-type='code_block']",
                preserveWhitespace: "full",
                getAttrs: (dom: any) => {
                    const className = dom.getAttribute("class") || "";
                    const match = className.match(/(?:language|lang)-([a-zA-Z0-9_\-]+)/);
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "code_block",
                        // language: match ? match : (dom.getAttribute("data-language") || "javascript"),
                        language: dom.getAttribute("data-language") || "javascript",
                        wrap: dom.getAttribute("data-wrap") === "true"
                    };
                }
            }],
            toDOM: (node: any) => ["pre", {
                "class": `language-${node.attrs.language}`,
                "data-block-id": node.attrs.dataBlockId,
                "data-block-type": node.attrs.dataBlockType,
                "data-language": node.attrs.language,
                "data-wrap": node.attrs.wrap
            }, ["code", 0]]
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
                dataBlockId: { default: null },
                dataBlockType: { default: "file" },
                src: { default: null },
                title: { default: '' }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            // draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: `div.${CLASSNAME}-file, [data-block-type='file']`,
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "file",
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title")
                    }
                }
            }],
            toDOM(node: any) {
                const { src, title, dataBlockId, dataBlockType } = node.attrs;
                return ["div", { class: `${CLASSNAME}-file-view`, style: "position: relative;display: inline-block;" },
                    ["div", { class: `${CLASSNAME}-file-view-content`, style: "position: relative;display: flex;" },
                        ["div", {
                            "data-block-id": dataBlockId,
                            "data-block-type": dataBlockType,
                            class: `${CLASSNAME}-file`,
                            src,
                            title
                        }]
                    ]
                ];
            }
        },
        bookmark: {
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "bookmark" },
                src: { default: null },
                title: { default: '' }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            // draggable: false,
            // selectable: true,
            atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            parseDOM: [{
                tag: `div.${CLASSNAME}-bookmark, [data-block-type='bookmark']`,
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "bookmark",
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title")
                    };
                }
            }],
            toDOM(node: any) {
                const { src, title, dataBlockId, dataBlockType } = node.attrs;
                return ["div", { class: `${CLASSNAME}-bookmark-view`, style: "position: relative;display: inline-block;" },
                    ["div", { class: `${CLASSNAME}-bookmark-view-content`, style: "position: relative;display: flex;" },
                        ["div", {
                            "data-block-id": dataBlockId,
                            "data-block-type": dataBlockType,
                            class: `${CLASSNAME}-bookmark`,
                            src,
                            title
                        }]
                    ]
                ];
            }
        },
        image: {
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "image" },
                src: { default: null },
                alt: { default: '' },
                title: { default: '' },
                width: { default: null },
                height: { default: null },
                scale: { default: 1 },
                translateX: { default: 0 },
                translateY: { default: 0 },
                caption: { default: false }
            },
            group: "inline",
            inline: true,
            content: "inline*",
            // 注意：如果是行内图文组合，建议开启 isolating，防止内容轻易溢出到外部块
            isolating: true,
            parseDOM: [
                // {
                //     tag: `span.${CLASSNAME}-image-view`, // 修正 parseDOM，应该匹配你生成的最新外层 DOM
                //     priority: 100,
                //     getAttrs(dom: any) {
                //         console.log('解析图片节点，当前 DOM:', dom);
                //         const img = dom.querySelector("img");
                //         if (!img) return false;
                //         const w = img.getAttribute("width");
                //         const h = img.getAttribute("height");
                //         return {
                //             dataBlockId: img.getAttribute("data-block-id"),
                //             dataBlockType: "image",
                //             src: img.getAttribute("src"),
                //             title: img.getAttribute("title"),
                //             alt: img.getAttribute("alt"),
                //             scale: img.getAttribute("scale") || 1,
                //             translateX: img.getAttribute("translateX") || 0,
                //             translateY: img.getAttribute("translateY") || 0,
                //             width: w,
                //             height: h
                //         };
                //     }
                // }, 
                {
                    // 兜底条件：如果是从外部网页复制进来的普通带有 block 标记的 img
                    tag: 'img[src]',
                    getAttrs(dom: any) {
                        const w = dom.getAttribute("width");
                        const h = dom.getAttribute("height");
                        return {
                            dataBlockId: dom.getAttribute("data-block-id"),
                            dataBlockType: "image",
                            src: dom.getAttribute("src"),
                            title: dom.getAttribute("title"),
                            alt: dom.getAttribute("alt"),
                            scale: dom.getAttribute("scale") || 1,
                            translateX: dom.getAttribute("translateX") || 0,
                            translateY: dom.getAttribute("translateY") || 0,
                            width: w,
                            height: h
                        };
                    }
                }
            ],
            toDOM(node: any) {
                const { src, alt, title, caption, width, height, scale, translateX, translateY, dataBlockId, dataBlockType } = node.attrs;

                // 修正样式字符串的赋值错误
                let styleStr = "";
                if (width) styleStr += `width: ${width}px;`;
                // if (height) styleStr += `height: ${height}px;`;
                if (scale) styleStr += `transform: scale(${scale}) translate(${translateX}px, ${translateY}px);`; // 修正 transform 语法
                console.log('生成图片节点，属性:', node);
                return [
                    "span",
                    { class: `${CLASSNAME}-image-view` },
                    ["span", { class: `${CLASSNAME}-image-view-content`, contenteditable: "false" }, // 图片和外壳不可编辑
                        ["img", {
                            "data-block-id": dataBlockId,
                            "data-block-type": dataBlockType,
                            src,
                            alt,
                            title,
                            style: styleStr || null
                        }]
                    ],
                    ["span", {
                        class: `${CLASSNAME}-editor-caption`,
                        "data-placeholder": "请输入图片描述..."
                        // style: `${caption ? '' : 'display: none;'}`,
                        //去掉了这里的 contenteditable: "false"，让外部控制或靠 PM 自动管理
                    }, 0] // 0 是内容占位符，用户输入的 text 属于 inline* 会落在这里
                ];
            }
        },
        video: {
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "video" },
                src: { default: null },
                title: { default: '' },
                width: { default: null },
                height: { default: null }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            // draggable: false,
            // selectable: true,
            // atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            content: "inline*",
            parseDOM: [{
                tag: "video[src], [data-block-type='video']",
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "video",
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        width: dom.getAttribute("width"),
                        height: dom.getAttribute("height")
                    };
                }
            }],
            toDOM(node: any) {
                const { src, title, caption, width, height, dataBlockId, dataBlockType } = node.attrs;
                let styleStr = "";
                if (width) styleStr += `width: ${width}px;`;
                if (height) styleStr += `height: ${height}px;`;
                return ["span", { class: `${CLASSNAME}-video-view`, style: "position: relative;display: inline-block;" },
                    ["span", { class: `${CLASSNAME}-video-view-content`, style: "position: relative;display: flex;" },
                        ["video", {
                            "data-block-id": dataBlockId,
                            "data-block-type": dataBlockType,
                            src,
                            controls: true,
                            title,
                            style: styleStr || null
                        }],
                        ["span", {
                            class: `${CLASSNAME}-caption`,
                            style: `display: block; font-size: 12px; color: #666; margin-top: 4px; min-width: 50px; outline: none;${caption ? '' : 'display: none;'}`,
                            "data-placeholder": "请输入图片描述..."
                        }, 0]
                    ]
                ];
            }
        },
        audio: {
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "audio" },
                src: { default: null },
                title: { default: '' },
                width: { default: null }
            },
            group: "inline",
            inline: true,    // 允许光标在左右停留
            // draggable: false,
            // selectable: true,
            // atom: true,      // 告诉 PM 这是一个原子节点，光标不能进入内部
            content: "inline*",
            parseDOM: [{
                tag: "audio[src], [data-block-type='audio']",
                getAttrs(dom: any) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "audio",
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        width: dom.getAttribute("width")
                    };
                }
            }],
            toDOM(node: any) {
                const { src, title, width, dataBlockId, dataBlockType } = node.attrs;
                let styleStr = width ? `width: ${width}px;` : "";
                return ["span", { class: `${CLASSNAME}-audio-view`, style: "position: relative;display: inline-block;" },
                    ["span", { class: `${CLASSNAME}-audio-view-content`, style: "position: relative;display: flex;" },
                        ["audio", {
                            "data-block-id": dataBlockId,
                            "data-block-type": dataBlockType,
                            src,
                            title,
                            controls: true,
                            style: styleStr || null
                        }],
                        ["span", {
                            class: `${CLASSNAME}-caption`,
                            style: "display: block; font-size: 12px; color: #666; margin-top: 4px; min-width: 50px; outline: none;",
                            "data-placeholder": "请输入图片描述..."
                        }, 0]
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
                dataBlockId: { default: null },
                dataBlockType: { default: "ordered_list" },
                order: { default: 1, validate: "number" }
            },
            parseDOM: [{
                tag: "ol, [data-block-type='ordered_list']",
                getAttrs(dom: HTMLElement) {
                    return {
                        dataBlockId: dom.getAttribute("data-block-id"),
                        dataBlockType: "ordered_list",
                        order: dom.hasAttribute("start") ? +dom.getAttribute("start")! : 1
                    };
                }
            }],
            toDOM(node: any) {
                const attrs: any = {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType
                };
                if (node.attrs.order !== 1) attrs.start = node.attrs.order;
                return ["ol", attrs, 0];
            }
        },
        bullet_list: {
            content: "list_item+",
            group: "block",
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "bullet_list" }
            },
            parseDOM: [{
                tag: "ul, [data-block-type='bullet_list']",
                getAttrs: (dom: any) => ({
                    dataBlockId: dom.getAttribute("data-block-id"),
                    dataBlockType: "bullet_list"
                })
            }],
            toDOM(node: any) {
                return ["ul", {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType
                }, 0];
            }
        },
        list_item: {
            // content: "paragraph block*",
            content: "block+",
            // attrs: {
            //     dataBlockId: {
            //         default: null
            //     }
            // },
            parseDOM: [
                {
                    tag: "li",
                    // getAttrs: (dom: any) => {
                    //     return {
                    //         dataBlockId: dom.getAttribute("data-block-id")
                    //     };
                    // }
                }
            ],
            toDOM(node: any) {
                return ["li", 0];
                // return ["li", { ["data-block-id"]: node.attrs.dataBlockId }, 0]
            },
            defining: true
        },
        // 多栏容器
        columns: {
            content: "column+", // 内部只能包含 column 节点
            group: "block",
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "columns" }
                // gap: {
                //     default: 12
                // }
            },
            parseDOM: [{
                tag: `div.${CLASSNAME}-columns, [data-block-type='columns']`,
                getAttrs: (dom: any) => ({
                    dataBlockId: dom.getAttribute("data-block-id"),
                    dataBlockType: "columns"
                })
            }],
            toDOM: (node: any) => ["div", {
                "data-block-id": node.attrs.dataBlockId,
                "data-block-type": node.attrs.dataBlockType,
                class: `${CLASSNAME}-columns`,
                style: `width:100%;position:relative;display:flex;box-sizing:border-box;`
            }, 0]
        },
        // 单个列
        column: {
            content: "block+", // 列内部可以包含段落、列表等
            // isolating: true,   // 重要：防止 Backspace 删掉列结构导致不同步
            attrs: {
                dataBlockId: { default: null },
                ratio: { default: 0 }
            },
            parseDOM: [{
                tag: `div.${CLASSNAME}-column`,
                getAttrs: (dom: any) => ({
                    dataBlockId: dom.getAttribute("data-block-id"),
                    width: dom.style.width
                })
            }],
            toDOM: (node: any) => ["div", {
                "data-block-id": node.attrs.dataBlockId,
                class: `${CLASSNAME}-column`,
                style: `width:calc(${node.attrs.ratio}%-6px);padding:6px;border-radius:10px;border:1px solid #ddd;`
            }, 0]
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
            // draggable: true,
            allowGapCursor: true, // 某些版本插件需要此显式标记
            group: "block",
            attrs: {
                dataBlockId: { default: null },
                dataBlockType: { default: "table" }
            },
            parseDOM: [{
                tag: "table, [data-block-type='table']",
                getAttrs: (dom: any) => ({
                    dataBlockId: dom.getAttribute("data-block-id"),
                    dataBlockType: "table"
                })
            }],
            toDOM(node: any) {
                return ["table", {
                    "data-block-id": node.attrs.dataBlockId,
                    "data-block-type": node.attrs.dataBlockType
                }, ["tbody", 0]];
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
                        if (value === null) return;
                        if (!Array.isArray(value)) throw new TypeError('colwidth must be null or an array');
                        for (const item of value) {
                            if (typeof item !== 'number') throw new TypeError('colwidth must be null or an array of numbers');
                        }
                    }
                },
                textAlign: { default: 'left' },
                backgroundColor: { default: null },
                textColor: { default: null },
                verticalAlign: { default: 'top' }  // 💡 新增：垂直对齐属性
            },
            tableRole: "cell",
            isolating: true,
            parseDOM: [{
                tag: "td",
                getAttrs(dom: any) {
                    if (typeof dom === 'string') return {};
                    const widthAttr = dom.getAttribute('data-colwidth');
                    const widths = widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
                        ? widthAttr.split(',').map((s: string) => Number(s))
                        : null;
                    const colspan = Number(dom.getAttribute('colspan') || 1);

                    const textAlign = dom.style.textAlign || 'left';
                    const backgroundColor = dom.style.backgroundColor || dom.getAttribute('background') || null;
                    const textColor = dom.style.color || null;
                    // 💡 新增：从 DOM 内联样式中提取 vertical-align
                    const verticalAlign = dom.style.verticalAlign || 'top';

                    return {
                        colspan,
                        rowspan: Number(dom.getAttribute('rowspan') || 1),
                        colwidth: widths && widths.length == colspan ? widths : null,
                        textAlign,
                        backgroundColor,
                        textColor,
                        verticalAlign
                    };
                }
            }],
            toDOM(node: any) {
                const attrs: any = {};
                if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan;
                if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan;
                if (node.attrs.colwidth) {
                    attrs['data-colwidth'] = node.attrs.colwidth.join(',');
                }

                let style = "";
                if (node.attrs.textAlign) {
                    style += `text-align: ${node.attrs.textAlign};`;
                }
                if (node.attrs.backgroundColor) {
                    style += `background-color: ${node.attrs.backgroundColor};`;
                }
                if (node.attrs.textColor) {
                    style += `color: ${node.attrs.textColor};`;
                }
                // 💡 新增：动态拼接 vertical-align 样式
                if (node.attrs.verticalAlign) {
                    style += `vertical-align: ${node.attrs.verticalAlign};`;
                }
                if (style) attrs.style = style;

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
                        if (value === null) return;
                        if (!Array.isArray(value)) throw new TypeError('colwidth must be null or an array');
                        for (const item of value) {
                            if (typeof item !== 'number') throw new TypeError('colwidth must be null or an array of numbers');
                        }
                    }
                },
                textAlign: { default: 'left' },
                backgroundColor: { default: null },
                textColor: { default: null },
                verticalAlign: { default: 'top' }  // 💡 新增：垂直对齐属性
            },
            tableRole: "header_cell",
            isolating: true,
            parseDOM: [{
                tag: "th",
                getAttrs(dom: any) {
                    if (typeof dom === 'string') return {};
                    const widthAttr = dom.getAttribute('data-colwidth');
                    const widths = widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
                        ? widthAttr.split(',').map((s: string) => Number(s))
                        : null;
                    const colspan = Number(dom.getAttribute('colspan') || 1);

                    const textAlign = dom.style.textAlign || 'left';
                    const backgroundColor = dom.style.backgroundColor || dom.getAttribute('background') || null;
                    const textColor = dom.style.color || null;
                    // 💡 新增：从 DOM 内联样式中提取 vertical-align
                    const verticalAlign = dom.style.verticalAlign || 'top';

                    return {
                        colspan,
                        rowspan: Number(dom.getAttribute('rowspan') || 1),
                        colwidth: widths && widths.length == colspan ? widths : null,
                        textAlign,
                        backgroundColor,
                        textColor,
                        verticalAlign
                    };
                }
            }],
            toDOM(node: any) {
                const attrs: any = {};
                if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan;
                if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan;
                if (node.attrs.colwidth) {
                    attrs['data-colwidth'] = node.attrs.colwidth.join(',');
                }

                let style = "";
                if (node.attrs.textAlign) {
                    style += `text-align: ${node.attrs.textAlign};`;
                }
                if (node.attrs.backgroundColor) {
                    style += `background-color: ${node.attrs.backgroundColor};`;
                }
                if (node.attrs.textColor) {
                    style += `color: ${node.attrs.textColor};`;
                }
                // 💡 新增：动态拼接 vertical-align 样式
                if (node.attrs.verticalAlign) {
                    style += `vertical-align: ${node.attrs.verticalAlign};`;
                }
                if (style) attrs.style = style;

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