import { EditorView } from 'prosemirror-view';
import { type Node } from 'prosemirror-model';
import {
    TableView
} from 'prosemirror-tables';
import { pluginKey } from './index';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';




export class TableCell {
    dom: HTMLTableCellElement;
    contentDOM: HTMLTableCellElement;
    node: Node;
    view: EditorView;
    getPos: Function;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.dom = document.createElement('td');
        this.contentDOM = this.dom;
    }
    update(node: Node): boolean {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        return true;
    }
    // 必须处理 ignoreMutation，否则点击面板按钮会导致编辑器重绘
    // ignoreMutation(record: ViewMutationRecord): boolean {
    //     return (
    //         record.type == 'attributes' &&
    //         (record.target == this.table || this.colgroup.contains(record.target))
    //     );
    // }

    // 必须处理 stopEvent，防止面板上的点击触发编辑器的选区更改
    // stopEvent(event: any) {
    //     return this.toolbar.contains(event.target);
    // }

}