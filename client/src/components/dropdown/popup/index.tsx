
import React, { Children, cloneElement, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { findParentWithPosition, getRect, setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import '@/global/animate.less';
import './index.less';



export const cloneChildren = (elment: ReactNode, props?: any) =>
    Children.map(elment, (child: any, index: number) => {
        return cloneElement(child, {
            ...child.props,
            ...props
        });
    });


export type popupProps = {
    className?: string;
    defaultOpen?: boolean;
    open?: boolean;
    rect?: any;
    items?: ReactNode;
    placement?: string;
    gap?: number;
    container?: any;
    onChange?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const Popup: React.FC<popupProps> = props => {
    const {
        gap = 0
    } = props;
    const [open, setOpen] = useState(props.open || props.defaultOpen || false);
    // const anchorRef: any = useRef(null);
    // const portal: any = useRef(null);
    const popupRef: any = useRef(null);
    const curOpenRef: any = useRef(null);
    curOpenRef.current = open;

    useEffect(() => {
            const handleDocClick = (e: any) => {
                // e.preventDefault();
                if (!popupRef.current?.contains(e.target)) {
                    if (curOpenRef.current !== false) {
                        if (!('open' in props)) {
                            setOpen(false);
                        }
                        props.onChange?.({
                            open: false,
                            domEvent: e
                        });
                    }
                    return;
                }
            }
            document.addEventListener('mousedown', handleDocClick, false);
            document.addEventListener('touchstart', handleDocClick, { passive: false });
            return () => {
                document.removeEventListener('mousedown', handleDocClick);
                document.removeEventListener('touchstart', handleDocClick);
            }
        }, []);

    useEffect(() => {
        // if ('open' in props) {
        setOpen(props.open || false);
        // }
    }, [props.open]);

    useEffect(() => {
        if (!('open' in props)) {
            setOpen(props.defaultOpen || false);
        }
    }, [props.defaultOpen]);

    useEffect(() => {
        if (popupRef.current) {
            // if (open && popupRef.current && anchorRef.current) {
            // if (open && popupRef.current) {
            if (open && props.rect) {
                // popupRef.current.classList.remove(`slideOutUp`);
                // popupRef.current.classList.add(`slideInUp`);
                popupRef.current.style.display = 'block';
                const pos = setAlignPos(popupRef.current, props.rect, {
                    placement: props.placement || 'tl-tr?',
                    gap
                });
                let left = pos.left;
                let top = pos.top;
                if (props.container) {
                    const pdom = findParentWithPosition(props.container);
                    if (pdom) {
                        const containerRect = getRect(pdom);
                        left -= containerRect.left;
                        top -= containerRect.top;
                    }
                }
                popupRef.current.style.left = `${left}px`;
                popupRef.current.style.top = `${top}px`;
                // popupRef.current.style.opacity = 1;
            } else {
                // popupRef.current.classList.remove(`slideInUp`);
                // popupRef.current.classList.add(`slideOutUp`);
                popupRef.current.style.display = 'none';
            }

            // }
        }
    }, [open, props.rect, props.container]);

    const cls = [`${CLASSNAME}-popup-container animated slideInUp`];
    if (props.className) {
        cls.push(props.className);
    }

    let portal;
    if (open) {
        portal = ReactDOM.createPortal(
            <div
                className={cls.join(' ')}
                ref={popupRef}
                // style={{
                //     left: `${pos.left}px`,
                //     top: `${pos.top}px`,
                //     display: `${open ? 'block' : 'none'}`
                // }}
            >
                {props.children}
            </div>,
            props.container ? props.container : document.body
        );
        
    }

    return <>{portal}</>;
}