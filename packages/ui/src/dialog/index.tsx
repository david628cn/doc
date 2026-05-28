import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '../button';
import { CLASSNAME } from '../config';
import './index.less';

export type DialogProps = {
    className?: string;
    defaultOpen?: boolean;
    open?: boolean;
    container?: any;
    center?: boolean;
    title?: React.ReactNode;
    onPopuoverDown?: (open: boolean) => void;
    footer?: React.ReactNode;
    onCancel?: Function;
    onSubmit?: Function;
    distroyOnClose?: boolean;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}

export const Dialog = (props: DialogProps) => {
    const {
        className,
        container,
        title,
        onPopuoverDown,
        distroyOnClose = true,
        onCancel,
        footer,
        children,
        center,
        style
    } = props;
    const [hasRendered, setHasRendered] = useState(false);
    const [open, setOpen] = useState(props.defaultOpen || props.open || false);
    const dialogRef = useRef<any>(null);

    useEffect(() => {
        if ('open' in props) {
            setOpen(props.open || false);
        }
    }, [props.open]);

    useEffect(() => {
        if (open) {
            setHasRendered(true);
        }
    }, [open]);

    const handleDown = (e: any) => {
        // e.preventDefault();
        // e.stopPropagation();
        // if (dialogRef.current.contains(e.target)) {
        //     return;
        // }
        if (!e.target.contains(dialogRef.current)) {
            return;
        }
        const nextOpen = !open;
        if (!('open' in props)) {
            setOpen(nextOpen);
        }
        onPopuoverDown?.(nextOpen);
    }

    // const handleSubmit = () => {
    //     const nextOpen = false;
    //     if (!('open' in props)) {
    //         setOpen(nextOpen);
    //     }
    //     // onChange?.(nextOpen);
    //     onSubmit?.(nextOpen);
    // }

    const handleCancel = () => {
        const nextOpen = false;
        if (!('open' in props)) {
            setOpen(nextOpen);
        }
        // onChange?.(nextOpen);
        onCancel?.(nextOpen);
    }

    const cls = [`${CLASSNAME}-dialog`];
    if (className) {
        cls.push(className);
    }
    if (center) {
        cls.push(`${CLASSNAME}-dialog-center`);
    }

    const renderContent = () => {
        if (distroyOnClose && !open) {
            return null;
        }
        if (!hasRendered && !open) {
            return null;
        }
        const containerCls = [`${CLASSNAME}-dialog-container`];
        if (open) {
            containerCls.push(`${CLASSNAME}-dialog-container-open`);
        }
        return ReactDOM.createPortal(
            <div 
                className={containerCls.join(' ')}
                onMouseDown={handleDown}
                onTouchStart={handleDown}
            >
                <div className={`${CLASSNAME}-dialog-inner animated slideDownIn`} ref={dialogRef} style={style}>
                    <div className={cls.join(' ')}>
                        <Button className={`${CLASSNAME}-dialog-close`} variant="soft" onClick={handleCancel}><svg width="1rem" height="1rem" viewBox="64 64 896 896" fill="currentColor"><path d="M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z"></path></svg></Button>
                        { title && <div className={`${CLASSNAME}-dialog-title`}>{title}</div> }
                        <div className={`${CLASSNAME}-dialog-content`}>
                            {children}
                        </div>
                        {footer != null && footer !== false ? (
                            <div className={`${CLASSNAME}-dialog-footer`}>{footer}</div>
                        ) : null}
                        {/* <div className={`${CLASSNAME}-dialog-footer`}>
                            <Button 
                                onClick={handleCancel}
                            >Cancel</Button>
                            <Button 
                                onClick={handleSubmit}
                            >Submit</Button>
                        </div> */}
                    </div>
                </div>
            </div>, container || document.body);
    }

    return renderContent();
}
