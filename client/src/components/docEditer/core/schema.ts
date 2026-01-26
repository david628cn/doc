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
            parseDOM: [{ tag: "p" }],
            toDOM() {
                return ["p", 0];
            }
        },
        /// A blockquote (`<blockquote>`) wrapping one or more blocks.
        blockquote: {
            content: "block+",
            group: "block",
            defining: true,
            parseDOM: [{ tag: "blockquote" }],
            toDOM() {
                return ["blockquote", 0];
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
                level: {
                    default: 1,
                    validate: "number"
                }
            },
            content: "inline*",
            group: "block",
            defining: true,
            parseDOM: [
                { tag: "h1", attrs: { level: 1 } },
                { tag: "h2", attrs: { level: 2 } },
                { tag: "h3", attrs: { level: 3 } },
                { tag: "h4", attrs: { level: 4 } },
                { tag: "h5", attrs: { level: 5 } },
                { tag: "h6", attrs: { level: 6 } }
            ],
            toDOM(node: any) {
                return ["h" + node.attrs.level, 0];
            }
        },
        /// A code listing. Disallows marks or non-text inline
        /// nodes by default. Represented as a `<pre>` element with a
        /// `<code>` element inside of it.
        code_block: {
            content: "text*",
            marks: "",
            group: "block",
            code: true,
            defining: true,
            parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
            toDOM() {
                return ["pre", ["code", 0]];
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
                src: { validate: "string" },
                alt: { default: null, validate: "string|null" },
                title: { default: null, validate: "string|null" }
            },
            group: "inline",
            draggable: true,
            parseDOM: [{
                tag: "img[src]", getAttrs(dom: any) {
                    return {
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt")
                    }
                }
            }],
            toDOM(node: any) {
                const { src, alt, title } = node.attrs;
                return ["img", { src, alt, title }];
            }
        },
        /// A hard line break, represented in the DOM as `<br>`.
        hard_break: {
            inline: true,
            group: "inline",
            selectable: false,
            parseDOM: [{ tag: "br" }],
            toDOM() {
                return ["br"];
            }
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
        color: {
            attrs: { color: { default: 'rgba(31,35,41,1)' } },
            parseDOM: [
                { style: 'color', getAttrs: (value: string) => ({ color: value }) }
            ],
            toDOM: (node: any) => ['span', { style: `color: ${node.attrs.color}` }, 0]
        },
        backgroundColor: {
            attrs: { 
                color: { default: 'rgba(255,255,255,0)' } 
            },
            parseDOM: [
                { style: 'background-color', getAttrs: (value: string) => ({ color: value }) }
            ],
            toDOM: (node: any) => ['span', { style: `background-color: ${node.attrs.color}` }, 0]
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