import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor, createEditor, Transforms, Range } from 'slate';
import {
    Slate,
    Editable,
    withReact,
    RenderElementProps,
    RenderLeafProps
    // useFocused,
    // useSlateSelection 
} from 'slate-react';
import { withHistory } from 'slate-history';
import { withHtml } from './WithCustomEditor';
import CustomElement from './CustomElement';
import { getStorageItem, setStorageItem } from './Storage';
import Toolbar from './UI/Toolbar';
import HoveringToolbar from './UI/HoveringToolbar';
import Portal from './UI/Portal';
import { CustomEditor, CustomTextKey } from './custom-types.d';
// import { WebrtcProvider } from 'y-webrtc';
// import { HocuspocusProvider } from '@hocuspocus/provider';
// import * as Y from 'yjs'
import './index.less';


// function removeBOM(text: string) {
//     return text
//         .replace(/[\u200B-\u200D\uFEFF]/g, '')  // 移除零宽度空格字符
//         .replace(/^\uFEFF/, '')           // 移除开头的BOM字符
//         .replace(/\uFEFF/g, '')             // 移除所有BOM字符
//         .trim();                            // 移除首尾空白
// }

const isMarkActive = (editor: CustomEditor, format: CustomTextKey) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
}

const toggleMark = (editor: CustomEditor, format: CustomTextKey) => {
    const isActive = isMarkActive(editor, format)
    if (isActive) {
        Editor.removeMark(editor, format);
    } else {
        Editor.addMark(editor, format, true);
    }
}

interface DocEditerProps {

}

const DocEditer: React.FC<DocEditerProps> = props => {
    const [active, setActive] = useState({});
    const [pos, setPos] = useState([0, 0]);
    const [display, setDisplay] = useState('none');
    // const inFocus = useFocused();
    const hoveringToolbarElRef =  useRef<HTMLDivElement | null>(null);
    const selectionRef: any = useRef(null);
    const initialValue = useMemo(() => getStorageItem(), []);
    const editor = useMemo<CustomEditor>(() => withReact(withHistory(createEditor())), []);

    const renderElement = useCallback((props: RenderElementProps) => {
        console.log('props', props);
        return <CustomElement {...props} />
    }, []);

    const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
        if (leaf.bold) {
            children = <strong>{children}</strong>;
        }

        if (leaf.italic) {
            children = <em>{children}</em>;
        }

        if (leaf.strikethrough) {
            children = <s>{children}</s>;
        }

        if (leaf.code) {
            children = <code>{children}</code>;
        }

        if (leaf.underlined) {
            children = <u>{children}</u>;
        }

        if (leaf.superscript) {
            children = <sup>{children}</sup>;
        }

        if (leaf.subscript) {
            children = <sub>{children}</sub>;
        }

        return <span {...attributes}>{children}</span>;
    }

    // Define a leaf rendering function that is memoized with `useCallback`.
    const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);

    // const handleActiveClick = (params: any) => {
    //     console.log('params', params);
    //     toggleMark(editor, params.activeKey);
    // }

    // const canUndo = editor.history.undos.size > 0;
    // const canRedo = editor.history.redos.size > 0;

    // // 后退操作
    // const handleUndo = useCallback(() => {
    //     editor.undo();
    //     console.log('后退', '执行后退操作', editor.history);
    // }, [editor]);

    // // 前进操作
    // const handleRedo = useCallback(() => {
    //     editor.redo();
    //     console.log('前进', '执行前进操作', editor.history);
    // }, [editor]);

    // 清空历史记录
    // const handleClearHistory = useCallback(() => {
    //     // 重置历史记录
    //     editor.history = { undos: [], redos: [] };
    //     console.log('历史记录已清空', 'success');
    // }, [editor]);

    return (
        <div className={'docEditer-container'}>
            <div className={'docEditer-editor-inner'}>
                <div className={'docEditer-editor-header'}>
                    {/* <button onClick={handleUndo}>Undo</button>
                    <button onClick={handleRedo}>Redo</button> */}
                    <Toolbar data={active} onSelect={(params: any) => {
                        const { activeKey, value, group } = params;
                        if (group === 'mark') {
                            const newActive = {
                                ...active,
                                [activeKey]: value
                            }
                            console.log(activeKey);
                            toggleMark(editor, activeKey);
                            setActive(newActive);
                        }
                    }}/>
                </div>
                <div className={'docEditer-editor-content'}>
                    <Slate
                        editor={editor}
                        initialValue={initialValue}
                        onChange={value => {
                            console.log('change', value);
                            setDisplay('none');
                            const isAstChange = editor.operations.some(op => 'set_selection' !== op.type)
                            if (isAstChange) {
                                // Save the value to Local Storage.
                                const content = JSON.stringify(value)
                                console.log('content', content)
                                setStorageItem(content)
                            }
                        }}
                        onSelectionChange={(selection: any) => {
                            selectionRef.current = selection;
                            // console.log('selection', selection, inFocus , Range.isCollapsed(selection), Editor.string(editor, selection));
                        }}
                    >
                        {/* <HoveringToolbar /> */}
                        <Editable
                            className={'docEditer-editor-body'}
                            renderElement={renderElement}
                            renderLeaf={renderLeaf}
                            onMouseUp={event => {
                                // event.preventDefault();
                                if (!hoveringToolbarElRef.current || !selectionRef.current || Range.isCollapsed(selectionRef.current)) {
                                    setDisplay('none');
                                    return;
                                }
                                setDisplay('block');
                                console.log('Range', Range);
                                const domSelection = window.getSelection();
                                const domRange = domSelection!.getRangeAt(0);
                                const rect = domRange.getBoundingClientRect();
                                setPos([rect.left + window.pageXOffset - hoveringToolbarElRef.current.offsetWidth / 2 + rect.width / 2, rect.top + window.pageYOffset - hoveringToolbarElRef.current.offsetHeight]);
                                console.log('onMouseUp', Range.isCollapsed(selectionRef.current), Editor.string(editor, selectionRef.current));
                            }}
                            // onKeyDown={event => {
                            //     if (!event.ctrlKey) {
                            //         return;
                            //     }
                            //     switch (event.key) {
                            //         case 'x':
                            //             handleUndo();
                            //             break;
                            //         case 'c':
                            //             handleRedo();
                            //             break;
                            //         // case 'v':
                            //         //     handleClearHistory();
                            //         //     break;
                            //     }
                            // }}
                        // onTouchEnd = {event => {
                        //     // event.preventDefault();
                        //     console.log('onTouchEnd Range', Range);
                        //     // console.log('onMouseUp', Range.isCollapsed(selectionRef.current), Editor.string(editor, selectionRef.current));
                        // }}
                        // onKeyDown={event => {
                        //     if (!event.ctrlKey) {
                        //         return
                        //     }

                        //     switch (event.key) {
                        //         // When "`" is pressed, keep our existing code block logic.
                        //         case '`': {
                        //             event.preventDefault()
                        //             const [match] = Editor.nodes(editor, {
                        //                 match: (n: any) => n.type === 'code',
                        //             })
                        //             Transforms.setNodes(
                        //                 editor,
                        //                 { type: match ? 'paragraph' : 'code' } as any,
                        //                 {
                        //                     match: n => Element.isElement(n) && Editor.isBlock(editor, n),
                        //                 }
                        //             )
                        //             break
                        //         }

                        //         // When "B" is pressed, bold the text in the selection.
                        //         case 'b': {
                        //             event.preventDefault()
                        //             Editor.addMark(editor, 'bold', true)
                        //             break
                        //         }
                        //     }
                        // }}
                        />
                        <Portal>
                            <div ref={hoveringToolbarElRef} style={{
                                position: 'absolute',
                                left: `${pos[0]}px`,
                                top: `${pos[1]}px`,
                                zIndex: 100,
                                display: display,
                                borderRadius: '8px',
                                border: '1px solid rgba(15,22,36,0.05)',
                                background: '#fff',
                                boxShadow: '0px 16px 48px 0px rgba(17,24,39,0.04),0px 12px 24px 0px rgba(17,24,39,0.04),0px 6px 8px 0px rgba(17,24,39,0.02),0px 2px 3px 0px rgba(17,24,39,0.02)'
                            }}>
                                <HoveringToolbar data={active} onSelect={(params: any) => {
                                    const { activeKey, value, group } = params;
                                    if (group === 'mark') {
                                        const newActive = {
                                            ...active,
                                            [activeKey]: value
                                        }
                                        toggleMark(editor, activeKey);
                                        setActive(newActive);
                                    }
                                }}/>
                            </div>
                            
                        </Portal>
                    </Slate>
                </div>
            </div>
        </div>
    );
}

export default DocEditer;