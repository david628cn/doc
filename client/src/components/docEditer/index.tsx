import { type ReactNode, useEffect, useRef, useCallback, createContext, useContext, useState } from 'react';
import { Editor as EditorCompent } from '@/components/docEditer/core/editor';
import { Popup } from '@/components/dropdown';
import { ToolBar } from '@/components/toolBar';
import { Menu } from '@/components/menu';
import {
    TextIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    Heading4Icon,
    BulletListIcon,
    OrderedListIcon,
    TaskListIcon,
    BlockquoteIcon, 
    CodeBlockIcon,
    TableIcon
} from '@/assets/Icon';
import { CLASSNAME } from '@/global';
import './index.less';

export type DocEditorProps = {
    className?: string;
    content?: any;
    editable?: boolean;
    // editor?: Editor;
    // onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void;
    children?: ReactNode;
}

// export const ParentContext = createContext(null);

export const DocEditor: React.FC<DocEditorProps> = props => {
    const {
        className = `${CLASSNAME}-editor-body`,
        content = '',
        editable
        // editor
    } = props;

    const [suggestionState, setSuggestionState] = useState({
        rect: null,
        open: false,
        query: ''
    });

    const [selectionUpdate, setSelectionUpdate] = useState({
        rect: null,
        open: false
    });

    const [toolBarData, setToolBarData] = useState({
        textAlign: '',
        strong: false,
        em: false,
        s: false,
        u: false,
        link: false,
        code: false,
        textStyle: {
            color: 'rgba(0,0,0,1)',
            backgroundColor: 'rgba(255,255,255,0)'
        },
        sup: false,
        sub: false
    });

    const contentRef = useRef(null);
    const editorRef: any = useRef(null);
    const handleSuggestion = (params: any) => {
        console.log('handleSuggestion', params);
        setSuggestionState({
            open: params.active,
            rect: params.rect,
            query: params.query
        });
    }

    const handleSelection = (params: any) => {
        const open = !params.rect ? false : true;
        if (open) {
            setToolBarData({
                textAlign: editorRef.current.getTextAlign(),
                strong: editorRef.current.hasMark('strong'),
                em: editorRef.current.hasMark('em'),
                s: editorRef.current.hasMark('s'),
                u: editorRef.current.hasMark('u'),
                link: editorRef.current.hasMark('link'),
                code: editorRef.current.hasMark('code'),
                textStyle: {
                    color: editorRef.current.getTextStyle('color'),
                    backgroundColor: editorRef.current.getTextStyle('backgroundColor')
                },
                sup: editorRef.current.hasMark('sup'),
                sub: editorRef.current.hasMark('sub')
            });
        }
        setSelectionUpdate({
            open,
            rect: params.rect
        });
    }

    // const handleBlur = () => {
    //     setSelectionUpdate({
    //         open: false,
    //         rect: null
    //     });
    // }

    useEffect(() => {
        if (contentRef.current) {
            editorRef.current = new EditorCompent({
                element: contentRef.current,
                content,
                editable: editable === false ? false : true,
                onSuggestion: handleSuggestion,
                onSelection: handleSelection
                // onBlur: handleBlur
                // content: `<h1>
                //             This is a very unique heading.
                //         </h1>
                //         <p>
                //             This is a unique paragraph. It’s so unique, it even has an ID attached to it.
                //         </p>
                //         <p>
                //             And this one, too.
                //         </p>`
            });
        }

        return () => {
            if (editorRef.current) {
                editorRef.current.destroy?.();
            }
        }

    }, []);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.editable = editable === false ? false : true;
        }
    }, [editable]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.content = content;
        }
    }, [content]);

    return (
        // <ParentContext.Provider value={editorRef}>
        <div className={`${CLASSNAME}-container`}>
            <div className={`${CLASSNAME}-editor-inner`}>
                <div className={`${CLASSNAME}-editor-header`} style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>

                </div>
                <div className={`${CLASSNAME}-editor-content`}>
                    <div
                        className={className}
                        ref={contentRef}
                    >
                        {/* <div className="drag-handle">
                            <div className="drag-handle-button-group">
                                <button className="drag-handle-button add">
                                    <svg width="24" height="24" className="drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z" fill="currentColor"></path></svg>
                                </button>
                                <button className="drag-handle-button drag" draggable="true">
                                    <svg width="24" height="24" className="drag-handle-button-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" fill="currentColor"></path><path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" fill="currentColor"></path><path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" fill="currentColor"></path><path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" fill="currentColor"></path><path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" fill="currentColor"></path><path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" fill="currentColor"></path></svg>
                                </button>
                            </div>
                        </div>
                        <Popup
                            {...suggestionState}
                            placement='tl-bl?'
                            items={<ToolBar />}
                            onChange={handleSuggestionPopupVisibleChange}
                        ></Popup>
                        */}
                        <Popup
                            placement='tl-bl?'
                            // container={contentRef.current}
                            {...suggestionState}

                        // onChange={handleSelectionPopupVisibleChange}
                        >
                            <Menu 
                                items={[
                                    {
                                        label: 'Text',
                                        key: 'text',
                                        icon: TextIcon
                                    },
                                    {
                                        label: 'Heading 1',
                                        key: 'heading1',
                                        icon: Heading1Icon
                                    },
                                    {
                                        label: 'Heading 2',
                                        key: 'heading2',
                                        icon: Heading2Icon
                                    },
                                    {
                                        label: 'Heading 3',
                                        key: 'heading3',
                                        icon: Heading3Icon
                                    },
                                    {
                                        label: 'Heading 4',
                                        key: 'heading4',
                                        icon: Heading4Icon
                                    },
                                    {
                                        label: 'Bullet list',
                                        key: 'bulletList',
                                        icon: BulletListIcon
                                    },
                                    {
                                        label: 'Ordered list',
                                        key: 'orderedList',
                                        icon: OrderedListIcon
                                    },
                                    {
                                        label: 'Task list',
                                        key: 'taskList',
                                        icon: TaskListIcon
                                    },

                                    {
                                        label: 'Blockquote',
                                        key: 'blockquote',
                                        icon: BlockquoteIcon
                                    },
                                    {
                                        label: 'CodeBlock',
                                        key: 'codeBlock',
                                        icon: CodeBlockIcon
                                    },
                                    {
                                        label: 'Table',
                                        key: 'table',
                                        icon: TableIcon
                                    }
                                ]}
                            />
                        </Popup>
                        <Popup
                            placement='t-b?'
                            gap={10}
                            // container={contentRef.current}
                            {...selectionUpdate}

                        // onChange={handleSelectionPopupVisibleChange}
                        >
                            <ToolBar
                                data={toolBarData}
                                onChange={(params: any) => {
                                    const { type, name, value, data } = params;
                                    if (type === 'mark') {
                                        editorRef.current.setMark(name, value);
                                    } else if (type === 'textAlign') {
                                        editorRef.current.setTextAlign(value);
                                    }
                                    setToolBarData(data);
                                }}
                            />
                        </Popup>
                    </div>
                </div>
            </div>
        </div>
        // </ParentContext.Provider>
    );
}