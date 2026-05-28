import { type EditorState, type Transaction, Plugin, PluginKey, NodeSelection, TextSelection } from 'prosemirror-state';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Selection } from 'prosemirror-state';
import { CellSelection, columnResizingPluginKey } from 'prosemirror-tables';
import { getPosition, isValidPosition, ImageCropper, getRect, getAlignPos } from '@carvy/ui';
import { ToolbarDropdown } from '../../ui';
import { posToDOMRect } from '../../utils';
import { CLASSNAME } from '../../config';
import './index.less';

/**
 * 判断当前是否【仅仅选中了一张图片】
 */
export const isSingleImageSelected = (state: EditorState): boolean => {
    const { selection } = state;

    // 1. 必须是节点选区 (NodeSelection)
    if (selection instanceof NodeSelection) {
        // 2. 选中的节点类型名称必须是 'image'
        return selection.node.type.name === 'image';
    }

    return false;

    // const { selection } = state;
    // const { $from, to } = selection;

    // // 场景 1：如果用户依然通过某种方式（如拖拽、API）触发了 NodeSelection 选中了整张图片
    // if ('node' in selection && (selection as any).node?.type.name === 'image') {
    //     return true;
    // }

    // // 场景 2：文本选区（TextSelection）。检查当前光标所在位置向上查找，其父级或祖先节点是否是 image
    // // 从深度 $from.depth 开始往上找，直到最外层（1）
    // for (let d = $from.depth; d > 0; d--) {
    //     if ($from.node(d).type.name === 'image') {
    //         return true;
    //     }
    // }

    // return false;
};

export const isTableCell = (state: EditorState): boolean => {
    const { selection } = state;
    return selection instanceof CellSelection;
};

const MARK_ITEMS = [
    // 1. 文字对齐方式（强单选）
    [
        { field: 'textAlign', value: 'left', title: '左对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'center', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'right', title: '右对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>' },
        { field: 'textAlign', value: 'justify', title: '两端对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>' }
    ],
    { type: 'separator' },
    [
        { field: 'strong', value: false, title: 'Bold', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 2.5C5.17157 2.5 4.5 3.17157 4.5 4V20C4.5 20.8284 5.17157 21.5 6 21.5H15C16.4587 21.5 17.8576 20.9205 18.8891 19.8891C19.9205 18.8576 20.5 17.4587 20.5 16C20.5 14.5413 19.9205 13.1424 18.8891 12.1109C18.6781 11.9 18.4518 11.7079 18.2128 11.5359C19.041 10.5492 19.5 9.29829 19.5 8C19.5 6.54131 18.9205 5.14236 17.8891 4.11091C16.8576 3.07946 15.4587 2.5 14 2.5H6ZM14 10.5C14.663 10.5 15.2989 10.2366 15.7678 9.76777C16.2366 9.29893 16.5 8.66304 16.5 8C16.5 7.33696 16.2366 6.70107 15.7678 6.23223C15.2989 5.76339 14.663 5.5 14 5.5H7.5V10.5H14ZM7.5 18.5V13.5H15C15.663 13.5 16.2989 13.7634 16.7678 14.2322C17.2366 14.7011 17.5 15.337 17.5 16C17.5 16.663 17.2366 17.2989 16.7678 17.7678C16.2989 18.2366 15.663 18.5 15 18.5H7.5Z" fill="currentColor"></path></svg>' },
        { field: 'em', value: false, title: 'Italic', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.0222 3H19C19.5523 3 20 3.44772 20 4C20 4.55228 19.5523 5 19 5H15.693L10.443 19H14C14.5523 19 15 19.4477 15 20C15 20.5523 14.5523 21 14 21H9.02418C9.00802 21.0004 8.99181 21.0004 8.97557 21H5C4.44772 21 4 20.5523 4 20C4 19.4477 4.44772 19 5 19H8.30704L13.557 5H10C9.44772 5 9 4.55228 9 4C9 3.44772 9.44772 3 10 3H14.9782C14.9928 2.99968 15.0075 2.99967 15.0222 3Z" fill="currentColor"></path></svg>' },
        { field: 's', value: false, title: 'Strikethrough', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.00039 3H16.0001C16.5524 3 17.0001 3.44772 17.0001 4C17.0001 4.55229 16.5524 5 16.0001 5H9.00011C8.68006 4.99983 8.36412 5.07648 8.07983 5.22349C7.79555 5.37051 7.55069 5.5836 7.36585 5.84487C7.181 6.10614 7.06155 6.40796 7.01754 6.72497C6.97352 7.04198 7.00623 7.36492 7.11292 7.66667C7.29701 8.18737 7.02414 8.75872 6.50344 8.94281C5.98274 9.1269 5.4114 8.85403 5.2273 8.33333C5.01393 7.72984 4.94851 7.08396 5.03654 6.44994C5.12456 5.81592 5.36346 5.21229 5.73316 4.68974C6.10285 4.1672 6.59256 3.74101 7.16113 3.44698C7.72955 3.15303 8.36047 2.99975 9.00039 3Z" fill="currentColor"></path><path d="M18 13H20C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11H4C3.44772 11 3 11.4477 3 12C3 12.5523 3.44772 13 4 13H14C14.7956 13 15.5587 13.3161 16.1213 13.8787C16.6839 14.4413 17 15.2044 17 16C17 16.7956 16.6839 17.5587 16.1213 18.1213C15.5587 18.6839 14.7956 19 14 19H6C5.44772 19 5 19.4477 5 20C5 20.5523 5.44772 21 6 21H14C15.3261 21 16.5979 20.4732 17.5355 19.5355C18.4732 18.5979 19 17.3261 19 16C19 14.9119 18.6453 13.8604 18 13Z" fill="currentColor"></path></svg>' },
        { field: 'u', value: false, title: 'Underlined', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 4C7 3.44772 6.55228 3 6 3C5.44772 3 5 3.44772 5 4V10C5 11.8565 5.7375 13.637 7.05025 14.9497C8.36301 16.2625 10.1435 17 12 17C13.8565 17 15.637 16.2625 16.9497 14.9497C18.2625 13.637 19 11.8565 19 10V4C19 3.44772 18.5523 3 18 3C17.4477 3 17 3.44772 17 4V10C17 11.3261 16.4732 12.5979 15.5355 13.5355C14.5979 14.4732 13.3261 15 12 15C10.6739 15 9.40215 14.4732 8.46447 13.5355C7.52678 12.5979 7 11.3261 7 10V4ZM4 19C3.44772 19 3 19.4477 3 20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20C21 19.4477 20.5523 19 20 19H4Z" fill="currentColor"></path></svg>' },
        { type: 'link', field: 'link', title: 'Link' },
        { field: 'code', value: false, title: 'Code', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.4545 4.2983C15.6192 3.77115 15.3254 3.21028 14.7983 3.04554C14.2712 2.88081 13.7103 3.1746 13.5455 3.70175L8.54554 19.7017C8.38081 20.2289 8.6746 20.7898 9.20175 20.9545C9.72889 21.1192 10.2898 20.8254 10.4545 20.2983L15.4545 4.2983Z"></path><path d="M6.70711 7.29289C7.09763 7.68342 7.09763 8.31658 6.70711 8.70711L3.41421 12L6.70711 15.2929C7.09763 15.6834 7.09763 16.3166 6.70711 16.7071C6.31658 17.0976 5.68342 17.0976 5.29289 16.7071L1.29289 12.7071C0.902369 12.3166 0.902369 11.6834 1.29289 11.2929L5.29289 7.29289C5.68342 6.90237 6.31658 6.90237 6.70711 7.29289Z"></path><path d="M17.2929 7.29289C17.6834 6.90237 18.3166 6.90237 18.7071 7.29289L22.7071 11.2929C23.0976 11.6834 23.0976 12.3166 22.7071 12.7071L18.7071 16.7071C18.3166 17.0976 17.6834 17.0976 17.2929 16.7071C16.9024 16.3166 16.9024 15.6834 17.2929 15.2929L20.5858 12L17.2929 8.70711C16.9024 8.31658 16.9024 7.68342 17.2929 7.29289Z"></path></svg>' }
    ],
    { type: 'separator' },
    // 2. 文字颜色与高亮背景色
    { type: 'textStyle', field: 'textStyle' },
    { type: 'separator' },
    [
        { field: 'sup', value: false, title: 'Superscript', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 7.29289C13.0976 7.68342 13.0976 8.31658 12.7071 8.70711L4.70711 16.7071C4.31658 17.0976 3.68342 17.0976 3.29289 16.7071C2.90237 16.3166 2.90237 15.6834 3.29289 15.2929L11.2929 7.29289C11.6834 6.90237 12.3166 6.90237 12.7071 7.29289Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M3.29289 7.29289C3.68342 6.90237 4.31658 6.90237 4.70711 7.29289L12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L3.29289 8.70711C2.90237 8.31658 2.90237 7.68342 3.29289 7.29289Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M17.405 1.40657C18.0246 1.05456 18.7463 0.92634 19.4492 1.04344C20.1521 1.16054 20.7933 1.51583 21.2652 2.0497L21.2697 2.05469L21.2696 2.05471C21.7431 2.5975 22 3.28922 22 4.00203C22 5.08579 21.3952 5.84326 20.7727 6.34289C20.1966 6.80531 19.4941 7.13675 18.9941 7.37261C18.9714 7.38332 18.9491 7.39383 18.9273 7.40415C18.4487 7.63034 18.2814 7.78152 18.1927 7.91844C18.1778 7.94155 18.1625 7.96834 18.1473 8.00003H21C21.5523 8.00003 22 8.44774 22 9.00003C22 9.55231 21.5523 10 21 10H17C16.4477 10 16 9.55231 16 9.00003C16 8.17007 16.1183 7.44255 16.5138 6.83161C16.9107 6.21854 17.4934 5.86971 18.0728 5.59591C18.6281 5.33347 19.1376 5.09075 19.5208 4.78316C19.8838 4.49179 20 4.25026 20 4.00203C20 3.77192 19.9178 3.54865 19.7646 3.37182C19.5968 3.18324 19.3696 3.05774 19.1205 3.01625C18.8705 2.97459 18.6137 3.02017 18.3933 3.14533C18.1762 3.26898 18.0191 3.45826 17.9406 3.67557C17.7531 4.19504 17.18 4.46414 16.6605 4.27662C16.141 4.0891 15.8719 3.51596 16.0594 2.99649C16.303 2.3219 16.7817 1.76125 17.4045 1.40689L17.405 1.40657Z" fill="currentColor"></path></svg>' },
        { field: 'sub', value: false, title: 'Subscript', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.29289 7.29289C3.68342 6.90237 4.31658 6.90237 4.70711 7.29289L12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L3.29289 8.70711C2.90237 8.31658 2.90237 7.68342 3.29289 7.29289Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 7.29289C13.0976 7.68342 13.0976 8.31658 12.7071 8.70711L4.70711 16.7071C4.31658 17.0976 3.68342 17.0976 3.29289 16.7071C2.90237 16.3166 2.90237 15.6834 3.29289 15.2929L11.2929 7.29289C11.6834 6.90237 12.3166 6.90237 12.7071 7.29289Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M17.4079 14.3995C18.0284 14.0487 18.7506 13.9217 19.4536 14.0397C20.1566 14.1578 20.7977 14.5138 21.2696 15.0481L21.2779 15.0574L21.2778 15.0575C21.7439 15.5988 22 16.2903 22 17C22 18.0823 21.3962 18.8401 20.7744 19.3404C20.194 19.8073 19.4858 20.141 18.9828 20.378C18.9638 20.387 18.9451 20.3958 18.9266 20.4045C18.4473 20.6306 18.2804 20.7817 18.1922 20.918C18.1773 20.9412 18.1619 20.9681 18.1467 21H21C21.5523 21 22 21.4477 22 22C22 22.5523 21.5523 23 21 23H17C16.4477 23 16 22.5523 16 22C16 21.1708 16.1176 20.4431 16.5128 19.832C16.9096 19.2184 17.4928 18.8695 18.0734 18.5956C18.6279 18.334 19.138 18.0901 19.5207 17.7821C19.8838 17.49 20 17.2477 20 17C20 16.7718 19.9176 16.5452 19.7663 16.3672C19.5983 16.1792 19.3712 16.0539 19.1224 16.0121C18.8722 15.9701 18.6152 16.015 18.3942 16.1394C18.1794 16.2628 18.0205 16.4549 17.9422 16.675C17.7572 17.1954 17.1854 17.4673 16.665 17.2822C16.1446 17.0972 15.8728 16.5254 16.0578 16.005C16.2993 15.3259 16.7797 14.7584 17.4039 14.4018L17.4079 14.3995L17.4079 14.3995Z" fill="currentColor"></path></svg>' },
    ]
];

const IMAGE_ITEMS = [
    // [
    //     { field: 'imageCrop', title: '裁剪', icon: '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M981 725.014H811v-384q0-54-37-91t-91-37l-380 5v-175q0-20-12-31.5t-31-11.5q-16 0-29 11.5t-13 31.5v175H43q-20 0-31.5 13t-11.5 29 13.5 29.5 29.5 13.5h175l-5 380q0 54 37 91t91 37h384v170q0 20 12 31.5t31 11.5 31-11.5 12-31.5v-170h170q20 0 31.5-12t11.5-31-11.5-31-31.5-12m-640 0q-19 0-30.5-11.5t-11.5-30.5l4-380 380-4q19 0 30.5 11.5t11.5 30.5v384z"/></svg>' },
    //     { field: 'reset', title: '重置', icon: '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M683 341.014H273l141-140q13-13 13-30t-13-30-30-13-30 13l-213 213q-3 3-6 6.5t-3 6.5q-3 10-3 17t3 17q3 3 4.5 6.5t4.5 6.5l213 213q7 7 13.5 10t16.5 3 16.5-3 13.5-10q13-13 13-30t-13-30l-141-140h410q54 0 91 36.5t37 91.5v298q0 20 11.5 31.5t30.5 11.5q20 0 31.5-11.5t11.5-31.5v-298q0-45-17-84-16-39-45-68t-68-45q-39-17-83-17"/></svg>' }
    // ],
    // { type: 'separator' },
    [
        { field: 'textAlign', value: 'left', title: '左对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 2C4 1.44772 3.55228 1 3 1C2.44772 1 2 1.44772 2 2V22C2 22.5523 2.44772 23 3 23C3.55228 23 4 22.5523 4 22V2Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M10 4C8.34315 4 7 5.34315 7 7V17C7 18.6569 8.34315 20 10 20H19C20.6569 20 22 18.6569 22 17V7C22 5.34315 20.6569 4 19 4H10ZM9 7C9 6.44772 9.44772 6 10 6H19C19.5523 6 20 6.44772 20 7V17C20 17.5523 19.5523 18 19 18H10C9.44772 18 9 17.5523 9 17V7Z" fill="currentColor"></path></svg>' },
        { field: 'textAlign', value: 'center', title: '居中对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 1C12.5523 1 13 1.44772 13 2V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V2C11 1.44772 11.4477 1 12 1Z" fill="currentColor"></path><path d="M2 7C2 5.34315 3.34315 4 5 4H7C7.55228 4 8 4.44772 8 5C8 5.55228 7.55228 6 7 6H5C4.44772 6 4 6.44772 4 7V17C4 17.5523 4.44772 18 5 18H7C7.55228 18 8 18.4477 8 19C8 19.5523 7.55228 20 7 20H5C3.34315 20 2 18.6569 2 17V7Z" fill="currentColor"></path><path d="M19 4C20.6569 4 22 5.34315 22 7V17C22 18.6569 20.6569 20 19 20H17C16.4477 20 16 19.5523 16 19C16 18.4477 16.4477 18 17 18H19C19.5523 18 20 17.5523 20 17V7C20 6.44772 19.5523 6 19 6H17C16.4477 6 16 5.55228 16 5C16 4.44772 16.4477 4 17 4H19Z" fill="currentColor"></path></svg>' },
        { field: 'textAlign', value: 'right', title: '右对齐', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M21 1C21.5523 1 22 1.44772 22 2V22C22 22.5523 21.5523 23 21 23C20.4477 23 20 22.5523 20 22V2C20 1.44772 20.4477 1 21 1Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M2 7C2 5.34315 3.34315 4 5 4H14C15.6569 4 17 5.34315 17 7V17C17 18.6569 15.6569 20 14 20H5C3.34315 20 2 18.6569 2 17V7ZM5 6C4.44772 6 4 6.44772 4 7V17C4 17.5523 4.44772 18 5 18H14C14.5523 18 15 17.5523 15 17V7C15 6.44772 14.5523 6 14 6H5Z" fill="currentColor"></path></svg>' },
        { field: 'caption', value: false, title: '描述', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 22C7 21.4477 7.44772 21 8 21H16C16.5523 21 17 21.4477 17 22C17 22.5523 16.5523 23 16 23H8C7.44772 23 7 22.5523 7 22Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M3 18C3 17.4477 3.44772 17 4 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M3 5C3 3.34315 4.34315 2 6 2H18C19.6569 2 21 3.34315 21 5V11C21 12.6569 19.6569 14 18 14H6C4.34315 14 3 12.6569 3 11V5ZM6 4C5.44772 4 5 4.44772 5 5V11C5 11.5523 5.44772 12 6 12H18C18.5523 12 19 11.5523 19 11V5C19 4.44772 18.5523 4 18 4H6Z" fill="currentColor"></path></svg>' }
    ],
    { type: 'separator' },
    [
        { field: 'upload', title: '上传', icon: '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor"><path d="m363 321 95-96v400q0 17 12.5 29.5T500 667t29.5-12.5T542 625V225l95 96q12 12 29.5 12t29.5-12 12-29.5-12-29.5L530 95q-6-5-14-8-16-7-32 0-8 3-14 8L304 262q-10 8-14 19t-1 23 11.5 20.5T321 336t23-1 19-14m512 179q-17 0-29.5 12.5T833 542v250q0 17-12 29t-29 12H208q-17 0-29-12t-12-29V542q0-17-12.5-29.5T125 500t-29.5 12.5T83 542v250q0 34 17 62.5t45.5 45.5 62.5 17h584q34 0 62.5-17t45.5-45.5 17-62.5V542q0-17-12.5-29.5T875 500"/></svg>' },
        { field: 'download', title: '下载', icon: '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M896 597.014q-19 0-31 12t-12 31v171q0 19-11.5 30.5t-30.5 11.5H213q-19 0-30.5-11.5t-11.5-30.5v-171q0-19-12-31t-31-12-31 12-12 31v171q0 54 37 91t91 37h598q54 0 91-37t37-91v-171q0-19-12-31t-31-12m-414 73q3 3 6.5 5.5t6.5 2.5q3 4 8.5 4.5t8.5.5 8.5-.5 8.5-4.5q3-3 6.5-4t6.5-4l213-213q13-13 13-30t-13-30-30-13-30 13l-140 141v-410q0-19-12-31t-31-12-31 12-12 31v410l-140-141q-13-13-30-13t-30 13-13 30 13 30z"/></svg>' },
        { field: 'copy', title: '复制链接', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>' },
        { field: 'delete', title: '删除', icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5V4C7 3.17477 7.40255 2.43324 7.91789 1.91789C8.43324 1.40255 9.17477 1 10 1H14C14.8252 1 15.5668 1.40255 16.0821 1.91789C16.5975 2.43324 17 3.17477 17 4V5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H20V20C20 20.8252 19.5975 21.5668 19.0821 22.0821C18.5668 22.5975 17.8252 23 17 23H7C6.17477 23 5.43324 22.5975 4.91789 22.0821C4.40255 21.5668 4 20.8252 4 20V7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H7ZM9 4C9 3.82523 9.09745 3.56676 9.33211 3.33211C9.56676 3.09745 9.82523 3 10 3H14C14.1748 3 14.4332 3.09745 14.6679 3.33211C14.9025 3.56676 15 3.82523 15 4V5H9V4ZM6 7V20C6 20.1748 6.09745 20.4332 6.33211 20.6679C6.56676 20.9025 6.82523 21 7 21H17C17.1748 21 17.4332 20.9025 17.6679 20.6679C17.9025 20.4332 18 20.1748 18 20V7H6Z" fill="currentColor"></path></svg>' }
    ]
];

let toolbar: any;
// let imageCrop: any;

export const selectionPluginKey = new PluginKey('selection');

export const selection = ({ editor }: any) => {
    let activeHandle = -1;
    let out = false;
    // let is: any = null;

    const getToolbar = () => {
        if (!toolbar) {
            toolbar = new ToolbarDropdown(editor.view.dom.parentNode as HTMLElement, {
                clssName: `${CLASSNAME}-selection-toolbar`,
                onChange: async ({ field, value, btn }) => {
                    const { state, dispatch } = editor.view;
                    const { selection } = state;
                    switch (field) {
                        case 'textAlign':
                            editor.setTextAlign(value);
                            break;
                        case 'verticalAlign':

                            break;
                        case 'textStyle':
                            editor.setMark(field, value);
                            break;
                        case 'caption':
                            if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
                                if (dispatch) {
                                    const { node } = selection;
                                    const pos = selection.from;
                                    // 🌟 读取当前图片的属性 caption
                                    const currentStatus = node.attrs.caption !== false;
                                    // 🌟 核心：取反并通过 setNodeMarkup 更新并持久化
                                    const tr = state.tr.setNodeMarkup(pos, null, {
                                        ...node.attrs,
                                        caption: !currentStatus
                                    });
                                    dispatch(tr);
                                }
                            }
                            break;
                        case 'imageCrop':
                            // if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
                            //     if (dispatch) {
                            //         const { node } = selection;
                            //         const pos = selection.from;
                            //         if (imageCrop && imageCrop.open) {
                            //             // dispatch()
                            //             console.log('>>>>', imageCrop.cropperInstance.getData());
                            //             const d = imageCrop.cropperInstance.getData();
                            //             dispatch(
                            //                 state.tr.setNodeMarkup(pos, null, {
                            //                     ...node.attrs,
                            //                     translateX: d.x,
                            //                     translateY: d.y,
                            //                     scale: d.scaleX,
                            //                     width: Math.round(d.width),
                            //                     height: Math.round(d.height)
                            //                 }));
                            //             break;
                            //         }


                            //         const domElement = editor.view.nodeDOM(pos);
                            //         const crop = getImageCrop();
                            //         crop.setSrc(node.attrs.src);
                            //         crop.setTransform({
                            //             // src: node.attrs.src,
                            //             width: node.attrs.width || 0,
                            //             // height: viewH,
                            //             scaleX: node.attrs.scale || 1,
                            //             translateX: node.attrs.translateX || 0,
                            //             translateY: node.attrs.translateY || 0
                            //         });
                            //         const rect = getAlignPos(crop.container, domElement, {
                            //             pos: 'tl-tl',
                            //             container: crop.container.parentNode
                            //         });
                            //         crop.show({
                            //             width: node.attrs.width,
                            //             height: domElement.offsetHeight,
                            //             ...rect
                            //         });
                            //     }
                            // }


                            break;
                        case 'reset':
                            break;
                        case 'upload':
                            break;
                        case 'download':
                            if (selection instanceof NodeSelection
                                && selection.node.type.name === 'image'
                            ) {
                                const { node } = selection;
                                const src = node.attrs.src;
                                console.log('href?', btn);
                                if (src) {
                                    try {
                                        // 1. 获取文件数据流
                                        const response = await fetch(src);
                                        if (!response.ok) throw new Error('网络请求错误');

                                        // 2. 转换为 Blob 对象
                                        const blob = await response.blob();

                                        // 3. 创建内存 URL 对象
                                        const objectUrl = URL.createObjectURL(blob);

                                        // 4. 创建虚拟 a 标签并触发点击
                                        const a = document.createElement('a');
                                        a.href = objectUrl;
                                        a.download = new Date().getTime() + ''; // 设置下载文件名
                                        a.style.display = 'none';
                                        document.body.appendChild(a);

                                        a.click(); // 触发下载

                                        // 5. 释放内存与移除标签
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(objectUrl);
                                    } catch (error) {
                                        console.error('下载失败:', error);
                                    }
                                }
                            }
                            break;
                        case 'copy':
                            if (selection instanceof NodeSelection
                                && selection.node.type.name === 'image'
                            ) {
                                const { node } = selection;
                                const src = node.attrs.src;
                                console.log('href?', btn);
                                if (src) {
                                    navigator.clipboard.writeText(src).then(() => {
                                        btn.innerHTML = '<svg width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014"><path d="M883 226.014q-13-13-30-13t-30 13l-439 440-183-184q-13-13-30-13t-30 13-13 30 13 30l213 213q7 7 13.5 10t16.5 3 16.5-3 13.5-10l469-469q13-13 13-30t-13-30"/></svg>';
                                        setTimeout(() => {
                                            btn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>';
                                        }, 1000);

                                    }).catch(err => {
                                        // console.error('无法复制链接:', err);
                                    });
                                }
                            }
                            break;
                        case 'delete':
                            if (dispatch) {
                                // 直接使用选区的范围进行删除
                                dispatch(state.tr.delete(selection.from, selection.to));
                            }
                            break;
                        default:
                            editor.setMark(field, value);
                            break;
                    }
                }
            });
        }
        return toolbar;
    }

    // const getImageCrop = () => {
    //     if (!imageCrop) {
    //         imageCrop = new ImageCropper({
    //             container: editor.view.dom.parentNode as HTMLElement
    //         });
    //     }
    //     return imageCrop;
    // }

    const onMouseDown = (e: any) => {
        const target = e.target as HTMLElement;
        if (e.button !== 0 || activeHandle !== -1 || target.closest(`.${CLASSNAME}-selection-toolbar`)) {
            // if (is === false) {
            //     is = true;
            // }
            // editor.emit('selection', {
            //     rect: null
            // });
            return;
        }
        document.addEventListener('mouseup', onMouseUp, false);
        document.addEventListener('touchend', onMouseUp, { passive: false } as any);
        document.addEventListener('touchcancel', onMouseUp, { passive: false } as any);
        const { state } = editor.view;
        if (!editor.view.dom.contains(target)) {
            editor.view.dispatch(state.tr.setMeta('selection', { active: false }));
            out = true;
            return;
        }
        const { left, top } = getPosition(e);
        const posCoords = editor.view.posAtCoords({
            left,
            top
        })

        if (!posCoords || !isValidPosition(posCoords.pos)) {
            return;
        }
        // const { state } = editor.view;
        const $pos = state.doc.resolve(posCoords.pos);
        const nodeBefore = $pos.nodeBefore;
        if (!nodeBefore || nodeBefore.isBlock) {
            return;
        }
        const tr = state.tr.setSelection(
            Selection.near(state.doc.resolve(posCoords.pos))
        );
        // .setMeta('selection', { active: false });
        editor.view.dispatch(tr);

    }
    const onMouseUp = (e: Event) => {
        // const target = e.target as HTMLElement;
        // if (target.closest(`.${CLASSNAME}-popuover-container`)?.getAttribute('data-toolbar') === 'selection') {
        //     return;
        // }
        document.removeEventListener('mouseup', onMouseUp, false);
        document.removeEventListener('touchend', onMouseUp, { passive: false } as any);
        document.removeEventListener('touchcancel', onMouseUp, { passive: false } as any);
        let timer: any;
        timer = setTimeout(() => {
            clearTimeout(timer);
            const { state } = editor.view;
            if (activeHandle !== -1) {
                editor.view.dispatch(state.tr.setMeta('selection', { active: false }));
                return;
            }
            if (out) {
                out = false;
                // editor.view.dispatch(state.tr.setMeta('selection', { active: false }));
                return;
            }
            const { doc, selection } = state;
            const { node, from, to, $from, empty } = selection;
            // const cotent = state.doc.textBetween(from, to);
            // const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, null, '\0')
            const isEmptyTextBlock = !doc.textBetween(from, to).length && selection instanceof TextSelection;
            const isCodeBlock = $from.parent.type.spec.code || (selection instanceof NodeSelection && node.type.spec.code);
            const isExcludedNode = selection instanceof NodeSelection && ['image', 'horizontal_rule'].includes(node.type.name);
            const isTableCell = selection instanceof CellSelection;
            let tr: Transaction;
            if (!empty && from !== to && !isEmptyTextBlock && !isCodeBlock && !isExcludedNode && !isTableCell) {
                tr = state.tr.setMeta('selection', { active: true });
            } else {
                tr = state.tr.setMeta('selection', { active: false });
            }
            editor.view.dispatch(tr);
        }, 10);

    }

    const plugin: Plugin = new Plugin({
        key: selectionPluginKey,
        view(view: EditorView) {
            document.addEventListener('mousedown', onMouseDown, false);
            document.addEventListener('touchstart', onMouseDown, { passive: false });
            return {
                update(view: EditorView, prevState: EditorState) {
                    if (!editor.editable) {
                        return;
                    }
                    const state = view.state;
                    // const { selection } = state;
                    const prev = plugin.getState(prevState);
                    const next = plugin.getState(state);
                    const { from, to } = next.range;
                    let rect = posToDOMRect(view, from, to);

                    if (isTableCell(state)) {
                        if (toolbar) {
                            toolbar.hide();
                        }
                        editor.emit('action', {
                            type: 'selection',
                            data: {
                                type: 'text',
                                active: false
                            }
                        });
                        // if (imageCrop) {
                        //     imageCrop.hide();
                        // }
                        // editor.emit('action', {
                        //     type: 'selection',
                        //     data: {
                        //         type: 'tableCell',
                        //         active: true,
                        //         range: next.range,
                        //         rect
                        //     }
                        // });
                        return;
                    }

                    if (isSingleImageSelected(state)) {
                        if (prev.range.from === next.range.from
                            && prev.range.to === next.range.to
                            && (toolbar && toolbar.isOpen)
                        ) {
                            return;
                        }
                        console.log('isSingleImageSelected', prev.range, next.range);
                        if (toolbar) {
                            toolbar.hide();
                        }
                        if (editor.showToolbar) {
                            toolbar = getToolbar();
                            toolbar.items = IMAGE_ITEMS;
                            const v = {
                                textAlign: editor.getTextAlign(),
                                caption: editor.getCaption('caption')
                            };
                            toolbar.value = v;
                            // console.log('dddd', v);
                            toolbar.show(rect);
                        }
                        editor.emit('action', {
                            type: 'selection',
                            data: {
                                type: 'text',
                                active: false
                            }
                        });
                        editor.emit('action', {
                            type: 'selection',
                            data: {
                                type: 'image',
                                active: true,
                                range: next.range,
                                rect
                            }
                        });
                        return;
                    }

                    if (prev.active === next.active
                        && prev.range.from === next.range.from
                        && prev.range.to === next.range.to
                    ) {
                        return;
                    }

                    let active = next.active;
                    if (from === to) {
                        active = false;
                    }
                    if (active) {
                        rect = posToDOMRect(view, from, to);
                    }
                    const params = {
                        type: 'selection',
                        data: {
                            type: 'text',
                            active: next.active,
                            range: next.range,
                            rect
                        }
                    }
                    if (editor.showToolbar) {
                        if (next.active) {
                            toolbar = getToolbar();
                            toolbar.items = MARK_ITEMS;
                            const v = {
                                textAlign: editor.getTextAlign(),
                                strong: editor.getMarkAttribute('strong'),
                                em: editor.getMarkAttribute('em'),
                                s: editor.getMarkAttribute('s'),
                                u: editor.getMarkAttribute('u'),
                                link: editor.getMarkAttribute('link'),
                                code: editor.getMarkAttribute('code'),
                                textStyle: {
                                    color: editor.getTextStyle('color'),
                                    backgroundColor: editor.getTextStyle('backgroundColor')
                                },
                                sup: editor.getMarkAttribute('sup'),
                                sub: editor.getMarkAttribute('sub'),
                                // caption: editor.getMarkAttribute('caption'),
                            };
                            // console.log('v', v);
                            toolbar.value = v;
                            toolbar.show(rect);
                        } else {
                            if (toolbar) {
                                toolbar.hide();
                            }
                            editor.emit('action', {
                                type: 'selection',
                                data: {
                                    type: 'text',
                                    active: false
                                }
                            });
                            // if (imageCrop) {
                            //     imageCrop.hide();
                            // }
                        }

                    } else {
                        if (toolbar) {
                            toolbar.hide();
                        }
                    }
                    editor.emit('action', params);
                },
                destroy() {
                    document.removeEventListener('mousedown', onMouseDown, false);
                    document.removeEventListener('touchstart', onMouseDown, { passive: false } as any);
                }
            };
        },
        state: {
            init() {
                return {
                    active: false,
                    range: { from: 0, to: 0 }
                }
            },
            apply(tr: Transaction, preValue: any) {
                // if (!editor.editable) {
                //     return {
                //         ...preValue,
                //         active: false
                //     };
                // }
                const meta = tr.getMeta('selection');
                if (meta) {
                    return {
                        ...preValue,
                        ...meta
                    };
                }
                const { selection } = tr;
                if (selection instanceof CellSelection) {
                    return {
                        ...preValue,
                        active: false
                    };
                }
                const { from, to } = selection;
                const newValue = {
                    ...preValue,
                    range: {
                        from,
                        to
                    }
                };
                if (!editor.editable || from === to) {
                    newValue.active = false;
                }
                return newValue;
            }
        },
        props: {
            handleDOMEvents: {
                mousedown(view: EditorView, event: any) {
                    const columnResizingPlugState: any = columnResizingPluginKey.getState(view.state);
                    activeHandle = columnResizingPlugState.activeHandle;
                }
            },
            handleKeyDown() {
                // const { state } = view;
                // let tr: Transaction;
                // tr = state.tr.setMeta('selection', { active: true });
                // editor.view.dispatch(tr);
            },
            decorations(state: EditorState) {
                // console.log('selection', state.selection.empty, state.selection instanceof NodeSelection);
                // return null;
                const pluginState = selectionPluginKey.getState(state);
                if (
                    state.selection.empty ||
                    state.selection instanceof NodeSelection
                ) {
                    return null;
                }
                return DecorationSet.create(state.doc, [
                    Decoration.inline(pluginState.range.from, pluginState.range.to, {
                        class: `${CLASSNAME}-selection`
                    })
                ]);
            }
        }
    });
    return plugin;
}