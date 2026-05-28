import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
// import { NodeSelection } from 'prosemirror-state'; 
import { BaseBlockView } from '../baseBlockView';
// import './index.less';


export class HorizontalRuleView extends BaseBlockView {
    constructor(node: Node, view: EditorView, getPos: () => number) {
        super({
            node,
            view,
            getPos
        })
        this.contentDOM = document.createElement('div');
        const hr = document.createElement('hr');
        this.contentDOM.style.padding = '1px 0';
        this.contentDOM.appendChild(hr);
        this.dom.appendChild(this.contentDOM);
        this.createHandle({
            icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z"></path></svg>`
        });
    }
}