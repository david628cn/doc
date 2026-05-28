import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CLASSNAME } from '../config';
import './index.less';

const getIcon = (type: string) => {
    switch(type) {
        case 'success': return <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"></path></svg>;
        case 'error': return <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor"><path d="M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64zm127.98 274.82h-.04l-.08.06L512 466.75 384.14 338.88c-.04-.05-.06-.06-.08-.06a.12.12 0 00-.07 0c-.03 0-.05.01-.09.05l-45.02 45.02a.2.2 0 00-.05.09.12.12 0 000 .07v.02a.27.27 0 00.06.06L466.75 512 338.88 639.86c-.05.04-.06.06-.06.08a.12.12 0 000 .07c0 .03.01.05.05.09l45.02 45.02a.2.2 0 00.09.05.12.12 0 00.07 0c.02 0 .04-.01.08-.05L512 557.25l127.86 127.87c.04.04.06.05.08.05a.12.12 0 00.07 0c.03 0 .05-.01.09-.05l45.02-45.02a.2.2 0 00.05-.09.12.12 0 000-.07v-.02a.27.27 0 00-.05-.06L557.25 512l127.87-127.86c.04-.04.05-.06.05-.08a.12.12 0 000-.07c0-.03-.01-.05-.05-.09l-45.02-45.02a.2.2 0 00-.09-.05.12.12 0 00-.07 0z"></path></svg>;
        case 'warning': return <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path></svg>;
        default: return <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path></svg>;
    }
};

type MessageType = 'success' | 'error' | 'info' | 'warning';

interface MessageData {
    id: number;
    content: string;
    type: MessageType;
}

// 单条消息组件
const MessageItem: React.FC<{ msg: MessageData; onRemove: (id: number) => void }> = ({ msg, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 触发退出动画并销毁
    const handleClose = () => {
        if (isLeaving) return;
        setIsLeaving(true);
        setTimeout(() => onRemove(msg.id), 300); // 对应 CSS transition 时间
    };

    const startTimer = () => {
        timerRef.current = setTimeout(handleClose, 3000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    useEffect(() => {
        startTimer();
        return stopTimer;
    }, []);

    return (
        <div 
            className={`${CLASSNAME}-message-item ${CLASSNAME}-message-${msg.type} ${isLeaving ? `${CLASSNAME}-message-leaving` : ''}`}
            onMouseEnter={stopTimer}
            onMouseLeave={startTimer}
            onClick={handleClose}
        >
            <span className={`${CLASSNAME}-message-icon`}>{getIcon(msg.type)}</span>
            <span className={`${CLASSNAME}-message-content`}>{msg.content}</span>
        </div>
    );
};

// 容器组件
const MessageContainer = ({ bindAdd }: { bindAdd: (fn: Function) => void }) => {
    const [messages, setMessages] = useState<MessageData[]>([]);

    useEffect(() => {
        bindAdd((msg: MessageData) => {
            setMessages(prev => [...prev, msg]);
        });
    }, []);

    const removeMessage = (id: number) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    return (
        <div className={`${CLASSNAME}-message-container`}>
            {messages.map(msg => (
                <MessageItem key={msg.id} msg={msg} onRemove={removeMessage} />
            ))}
        </div>
    );
};

// 静态导出对象
let messageId = 0;
let addFn: Function;

const init = () => {
    if (typeof window === 'undefined') return;
    const container = document.createElement('div');
    container.id = `${CLASSNAME}-message-portal`;
    document.body.appendChild(container);
    createRoot(container).render(<MessageContainer bindAdd={(fn) => (addFn = fn)} />);
};

init();

export const message = {
    success: (content: string) => {
        addFn?.({ id: messageId++, content, type: 'success' });
    },
    error: (content: string) => {
        addFn?.({ id: messageId++, content, type: 'error' });
    },
    info: (content: string) => {
        addFn?.({ id: messageId++, content, type: 'info' });
    },
    warning: (content: string) => {
        addFn?.({ id: messageId++, content, type: 'warning' });
    }
};