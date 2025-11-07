import { BaseEditor, BaseRange } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

export type CodeElement = {
    type: 'code'
    children: Descendant[]
}


export type ParagraphElement = {
    type: 'paragraph'; children: CustomText[]
    align?: string
}

export type CustomText = {
    bold?: boolean
    italic?: boolean
    code?: boolean
    underline?: boolean
    strikethrough?: boolean
    superscript?: boolean
    subscript?: boolean
    // MARKDOWN PREVIEW SPECIFIC LEAF
    underlined?: boolean
    title?: boolean
    list?: boolean
    hr?: boolean
    blockquote?: boolean
    text: string
}

export type CustomTextKey = keyof Omit<CustomText, 'text'>;

export type CustomElement =
    | ParagraphElement
    | CodeElement
    | {
        type?: string
    }
// | HeadingElement
// | HeadingTwoElement
// | HeadingThreeElement
// | HeadingFourElement
// | HeadingFiveElement
// | HeadingSixElement
// | BlockQuoteElement
// | BulletedListElement

export type CustomEditor = BaseEditor &
    ReactEditor &
    HistoryEditor & {
        nodeToDecorations?: Map<Element, Range[]>
    }

declare module 'slate' {
    interface CustomTypes {
        Editor: CustomEditor
        Element: CustomElement
        Text: CustomText
        Range: BaseRange & {
            [key: string]: unknown
        }
    }
}