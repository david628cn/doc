import { EditorView } from 'prosemirror-view';
import {
    DragDrop,
    getRect,
    getAlignPos,
    setPos
} from '@carvy/ui';
import {
    deleteRow,
    deleteColumn,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
    addColumnBefore,
    addColumnAfter,
    addRowBefore,
    addRowAfter,
    copyAndInsertRowAfter,
    copyAndInsertColumnAfter,
    clearCurrentRowContentAndStyle,
    clearCurrentColumnContentAndStyle,
    clearSelectedCellsContentAndStyle,
    moveRow,
    moveColumn,
    duplicateTableAfter,
    makeTableAutoWidth,
    setTableTextAlign,
    setTableVerticalAlign,
    setTableMultipleAttributes,
    checkTableStatus,
    checkTableStyle
} from '../command';
import { ToolbarDropdown } from '../../../ui';
import {
    getAxisMap,
    getSafeInfo,
    selectCellDimensionByCellNodeInfo,
    getSelectionCellsRect,
    getCellDimensionRectByCellNodeInfo,
    getCellNodeInfoByCellDom,
    moveTableRowEx as moveTableRow,
    moveTableColumnEx as moveTableColumn,
    findTable
} from '../../../utils';
import { CLASSNAME } from '../../../config';
import './index.less';

const svg = `<svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20"><path d="M6.25 4a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m5 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m1.25 7.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5M6.25 10a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0m6.25 7.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5M6.25 16a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0"></path></svg>`;

const ROW_ITEMS = [
    // 1. 文字对齐方式（强单选）
    [
        { field: 'textAlign', value: 'left', title: '左对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'center', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'right', title: '右对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'justify', title: '两端对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>' }
    ],

    { type: 'separator' },

    [
        { field: 'verticalAlign', value: 'top', title: '顶对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4C22 4.55228 21.5523 5 21 5H3C2.44772 5 2 4.55228 2 4Z" fill="currentColor"></path><path d="M13 10.4142L14.2929 11.7071C14.6834 12.0976 15.3166 12.0976 15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929L12.7071 7.29289C12.3166 6.90237 11.6834 6.90237 11.2929 7.29289L8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071C8.68342 12.0976 9.31658 12.0976 9.70711 11.7071L11 10.4142L11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20L13 10.4142Z" fill="currentColor"></path></svg>' },
        { field: 'verticalAlign', value: 'middle', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 2L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 19L12 16L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 5L12 8L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>' },
        { field: 'verticalAlign', value: 'bottom', title: '底对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 11.5858L9.70711 10.2929C9.31658 9.90237 8.68342 9.90237 8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071L11.2929 14.7071C11.6834 15.0976 12.3166 15.0976 12.7071 14.7071L15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929C15.3166 9.90237 14.6834 9.90237 14.2929 10.2929L13 11.5858V4C13 3.44771 12.5523 3 12 3C11.4477 3 11 3.44771 11 4V11.5858Z" fill="currentColor"></path><path d="M2 18C2 17.4477 2.44772 17 3 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18Z" fill="currentColor"></path></svg>' }
    ],

    { type: 'separator' },

    // 2. 文字颜色与高亮背景色
    { type: 'textStyle', field: 'textStyle' },

    { type: 'separator' },

    // 4. 表格行/列插入操作（📢 补充：标准快捷键控制）
    [
        { field: 'toggleHeaderRow', title: '标题行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 5V7V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V7V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5ZM20 19V8H16V20H19C19.5523 20 20 19.5523 20 19ZM14 20L14 8H10L10 20H14ZM8 20L8 8H4V19C4 19.5523 4.44772 20 5 20H8Z" fill="currentColor"></path></svg>' },
        { field: 'insertRowBefore', title: '在上方插入行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M19 12C20.6569 12 22 13.3431 22 15V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V15C2 13.3431 3.34315 12 5 12H19ZM5 14C4.44772 14 4 14.4477 4 15V19C4 19.5523 4.44772 20 5 20H11V14H5ZM13 20H19C19.5523 20 20 19.5523 20 19V15C20 14.4477 19.5523 14 19 14H13V20Z" fill="currentColor"></path><path d="M12 2C12.5523 2 13 2.44772 13 3V5H15C15.5523 5 16 5.44772 16 6C16 6.55228 15.5523 7 15 7H13V9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9V7H9C8.44772 7 8 6.55228 8 6C8 5.44772 8.44772 5 9 5H11V3C11 2.44772 11.4477 2 12 2Z" fill="currentColor"></path></svg>' },
        { field: 'insertRowAfter', title: '在下方插入行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 14C12.5523 14 13 14.4477 13 15V17H15C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H13V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V19H9C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17H11V15C11 14.4477 11.4477 14 12 14Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M19 2C20.6569 2 22 3.34315 22 5V9C22 10.6569 20.6569 12 19 12H5C3.34315 12 2 10.6569 2 9V5C2 3.34315 3.34315 2 5 2H19ZM5 4C4.44772 4 4 4.44772 4 5V9C4 9.55228 4.44772 10 5 10H11V4H5ZM13 10H19C19.5523 10 20 9.55228 20 9V5C20 4.44772 19.5523 4 19 4H13V10Z" fill="currentColor"></path></svg>' },
        { field: 'copyRow', title: '复制行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' },
        { field: 'clearRow', title: '清空行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H5ZM2 5C2 3.34315 3.34315 2 5 2H19C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5ZM15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L13.4142 12L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L12 13.4142L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L10.5858 12L8.29289 9.70711C7.90237 9.31658 7.90237 8.68342 8.29289 8.29289C8.68342 7.90237 9.31658 7.90237 9.70711 8.29289L12 10.5858L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289Z" fill="currentColor"></path></svg>' },
        { field: 'deleteRow', title: '删除行', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' },
        { field: 'moveRowUp', title: '行向上移', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 4.29289C12.3166 3.90237 11.6834 3.90237 11.2929 4.29289L4.29289 11.2929C3.90237 11.6834 3.90237 12.3166 4.29289 12.7071C4.68342 13.0976 5.31658 13.0976 5.70711 12.7071L11 7.41421V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V7.41421L18.2929 12.7071C18.6834 13.0976 19.3166 13.0976 19.7071 12.7071C20.0976 12.3166 20.0976 11.6834 19.7071 11.2929L12.7071 4.29289Z" fill="currentColor"></path></svg>' },
        { field: 'moveRowDown', title: '行向下移', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.707 19.707C12.3165 20.0976 11.6835 20.0976 11.293 19.707L4.29297 12.707C3.90245 12.3165 3.90245 11.6835 4.29297 11.293C4.68349 10.9024 5.31651 10.9024 5.70703 11.293L11 16.5859L11 5C11 4.44771 11.4477 4 12 4C12.5523 4 13 4.44771 13 5L13 16.5859L18.293 11.293C18.6835 10.9024 19.3165 10.9024 19.707 11.293C20.0976 11.6835 20.0976 12.3165 19.707 12.707L12.707 19.707Z" fill="currentColor"></path></svg>' },
    ],

    { type: 'separator' },

    [
        { field: 'fit', title: '自适应宽度', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 7.29303C17.6835 6.90251 18.3165 6.90251 18.707 7.29303L22.707 11.293C22.7548 11.3408 22.7976 11.3936 22.835 11.4503C22.8597 11.4877 22.8812 11.5267 22.9004 11.5665C22.9222 11.6117 22.9412 11.6584 22.9561 11.7071C22.9622 11.7274 22.9668 11.748 22.9717 11.7686C22.9893 11.843 23 11.9203 23 12.0001C23 12.0831 22.9878 12.1632 22.9688 12.2403C22.9646 12.2572 22.9611 12.2743 22.9561 12.2911C22.9421 12.337 22.9244 12.3811 22.9043 12.4239C22.8833 12.4686 22.859 12.5119 22.8311 12.5538C22.8185 12.5726 22.8048 12.5905 22.791 12.6085C22.7649 12.6423 22.738 12.6761 22.707 12.7071L18.707 16.7071C18.3165 17.0976 17.6835 17.0975 17.293 16.7071C16.9024 16.3166 16.9025 15.6836 17.293 15.293L19.5859 13.0001H4.41406L6.70703 15.293C7.09747 15.6836 7.09753 16.3166 6.70703 16.7071C6.31654 17.0976 5.6835 17.0975 5.29297 16.7071L1.29297 12.7071C1.26185 12.676 1.23417 12.6424 1.20801 12.6085C1.19423 12.5906 1.18053 12.5726 1.16797 12.5538C1.14006 12.5119 1.11566 12.4686 1.09473 12.4239C1.07465 12.3811 1.0569 12.3369 1.04297 12.2911C1.0379 12.2743 1.03445 12.2572 1.03027 12.2403C1.01124 12.1633 1.00001 12.083 1 12.0001C1 11.9204 1.00974 11.8429 1.02734 11.7686C1.03221 11.7481 1.03678 11.7274 1.04297 11.7071C1.05787 11.6583 1.07777 11.6117 1.09961 11.5665C1.11877 11.5267 1.1403 11.4877 1.16504 11.4503C1.20242 11.3936 1.24516 11.3408 1.29297 11.293L5.29297 7.29303C5.68349 6.90251 6.31651 6.90251 6.70703 7.29303C7.09747 7.68356 7.09753 8.3166 6.70703 8.70709L4.41406 11.0001H19.5859L17.293 8.70709C16.9024 8.31657 16.9025 7.68356 17.293 7.29303Z" fill="currentColor"></path></svg>' },
        { field: 'deleteTable', title: '删除表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' },
        { field: 'copyTable', title: '复制表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' }
    ]
];

const COLUMN_ITEMS = [
    // 1. 文字对齐方式（强单选）
    [
        { field: 'textAlign', value: 'left', title: '左对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'center', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'right', title: '右对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'justify', title: '两端对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>' }
    ],

    { type: 'separator' },

    [
        { field: 'verticalAlign', value: 'top', title: '顶对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4C22 4.55228 21.5523 5 21 5H3C2.44772 5 2 4.55228 2 4Z" fill="currentColor"></path><path d="M13 10.4142L14.2929 11.7071C14.6834 12.0976 15.3166 12.0976 15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929L12.7071 7.29289C12.3166 6.90237 11.6834 6.90237 11.2929 7.29289L8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071C8.68342 12.0976 9.31658 12.0976 9.70711 11.7071L11 10.4142L11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20L13 10.4142Z" fill="currentColor"></path></svg>' },
        { field: 'verticalAlign', value: 'middle', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 2L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 19L12 16L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 5L12 8L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>' },
        { field: 'verticalAlign', value: 'bottom', title: '底对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 11.5858L9.70711 10.2929C9.31658 9.90237 8.68342 9.90237 8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071L11.2929 14.7071C11.6834 15.0976 12.3166 15.0976 12.7071 14.7071L15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929C15.3166 9.90237 14.6834 9.90237 14.2929 10.2929L13 11.5858V4C13 3.44771 12.5523 3 12 3C11.4477 3 11 3.44771 11 4V11.5858Z" fill="currentColor"></path><path d="M2 18C2 17.4477 2.44772 17 3 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18Z" fill="currentColor"></path></svg>' }
    ],

    { type: 'separator' },

    // 2. 文字颜色与高亮背景色
    { type: 'textStyle', field: 'textStyle' },

    { type: 'separator' },

    // 4. 表格行/列插入操作（📢 补充：标准快捷键控制）
    [
        { field: 'toggleHeaderColumn', title: '标题列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M22 19V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19ZM8 20V16H20V19C20 19.5523 19.5523 20 19 20H8ZM8 14L20 14V10L8 10V14ZM20 8L8 8V4H19C19.5523 4 20 4.44772 20 5V8Z" fill="currentColor"></path></svg>' },
        { field: 'insertColumnBefore', title: '在左侧插入列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H15C13.3431 22 12 20.6569 12 19V5C12 3.34315 13.3431 2 15 2H19ZM14 19C14 19.5523 14.4477 20 15 20H19C19.5523 20 20 19.5523 20 19V13H14V19ZM15 4C14.4477 4 14 4.44772 14 5V11H20V5C20 4.44772 19.5523 4 19 4H15Z" fill="currentColor"></path><path d="M6 8C6.55228 8 7 8.44772 7 9V11H9C9.55228 11 10 11.4477 10 12C10 12.5523 9.55228 13 9 13H7V15C7 15.5523 6.55228 16 6 16C5.44772 16 5 15.5523 5 15V13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H5V9C5 8.44772 5.44772 8 6 8Z" fill="currentColor"></path></svg>' },
        { field: 'insertColumnAfter', title: '在右侧插入列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9 2C10.6569 2 12 3.34315 12 5V19C12 20.6569 10.6569 22 9 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H9ZM4 19C4 19.5523 4.44772 20 5 20H9C9.55228 20 10 19.5523 10 19V13H4V19ZM5 4C4.44772 4 4 4.44772 4 5V11H10V5C10 4.44772 9.55228 4 9 4H5Z" fill="currentColor"></path><path d="M18 8C18.5523 8 19 8.44772 19 9V11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H19V15C19 15.5523 18.5523 16 18 16C17.4477 16 17 15.5523 17 15V13H15C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11H17V9C17 8.44772 17.4477 8 18 8Z" fill="currentColor"></path></svg>' },
        { field: 'copyColumn', title: '复制列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' },
        { field: 'clearColumn', title: '清空列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H5ZM2 5C2 3.34315 3.34315 2 5 2H19C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5ZM15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L13.4142 12L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L12 13.4142L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L10.5858 12L8.29289 9.70711C7.90237 9.31658 7.90237 8.68342 8.29289 8.29289C8.68342 7.90237 9.31658 7.90237 9.70711 8.29289L12 10.5858L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289Z" fill="currentColor"></path></svg>' },
        { field: 'deleteColumn', title: '删除列', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' },
        { field: 'moveColumnLeft', title: '列向左移', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.7071 5.70711C13.0976 5.31658 13.0976 4.68342 12.7071 4.29289C12.3166 3.90237 11.6834 3.90237 11.2929 4.29289L4.29289 11.2929C3.90237 11.6834 3.90237 12.3166 4.29289 12.7071L11.2929 19.7071C11.6834 20.0976 12.3166 20.0976 12.7071 19.7071C13.0976 19.3166 13.0976 18.6834 12.7071 18.2929L7.41421 13L19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11L7.41421 11L12.7071 5.70711Z" fill="currentColor"></path></svg>' },
        { field: 'moveColumnRight', title: '列向右移', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 4.29289C12.3166 3.90237 11.6834 3.90237 11.2929 4.29289C10.9024 4.68342 10.9024 5.31658 11.2929 5.70711L16.5858 11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H16.5858L11.2929 18.2929C10.9024 18.6834 10.9024 19.3166 11.2929 19.7071C11.6834 20.0976 12.3166 20.0976 12.7071 19.7071L19.7071 12.7071C20.0976 12.3166 20.0976 11.6834 19.7071 11.2929L12.7071 4.29289Z" fill="currentColor"></path></svg>' },
    ],

    { type: 'separator' },

    [
        { field: 'fit', title: '自适应宽度', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 7.29303C17.6835 6.90251 18.3165 6.90251 18.707 7.29303L22.707 11.293C22.7548 11.3408 22.7976 11.3936 22.835 11.4503C22.8597 11.4877 22.8812 11.5267 22.9004 11.5665C22.9222 11.6117 22.9412 11.6584 22.9561 11.7071C22.9622 11.7274 22.9668 11.748 22.9717 11.7686C22.9893 11.843 23 11.9203 23 12.0001C23 12.0831 22.9878 12.1632 22.9688 12.2403C22.9646 12.2572 22.9611 12.2743 22.9561 12.2911C22.9421 12.337 22.9244 12.3811 22.9043 12.4239C22.8833 12.4686 22.859 12.5119 22.8311 12.5538C22.8185 12.5726 22.8048 12.5905 22.791 12.6085C22.7649 12.6423 22.738 12.6761 22.707 12.7071L18.707 16.7071C18.3165 17.0976 17.6835 17.0975 17.293 16.7071C16.9024 16.3166 16.9025 15.6836 17.293 15.293L19.5859 13.0001H4.41406L6.70703 15.293C7.09747 15.6836 7.09753 16.3166 6.70703 16.7071C6.31654 17.0976 5.6835 17.0975 5.29297 16.7071L1.29297 12.7071C1.26185 12.676 1.23417 12.6424 1.20801 12.6085C1.19423 12.5906 1.18053 12.5726 1.16797 12.5538C1.14006 12.5119 1.11566 12.4686 1.09473 12.4239C1.07465 12.3811 1.0569 12.3369 1.04297 12.2911C1.0379 12.2743 1.03445 12.2572 1.03027 12.2403C1.01124 12.1633 1.00001 12.083 1 12.0001C1 11.9204 1.00974 11.8429 1.02734 11.7686C1.03221 11.7481 1.03678 11.7274 1.04297 11.7071C1.05787 11.6583 1.07777 11.6117 1.09961 11.5665C1.11877 11.5267 1.1403 11.4877 1.16504 11.4503C1.20242 11.3936 1.24516 11.3408 1.29297 11.293L5.29297 7.29303C5.68349 6.90251 6.31651 6.90251 6.70703 7.29303C7.09747 7.68356 7.09753 8.3166 6.70703 8.70709L4.41406 11.0001H19.5859L17.293 8.70709C16.9024 8.31657 16.9025 7.68356 17.293 7.29303Z" fill="currentColor"></path></svg>' },
        { field: 'deleteTable', title: '删除表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' },
        { field: 'copyTable', title: '复制表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' }
    ]
];

const CELLS_ITEMS = [
    // 1. 文字对齐方式（强单选）
    [
        { field: 'textAlign', value: 'left', title: '左对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'center', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'right', title: '右对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'justify', title: '两端对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>' }
    ],

    { type: 'separator' },

    [
        { field: 'verticalAlign', value: 'top', title: '顶对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4C22 4.55228 21.5523 5 21 5H3C2.44772 5 2 4.55228 2 4Z" fill="currentColor"></path><path d="M13 10.4142L14.2929 11.7071C14.6834 12.0976 15.3166 12.0976 15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929L12.7071 7.29289C12.3166 6.90237 11.6834 6.90237 11.2929 7.29289L8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071C8.68342 12.0976 9.31658 12.0976 9.70711 11.7071L11 10.4142L11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20L13 10.4142Z" fill="currentColor"></path></svg>' },
        { field: 'verticalAlign', value: 'middle', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 2L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 19L12 16L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 5L12 8L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>' },
        { field: 'verticalAlign', value: 'bottom', title: '底对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 11.5858L9.70711 10.2929C9.31658 9.90237 8.68342 9.90237 8.29289 10.2929C7.90237 10.6834 7.90237 11.3166 8.29289 11.7071L11.2929 14.7071C11.6834 15.0976 12.3166 15.0976 12.7071 14.7071L15.7071 11.7071C16.0976 11.3166 16.0976 10.6834 15.7071 10.2929C15.3166 9.90237 14.6834 9.90237 14.2929 10.2929L13 11.5858V4C13 3.44771 12.5523 3 12 3C11.4477 3 11 3.44771 11 4V11.5858Z" fill="currentColor"></path><path d="M2 18C2 17.4477 2.44772 17 3 17H21C21.5523 17 22 17.4477 22 18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18Z" fill="currentColor"></path></svg>' }
    ],

    { type: 'separator' },

    // 2. 文字颜色与高亮背景色
    { type: 'textStyle', field: 'textStyle' },

    { type: 'separator' },

    // 5. 合并与拆分单元格操作（📢 补充：标准快捷键控制）
    [
        { field: 'mergeCells', title: '合并单元格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 16C10.5177 16 10.9438 16.3933 10.9951 16.8975L11 17V19C11 20.6569 9.65685 22 8 22H4C2.34315 22 1 20.6569 1 19V17C1 16.4477 1.44772 16 2 16C2.55228 16 3 16.4477 3 17V19C3 19.5523 3.44772 20 4 20H8C8.55228 20 9 19.5523 9 19V17L9.00488 16.8975C9.05621 16.3933 9.48232 16 10 16Z" fill="currentColor"></path><path d="M22 16C22.5177 16 22.9438 16.3933 22.9951 16.8975L23 17V19C23 20.6569 21.6569 22 20 22H16C14.3431 22 13 20.6569 13 19V17C13 16.4477 13.4477 16 14 16C14.5523 16 15 16.4477 15 17V19C15 19.5523 15.4477 20 16 20H20C20.5523 20 21 19.5523 21 19V17L21.0049 16.8975C21.0562 16.3933 21.4823 16 22 16Z" fill="currentColor"></path><path d="M5.29297 8.29297C5.68349 7.90244 6.31651 7.90244 6.70703 8.29297L9.70703 11.293L9.77539 11.3691C10.0957 11.7619 10.0731 12.3409 9.70703 12.707L6.70703 15.707C6.31651 16.0975 5.68349 16.0975 5.29297 15.707C4.90245 15.3165 4.90245 14.6835 5.29297 14.293L6.58594 13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H6.58594L5.29297 9.70703C4.90245 9.31651 4.90245 8.68349 5.29297 8.29297Z" fill="currentColor"></path><path d="M17.293 8.29297C17.6835 7.90245 18.3165 7.90246 18.707 8.29297C19.0976 8.68349 19.0976 9.31651 18.707 9.70703L17.4141 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H17.4141L18.707 14.293C19.0976 14.6835 19.0976 15.3165 18.707 15.707C18.3165 16.0976 17.6835 16.0976 17.293 15.707L14.293 12.707L14.2246 12.6309C13.9043 12.2381 13.9269 11.6591 14.293 11.293L17.293 8.29297Z" fill="currentColor"></path><path d="M8 2C9.65685 2 11 3.34315 11 5V7C11 7.55228 10.5523 8 10 8C9.44771 8 9 7.55228 9 7V5C9 4.44772 8.55228 4 8 4H4C3.44772 4 3 4.44772 3 5V7C3 7.55228 2.55228 8 2 8C1.44772 8 1 7.55228 1 7V5C1 3.34315 2.34315 2 4 2H8Z" fill="currentColor"></path><path d="M20 2C21.6569 2 23 3.34315 23 5V7C23 7.55228 22.5523 8 22 8C21.4477 8 21 7.55228 21 7V5C21 4.44772 20.5523 4 20 4H16C15.4477 4 15 4.44772 15 5V7C15 7.55228 14.5523 8 14 8C13.4477 8 13 7.55228 13 7V5C13 3.34315 14.3431 2 16 2H20Z" fill="currentColor"></path></svg>' },
        { field: 'splitCell', title: '拆分单元格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 2C2.34315 2 1 3.34315 1 5V7C1 7.55228 1.44772 8 2 8C2.55228 8 3 7.55228 3 7V5C3 4.44772 3.44772 4 4 4H8C8.55228 4 9 4.44772 9 5V7C9 7.55228 9.44772 8 10 8C10.5523 8 11 7.55228 11 7V5C11 3.34315 9.65685 2 8 2H4Z" fill="currentColor"></path><path d="M20 22C21.6569 22 23 20.6569 23 19V17C23 16.4477 22.5523 16 22 16C21.4477 16 21 16.4477 21 17V19C21 19.5523 20.5523 20 20 20H16C15.4477 20 15 19.5523 15 19V17C15 16.4477 14.5523 16 14 16C13.4477 16 13 16.4477 13 17V19C13 20.6569 14.3431 22 16 22H20Z" fill="currentColor"></path><path d="M13 5C13 3.34315 14.3431 2 16 2H20C21.6569 2 23 3.34315 23 5V7C23 7.55228 22.5523 8 22 8C21.4477 8 21 7.55228 21 7V5C21 4.44772 20.5523 4 20 4H16C15.4477 4 15 4.44772 15 5V7C15 7.55228 14.5523 8 14 8C13.4477 8 13 7.55228 13 7V5Z" fill="currentColor"></path><path d="M8 22C9.65685 22 11 20.6569 11 19V17C11 16.4477 10.5523 16 10 16C9.44772 16 9 16.4477 9 17V19C9 19.5523 8.55229 20 8 20H4C3.44772 20 3 19.5523 3 19L3 17C3 16.4477 2.55229 16 2 16C1.44772 16 1 16.4477 1 17V19C1 20.6569 2.34315 22 4 22H8Z" fill="currentColor"></path><path d="M18.7071 15.7071L21.7061 12.7081C21.8877 12.527 22 12.2766 22 12L22 11.997C21.9992 11.7421 21.9016 11.4874 21.7071 11.2929L18.7071 8.29289C18.3166 7.90237 17.6834 7.90237 17.2929 8.29289C16.9024 8.68342 16.9024 9.31658 17.2929 9.70711L18.5858 11H15C14.4477 11 14 11.4477 14 12C14 12.5523 14.4477 13 15 13H18.5858L17.2929 14.2929C16.9024 14.6834 16.9024 15.3166 17.2929 15.7071C17.6834 16.0976 18.3166 16.0976 18.7071 15.7071Z" fill="currentColor"></path><path d="M2.07588 11.6172C2.02699 11.7351 2 11.8644 2 12C2 12.2728 2.10925 12.5201 2.2864 12.7005C2.28879 12.703 2.2912 12.7054 2.29362 12.7078L5.29289 15.7071C5.68342 16.0976 6.31658 16.0976 6.70711 15.7071C7.09763 15.3166 7.09763 14.6834 6.70711 14.2929L5.41421 13L9 13C9.55228 13 10 12.5523 10 12C10 11.4477 9.55229 11 9 11L5.41421 11L6.70711 9.70711C7.09763 9.31658 7.09763 8.68342 6.70711 8.29289C6.31658 7.90237 5.68342 7.90237 5.29289 8.29289L2.29366 11.2921C2.29122 11.2946 2.2888 11.297 2.2864 11.2995C2.19374 11.3938 2.12357 11.502 2.07588 11.6172Z" fill="currentColor"></path></svg>' },
        { field: 'clearCell', title: '清空单元格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H5ZM2 5C2 3.34315 3.34315 2 5 2H19C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5ZM15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L13.4142 12L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L12 13.4142L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L10.5858 12L8.29289 9.70711C7.90237 9.31658 7.90237 8.68342 8.29289 8.29289C8.68342 7.90237 9.31658 7.90237 9.70711 8.29289L12 10.5858L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289Z" fill="currentColor"></path></svg>' }
    ],

    { type: 'separator' },

    [
        { field: 'fit', title: '自适应宽度', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 7.29303C17.6835 6.90251 18.3165 6.90251 18.707 7.29303L22.707 11.293C22.7548 11.3408 22.7976 11.3936 22.835 11.4503C22.8597 11.4877 22.8812 11.5267 22.9004 11.5665C22.9222 11.6117 22.9412 11.6584 22.9561 11.7071C22.9622 11.7274 22.9668 11.748 22.9717 11.7686C22.9893 11.843 23 11.9203 23 12.0001C23 12.0831 22.9878 12.1632 22.9688 12.2403C22.9646 12.2572 22.9611 12.2743 22.9561 12.2911C22.9421 12.337 22.9244 12.3811 22.9043 12.4239C22.8833 12.4686 22.859 12.5119 22.8311 12.5538C22.8185 12.5726 22.8048 12.5905 22.791 12.6085C22.7649 12.6423 22.738 12.6761 22.707 12.7071L18.707 16.7071C18.3165 17.0976 17.6835 17.0975 17.293 16.7071C16.9024 16.3166 16.9025 15.6836 17.293 15.293L19.5859 13.0001H4.41406L6.70703 15.293C7.09747 15.6836 7.09753 16.3166 6.70703 16.7071C6.31654 17.0976 5.6835 17.0975 5.29297 16.7071L1.29297 12.7071C1.26185 12.676 1.23417 12.6424 1.20801 12.6085C1.19423 12.5906 1.18053 12.5726 1.16797 12.5538C1.14006 12.5119 1.11566 12.4686 1.09473 12.4239C1.07465 12.3811 1.0569 12.3369 1.04297 12.2911C1.0379 12.2743 1.03445 12.2572 1.03027 12.2403C1.01124 12.1633 1.00001 12.083 1 12.0001C1 11.9204 1.00974 11.8429 1.02734 11.7686C1.03221 11.7481 1.03678 11.7274 1.04297 11.7071C1.05787 11.6583 1.07777 11.6117 1.09961 11.5665C1.11877 11.5267 1.1403 11.4877 1.16504 11.4503C1.20242 11.3936 1.24516 11.3408 1.29297 11.293L5.29297 7.29303C5.68349 6.90251 6.31651 6.90251 6.70703 7.29303C7.09747 7.68356 7.09753 8.3166 6.70703 8.70709L4.41406 11.0001H19.5859L17.293 8.70709C16.9024 8.31657 16.9025 7.68356 17.293 7.29303Z" fill="currentColor"></path></svg>' },
        { field: 'deleteTable', title: '删除表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' },
        { field: 'copyTable', title: '复制表格', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' }
    ]
];

let selectRect: any;
let handle: any;
let toolbar: any;

export type CtrolPanelProps = {
    editor: any;
    view: EditorView;
    tableContainer: HTMLElement | null | undefined;
    // container?: HTMLElement | null | undefined;
    cell?: HTMLElement | null | undefined;
    // onClickPanel?: Function;
    // onStart?: Function;
    // onMove?: Function;
    // onEnd?: Function;
    [key: string]: unknown;
};

export class CtrolPanel {
    editor?: any
    view: any;
    tableContainer: any;
    ctrolPanel: any;
    table: any;
    colPanel: any;
    rowPanel: any;
    indicator: any;
    cell: any;
    moving: 'col' | 'row' | null = null;
    drag: any;
    current: any;
    matrix: any;
    sourceRange: any;
    toIndex: any;
    preview: any;
    previewRect: any = {
        width: 0,
        height: 0,
        left: 0,
        top: 0
    };
    constructor(props: CtrolPanelProps) {
        Object.assign(this, props);
        const inner = this.tableContainer.childNodes[0] as HTMLElement;
        this.table = inner.firstChild as HTMLTableElement;
        this.ctrolPanel = this.tableContainer.childNodes[1] as HTMLElement;

        this.colPanel = document.createElement('div');
        this.colPanel.className = `${CLASSNAME}-table-view-col-panel`;
        // this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z" fill="currentColor"></path></svg></div>`;
        this.colPanel.innerHTML = `<div class="${CLASSNAME}-table-view-col-panel-inner">${svg}</div>`;

        this.rowPanel = document.createElement('div');
        this.rowPanel.className = `${CLASSNAME}-table-view-row-panel`;
        this.rowPanel.innerHTML = `<div class="${CLASSNAME}-table-view-row-panel-inner">${svg}</div>`;

        this.indicator = document.createElement('div');
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator`;

        this.ctrolPanel.appendChild(this.colPanel);
        this.ctrolPanel.appendChild(this.rowPanel);
        this.ctrolPanel.appendChild(this.indicator);

        this.drag = {};
        [this.colPanel.firstChild, this.rowPanel.firstChild].forEach((handle: any, index: number) => {
            const type = index === 0 ? 'col' : 'row';
            this.drag[type] = new DragDrop({
                handle,
                container: this.tableContainer,
                // preview: this.preview,
                translate: true,
                onStart: (e: any, drag: DragDrop) => {
                    this.handleStart(type, drag);
                },
                onMove: (e: any, drag: DragDrop) => {
                    this.handleMove(type, drag);
                },
                onEnd: (e: any, drag: DragDrop) => {
                    this.handleEnd(type, drag);
                }
            });
        });
        // this.ctrolPanel.addEventListener('click', this.handleClickPanel, false);
    }

    // onClickPanel = (e: MouseEvent, type: 'col' | 'row') => { }
    // onStart(e: any, type: 'col' | 'row') { }
    // onMove(e: any, type: 'col' | 'row') { }
    // onEnd(e: any, type: 'col' | 'row') { }

    // handleClickPanel = (e: any) => {
    //     // if (!isTouchEvent(e)) {
    //     // }
    //     if (e.preventDefault) {
    //         e.preventDefault();
    //     } else {
    //         e.returnValue = false;
    //     }
    //     if (e.stopPropagation) {
    //         e.stopPropagation();
    //     } else {
    //         e.cancelBubble = true;
    //     }
    //     const col = this.colPanel?.contains(e.target as Node);
    //     const row = this.rowPanel?.contains(e.target as Node);
    //     if (col || row) {
    //         let type: 'col' | 'row';
    //         if (col) {
    //             type = 'col';
    //         } else if (row) {
    //             type = 'row';
    //         }
    //         // selectDimensionByCell(this.view, this.cell, type);
    //         this.onClickPanel?.(e, type);
    //     }
    // }
    handleStart(type: 'col' | 'row' = 'row', drag: DragDrop) {
        const cellNodeInfo = getCellNodeInfoByCellDom(this.view, this.cell as HTMLTableCellElement, type);
        if (!cellNodeInfo) {
            return;
        }
        if (selectCellDimensionByCellNodeInfo(this.view, cellNodeInfo, type)) {
            this.matrix = cellNodeInfo.matrix;
            this.sourceRange = cellNodeInfo.cellRange;
            this.toIndex = this.sourceRange.start;
            const previewcontainer = this.view.dom.parentNode as HTMLDivElement;
            this.previewRect = getCellDimensionRectByCellNodeInfo(this.view, cellNodeInfo, type, previewcontainer);
            this.createPreview(this.previewRect, previewcontainer);
            drag.preview = this.preview;
        }
    }
    handleMove(type: 'col' | 'row' = 'row', drag: DragDrop) {
        this.moving = type;
        const safeInfo = getSafeInfo(drag.endPos, getAxisMap(this.table), this.matrix, type);
        this.toIndex = safeInfo.index;
        this.showIndicator(safeInfo.pos, type);
        setPos(this.preview, {
            left: type === 'row' ? this.previewRect.left : this.previewRect.left + drag.increase.left,
            top: type === 'col' ? this.previewRect.top : this.previewRect.top + drag.increase.top
        }, true);
    }
    handleEnd(type: 'col' | 'row' = 'row', drag: DragDrop) {
        let isClick = false;
        if (!this.moving) {
            isClick = true;
        }

        drag.preview = null;
        this.moving = null;
        this.current = null;
        this.hidePreview();
        this.hideIndicator();

        if (isClick) {
            this.showPopover(type === 'col' ? this.colPanel : this.rowPanel, type);
            return;
        }

        const { start, end } = this.sourceRange;
        let finalTo = this.toIndex;

        // if (finalTo >= start && finalTo <= end + 1) {
        //     console.log('原地移动');
        // } else {

        // }
        if (finalTo < start || finalTo > end + 1) {
            // 2. 核心换算逻辑
            if (finalTo > end) {
                // 向后移：目标索引减去移动块的大小
                // finalTo = finalTo - (end - start + 1);
                finalTo = finalTo - 1;
            }
            const { state, dispatch } = this.view;
            try {
                const command = type === 'col'
                    ? moveTableColumn({ from: start, to: finalTo, select: true })
                    : moveTableRow({ from: start, to: finalTo, select: true });
                const success = command(state, dispatch);
                // if (success) {
                //     setTimeout(() => {
                //         selectCellDimension(this.view, this.cell as HTMLTableCellElement, type);
                //     }, 1000);

                // }
            } catch (err: any) {
                console.warn("Caught Prosemirror Table Map Error:", err);
            }
        }


        // 1. 拦截原地移动：目标线在源块的范围内（start 到 end+1）
        // if (finalTo < start || finalTo > end + 1) {
        //     const { state, dispatch } = this.view;

        //     if (finalTo > start) {
        //         // finalTo = finalTo - (end - start + 1);
        //         finalTo = finalTo - 1;
        //     }

        //     try {
        //         const command = type === 'col'
        //             ? moveTableColumn({ from: start, to: finalTo })
        //             : moveTableRow({ from: start, to: finalTo });
        //         command(state, dispatch);
        //         // const success = command(state, dispatch);
        //         // if (success) {
        //         //     setTimeout(() => this.view.focus(), 10);
        //         // }
        //     } catch (err: any) {
        //         console.warn("Caught Prosemirror Table Map Error:", err);
        //     }
        // }
    }
    createPreview(rect: any, container?: HTMLDivElement) {
        if (this.preview && this.preview.parentNode) {
            this.preview.parentNode.removeChild(this.preview);
        }
        if (!this.preview) {
            this.preview = document.createElement('div');
            this.preview.className = `${CLASSNAME}-table-view-ctrol-panel-preview`;
        }
        // if (content) {
        //     this.preview.appendChild(content);
        // }
        this.preview.style.opacity = '1';
        if (rect) {
            this.preview.style.width = `${rect.width}px`;
            this.preview.style.height = `${rect.height}px`;
            setPos(this.preview, {
                left: rect.left,
                top: rect.top
            }, true);
        }
        (container || document.body).appendChild(this.preview);
    }
    hidePreview() {
        if (this.preview && this.preview.parentNode) {
            this.preview.parentNode.removeChild(this.preview);
        }
        this.preview.style.opacity = '0';
        this.preview.innerHTML = '';
    }
    showIndicator(pos: number, axis: 'row' | 'col') {
        if (!this.indicator) {
            return;
        }
        this.indicator.className = `${CLASSNAME}-table-view-ctrol-panel-indicator ${CLASSNAME}-table-view-ctrol-panel-${axis}-axis`;
        this.indicator.style.opacity = '1';
        const ctrolPanelRect = getRect(this.ctrolPanel);
        // const scrollLeft = getScroll(this.tableContainer);
        if (axis === 'row') {
            setPos(this.indicator, {
                // width: containerRect.width,
                left: 0,
                top: pos - ctrolPanelRect.top
            }, true);
        } else {
            setPos(this.indicator, {
                // height: containerRect.height,
                left: pos - ctrolPanelRect.left,
                top: 0
            }, true);
        }
    }
    hideIndicator() {
        this.indicator.style.opacity = '0';
        setPos(this.indicator, {
            left: 0,
            top: 0
        }, true);
    }
    showColPanel() {
        if (this.colPanel) {
            this.colPanel.classList.add(`${CLASSNAME}-table-view-col-panel-show`);
            if (this.cell) {
                this.colPanel.style.width = `${this.cell.offsetWidth}px`;
                const pos = getAlignPos(this.colPanel, this.cell, {
                    placement: 'bl-tl',
                    container: this.ctrolPanel
                });
                setPos(this.colPanel, {
                    ...pos,
                    top: 0
                }, true);
            }
        }
    }
    hideColPanel() {
        if (this.colPanel) {
            this.colPanel.classList.remove(`${CLASSNAME}-table-view-col-panel-show`);
        }
    }
    showRowPanel() {
        if (this.rowPanel) {
            this.rowPanel.classList.add(`${CLASSNAME}-table-view-row-panel-show`);
            if (this.cell) {
                this.rowPanel.style.height = `${this.cell.offsetHeight}px`;
                const pos = getAlignPos(this.rowPanel, this.cell, {
                    placement: 'tr-tl',
                    container: this.ctrolPanel
                });
                setPos(this.rowPanel, {
                    ...pos,
                    left: 0
                }, true);
            }
        }
    }
    hideRowPanel() {
        if (this.rowPanel) {
            this.rowPanel.classList.remove(`${CLASSNAME}-table-view-row-panel-show`);
        }
    }
    showPopover(rect: any, type: string) {
        if (toolbar) {
            toolbar.hide();
        }
        if (!toolbar) {
            toolbar = new ToolbarDropdown(this.view.dom.parentNode, {
                onChange: ({ field, value }) => {
                    const view = this.view;
                    if (!view) return;
                    const { state, dispatch } = view;
                    switch (field) {
                        case 'insertRowBefore':
                            addRowBefore(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'insertRowAfter':
                            addRowAfter(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'insertColumnBefore':
                            addColumnBefore(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'insertColumnAfter':
                            addColumnAfter(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'copyRow':
                            copyAndInsertRowAfter(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'copyColumn':
                            copyAndInsertColumnAfter(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'mergeCells':
                            mergeCells(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'splitCell':
                            splitCell(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'clearRow':
                            clearCurrentRowContentAndStyle(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'clearColumn':
                            clearCurrentColumnContentAndStyle(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'clearCell':
                            clearSelectedCellsContentAndStyle(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'moveRowUp':
                            moveRow('up')(state, dispatch);
                            break;
                        case 'moveRowDown':
                            moveRow('down')(state, dispatch);
                            break;
                        case 'moveColumnLeft':
                            moveColumn('left')(state, dispatch);
                            break;
                        case 'moveColumnRight':
                            moveColumn('right')(state, dispatch);
                            break;
                        case 'copyTable':
                            // copyWholeTable(state);
                            duplicateTableAfter(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'fit':
                            makeTableAutoWidth(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'deleteRow':
                            deleteRow(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'deleteColumn':
                            deleteColumn(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'deleteTable':
                            // if (confirm('确认要彻底删除当前表格吗？')) {
                                deleteTable(state, dispatch);
                                // clearWholeTableContentAndStyle(state, dispatch);
                            // }
                            toolbar.hide();
                            break;
                        case 'textAlign':
                            setTableTextAlign(value)(state, dispatch);
                            break;
                        case 'verticalAlign':
                            setTableVerticalAlign(value)(state, dispatch);
                            break;
                        case 'textStyle':
                            setTableMultipleAttributes({
                                backgroundColor: value.backgroundColor,
                                textColor: value.color
                            })(state, dispatch);
                            break;
                        case 'toggleHeaderRow':
                            toggleHeaderRow(state, dispatch);
                            toolbar.hide();
                            break;
                        case 'toggleHeaderColumn':
                            toggleHeaderColumn(state, dispatch);
                            toolbar.hide();
                            break;
                        default:
                            break;
                    }
                }
            });
        }
        // 2. 依据传入环境类型动态重构工具栏 items
        if (type === 'cells') {
            toolbar.items = CELLS_ITEMS;
        } else if (type === 'row') {
            toolbar.items = ROW_ITEMS;
        } else if (type === 'col') {
            toolbar.items = COLUMN_ITEMS;
        }

        // 3. 📢 核心注入：在每次展示前测算 18 合 1 的置灰条件并倒灌进当前动态 items
        if (this.view) {
            const latestDisabledMap = checkTableStatus(this.view.state);
            const tableStyle = checkTableStyle(this.view.state);
            toolbar.disabled = latestDisabledMap;
            toolbar.value = tableStyle;
        }
        // 4. 显示弹窗
        toolbar.show(getRect(rect));
    }
    onClick = (e: MouseEvent) => {
        e.preventDefault();
        // e.stopPropagation();
        this.showPopover(e.target, 'cells');
    }
    showSelectionCells(view: EditorView) {
        if (!selectRect) {
            selectRect = document.createElement('div');
            selectRect.className = `${CLASSNAME}-table-view-cell-selection`;
            const inner = document.createElement('div');
            inner.className = `${CLASSNAME}-table-view-cell-selection-inner`;
            handle = document.createElement('div');
            handle.className = `${CLASSNAME}-table-view-cell-selection-handle`;
            handle.innerHTML = svg;
            handle.addEventListener('pointerdown', this.onClick);
            inner.appendChild(handle);
            selectRect.appendChild(inner);
        }
        const rect = getSelectionCellsRect(view);
        if (!rect) {
            if (selectRect.parentNode) {
                selectRect.parentNode.removeChild(selectRect);
            }
            return;
        }
        const { from } = view.state.selection;
        const $from = view.state.doc.resolve(from);
        const tableNodeInfo: any = findTable($from);
        const tableContainerDom: any = view.nodeDOM(tableNodeInfo.pos);
        const ctrolPanel: any = tableContainerDom.childNodes[1];
        if (!ctrolPanel) {
            if (selectRect.parentNode) {
                selectRect.parentNode.removeChild(selectRect);
            }
            return;
        }
        if (ctrolPanel !== selectRect.parentNode) {
            if (selectRect.parentNode) {
                selectRect.parentNode.removeChild(selectRect);
            }
            ctrolPanel.appendChild(selectRect);
        }
        selectRect.style.width = `${rect.width}px`;
        selectRect.style.height = `${rect.height}px`;
        const ctrolPanelRect = getRect(ctrolPanel);
        // const l = getPadding(scrop.ctrolPanel, 'l');
        // const t = getPadding(scrop.ctrolPanel, 't');
        setPos(selectRect, {
            left: rect.left - ctrolPanelRect.left,
            top: rect.top - ctrolPanelRect.top
        }, true);
    }
    destroy() {
        for (let n in this.drag) {
            this.drag[n].destroy?.();
        }
        handle.addEventListener('pointerdown', this.onClick, false);
        this.drag = null;
        selectRect = null;
        handle = null;
        if (toolbar) {
            toolbar.destroy?.();
            toolbar = null;
        }
    }
}