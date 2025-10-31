import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Selection } from '@tiptap/extensions';

import SlashCommand from './DocCommands/SlashCommand';

import './DocNodes/HeadingNode/index.less';
import './DocNodes/CodeBlockNode/index.less';
import './DocNodes/ParagraphNode/index.less';
import './DocNodes/BlockquoteNode/index.less';
import './DocNodes/ListNode/index.less';
import './DocNodes/ImageNode/index.less';

import styles from './index.module.less';

interface DocViewerProps {
    params?: any;
    data?: Array<any>;
}

const DocViewer: React.FC<DocViewerProps> = props => {
    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                // "aria-label": "Main content area, start typing to enter text.",
                class: "simple-editor",
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                link: {
                    openOnClick: false,
                    enableClickSelection: true,
                },
            }),
            SlashCommand,
            // HorizontalRule,
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
        ],
        content: props.data
    })

    return (
        <div className={styles['docViewer-container']}>
            <EditorContext.Provider value={{ editor }}>
                <EditorContent
                    editor={editor}
                    role="presentation"
                    className={styles['docViewer-content']}
                />
            </EditorContext.Provider>
        </div>
    )
}

export default DocViewer;