import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';

const findParentWithLink = (dom: any) => {
    let curDom = dom;
    while (curDom) {
        if (curDom.tagName === 'A' || curDom.tagName === 'a') {
            return curDom;
        }
        curDom = curDom.parentElement;
    }
    return null;
}

// const getPosition = (event: any) => {
//     if (event.touches && event.touches.length) {
//         return {
//             x: event.touches[0].pageX,
//             y: event.touches[0].pageY
//         };
//     } else if (event.changedTouches && event.changedTouches.length) {
//         return {
//             x: event.changedTouches[0].pageX,
//             y: event.changedTouches[0].pageY
//         };
//     } else {
//         return {
//             x: event.pageX,
//             y: event.pageY
//         };
//     }
// }

export const link = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: new PluginKey('link'),
        props: {
            handleClickOn(view: EditorView, pos: number, node: Node, nodePos: number, event: Event): boolean {
                const target: any = findParentWithLink(event.target);
                if (target && (target.tagName === 'A' || target.tagName === 'a')) {
                    const href = target.href;
                    window.open(href, target.target);
                    return true;
                }
                return false;
            }
        }
    });
    return plugin;
}