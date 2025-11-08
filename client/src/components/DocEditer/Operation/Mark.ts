import { Editor, Range } from 'slate';
import { CustomEditor, CustomTextKey } from '../custom-types.d';

const isMarkActive = (editor: CustomEditor, format: CustomTextKey) => {
    const marks = Editor.marks(editor);
    console.log('marks[format]', marks);
    return marks ? marks[format] === true : false;
}

const toggleMark = (editor: CustomEditor, format: CustomTextKey, value?: any) => {
    const isActive = isMarkActive(editor, format);
    if (isActive) {
        Editor.removeMark(editor, format);
    } else {
        Editor.addMark(editor, format, true);
    }
}

export {
    isMarkActive,
    toggleMark
};