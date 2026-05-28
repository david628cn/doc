import { type Transaction, EditorState, Plugin, PluginKey, NodeSelection } from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { type EditorView, Decoration, DecorationSet } from 'prosemirror-view';
// import { ImagePreviewer } from '../../ui';
import { ImageView } from './imageView';
import { getPosRect } from '../../utils';
import { CLASSNAME } from '../../config';
import './index.less';

// const imagePreviewer = new ImagePreviewer();

/**
 * 获取文档中所有图片及当前点击图片的索引
 * @param {EditorState} state - ProseMirror 的 state
 * @param {number} clickPos - 当前点击的图片在文档中的绝对位置 (pos)
 */
export const getDocumentImages = (state: EditorState, clickPos: number) => {
    const images: any[] = [];
    let currentIndex = 0;

    // 遍历整个文档树
    state.doc.descendants((node, pos, parent, index) => {
        // 假设你的图片 Node 名称叫 'image'
        if (node.type.name === 'image') {
            images.push({
                // id: index,
                src: node.attrs.src,
                alt: node.attrs.alt,
                title: node.attrs.title,
                pos: pos // 记录图片在文档中的绝对位置
            });

            // 如果当前图片的 pos 和点击的 pos 一致，记录索引
            if (pos === clickPos) {
                currentIndex = images.length - 1;
            }
        }
        // 返回 true 继续遍历子节点
        return true;
    });

    return {
        images,       // 当前文档所有的图片数组 [{src, alt, pos}, ...]
        currentIndex  // 当前点击的图片在数组中的索引，传给预览组件作为初始页
    };
}


// const command = (url: string) => {
//     const { state } = view;

//     // 1. 從插件中獲取被 Mapping 過的最新位置
//     // 這保證了即使上傳期間用戶在前面插入了文字，位置依然準確
//     const imagePluginState = imagePluginKey.getState(state);
//     const currentPos = imagePluginState?.pos;

//     if (typeof currentPos !== 'number') {
//         console.warn('找不到插入點，可能已被用戶刪除');
//         return;
//     }

//     // 2. 執行替換/插入
//     const node = state.schema.nodes.image.create({ src: url });
//     const tr = state.tr
//         .replaceWith(currentPos, currentPos, node) // 在精確位置插入
//         .setMeta('image', false);                  // 關閉插件狀態（隱藏模擬光標和彈窗）

//     view.dispatch(tr);
//     view.focus();
// };

export const imagePluginKey = new PluginKey('image');

export const image = ({
    editor
}: any) => {
    // const cursorDom = document.createElement('span');
    // cursorDom.className = `${CLASSNAME}-cursor`;
    const plugin: Plugin = new Plugin({
        key: imagePluginKey,
        view(view: EditorView) {
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
                            const imagePluginState = imagePluginKey.getState(state);
                            const currentPos = imagePluginState?.pos;

                            if (typeof currentPos !== 'number') {
                                // console.warn('找不到插入點，可能已被用戶刪除');
                                return;
                            }

                            // 2. 執行替換/插入
                            const node = state.schema.nodes.image.create({ src: url });
                            const tr = state.tr
                                .replaceWith(currentPos, currentPos, node) // 在精確位置插入
                                .setMeta('image', false);                  // 關閉插件狀態（隱藏模擬光標和彈窗）

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
                        type: 'image',
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
                const meta = tr.getMeta('image');
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
                image: (node: Node, view: EditorView, getPos: () => number) => new ImageView(node, view, getPos)
            } as any,
            handleDOMEvents: {
                mousedown(view: EditorView, event: MouseEvent) {
                    const target = event.target as HTMLElement;

                    // 1. 严格锁定点击目标必须是图片
                    if (target.nodeName !== "IMG") return false;

                    const { state, dispatch } = view;
                    const { selection } = state;

                    // 🔍 精准获取当前点击的图片在 ProseMirror 中的绝对起始位置
                    // 对于原生节点或图片，使用 view.posAtDOM(target.parentNode, ...) 或直接使用底层方法更安全
                    // 最稳妥的方法是利用 view.utils 或直接通过 target 向上找对应的 ProseMirror 节点
                    let pos = view.posAtDOM(target, 0);

                    // 修正：如果点在 img 上，posAtDOM 返回的可能是节点内部，需要通过临近节点微调，或者直接安全获取
                    // 更好的做法是判断如果 nodeAt(pos) 不是 image，尝试 pos - 1
                    if (pos !== null && state.doc.nodeAt(pos)?.type.name !== 'image') {
                        if (pos > 0 && state.doc.nodeAt(pos - 1)?.type.name === 'image') {
                            pos = pos - 1;
                        }
                    }

                    if (pos === null) return false;
                    const node = state.doc.nodeAt(pos);
                    if (!node || node.type.name !== 'image') return false;

                    // 2. 判断当前点击的图片是否已经是“被选中”的状态
                    const isImageSelected = selection instanceof NodeSelection &&
                        selection.node.type.name === 'image' &&
                        selection.from === pos; // 👈 双重锁定：类型对，且位置对

                    // 3. 根据是否可编辑执行分流逻辑
                    if (editor.editable) {
                        if (isImageSelected) {
                            // 【第二次点击】已经选中了，直接触发预览
                            const { images, currentIndex } = getDocumentImages(view.state, selection.from);
                            editor.emit('action', { type: 'imagePreviewer', data: { images, currentIndex } });

                            event.preventDefault(); // 阻止浏览器默认行为
                            return true;            // 👈 必须返回 true，彻底拦截事件，不让 ProseMirror 乱动光标
                        } else {
                            // 【第一次点击】未选中，帮它创建一个 NodeSelection
                            const nodeSelection = NodeSelection.create(state.doc, pos);
                            const tr = state.tr.setSelection(nodeSelection);
                            dispatch(tr);

                            event.preventDefault(); // 阻止默认的文本光标闪烁
                            return true;            // 👈 告诉系统我已经消费了这次点击，别再走默认的文本点击逻辑了
                        }
                    } else {
                        // 【非编辑模式】直接预览
                        const { images, currentIndex } = getDocumentImages(view.state, pos);
                        editor.emit('action', { type: 'imagePreviewer', data: { images, currentIndex } });

                        event.preventDefault();
                        return true;
                    }
                }
            },
            handleKeyDown(view: EditorView, event: any) {
                const state = imagePluginKey.getState(view.state);
                if (typeof state.pos !== 'number') {
                    return false; // 我不活跃，放行给后面的插件
                }
                if (event.key === 'Escape' || event.key === 'Esc') {
                    view.dispatch(view.state.tr.setMeta('image', false));
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
                cursor.className = `${CLASSNAME}-image-cursor`;
                return DecorationSet.create(state.doc, [
                    Decoration.widget(pos, cursor, { key: 'image-cursor', side: -1 })
                ]);
            }
        }
    });

    return plugin;
}