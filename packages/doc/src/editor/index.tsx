import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { Doc as DocView } from '../doc';
import { Popuover, MediaUpload, Menu, ImagePreviewer } from '@carvy/ui';
import { ToolBar } from '../toolBar';
// import { Button } from '@/components/button';
import {
    TextIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    Heading4Icon,
    BulletListIcon,
    OrderedListIcon,
    // TaskListIcon,
    BlockquoteIcon,
    CodeBlockIcon,
    HorizontalRule,
    TableIcon,
    ImageIcon,
    VedioIcon,
    AudioIcon,
    FileIcon,
    BookmarkIcon
} from '../config/Icon';
import { CLASSNAME } from '../config';
import './index.less';

export type DocProps = {
    className?: string;
    content?: any;
    editable?: boolean;
    // editor?: Editor;
    // onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void;
    children?: ReactNode;
}

// export const ParentContext = createContext(null);

const commandTree = [
    {
        label: '基本',
        // key: 'basic',
        type: 'group',
        children: [
            { label: '正文', key: 'paragraph', nodeType: 'paragraph', nodeAttrs: null, icon: TextIcon, description: '普通文本输入' },
            { label: '标题 1', key: 'heading1', nodeType: 'heading', nodeAttrs: { level: 1 }, icon: Heading1Icon, description: '最大的标题' },
            { label: '标题 2', key: 'heading2', nodeType: 'heading', nodeAttrs: { level: 2 }, icon: Heading2Icon, description: '中型标题' },
            { label: '标题 3', key: 'heading3', nodeType: 'heading', nodeAttrs: { level: 3 }, icon: Heading3Icon, description: '小型标题' },
            { label: '标题 4', key: 'heading4', nodeType: 'heading', nodeAttrs: { level: 4 }, icon: Heading4Icon, description: '超小标题' },
            { label: '无序列表', key: 'bullet_list', nodeType: 'bullet_list', nodeAttrs: null, icon: BulletListIcon },
            { label: '有序列表', key: 'ordered_list', nodeType: 'ordered_list', nodeAttrs: null, icon: OrderedListIcon },
            // { label: '任务列表', key: 'task_list', nodeType: 'task_list', nodeAttrs: null, icon: TaskListIcon }
            { label: '引用', key: 'blockquote', nodeType: 'blockquote', nodeAttrs: null, icon: BlockquoteIcon },
            { label: '表格', key: 'table', nodeType: 'table', nodeAttrs: null, icon: TableIcon },
            { label: '代码', key: 'code_block', nodeType: 'code_block', nodeAttrs: null, icon: CodeBlockIcon },
            { label: '分隔线', key: 'horizontal_rule', nodeType: 'horizontal_rule', nodeAttrs: null, icon: HorizontalRule }
        ]
    },
    {
        label: '媒体',
        // key: 'advanced',
        type: 'group',
        children: [
            { label: '图片', key: 'image', nodeType: 'image', nodeAttrs: null, icon: ImageIcon },
            { label: '视频', key: 'video', nodeType: 'video', nodeAttrs: null, icon: VedioIcon },
            { label: '音频', key: 'audio', nodeType: 'audio', nodeAttrs: null, icon: AudioIcon },
            { label: '文件', key: 'file', nodeType: 'file', nodeAttrs: null, icon: FileIcon },
            { label: '书签', key: 'bookmark', nodeType: 'bookmark', nodeAttrs: null, icon: BookmarkIcon }
        ]
    },
    {
        label: '高级',
        // key: 'list',
        type: 'group',
        children: [
            { label: '分栏', key: 'columns', nodeType: 'columns', nodeAttrs: null, icon: BlockquoteIcon }
        ]
    },
];

const searchTree = (query: string = '', tree: any = []) => {
    if (!query) {
        return tree;
    }
  const keyword = query.toString().toLocaleLowerCase().trim();
  return tree.map((node: any) => {
      // 1. 先递归处理子节点
      const children = node.children ? searchTree(keyword, node.children) : null;
      
      // 2. 检查当前节点是否匹配：label 包含关键字 OR 子节点有匹配项
      const isMatch = node.label.includes(keyword);
      const hasChildMatch = children && children.length > 0;

      if (isMatch || hasChildMatch) {
        // 返回当前节点，如果有子节点匹配则带上过滤后的子节点
        return { ...node, children };
      }
      
      return null;
    })
    .filter((node: any) => node !== null); // 移除不匹配的节点
};

export const Doc: React.FC<DocProps> = props => {
    const {
        className = `${CLASSNAME}-editor-body`,
        content = '',
        editable
        // editor
    } = props;

    const [suggestionState, setSuggestionState] = useState({
        rect: null,
        open: false,
        query: '',
        text: '',
        range: null,
        command: (params: any) => {},
        items: []
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

    const [uploadImage, setUploadImage] = useState({
        rect: null,
        open: false,
        command: (params: any) => {}
    });

    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [images, setImages] = useState([]);

    const contentRef = useRef(null);
    const editorRef: any = useRef(null);

    const handleUploadImage = (params: any) => {
        setUploadImage({
            open: params.active,
            rect: params.rect,
            command: params.command
        });
    }

    const handleSuggestion = (params: any) => {
        const items = searchTree(params.query, commandTree);
        setSuggestionState({
            open: params.active,
            text: params.text,
            rect: params.rect,
            query: params.query,
            range: params.range,
            items,
            command: params.command
        });
    }

    const handleSelection = ({
        active,
        rect
    }: any) => {
        if (active) {
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
            open: active,
            rect
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
            editorRef.current = new DocView({
                element: contentRef.current,
                content,
                editable: editable === false ? false : true,
                onAction: (params: any) => {
                    const { type, data } = params;
                    if (type === 'selection') {
                        // handleSelection(data);
                    } else if (type === 'suggestion') {
                        handleSuggestion(data);
                    } else if (type === 'image') {
                        handleUploadImage(data);
                    } else if (type === 'imagePreviewer') {
                        setImages(data.images);
                        setCurrentImgIndex(data.currentIndex);
                        setViewerOpen(true);
                    }
                }
                // onSuggestion: handleSuggestion,
                // onSelection: handleSelection
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

    // const handleClick = (e: any) => {
    //     e.preventDefault();
    //     console.log(e)
    //     let tr = editorRef.current.view.state.tr;
    //     const column = editorRef.current.view.state.schema.nodes.column.createAndFill();
    //     const columns = editorRef.current.view.state.schema.nodes.columns.createAndFill();
    //     editorRef.current.view.dispatch(tr.replaceSelectionWith(columns).scrollIntoView());
    // }

    return (
        // <ParentContext.Provider value={editorRef}>
        <div className={`${CLASSNAME}-container`}>
            <div className={`${CLASSNAME}-editor-inner`}>
                {/* <div className={`${CLASSNAME}-editor-header`} style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Button onClick={handleClick}>添加</Button>
                </div> */}
                <div className={`${CLASSNAME}-editor-content`} ref={contentRef}>
                    <Popuover
                        pos='tl-bl?'
                        container={contentRef.current}
                        isScroll={false}
                        popuoverProps={{
                            onPointerDown: (e: any) => e.preventDefault()
                        }}
                        onChange={(params: any) => {
                            // params.event.preventDefault();
                            if (editorRef.current) {
                                const { state, dispatch } = editorRef.current.view;
                                const { tr } = state;
                                dispatch(tr.setMeta('suggestion', {
                                    active: false
                                }));
                            }
                            
                        }}
                        {...suggestionState}
                    >
                        <Menu
                            className={`${CLASSNAME}-suggestion-menu`}
                            mode='bubble'
                            shortKey={suggestionState.open}
                            items={suggestionState.items}
                            onSelect={(params: any) => {
                                suggestionState.command?.({
                                    // active: false,
                                    nodeType: params.item.nodeType,
                                    nodeAttrs: params.item.nodeAttrs,
                                    text: suggestionState.text,
                                    query: suggestionState.query,
                                    range: suggestionState.range
                                })
                            }}
                        />
                    </Popuover>
                    <Popuover
                        pos='tl-bl?'
                        // gap={0}
                        container={contentRef.current}
                        isScroll={false}
                        popuoverProps={{
                            onPointerDown: (e: any) => e.preventDefault()
                        }}
                        onChange={(params: any) => {
                            // params.event.preventDefault();
                            if (editorRef.current) {
                                const { state, dispatch } = editorRef.current.view;
                                const { tr } = state;
                                dispatch(tr.setMeta('image', false));
                            }
                            
                        }}
                        {...uploadImage}
                    // onChange={handleSelectionPopupVisibleChange}
                    >
                        {/* <MediaUpload onComplete={(params: any) => {
                            uploadImage.command(params.file);
                        }}/> */}
                    </Popuover>
                    <Popuover
                        pos='t-b?'
                        gap={30}
                        container={contentRef.current}
                        isScroll={false}
                        popuoverProps={{
                            onPointerDown: (e: any) => e.preventDefault()
                        }}
                        {...selectionUpdate}
                        onChange={(_: any) => {
                            // params.event.preventDefault();
                            if (editorRef.current) {
                                const { state, dispatch } = editorRef.current.view;
                                const { tr } = state;
                                dispatch(tr.setMeta('selection', {
                                    active: false
                                }));
                            }
                            
                        }}
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
                    </Popuover>
                    <ImagePreviewer 
                        open={viewerOpen}
                        images={images}
                        defaultIndex={currentImgIndex}
                        onClose={() => setViewerOpen(false)}
                    />
                </div>
            </div>
        </div>
        // </ParentContext.Provider>
    );
}