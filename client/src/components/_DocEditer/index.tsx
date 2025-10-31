import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Selection, Placeholder } from '@tiptap/extensions';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Document from '@tiptap/extension-document';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
// import { WebrtcProvider } from 'y-webrtc';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs'
import SlashCommand from './Commands/SlashCommand';
import './blockquote-node.less';
import './code-block-node.less';
import './heading-node.less';
import './image-node.less';
import './list-node.less';
import './paragraph-node.less';
import './simple-editor.less';
import './variables.less';
import './keyframe-animations.less';
import './index.less';

import content from './content.json'

// console.log('provider', Provider.HocuspocusProvider)

const ydoc = new Y.Doc();
// const provider = new WebrtcProvider('xxx', ydoc);
// const provider = new Provider.HocuspocusProvider({
//     url: 'wss://your-hocuspocus-server:1234',
//     document: ydoc, // 必填参数
//     connect: false, // 可选延迟连接
//     maxAttempts: 5, // 重连最大尝试次数
//     delay: 3000 // 重连间隔(ms)
// } as any)
// const provider = new HocuspocusProvider({
//     url: `ws://127.0.0.1:8000/docWs?userId=${}`,
//     name: "page.sdgfgjhjl2354797809879",
//     document: ydoc,
//     // connect: true,
//     // preserveConnection: false,
//     // onStatus: (status: any) => {
//     //     if (status.status === "connected") {
//     //         console.log(status.status);
//     //     }
//     // }
// });

interface DocEditerProps {
    params?: any
}

const DocEditer: React.FC<DocEditerProps> = props => {
    // const containRef: any = useRef(null);
    const elRef: any = useRef(null);
    const editRef: any = useRef(null);
    useEffect(() => {
        console.log('文档初始化');
        let provider: any;
        if (!editRef.current) {
            provider = new HocuspocusProvider({
                url: `ws://127.0.0.1:8000/docWs?userId=${props.params.user.id}&roomId=${props.params.docId}`,
                name: props.params.docId,
                document: ydoc,
                connect: true,
                preserveConnection: false,
                // onStatus: (status: any) => {
                //     if (status.status === "connected") {
                //         console.log(status.status);
                //     }
                // }
            });
            provider.on('synced', () => {
                console.log('synced');
            });
            provider.on('disconnect', () => {
                console.log('disconnect');
            });
            editRef.current = new Editor({
                element: elRef.current,
                extensions: [
                    Document,
                    Text,
                    Paragraph,
                    StarterKit.configure({
                        undoRedo: false,
                        dropcursor: {
                            width: 3,
                            color: "#70CFF8",
                        },
                        horizontalRule: false,
                        link: {
                            openOnClick: false,
                            enableClickSelection: true,
                        },
                    }),
                    SlashCommand,
                    //   HorizontalRule,
                    TextAlign.configure({ types: ["heading", "paragraph"] }),
                    TaskList,
                    TaskItem.configure({ nested: true }),
                    Highlight.configure({ multicolor: true }),
                    Image,
                    Typography,
                    Superscript,
                    Subscript,
                    Selection,
                    // ImageUploadNode.configure({
                    //     accept: "image/*",
                    //     maxSize: MAX_FILE_SIZE,
                    //     limit: 3,
                    //     upload: handleImageUpload,
                    //     onError: (error) => console.error("Upload failed:", error),
                    // }),
                    Collaboration.configure({
                        document: ydoc
                    }),
                    CollaborationCaret.configure({
                        provider,
                        user: {
                            name: props.params.user.username,
                            color: '#ffcc00',
                        },
                    })
                    // Placeholder.configure({
                    //     placeholder: 'Write something … It’ll be shared with everyone else looking at this example.',
                    // }),
                ],
                editable: true,
                editorProps: {
                    attributes: {
                        class: 'simple-editor'
                    }
                },
                // editorProps: {
                //     scrollThreshold: 80,
                //     scrollMargin: 80,
                //     handleDOMEvents: {
                //         keydown: (view: any, event: any): any => {
                //             if ((event.ctrlKey || event.metaKey) && event.code === "KeyS") {
                //                 event.preventDefault();
                //                 return true;
                //             }
                //             if ((event.ctrlKey || event.metaKey) && event.code === "KeyK") {
                //                 // searchSpotlight.open();
                //                 return true;
                //             }
                //             if (["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) {
                //                 const slashCommand = document.querySelector("#slash-command");
                //                 if (slashCommand) {
                //                     return true;
                //                 }
                //             }
                //             if (
                //                 [
                //                     "ArrowUp",
                //                     "ArrowDown",
                //                     "ArrowLeft",
                //                     "ArrowRight",
                //                     "Enter",
                //                 ].includes(event.key)
                //             ) {
                //                 const emojiCommand = document.querySelector("#emoji-command");
                //                 if (emojiCommand) {
                //                     return true;
                //                 }
                //             }
                //         }
                //     },
                //     handlePaste: (view, event, slice) => {
                //         // handlePaste(view, event, pageId, currentUser?.user.id)
                //     },
                //     handleDrop: (view, event, _slice, moved) => {
                //         // handleFileDrop(view, event, moved, pageId)
                //     }
                // },
                // content
            });
        }
        return () => {
            if (provider) {
                // 1. 状态同步
                // provider.document.gc();
                // provider.sendStateless('disconnect', { reason: 'user-request' });

                // 2. 清理awareness
                // provider.setAwarenessField('presence', null);
                // provider.awareness.destroy();

                // 3. 断开连接
                // setTimeout(() => provider.disconnect(), 100);

                provider.disconnect();
                provider.destroy();
            }
        }
    }, []);
    return (
        <div className={'docEditer-container'}>
            <div className={'simple-editor-wrapper'}>
                <div className={'simple-editor-content'} ref={elRef}></div>
            </div>
        </div>
    );
}

export default DocEditer;