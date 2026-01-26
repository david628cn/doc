import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';

const link = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: new PluginKey('link'),
        props: {
            handleClickOn(view: EditorView, pos: number, node: Node, nodePos: number, event: any): boolean {
                if (event.target.tagName === 'A' || event.target.tagName === 'a') {
                    const href = event.target.href;
                    const target = event.target.target;
                    window.open(href, target);
                    return true;
                }
                return false;
            }
        }
    });
    return plugin;
}
export default link;