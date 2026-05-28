import { type EditorState, type Transaction, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { type Node, type Schema, Fragment } from 'prosemirror-model';
// import { type ResolvedPos } from 'prosemirror-model';
import { Popuover, Menu } from '../../ui';
import { findSuggestionMatch } from '../../utils';
import { CLASSNAME } from '../../config';
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

export const createTable = (schema: Schema, rows: number = 3, cols: number = 3) => {
    const { table, table_row, table_cell, paragraph } = schema.nodes;
    const rowsArr = [];

    for (let i = 0; i < rows; i++) {
        const cells: any[] = [];
        for (let j = 0; j < cols; j++) {
            // 每个单元格内部必须至少有一个基础块节点（通常是 paragraph）
            const cell = table_cell.createAndFill(null, Fragment.from(paragraph.create()));
            cells.push(cell);
        }
        rowsArr.push(table_row.create(null, Fragment.from(cells)));
    }

    return table.create(null, Fragment.from(rowsArr));
}

export const command = (view: EditorView) => {
    return (ds: any) => {
        const exc = excSuggestion(view, false);
        let newTr = exc.tr;

        if (ds.nodeType === 'image') {
            const fromPos = newTr.selection.from;
            newTr = newTr.setMeta('image', {
                pos: fromPos
            });
            view.dom.blur();
        } else {
            const nodeType = view.state.schema.nodes[ds.nodeType];
            let newNode: any;
            // let isBlock = nodeType.isBlock;
            if (ds.nodeType === 'table') {
                newNode = createTable(view.state.schema, 3, 3);
            } else if (ds.nodeType === 'columns') {
                let { columns, column, paragraph } = view.state.schema.nodes;
                // 创建两个空的栏位，每个栏位包含一个初始段落
                newNode = columns.create(null, [
                    column.create({
                        ratio: 30
                    }, paragraph.create()),
                    column.create({
                        ratio: 30
                    }, paragraph.create()),
                    column.create({
                        ratio: 40
                    }, paragraph.create())
                ]);
            } else {
                newNode = nodeType.createAndFill(ds.nodeAttrs || {});
            }

            if (exc.firstPlace) {
                // 逻辑 A：如果为空，直接 setBlockType 转换整行
                // console.log('替换');
                // 【核心修正】：计算父节点在 doc 中的绝对坐标
                // $from.start() 是内容起点，$from.start() - 1 是节点开启标签位置
                const startOfParent = exc.$pos.start() - 1;
                const endOfParent = startOfParent + exc.$pos.parent.nodeSize;

                // 直接用 table 替换掉整个 paragraph 节点范围
                // 这一步会物理抹除旧行，原地放入新块
                newTr = newTr.replaceWith(startOfParent, endOfParent, newNode);
                const resolvedPos = newTr.doc.resolve(startOfParent);
                const selection = TextSelection.near(resolvedPos);
                newTr = newTr.setSelection(selection);
            } else {
                // 逻辑 B：如果不为空，在当前位置插入块（会自动切断行）
                // console.log('插入');
                newTr = newTr.replaceWith(exc.pos, exc.pos, newNode);
                const resolvedPos = newTr.doc.resolve(exc.pos + 1);
                const selection = TextSelection.near(resolvedPos);
                newTr = newTr.setSelection(selection);
            }
        }
        // const nodeAfter = view.state.selection.$to.nodeAfter;
        // const overrideSpace = nodeAfter?.text?.startsWith(" ");
        view.dispatch(newTr.scrollIntoView());
        // view.focus();
    };
}

export const calculateStartPosition = (
    cursorPosition: number,
    previousNode: Node | null | undefined,
    triggerChar?: string
): number => {
    if (!previousNode?.text || !triggerChar) {
        return cursorPosition;
    }
    const commandText = previousNode.text;
    const triggerCharIndex = commandText.lastIndexOf(triggerChar);
    if (triggerCharIndex === -1) {
        return cursorPosition;
    }
    const textLength = commandText.substring(triggerCharIndex).length;
    return cursorPosition - textLength;
}

// if (!isMention) {
//     const cursorPosition = selection.$from.pos
//     const previousNode = selection.$head?.nodeBefore

//     const startPosition = previousNode
//         ? calculateStartPosition(
//             cursorPosition,
//             previousNode,
//             internalSuggestionPropsRef.current.char
//         )
//         : selection.$from.start()

//     const transaction = state.tr.deleteRange(
//         startPosition,
//         cursorPosition
//     )
//     view.dispatch(transaction)
// }

// const nodeAfter = view.state.selection.$to.nodeAfter
// const overrideSpace = nodeAfter?.text?.startsWith(" ")

// const rangeToUse = { ...range }

// if (overrideSpace) {
//     rangeToUse.to += 1
// }

let suggestionPopuover: any;
let menu: any;

const excSuggestion = (view: EditorView, active: boolean = false) => {
    const { state } = view;
    const { tr, selection } = state;
    const { $from, $head } = selection;

    let newTr = tr.setMeta('suggestion', {
        active
    });
    const cursorPosition = $from.pos;
    const previousNode = $head?.nodeBefore;

    const startPosition = previousNode
        ? calculateStartPosition(cursorPosition, previousNode, '/')
        : $from.start();

    newTr = newTr.deleteRange(startPosition, cursorPosition);

    const $startPosition = newTr.doc.resolve(startPosition);

    const isParentEmpty = $startPosition.parent.content.size === 0 || $startPosition.parent.textContent === '';

    return {
        tr: newTr,
        pos: startPosition,
        $pos: $startPosition,
        firstPlace: isParentEmpty
    };
}

export const suggestionPluginKey = new PluginKey('suggestion');

export const suggestion = ({
    editor,
    trigger = '/'
    // triggers = [
    //     { name: 'command', trigger: '/' },
    //     { name: 'mention', trigger: '@' }
    // ]
}: any) => {

    const getPopuover = () => {
        if (!suggestionPopuover) {
            if (!menu) {
                menu = new Menu(null, {
                    className: 'custom-theme',
                    popuoverContainer: editor.view.dom.parentNode,
                    // mode: 'inline',
                    mode: 'popuover',
                    // shortKey: true,
                    // fieldNames: {
                    //     key: 'id',
                    //     label: 'name',
                    //     children: 'subItems'
                    // },
                    style: {
                        maxHeight: '380px',
                    },
                    items: [
                        {
                            label: '基本',
                            // key: 'basic',
                            type: 'group',
                            children: [
                                {
                                    label: '正文', key: 'paragraph', nodeType: 'paragraph', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V7C21 7.55228 20.5523 8 20 8C19.4477 8 19 7.55228 19 7V5H13V19H15C15.5523 19 16 19.4477 16 20C16 20.5523 15.5523 21 15 21H9C8.44772 21 8 20.5523 8 20C8 19.4477 8.44772 19 9 19H11V5H5V7C5 7.55228 4.55228 8 4 8C3.44772 8 3 7.55228 3 7V4Z"
        fill="currentColor"
    ></path>
</svg>`, description: '普通文本输入'
                                },
                                {
                                    label: '标题 1', key: 'heading1', nodeType: 'heading', nodeAttrs: { level: 1 }, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M5 6C5 5.44772 4.55228 5 4 5C3.44772 5 3 5.44772 3 6V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V13H11V18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18V6C13 5.44772 12.5523 5 12 5C11.4477 5 11 5.44772 11 6V11H5V6Z"
        fill="currentColor"
    ></path>
    <path
        d="M21.0001 10C21.0001 9.63121 20.7971 9.29235 20.472 9.11833C20.1468 8.94431 19.7523 8.96338 19.4454 9.16795L16.4454 11.168C15.9859 11.4743 15.8617 12.0952 16.1681 12.5547C16.4744 13.0142 17.0953 13.1384 17.5548 12.8321L19.0001 11.8685V18C19.0001 18.5523 19.4478 19 20.0001 19C20.5524 19 21.0001 18.5523 21.0001 18V10Z"
        fill="currentColor"
    ></path>
</svg>`, description: '最大的标题'
                                },
                                {
                                    label: '标题 2', key: 'heading2', nodeType: 'heading', nodeAttrs: { level: 2 }, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M5 6C5 5.44772 4.55228 5 4 5C3.44772 5 3 5.44772 3 6V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V13H11V18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18V6C13 5.44772 12.5523 5 12 5C11.4477 5 11 5.44772 11 6V11H5V6Z"
        fill="currentColor"
    ></path>
    <path
        d="M22.0001 12C22.0001 10.7611 21.1663 9.79297 20.0663 9.42632C18.9547 9.05578 17.6171 9.28724 16.4001 10.2C15.9582 10.5314 15.8687 11.1582 16.2001 11.6C16.5314 12.0418 17.1582 12.1314 17.6001 11.8C18.383 11.2128 19.0455 11.1942 19.4338 11.3237C19.8339 11.457 20.0001 11.7389 20.0001 12C20.0001 12.4839 19.8554 12.7379 19.6537 12.9481C19.4275 13.1837 19.1378 13.363 18.7055 13.6307C18.6313 13.6767 18.553 13.7252 18.4701 13.777C17.9572 14.0975 17.3128 14.5261 16.8163 15.2087C16.3007 15.9177 16.0001 16.8183 16.0001 18C16.0001 18.5523 16.4478 19 17.0001 19H21.0001C21.5523 19 22.0001 18.5523 22.0001 18C22.0001 17.4477 21.5523 17 21.0001 17H18.131C18.21 16.742 18.3176 16.5448 18.4338 16.385C18.6873 16.0364 19.0429 15.7775 19.5301 15.473C19.5898 15.4357 19.6536 15.3966 19.7205 15.3556C20.139 15.0992 20.6783 14.7687 21.0964 14.3332C21.6447 13.7621 22.0001 13.0161 22.0001 12Z"
        fill="currentColor"
    ></path>
</svg>`, description: '中型标题'
                                },
                                {
                                    label: '标题 3', key: 'heading3', nodeType: 'heading', nodeAttrs: { level: 3 }, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M4 5C4.55228 5 5 5.44772 5 6V11H11V6C11 5.44772 11.4477 5 12 5C12.5523 5 13 5.44772 13 6V18C13 18.5523 12.5523 19 12 19C11.4477 19 11 18.5523 11 18V13H5V18C5 18.5523 4.55228 19 4 19C3.44772 19 3 18.5523 3 18V6C3 5.44772 3.44772 5 4 5Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.4608 11.2169C19.1135 11.0531 18.5876 11.0204 18.0069 11.3619C17.5309 11.642 16.918 11.4831 16.638 11.007C16.358 10.531 16.5169 9.91809 16.9929 9.63807C18.1123 8.97962 19.3364 8.94691 20.314 9.40808C21.2839 9.86558 21.9999 10.818 21.9999 12C21.9999 12.7957 21.6838 13.5587 21.1212 14.1213C20.5586 14.6839 19.7956 15 18.9999 15C18.4476 15 17.9999 14.5523 17.9999 14C17.9999 13.4477 18.4476 13 18.9999 13C19.2651 13 19.5195 12.8947 19.707 12.7071C19.8946 12.5196 19.9999 12.2652 19.9999 12C19.9999 11.6821 19.8159 11.3844 19.4608 11.2169Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0001 14C18.0001 13.4477 18.4478 13 19.0001 13C19.7957 13 20.5588 13.3161 21.1214 13.8787C21.684 14.4413 22.0001 15.2043 22.0001 16C22.0001 17.2853 21.2767 18.3971 20.1604 18.8994C19.0257 19.41 17.642 19.2315 16.4001 18.3C15.9582 17.9686 15.8687 17.3418 16.2001 16.9C16.5314 16.4582 17.1582 16.3686 17.6001 16.7C18.3581 17.2685 18.9744 17.24 19.3397 17.0756C19.7234 16.9029 20.0001 16.5147 20.0001 16C20.0001 15.7348 19.8947 15.4804 19.7072 15.2929C19.5196 15.1054 19.2653 15 19.0001 15C18.4478 15 18.0001 14.5523 18.0001 14Z"
        fill="currentColor"
    ></path>
</svg>`, description: '小型标题'
                                },
                                {
                                    label: '标题 4', key: 'heading4', nodeType: 'heading', nodeAttrs: { level: 4 }, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M4 5C4.55228 5 5 5.44772 5 6V11H11V6C11 5.44772 11.4477 5 12 5C12.5523 5 13 5.44772 13 6V18C13 18.5523 12.5523 19 12 19C11.4477 19 11 18.5523 11 18V13H5V18C5 18.5523 4.55228 19 4 19C3.44772 19 3 18.5523 3 18V6C3 5.44772 3.44772 5 4 5Z"
        fill="currentColor"
    ></path>
    <path
        d="M17 9C17.5523 9 18 9.44772 18 10V13H20V10C20 9.44772 20.4477 9 21 9C21.5523 9 22 9.44772 22 10V18C22 18.5523 21.5523 19 21 19C20.4477 19 20 18.5523 20 18V15H17C16.4477 15 16 14.5523 16 14V10C16 9.44772 16.4477 9 17 9Z"
        fill="currentColor"
    ></path>
</svg>`, description: '超小标题'
                                },
                                {
                                    label: '无序列表', key: 'bullet_list', nodeType: 'bullet_list', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 6C7 5.44772 7.44772 5 8 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H8C7.44772 7 7 6.55228 7 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 12C7 11.4477 7.44772 11 8 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H8C7.44772 13 7 12.5523 7 12Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 18C7 17.4477 7.44772 17 8 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H8C7.44772 19 7 18.5523 7 18Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 6C2 5.44772 2.44772 5 3 5H3.01C3.56228 5 4.01 5.44772 4.01 6C4.01 6.55228 3.56228 7 3.01 7H3C2.44772 7 2 6.55228 2 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 12C2 11.4477 2.44772 11 3 11H3.01C3.56228 11 4.01 11.4477 4.01 12C4.01 12.5523 3.56228 13 3.01 13H3C2.44772 13 2 12.5523 2 12Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 18C2 17.4477 2.44772 17 3 17H3.01C3.56228 17 4.01 17.4477 4.01 18C4.01 18.5523 3.56228 19 3.01 19H3C2.44772 19 2 18.5523 2 18Z"
        fill="currentColor"
    ></path>
</svg>`},
                                {
                                    label: '有序列表', key: 'ordered_list', nodeType: 'ordered_list', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 6C9 5.44772 9.44772 5 10 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H10C9.44772 7 9 6.55228 9 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 12C9 11.4477 9.44772 11 10 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H10C9.44772 13 9 12.5523 9 12Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 18C9 17.4477 9.44772 17 10 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H10C9.44772 19 9 18.5523 9 18Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 6C3 5.44772 3.44772 5 4 5H5C5.55228 5 6 5.44772 6 6V10C6 10.5523 5.55228 11 5 11C4.44772 11 4 10.5523 4 10V7C3.44772 7 3 6.55228 3 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 10C3 9.44772 3.44772 9 4 9H6C6.55228 9 7 9.44772 7 10C7 10.5523 6.55228 11 6 11H4C3.44772 11 3 10.5523 3 10Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.82219 13.0431C6.54543 13.4047 6.99997 14.1319 6.99997 15C6.99997 15.5763 6.71806 16.0426 6.48747 16.35C6.31395 16.5814 6.1052 16.8044 5.91309 17H5.99997C6.55226 17 6.99997 17.4477 6.99997 18C6.99997 18.5523 6.55226 19 5.99997 19H3.99997C3.44769 19 2.99997 18.5523 2.99997 18C2.99997 17.4237 3.28189 16.9575 3.51247 16.65C3.74323 16.3424 4.03626 16.0494 4.26965 15.8161C4.27745 15.8083 4.2852 15.8006 4.29287 15.7929C4.55594 15.5298 4.75095 15.3321 4.88748 15.15C4.96287 15.0495 4.99021 14.9922 4.99911 14.9714C4.99535 14.9112 4.9803 14.882 4.9739 14.8715C4.96613 14.8588 4.95382 14.845 4.92776 14.8319C4.87723 14.8067 4.71156 14.7623 4.44719 14.8944C3.95321 15.1414 3.35254 14.9412 3.10555 14.4472C2.85856 13.9533 3.05878 13.3526 3.55276 13.1056C4.28839 12.7378 5.12272 12.6934 5.82219 13.0431Z"
        fill="currentColor"
    ></path>
</svg>` },
                                // { label: '任务列表', key: 'task_list', nodeType: 'task_list', nodeAttrs: null, icon: TaskListIcon }
                                {
                                    label: '引用', key: 'blockquote', nodeType: 'blockquote', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 6C8 5.44772 8.44772 5 9 5H16C16.5523 5 17 5.44772 17 6C17 6.55228 16.5523 7 16 7H9C8.44772 7 8 6.55228 8 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 3C4.55228 3 5 3.44772 5 4L5 20C5 20.5523 4.55229 21 4 21C3.44772 21 3 20.5523 3 20L3 4C3 3.44772 3.44772 3 4 3Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 12C8 11.4477 8.44772 11 9 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H9C8.44772 13 8 12.5523 8 12Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 18C8 17.4477 8.44772 17 9 17H16C16.5523 17 17 17.4477 17 18C17 18.5523 16.5523 19 16 19H9C8.44772 19 8 18.5523 8 18Z"
        fill="currentColor"
    ></path>
</svg>` },
                                {
                                    label: '表格', key: 'table', nodeType: 'table', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 5C2 3.34315 3.34315 2 5 2H19C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5ZM4 5C4 4.44772 4.44772 4 5 4H11V8H4V5ZM4 10H11V14H4V10ZM20 14V10H13V14H20ZM13 16H20V19C20 19.5523 19.5523 20 19 20H13V16ZM11 16V20H5C4.44772 20 4 19.5523 4 19V16H11ZM13 8H20V5C20 4.44772 19.5523 4 19 4H13V8Z"
        fill="currentColor"
    ></path>
</svg>` },
                                { label: '代码', key: 'code_block', nodeType: 'code_block', nodeAttrs: null, icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.4545 4.2983C15.6192 3.77115 15.3254 3.21028 14.7983 3.04554C14.2712 2.88081 13.7103 3.1746 13.5455 3.70175L8.54554 19.7017C8.38081 20.2289 8.6746 20.7898 9.20175 20.9545C9.72889 21.1192 10.2898 20.8254 10.4545 20.2983L15.4545 4.2983Z"></path><path d="M6.70711 7.29289C7.09763 7.68342 7.09763 8.31658 6.70711 8.70711L3.41421 12L6.70711 15.2929C7.09763 15.6834 7.09763 16.3166 6.70711 16.7071C6.31658 17.0976 5.68342 17.0976 5.29289 16.7071L1.29289 12.7071C0.902369 12.3166 0.902369 11.6834 1.29289 11.2929L5.29289 7.29289C5.68342 6.90237 6.31658 6.90237 6.70711 7.29289Z"></path><path d="M17.2929 7.29289C17.6834 6.90237 18.3166 6.90237 18.7071 7.29289L22.7071 11.2929C23.0976 11.6834 23.0976 12.3166 22.7071 12.7071L18.7071 16.7071C18.3166 17.0976 17.6834 17.0976 17.2929 16.7071C16.9024 16.3166 16.9024 15.6834 17.2929 15.2929L20.5858 12L17.2929 8.70711C16.9024 8.31658 16.9024 7.68342 17.2929 7.29289Z"></path></svg>' },
                                { label: '分隔线', key: 'horizontal_rule', nodeType: 'horizontal_rule', nodeAttrs: null, icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z"></path></svg>' }
                            ]
                        },
                        {
                            label: '媒体',
                            // key: 'advanced',
                            type: 'group',
                            children: [
                                {
                                    label: '图片', key: 'image', nodeType: 'image', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 2C20 1.44772 19.5523 1 19 1C18.4477 1 18 1.44772 18 2V4H16C15.4477 4 15 4.44772 15 5C15 5.55228 15.4477 6 16 6H18V8C18 8.55228 18.4477 9 19 9C19.5523 9 20 8.55228 20 8V6H22C22.5523 6 23 5.55228 23 5C23 4.44772 22.5523 4 22 4H20V2ZM5 4C4.73478 4 4.48043 4.10536 4.29289 4.29289C4.10536 4.48043 4 4.73478 4 5V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H5.58579L14.379 11.2068C14.9416 10.6444 15.7045 10.3284 16.5 10.3284C17.2955 10.3284 18.0584 10.6444 18.621 11.2068L20 12.5858V12C20 11.4477 20.4477 11 21 11C21.5523 11 22 11.4477 22 12V14.998C22 14.9994 22 15.0007 22 15.002V19C22 19.7957 21.6839 20.5587 21.1213 21.1213C20.5587 21.6839 19.7957 22 19 22H6.00219C6.00073 22 5.99927 22 5.99781 22H5C4.20435 22 3.44129 21.6839 2.87868 21.1213C2.31607 20.5587 2 19.7957 2 19V5C2 4.20435 2.31607 3.44129 2.87868 2.87868C3.44129 2.31607 4.20435 2 5 2H12C12.5523 2 13 2.44772 13 3C13 3.55228 12.5523 4 12 4H5ZM8.41422 20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19V15.4142L17.207 12.6212C17.0195 12.4338 16.7651 12.3284 16.5 12.3284C16.2349 12.3284 15.9806 12.4337 15.7931 12.6211L8.41422 20ZM6.87868 6.87868C7.44129 6.31607 8.20435 6 9 6C9.79565 6 10.5587 6.31607 11.1213 6.87868C11.6839 7.44129 12 8.20435 12 9C12 9.79565 11.6839 10.5587 11.1213 11.1213C10.5587 11.6839 9.79565 12 9 12C8.20435 12 7.44129 11.6839 6.87868 11.1213C6.31607 10.5587 6 9.79565 6 9C6 8.20435 6.31607 7.44129 6.87868 6.87868ZM9 8C8.73478 8 8.48043 8.10536 8.29289 8.29289C8.10536 8.48043 8 8.73478 8 9C8 9.26522 8.10536 9.51957 8.29289 9.70711C8.48043 9.89464 8.73478 10 9 10C9.26522 10 9.51957 9.89464 9.70711 9.70711C9.89464 9.51957 10 9.26522 10 9C10 8.73478 9.89464 8.48043 9.70711 8.29289C9.51957 8.10536 9.26522 8 9 8Z"
        fill="currentColor"
    ></path>
</svg>` },
                                { label: '视频', key: 'video', nodeType: 'video', nodeAttrs: null, icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7.814 12.407c0 .295.323.479.58.33l4.165-2.407a.38.38 0 0 0 0-.66L8.394 7.263a.385.385 0 0 0-.58.33z"></path><path d="M4.5 4.125A2.125 2.125 0 0 0 2.375 6.25v7.5c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 15.5 4.125zM3.625 6.25c0-.483.392-.875.875-.875h11c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-11a.875.875 0 0 1-.875-.875z"></path></svg>' },
                                { label: '音频', key: 'audio', nodeType: 'audio', nodeAttrs: null, icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.207 3.197c.619-.578 1.63-.14 1.63.708v12.417c0 .847-1.011 1.286-1.63.708l-3.523-3.291H2.712a.625.625 0 0 1-.625-.625v-6c0-.346.28-.625.625-.625h2.972zm.38 1.356L6.357 7.57a.63.63 0 0 1-.426.169H3.337v4.75H5.93c.158 0 .31.06.426.168l3.23 3.017zm3.224 2.08a.625.625 0 0 1 .88.08 5.31 5.31 0 0 1 0 6.8.625.625 0 0 1-.96-.8 4.06 4.06 0 0 0 0-5.2.625.625 0 0 1 .08-.88"></path><path d="M16.224 4.755a.625.625 0 0 0-1.024.717 8.09 8.09 0 0 1 0 9.283.625.625 0 0 0 1.024.717 9.34 9.34 0 0 0 0-10.717"></path></svg>' },
                                { label: '文件', key: 'file', nodeType: 'file', nodeAttrs: null, icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10.184 3.64A3.475 3.475 0 0 1 15.1 8.554l-5.374 5.374a2.05 2.05 0 1 1-2.9-2.9l2.688-2.686a.625.625 0 0 1 .884.884L7.71 11.913a.8.8 0 0 0 1.13 1.131l5.375-5.374a2.225 2.225 0 1 0-3.147-3.146L5.694 9.898a3.65 3.65 0 1 0 5.162 5.161l4.702-4.702a.625.625 0 0 1 .884.884l-4.702 4.702a4.9 4.9 0 1 1-6.93-6.93z"></path></svg>' },
                                { label: '书签', key: 'bookmark', nodeType: 'bookmark', nodeAttrs: null, icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.125 4c0-1.174.951-2.125 2.125-2.125h7.5c1.174 0 2.125.951 2.125 2.125v12.502a1.125 1.125 0 0 1-1.799.9L10 14.356l-4.076 3.048a1.125 1.125 0 0 1-1.799-.901zm2.125-.875A.875.875 0 0 0 5.375 4v12.252l3.951-2.954c.4-.298.948-.298 1.348 0l3.951 2.954V4a.875.875 0 0 0-.875-.875z"></path></svg>' }
                            ]
                        },
                        {
                            label: '高级',
                            // key: 'list',
                            type: 'group',
                            children: [
                                {
                                    label: '分栏', key: 'columns', nodeType: 'columns', nodeAttrs: null, icon: `<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 6C8 5.44772 8.44772 5 9 5H16C16.5523 5 17 5.44772 17 6C17 6.55228 16.5523 7 16 7H9C8.44772 7 8 6.55228 8 6Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 3C4.55228 3 5 3.44772 5 4L5 20C5 20.5523 4.55229 21 4 21C3.44772 21 3 20.5523 3 20L3 4C3 3.44772 3.44772 3 4 3Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 12C8 11.4477 8.44772 11 9 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H9C8.44772 13 8 12.5523 8 12Z"
        fill="currentColor"
    ></path>
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 18C8 17.4477 8.44772 17 9 17H16C16.5523 17 17 17.4477 17 18C17 18.5523 16.5523 19 16 19H9C8.44772 19 8 18.5523 8 18Z"
        fill="currentColor"
    ></path>
</svg>` }
                            ]
                        },
                    ],
                    onSelect(params: any) {
                        console.log(`当前选择的节点是: `, params);
                        command(editor.view)({
                            nodeType: params.item.nodeType,
                            nodeAttrs: params.item.nodeAttrs
                            // text: suggestionState.text,
                            // query: suggestionState.query,
                            // range: suggestionState.range
                        });
                    }
                });
            }

            suggestionPopuover = new Popuover(null, {
                // trigger: 'click', 
                pos: 'tl-bl?',    // 經典下拉框左對齊自適應
                // gap: 6,
                // mask: true,       // 啟用防誤觸半透明遮罩層
                items: menu,
                container: editor.view.dom.parentNode,
                isAutoScroll: false,
                onPointerDown: e => e.preventDefault(),
                onPopuoverMouseDown(params) {
                    if (params.isOutside) {
                        const { state, dispatch } = editor.view;
                        dispatch(state.tr.setMeta('suggestion', {
                            active: false
                        }));
                    }
                    return params.isOutside;
                }
                // onChange(status) {
                //     console.log(`[Popover] 狀態變更 -> 是否展開: ${status.open}, 觸發動作: ${status.action}`);
                // }
            });
        }
        menu.activeKey = [];
        menu.selectedKeys = [];
        return suggestionPopuover;
    }

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
                update(view: EditorView) {
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
                    let params: any = {
                        editor,
                        command: command(view),
                        active,
                        range: { from: 0, to: 0 },
                        query: null,
                        text: null,
                        rect: null
                    };

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
                    if (editor.showToolbar) {
                        if (params.active) {
                            suggestionPopuover = getPopuover();
                            menu.filter(params.query);
                            menu.shortKey = true;
                            suggestionPopuover.show(params.rect);
                        } else {
                            if (suggestionPopuover) {
                                menu.shortKey = false;
                                suggestionPopuover.hide();
                            }
                        }
                    }
                    // editor.emit('action', {
                    //     type: 'suggestion',
                    //     data: params
                    // });
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
            apply(tr: Transaction, prevValue: any) {
                const { composing } = editor.view;
                const { selection } = tr;
                const { empty, from } = selection;
                if (!editor.editable || !(empty || composing)) {
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