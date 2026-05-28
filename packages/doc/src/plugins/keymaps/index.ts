import { Plugin, PluginKey } from 'prosemirror-state';
// import type { EditorState, Transaction } from 'prosemirror-state';
// import type { EditorView } from 'prosemirror-view';
// import type { Node } from 'prosemirror-model';
import {
    // splitBlock, 
    // newlineInCode, 
    baseKeymap,
    // chainCommands,
    // newlineInCode,
    // createParagraphNear,
    // liftEmptyBlock,
    // splitBlockAs
} from 'prosemirror-commands';
// import { type EditorState, type Transaction, NodeSelection, TextSelection, AllSelection } from 'prosemirror-state';
// import { canSplit } from 'prosemirror-transform';
import { keydownHandler } from 'prosemirror-keymap';
import { undo, redo } from 'prosemirror-history';

// const defaultBlockAt = (match: any) => {
//     for (let i = 0; i < match.edgeCount; i++) {
//         let { type } = match.edge(i);
//         if (type.isTextblock && !type.hasRequiredAttrs())
//             return type;
//     }
//     return null;
// }

// const splitBlockEx = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => {
//     let { $from, $to } = state.selection;
//     if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
//         if (!$from.parentOffset || !canSplit(state.doc, $from.pos)) {
//             return false;
//         }
            
//         if (dispatch) {
//             dispatch(state.tr.split($from.pos).scrollIntoView());
//         }
//         return true;
//     }
//     if (!$from.depth) {
//         return false;
//     }
//     let types: Array<any> = [];
//     let splitDepth = $from.depth;
//     let deflt = state.schema.nodes.slash;
//     let atEnd = false;
//     let atStart = false;
//     let curDepth = splitDepth;
//     while (curDepth > 0) {
//         let node = $from.node(curDepth);
//         if (node.isBlock) {
//             atEnd = $from.end(curDepth) == $from.pos + ($from.depth - curDepth);
//             atStart = $from.start(curDepth) == $from.pos - ($from.depth - curDepth);
//             // deflt = defaultBlockAt($from.node(curDepth - 1).contentMatchAt($from.indexAfter(curDepth - 1)));
//             // deflt = state.schema.nodes.slash;
//             let splitType = undefined;
//             types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
//             splitDepth = curDepth;
//             break;
//         } else {
//             if (curDepth === 1) {
//                 return false;
//             }   
//             types.unshift(null);
//         }
//         curDepth--;
//     }
//     // types = [{
//     //     type: state.schema.nodes.codeBlock
//     // }];
//     // for (let d = $from.depth; ; d--) {
//     //     let node = $from.node(d);
//     //     console.log('node', node.isBlock);
//     //     if (node.isBlock) {
//     //         atEnd = $from.end(d) == $from.pos + ($from.depth - d);
//     //         atStart = $from.start(d) == $from.pos - ($from.depth - d);
//     //         deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
//     //         let splitType = undefined;
//     //         types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
//     //         splitDepth = d;
//     //         break;
//     //     } else {
//     //         if (d === 1) {
//     //             return false;
//     //         }   
//     //         types.unshift(null);
//     //     }
//     // }
//     let tr = state.tr;
//     if (state.selection instanceof TextSelection || state.selection instanceof AllSelection) {
//         tr.deleteSelection();
//     }
//     let splitPos = tr.mapping.map($from.pos);
//     let can = canSplit(tr.doc, splitPos, types.length, types);
//     if (!can) {
//         types[0] = deflt ? { type: deflt } : null;
//         can = canSplit(tr.doc, splitPos, types.length, types);
//     }
//     if (!can) {
//         return false;
//     }
        
//     tr.split(splitPos, types.length, types);
//     if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
//         let first = tr.mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first);
//         if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt)) {
//             tr.setNodeMarkup(tr.mapping.map($from.before(splitDepth)), deflt);
//         }
//     }
//     if (dispatch) {
//         dispatch(tr.scrollIntoView());
//     }
        
//     return true;
// }

export const keymapsKey = new PluginKey('keymaps');

const keymaps = ({ editor }: any) => {
    // console.log('baseKeymap', baseKeymap);
    // const EnterFunc = baseKeymap['Enter'];
    return new Plugin({
        key: keymapsKey,
        props: {
            handleKeyDown: keydownHandler({
                ...baseKeymap,
                'Mod-z': undo, // 绑定撤销操作
                'Mod-y': redo, // 绑定重做操作
                'Mod-Shift-z': redo, // 兼容某些系统
                // 'Enter': (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean => {
                //     // if (newlineInCode(state, dispatch, view)) {
                //     //     return true;
                //     // }
                //     // if (createParagraphNear(state, dispatch, view)) {
                //     //     return true;
                //     // }
                //     // if (liftEmptyBlock(state, dispatch, view)) {
                //     //     return true;
                //     // }
                //     // console.log('state.schema.nodes.codeBlock', state.schema.nodes.codeBlock);
                //     // const splitBlockEx = splitBlockAs((node: any, atEnd: any, $from: any): any =>  {
                //     //     return {
                //     //         type: state.schema.nodes.codeBlock
                //     //     };
                //     // });
                //     // const splitBlockEx = splitBlockAs();
                //     // console.log('view', state.schema.nodes.codeBlock.create());
                //     if (splitBlockEx(state, dispatch, view)) {
                //         return true;
                //     }
                //     return false;
                // }
            })
        }
    });
    // return keymap({
    //     ...baseKeymap,
    //     'Mod-z': undo, // 绑定撤销操作
    //     'Mod-y': redo, // 绑定重做操作
    //     'Mod-Shift-z': redo, // 兼容某些系统
    //     'Enter': (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean => {
    //         // if (newlineInCode(state, dispatch, view)) {
    //         //     return true;
    //         // }
    //         // if (createParagraphNear(state, dispatch, view)) {
    //         //     return true;
    //         // }
    //         // if (liftEmptyBlock(state, dispatch, view)) {
    //         //     return true;
    //         // }
    //         // console.log('state.schema.nodes.codeBlock', state.schema.nodes.codeBlock);
    //         // const splitBlockEx = splitBlockAs((node: any, atEnd: any, $from: any): any =>  {
    //         //     return {
    //         //         type: state.schema.nodes.codeBlock
    //         //     };
    //         // });
    //         // const splitBlockEx = splitBlockAs();
    //         // console.log('view', state.schema.nodes.codeBlock.create());
    //         if (splitBlockEx(state, dispatch, view)) {
    //             return true;
    //         }
    //         return false;
    //     }
    // })
}
export default keymaps;