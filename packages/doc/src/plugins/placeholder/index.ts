import { type EditorState, Plugin, PluginKey } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { isNodeEmpty } from '../../utils';
import { CLASSNAME } from '../../config';
import './index.less';

export const placeholderKey = new PluginKey('placeholder');

export const placeholder = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: placeholderKey,
        props: {
            decorations(state: EditorState) {
                if (!editor.editable) {
                    return null;
                }
                const doc = state.doc;
                const { anchor } = state.selection;
                const decorations: Decoration[] = [];
                doc.descendants((node: Node, pos: number) => {
                    const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
                    const isEmpty = !node.isLeaf && isNodeEmpty(node)
                    if (hasAnchor && isEmpty) {
                        const classes: Array<string> = [`${CLASSNAME}-is-empty`];
                        const decoration = Decoration.node(pos, pos + node.nodeSize, {
                            class: classes.join(' '),
                            'placeholder': 'Write, type / for commands…',
                        });
                        decorations.push(decoration);
                    }
                });
                return DecorationSet.create(doc, decorations);
            }
        }
    });
    return plugin;
}