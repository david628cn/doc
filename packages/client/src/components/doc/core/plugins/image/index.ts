import { type EditorState, type Transaction, Plugin, PluginKey, EditorStateConfig } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView } from 'prosemirror-view';
import { ImageView } from './imageView';
// import { CLASSNAME } from '@/global';
import './index.less';

export const imagePluginKey = new PluginKey('image');

export const image = ({
    editor
}: any) => {
    const plugin: Plugin = new Plugin({
        key: imagePluginKey,
        props: {
            nodeViews: {
                image: (node: Node, view: EditorView, getPos: () => number) => new ImageView(node, view, getPos)
            } as any
        }
    });

    return plugin;
}