import { type EditorState, Plugin, PluginKey } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { CLASSNAME } from '@/global';
import './index.less';


const isNodeEmpty = (node: Node, {
        checkChildren = true,
        ignoreWhitespace = false,
    }: {
        /**
         * When true (default), it will also check if all children are empty.
         */
        checkChildren?: boolean
      /**
       * When true, it will ignore whitespace when checking for emptiness.
       */
      ignoreWhitespace?: boolean
    } = {},
): boolean => {
    if (ignoreWhitespace) {
        if (node.type.name === 'hardBreak') {
            // Hard breaks are considered empty
            return true;
        }
        if (node.isText) {
            return /^\s*$/m.test(node.text ?? '');
        }
    }

    if (node.isText) {
        return !node.text;
    }

    if (node.isAtom || node.isLeaf) {
        return false;
    }

    if (node.content.childCount === 0) {
        return true;
    }

    if (checkChildren) {
        let isContentEmpty = true;

        node.content.forEach(childNode => {
            if (isContentEmpty === false) {
                // Exit early for perf
                return;
            }

            if (!isNodeEmpty(childNode, { ignoreWhitespace, checkChildren })) {
                isContentEmpty = false;
            }
        })

        return isContentEmpty;
    }

    return false;
}

export const placeholder = ({ editor }: any) => {
    const plugin: Plugin = new Plugin({
        key: new PluginKey('placeholder'),
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