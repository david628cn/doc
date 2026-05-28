import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog, DialogProps } from '../dialog';
import { Button } from '../button';
import { CLASSNAME } from '../config';
import './index.less';

// 用于存储所有当前打开的销毁函数，实现 destroyAll
const destroyFns = new Set<() => void>();

export interface ConfirmOptions extends Omit<DialogProps, 'open'> {
    className?: string;
    content?: React.ReactNode;
    okText?: string;
    center?: boolean;
    cancelText?: string;
    onOk?: () => void | Promise<any>;
}

export const Confirm = (options: ConfirmOptions) => {
    const { 
        className,
        title, 
        content, 
        center = true,
        onOk, 
        onCancel, 
        okText = '确定', 
        cancelText = '取消',
        ...restProps 
    } = options;

    const container = document.createElement('div');
    document.body.appendChild(container);
    
    const root = createRoot(container);

    // 定义销毁逻辑
    const destroy = () => {
        root.unmount(); // 卸载组件
        if (container.parentNode) {
            container.parentNode.removeChild(container); // 移除 DOM
        }
        destroyFns.delete(destroy); // 从全局集合中移除
    };

    destroyFns.add(destroy);

    const render = () => {
        root.render(
            <Dialog
                {...restProps}
                className={[
                    `${CLASSNAME}-confirm`,
                    className ?? ''
                ].filter(Boolean).join(' ')}
                center={center}
                open={true}
                title={title}
                container={container}
                onCancel={() => {
                    onCancel?.();
                    destroy();
                }}
                onPopuoverDown={() => {
                    onCancel?.();
                    destroy();
                }}
                footer={
                    <div className={`${CLASSNAME}-confirm-footer-btn`}>
                        <Button 
                            onClick={() => {
                                onCancel?.();
                                destroy();
                            }}
                        >
                            {cancelText}
                        </Button>
                        <Button 
                            variant="solid" 
                            color="blue"
                            onClick={() => {
                                onOk?.();
                                destroy();
                            }}
                        >
                            {okText}
                        </Button>
                    </div>
                }
            >
                <div className={`${CLASSNAME}-confirm-content`}>{content}</div>
            </Dialog>
        );
    };

    render();

    return {
        destroy: destroy,
    };
};

// 静态方法：关闭所有弹窗
Confirm.destroyAll = () => {
    destroyFns.forEach((fn) => fn());
};