import { ReactRenderer, useEditor } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import SlashCommandList from './SlashCommandList';
import tippy from "tippy.js";

export const SlashMenuPluginKey = new PluginKey('slash-command');

const Command = Extension.create({
    name: 'slash-command',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range, props });
                }
            }
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                pluginKey: SlashMenuPluginKey,
                ...this.options.suggestion,
                editor: this.editor
            })
        ];
    }
});

const SlashCommand = Command.configure({
    suggestion: {
        items: ({ query }: any) => {
            console.log('query', query);
            return [
                {
                    title: 'Heading 1',
                    command: ({ editor, range }: any) => {
                        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
                    },
                },
                {
                    title: 'Heading 2',
                    command: ({ editor, range }: any) => {
                        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
                    },
                },
                {
                    title: 'Bold',
                    command: ({ editor, range }: any) => {
                        editor.chain().focus().deleteRange(range).setMark('bold').run()
                    },
                },
                {
                    title: 'Italic',
                    command: ({ editor, range }: any) => {
                        editor.chain().focus().deleteRange(range).setMark('italic').run()
                    },
                },
            ]
        },
        render: () => {
            let component: ReactRenderer | null = null;
            let popup: any | null = null;
            return {
                onStart: (props: {
                    editor: ReturnType<typeof useEditor>;
                    clientRect: DOMRect;
                }) => {
                    component = new ReactRenderer(SlashCommandList, {
                        props,
                        editor: props.editor
                    });


                    if (!props.clientRect) {
                        return;
                    }

                    console.log('component', component.element)

                    // @ts-ignore
                    popup = tippy("body", {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "bottom-start",
                    });
                },
                onUpdate: (props: {
                    editor: ReturnType<typeof useEditor>;
                    clientRect: DOMRect;
                }) => {
                    console.log('component updateProps', !props.clientRect)
                    component?.updateProps(props);
                    if (!props.clientRect) {
                        return;
                    }
                    if (popup) {
                        popup[0].setProps({
                            getReferenceClientRect: props.clientRect
                        });
                    }
                },
                onKeyDown: (props: { event: KeyboardEvent }) => {
                    if (props.event.key === "Escape") {
                        popup?.[0].hide();
                        return true;
                    }
                    // @ts-ignore
                    return component?.ref?.onKeyDown(props);
                },
                onExit: () => {
                    if (popup && !popup[0].state.isDestroyed) {
                        popup[0].destroy();
                    }

                    if (component) {
                        component.destroy();
                    }
                }
            };
        }
    }
});

export default SlashCommand;