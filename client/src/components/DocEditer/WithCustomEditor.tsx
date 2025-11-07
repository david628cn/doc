import { CustomEditor } from './custom-types';

const withHtml = (editor: CustomEditor) => {
    const { insertData, isInline, isVoid } = editor
    console.log('editor', editor);

    // editor.isInline = (element: CustomElement) => {
    //     return element.type === 'link' ? true : isInline(element)
    // }

    // editor.isVoid = (element: CustomElement) => {
    //     return element.type === 'image' ? true : isVoid(element)
    // }

    // 标记代码块为void元素，防止直接编辑
    // editor.isVoid = (element: CustomElement) => {
    //     return element.type === 'image' ? true : isVoid(element);
    // };

    // editor.isVoid = (element: CustomElement) => {
    //     return element.type === 'code' ? true : isVoid(element);
    // };

    // 处理粘贴内容
    // editor.insertData = data => {
    //     const html = data.getData('text/html');
    //     // console.log('html', html)
    //     if (html) {
    //         const parsed = new DOMParser().parseFromString(html, 'text/html');
    //         const preElements = parsed.querySelectorAll('pre');

    //         const codeBlocks: Array<any> = [];
    //         for (let i = 0; i < preElements.length; i++) {
    //             const codeElement = preElements[i].querySelector('code');
    //             const language = codeElement?.className?.replace('language-', '') || 'text';
    //             const codeContent = preElements[i].textContent || '';
    //             // codeBlocks.push({
    //             //     type: 'code',
    //             //     language,
    //             //     children: [{ text: codeContent }]
    //             // });

    //         }
    //         if (codeBlocks.length > 0) {
    //             Transforms.insertNodes(editor, codeBlocks);
    //             return;
    //         }

    //         // 默认处理其他粘贴内容
    //         insertData(data);
    //     }
    // }

    return editor;
}

export {
    withHtml
};