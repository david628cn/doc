import { type Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { LANGS, shiki, changeLangAndEnsureLoaded } from './shiki';
import { BaseBlockView } from '../baseBlockView';
import { Select } from '../../ui';
import { CLASSNAME } from '../../config';
import { language } from '@codemirror/language';

export { shiki };

const options: any = LANGS.map(lang => {
    return { 
        key: lang, 
        label: lang.charAt(0).toUpperCase() + lang.slice(1) 
    };
});

const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Modern clipboard failed:', err);
        }
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('Fallback failed:', err);
    }
    document.body.removeChild(textArea);
    return success;
};

export class CodeBlockView extends BaseBlockView {
    selectContainer: any;
    select: any;
    copyBtn: any;
    switcherBtn: any;
    pre: HTMLElement;
    constructor(node: Node, view: EditorView, getPos: () => number) {
        super({
            node,
            view,
            getPos
        });
        this.pre = document.createElement('pre');
        const code = document.createElement('code');
        this.pre.appendChild(code);
        this.contentDOM = code;
        this.createTools();
        this.dom.appendChild(this.pre);
        this.createHandle({
            icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.4545 4.2983C15.6192 3.77115 15.3254 3.21028 14.7983 3.04554C14.2712 2.88081 13.7103 3.1746 13.5455 3.70175L8.54554 19.7017C8.38081 20.2289 8.6746 20.7898 9.20175 20.9545C9.72889 21.1192 10.2898 20.8254 10.4545 20.2983L15.4545 4.2983Z"></path><path d="M6.70711 7.29289C7.09763 7.68342 7.09763 8.31658 6.70711 8.70711L3.41421 12L6.70711 15.2929C7.09763 15.6834 7.09763 16.3166 6.70711 16.7071C6.31658 17.0976 5.68342 17.0976 5.29289 16.7071L1.29289 12.7071C0.902369 12.3166 0.902369 11.6834 1.29289 11.2929L5.29289 7.29289C5.68342 6.90237 6.31658 6.90237 6.70711 7.29289Z"></path><path d="M17.2929 7.29289C17.6834 6.90237 18.3166 6.90237 18.7071 7.29289L22.7071 11.2929C23.0976 11.6834 23.0976 12.3166 22.7071 12.7071L18.7071 16.7071C18.3166 17.0976 17.6834 17.0976 17.2929 16.7071C16.9024 16.3166 16.9024 15.6834 17.2929 15.2929L20.5858 12L17.2929 8.70711C16.9024 8.31658 16.9024 7.68342 17.2929 7.29289Z"></path></svg>'
        });
        this.updateStatus();
    }

    /**
     * 精准监听编辑器编辑属性的切换，改变下拉框的状态
     */
    onChange(e: any) {
        const { detail, type } = e;
        if (type === 'editableChanged') {
            const isEditable = detail;
            if (this.select) {
                this.select.readonly = !isEditable;
            }
            
            // 【补充可选控制】只读模式下同步禁用/隐藏拖拽手柄的外观和交互
            const dragHandleDom = this.dom.querySelector(`.${CLASSNAME}-drag-handle`) as HTMLElement || this.dragHandle?.dom;
            if (dragHandleDom) {
                dragHandleDom.style.pointerEvents = isEditable ? 'auto' : 'none';
                dragHandleDom.style.display = isEditable ? '' : 'none';
            }
        }
        
    };

    handleCopy = async (e: any) => {
        e.preventDefault();
        const success = await copyTextToClipboard(this.node.textContent);
        if (success) {
            this.copyBtn.innerHTML = '<svg width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014"><path d="M883 226.014q-13-13-30-13t-30 13l-439 440-183-184q-13-13-30-13t-30 13-13 30 13 30l213 213q7 7 13.5 10t16.5 3 16.5-3 13.5-10l469-469q13-13 13-30t-13-30"/></svg>';
            setTimeout(() => {
                this.copyBtn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>';
            }, 1000);
        }
    };

    handleSwitcher = (e: any) => {
        e.preventDefault();
        const isCollapsed = this.dom.classList.toggle(`${CLASSNAME}-block-wrapper-collapsed`);
        if (isCollapsed) {
            this.switcherBtn.classList.add(`${CLASSNAME}-block-type-code_block-switcher-close`);
            const { from, to } = this.view.state.selection;
            const currentPos = this.getPos();
            if (from > currentPos && to < currentPos + this.node.nodeSize) {
                this.view.focus();
            }
        } else {
            this.switcherBtn.classList.remove(`${CLASSNAME}-block-type-code_block-switcher-close`);
        }
    };

    createTools() {
        const tools = document.createElement('div');
        tools.className = `${CLASSNAME}-block-type-code_block-tools`;
        tools.setAttribute('contenteditable', 'false');
        
        const leftDom = document.createElement('div');
        leftDom.className = `${CLASSNAME}-block-type-code_block-tools-left`;
        const rightDom = document.createElement('div');
        rightDom.className = `${CLASSNAME}-block-type-code_block-tools-right`;
        
        this.switcherBtn = document.createElement('button');
        this.switcherBtn.className = `${CLASSNAME}-block-type-code_block-button ${CLASSNAME}-block-type-code_block-switcher`;
        this.switcherBtn.innerHTML = `<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path></svg>`;
        this.switcherBtn.addEventListener('click', this.handleSwitcher);
        leftDom.appendChild(this.switcherBtn);
        
        const selectContainer = document.createElement('div');
        
        
        this.select = new Select(selectContainer, {
            className: `${CLASSNAME}-block-type-code_block-select`,
            popuoverContainer: this.view.dom.parentElement as HTMLElement,
            options,
            value: this.node.attrs.language || LANGS[0],
            readonly: !this.view.editable, // 初始化时自动匹配当前的只读状态
            // isAutoScroll: false,
            popuoverContainerStyle: {
                width: '160px'
            },
            onChange: async (v) => {
                const targetLang = v;
                const currentPos = this.getPos();
                const { tr } = this.view.state;
                this.view.dispatch(
                    tr.setNodeMarkup(this.getPos(), null, {
                        ...this.node.attrs,
                        language: targetLang
                    })
                );
                await changeLangAndEnsureLoaded(this.view, currentPos, targetLang || LANGS[0]);
            }
        });
        rightDom.appendChild(selectContainer);
        
        this.copyBtn = document.createElement('button');
        this.copyBtn.className = `${CLASSNAME}-block-type-code_block-button`;
        this.copyBtn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 9C9.44772 9 9 9.44772 9 10V20C9 20.5523 9.44772 21 10 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H10ZM7 10C7 8.34315 8.34315 7 10 7H20C21.6569 7 23 8.34315 23 10V20C23 21.6569 21.6569 23 20 23H10C8.34315 23 7 21.6569 7 20V10Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C3.45228 3 3 3.45228 3 4V14C3 14.5477 3.45228 15 4 15C4.55228 15 5 15.4477 5 16C5 16.5523 4.55228 17 4 17C2.34772 17 1 15.6523 1 14V4C1 2.34772 2.34772 1 4 1H14C15.6523 1 17 2.34772 17 4C17 4.55228 16.5523 5 16 5C15.4477 5 15 4.55228 15 4C15 3.45228 14.5477 3 14 3H4Z" fill="currentColor"></path></svg>';
        this.copyBtn.addEventListener('click', this.handleCopy);
        rightDom.appendChild(this.copyBtn);
        
        tools.appendChild(leftDom);
        tools.appendChild(rightDom);
        this.dom.appendChild(tools);
    }

    updateStatus() {
        this.pre.setAttribute('data-language', this.node.attrs.language || LANGS[0]);
        return true;
    }

    /**
     * 原生文档数据流更新：仅在文本、协同用户修改语言等“内容变化”时触发
     */
    onUpdate() {
        if (this.select.value !== this.node.attrs.language) {
            this.select.value = this.node.attrs.language || LANGS[0];
        }
        this.select.readonly = !this.view.editable;
        return true;
    }

    ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
        if (this.dom.querySelector(`.${CLASSNAME}-block-type-code_block-tools`)?.contains(mutation.target)) {
            return true;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target === this.dom) {
            return true;
        }
        return false;
    }

    /**
     * 销毁生命周期钩子：负责清理所有的事件绑定和 DOM 残留
     */
    onDestroy() {
        if (this.select) {
            this.select.destroy?.();
        }
        if (this.copyBtn) {
            this.copyBtn.removeEventListener('click', this.handleCopy);
        }
        if (this.switcherBtn) {
            this.switcherBtn.removeEventListener('click', this.handleSwitcher);
        }
    }
}
