import { type Node, type Schema } from 'prosemirror-model';
import { type EditorView } from 'prosemirror-view';

export const createGlobalWrapper = (node: Node, view: EditorView, getPos: () => number, originalNodeViewFactory: any) => {
    // 1. 创建统一的外层容器
    const wrapper = document.createElement('div');
    wrapper.className = `dui-node-wrapper dui-node-${node.type.name}`;
    wrapper.setAttribute('data-node-id', node.attrs.dataBlockId || '');

    // 2. 实例化原始的 NodeView
    const innerView = originalNodeViewFactory(node, view, getPos);

    // 3. 将原始 DOM 挂载到容器中
    wrapper.appendChild(innerView.dom);

    // 4. 返回包装后的对象，确保所有方法转发给 innerView
    return {
        ...innerView,
        dom: wrapper, // 这里的 dom 变成了外层容器
        contentDOM: innerView.contentDOM, // 保持内容插槽引用
        update: (newNode: Node, decorations: any, innerDecorations: any) => {
            // 必须转发 update，否则撤销/重做失效
            // 更新容器属性（可选）
            wrapper.setAttribute('data-node-id', newNode.attrs.dataBlockId || '');
            // 转发更新给内部视图
            return innerView.update(newNode, decorations, innerDecorations);
        },
        selectNode: () => {
            // 统一处理选中样式
            wrapper.classList.add('dui-node-selected');
            innerView.selectNode?.();
        },
        deselectNode: () => {
            wrapper.classList.remove('dui-node-selected');
            innerView.deselectNode?.();
        },
        destroy: () => innerView.destroy()
    };
}

export const wrapAllNodeViews = (schema: Schema, customViews: { [key: string]: any }) => {
    const nodeViews: { [key: string]: any } = {};

    Object.keys(schema.nodes).forEach(nodeName => {
        const originalFactory = customViews[nodeName];
        
        // 如果该节点没有定义 NodeView，或者你不想包装某些节点（比如 doc, text）
        if (!originalFactory || nodeName === 'doc' || nodeName === 'text') return;

        // 自动注入包装逻辑
        nodeViews[nodeName] = (node: Node, view: EditorView, getPos: () => number) => 
            createGlobalWrapper(node, view, getPos, originalFactory);
    });

    return nodeViews;
}

// 3. 如何使用
// 在初始化 EditorView 时，将你的 ImageView 等传进去即可：
// typescript
// const myCustomViews = {
//     image: (node, view, getPos) => new ImageView(node, view, getPos),
//     paragraph: (node, view, getPos) => new ParagraphView(node, view, getPos),
//     // ... 其他节点
// };

// const view = new EditorView(document.querySelector('#editor'), {
//     state: editorState,
//     nodeViews: wrapAllNodeViews(schema, myCustomViews)
// });