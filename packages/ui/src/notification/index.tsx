import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CLASSNAME } from '../config';
import './index.less';

type NotiType = 'success' | 'error' | 'info' | 'warning';

/** `list`：纵向展开；`stack`：多条合并为一条占位，只展示最新一条，其余排队，关闭后依次出现 */
export type NotificationMode = 'list' | 'stack';

interface NotiData {
    id: number;
    title: string;
    description?: string;
    type: NotiType;
}

/** 队列过长时丢弃最旧，避免极端刷屏撑爆内存 */
const STACK_QUEUE_MAX = 80;

type NotiItemProps = {
    data: NotiData;
    onRemove: (id: number) => void;
};

const NotiItem: React.FC<NotiItemProps> = ({ data, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClose = () => {
        if (isLeaving) return;
        setIsLeaving(true);
        setTimeout(() => onRemove(data.id), 300);
    };

    const startTimer = () => {
        timerRef.current = setTimeout(handleClose, 4500);
    };

    const stopTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    useEffect(() => {
        startTimer();
        return stopTimer;
    }, []);

    const getIcon = () => {
        switch (data.type) {
            case 'success':
                return (
                    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"></path>
                    </svg>
                );
            case 'error':
                return (
                    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                        <path d="M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64zm127.98 274.82h-.04l-.08.06L512 466.75 384.14 338.88c-.04-.05-.06-.06-.08-.06a.12.12 0 00-.07 0c-.03 0-.05.01-.09.05l-45.02 45.02a.2.2 0 00-.05.09.12.12 0 000 .07v.02a.27.27 0 00.06.06L466.75 512 338.88 639.86c-.05.04-.06.06-.06.08a.12.12 0 000 .07c0 .03.01.05.05.09l45.02 45.02a.2.2 0 00.09.05.12.12 0 00.07 0c.02 0 .04-.01.08-.05L512 557.25l127.86 127.87c.04.04.06.05.08.05a.12.12 0 00.07 0c.03 0 .05-.01.09-.05l45.02-45.02a.2.2 0 00.05-.09.12.12 0 000-.07v-.02a.27.27 0 00-.05-.06L557.25 512l127.87-127.86c.04-.04.05-.06.05-.08a.12.12 0 000-.07c0-.03-.01-.05-.05-.09l-45.02-45.02a.2.2 0 00-.09-.05.12.12 0 00-.07 0z"></path>
                    </svg>
                );
            case 'warning':
                return (
                    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path>
                    </svg>
                );
            default:
                return (
                    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path>
                    </svg>
                );
        }
    };

    return (
        <div
            className={`${CLASSNAME}-notification-item ${CLASSNAME}-notification-${data.type} ${
                isLeaving ? `${CLASSNAME}-notification-leaving` : ''
            }`}
            onMouseEnter={stopTimer}
            onMouseLeave={startTimer}
        >
            <div className={`${CLASSNAME}-notification-close`} onClick={handleClose}>
                ×
            </div>
            <div className={`${CLASSNAME}-notification-header`}>
                <span className={`${CLASSNAME}-notification-icon`}>{getIcon()}</span>
                <span className={`${CLASSNAME}-notification-title`}>{data.title}</span>
            </div>
            {data.description && (
                <div className={`${CLASSNAME}-notification-description`}>{data.description}</div>
            )}
        </div>
    );
};

let addFn: ((data: NotiData) => void) | undefined;
let setModeFn: ((mode: NotificationMode) => void) | undefined;

const NotificationContainer: React.FC = () => {
    const [notis, setNotis] = useState<NotiData[]>([]);
    const [mode, setMode] = useState<NotificationMode>('list');

    useEffect(() => {
        addFn = (data: NotiData) => {
            setNotis((prev) => [...prev, data].slice(-STACK_QUEUE_MAX));
        };
        setModeFn = setMode;
        return () => {
            addFn = undefined;
            setModeFn = undefined;
        };
    }, []);

    const stack = mode === 'stack';
    const n = notis.length;
    const head = n > 0 ? notis[n - 1] : null;

    return (
        <div
            className={`${CLASSNAME}-notification-container ${
                stack ? `${CLASSNAME}-notification-container--stack` : ''
            }`}
        >
            {stack ? (
                head ? (
                    <div className={`${CLASSNAME}-notification-stack-single`}>
                        {n > 1 ? (
                            <div
                                className={`${CLASSNAME}-notification-stack-bar`}
                                role="group"
                                aria-label="通知队列"
                            >
                                <span className={`${CLASSNAME}-notification-stack-count`}>
                                    共 {n} 条
                                </span>
                                <button
                                    type="button"
                                    className={`${CLASSNAME}-notification-stack-close-all`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNotis([]);
                                    }}
                                >
                                    全部关闭
                                </button>
                            </div>
                        ) : null}
                        <NotiItem
                            key={head.id}
                            data={head}
                            onRemove={(id) =>
                                setNotis((prev) => prev.filter((x) => x.id !== id))
                            }
                        />
                    </div>
                ) : null
            ) : (
                notis.map((item) => (
                    <NotiItem
                        key={item.id}
                        data={item}
                        onRemove={(id) =>
                            setNotis((prev) => prev.filter((x) => x.id !== id))
                        }
                    />
                ))
            )}
        </div>
    );
};

let notiId = 0;

const init = () => {
    if (typeof window === 'undefined') return;
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(<NotificationContainer />);
};

init();

export type NotificationOpenConfig = {
    message: string;
    description?: string;
    type?: NotiType;
};

export const notification = {
    /**
     * 切换展示模式（全局生效，后续所有 toast 使用）
     * @example notification.config({ mode: 'stack' })
     */
    config: (opts: { mode?: NotificationMode }) => {
        if (opts.mode) setModeFn?.(opts.mode);
    },

    open: ({ message, description, type = 'info' }: NotificationOpenConfig) => {
        addFn?.({
            id: notiId++,
            title: message,
            description,
            type,
        });
    },

    success: (config: NotificationOpenConfig) => {
        notification.open({ ...config, type: 'success' });
    },

    error: (config: NotificationOpenConfig) => {
        notification.open({ ...config, type: 'error' });
    },

    info: (config: NotificationOpenConfig) => {
        notification.open({ ...config, type: 'info' });
    },

    warning: (config: NotificationOpenConfig) => {
        notification.open({ ...config, type: 'warning' });
    },
};
