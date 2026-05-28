import { type EditorState, type Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { AudioView } from './audioView';
import { getPosRect } from '../../utils';
import { CLASSNAME } from '../../config';
import './index.less';

export const audioPluginKey = new PluginKey('audio');

export const audio = ({
    editor
}: any) => {
    // const cursorDom = document.createElement('span');
    // cursorDom.className = `${CLASSNAME}-cursor`;
    const plugin: Plugin = new Plugin({
        key: audioPluginKey,
        view(_: EditorView) {
            return {
                update(view: EditorView) {
                    const next = plugin.getState(view.state);
                    let pos = next.pos;
                    const params: any = {
                        active: typeof pos === 'number' ? true : false,
                        pos,
                        rect: null,
                        command: (url: string) => {
                            const { state } = view;

                            // 1. 從插件中獲取被 Mapping 過的最新位置
                            // 這保證了即使上傳期間用戶在前面插入了文字，位置依然準確
                            const audioPluginState = audioPluginKey.getState(state);
                            const currentPos = audioPluginState?.pos;

                            if (typeof currentPos !== 'number') {
                                console.warn('找不到插入點，可能已被用戶刪除');
                                return;
                            }

                            // 2. 執行替換/插入
                            const node = state.schema.nodes.audio.create({ src: url });
                            const tr = state.tr
                                .replaceWith(currentPos, currentPos, node) // 在精確位置插入
                                .setMeta('audio', false);                  // 關閉插件狀態（隱藏模擬光標和彈窗）

                            view.dispatch(tr);
                            view.focus();
                        }
                    };
                    if (params.active) {
                        const rect = getPosRect(view, pos);
                        params.rect = rect;
                    }
                    if (!params.rect) {
                        params.active = false;
                    }
                    editor.emit('action', {
                        type: 'audio',
                        data: params
                    });
                }
            }
        },
        state: {
            init() {
                return {
                    pos: null
                };
            },
            apply(tr: Transaction, prevValue: any) {
                const meta = tr.getMeta('audio');
                if (meta === false) {
                    return {
                        pos: null
                    };
                }
                if (meta === true) {
                    return {
                        pos: tr.selection.from
                    };
                }
                if (meta && typeof meta.pos === 'number') {
                    const newPos = meta.pos;
                    
                    // 【關鍵檢查】：確保傳入的位點在當前文檔範圍內
                    // 如果位置越界（例如異步延遲導致文檔被刪減），則不開啟
                    if (newPos < 0 || newPos > tr.doc.content.size) {
                        return { pos: null };
                    }
                    
                    return { pos: newPos };
                }
                const value = {
                    ...prevValue
                }
                if (value.pos !== null) {
                    // 使用 mapResult 获取详细的映射结果
                    const result = tr.mapping.mapResult(value.pos);
                    
                    // deleted 为 true 表示该位置所在的范围被删除了（例如删除了父段落）
                    if (result.deleted) {
                        return { pos: null }; 
                    }

                    // 检查映射后的位置是否还在文档合法范围内
                    if (result.pos > tr.doc.content.size) {
                        return { pos: null };
                    }

                    return { pos: result.pos };
                }
                return value;
            }
        },
        props: {
            nodeViews: {
                audio: (node: Node, view: EditorView, getPos: () => number) => new AudioView(node, view, getPos)
            } as any,
            handleKeyDown(view: EditorView, event: any) {
                const state = audioPluginKey.getState(view.state);
                if (typeof state.pos !== 'number') {
                    return false; // 我不活跃，放行给后面的插件
                }
                if (event.key === 'Escape' || event.key === 'Esc') {
                    view.dispatch(view.state.tr.setMeta('audio', false));
                    return true;
                }
                return false;
            },
            decorations(state) {
                const { pos } = this.getState(state);
                if (typeof pos !== 'number') {
                    return DecorationSet.empty;
                }
                // 3. 渲染模拟光标 (Widget)
                const cursor = document.createElement('span');
                cursor.className = `${CLASSNAME}-cursor`;
                return DecorationSet.create(state.doc, [
                    Decoration.widget(pos, cursor, { key: 'cursor', side: -1 })
                ]);
            }
        }
    });

    return plugin;
}