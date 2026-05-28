import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getAlignPos, setPos } from '../utils/align';
import { CLASSNAME } from '../config';
import './index.less';

export type PopuoverChangeEventProps = {
    open: boolean;
    event: any;
    action: string;
};

export type PopuoverProps = {
    className?: string;
    zIndex?: number;
    container?: any;
    defaultOpen?: boolean;
    open?: boolean;
    pos?: string;
    gap?: number;
    dxy?: number[];
    distroyOnClose?: boolean;
    trigger?: string | Array<string>;
    translate?: boolean;
    items?: React.ReactNode;
    mask?: boolean;
    rect?: any;
    // targetRef?: any;
    children?: React.ReactNode;
    isScroll?: boolean;
    popuoverProps?: any;
    // mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    onChange?: (p: PopuoverChangeEventProps) => void;
    // onPopuoverMouseEnter?: Function;
    // onPopuoverMouseLeave?: Function;
    // onPopuoverMouseDown?: Function;
    style?: React.CSSProperties;
    [key: string]: unknown;
}

export const Popuover: React.FC<PopuoverProps> = props => {
    const {
        // onChange,
        zIndex,
        items,
        pos = 'tl-bl?',
        rect,
        translate = false,
        gap = 0,
        dxy = [0, 0],
        children,
        isScroll = true,
        distroyOnClose = true,
        // mouseEnterDelay = 0,
        mouseLeaveDelay = 0.1,
        // targetRef,
        container,
        popuoverProps,
        mask = false,
        trigger = 'click',
        style
    } = props;

    /** 由父组件传入 `rect`（相对 document 的选区等），走锚点对照逻辑之外的定位分支 */
    const hasRectMode = 'rect' in props;

    const [open, setOpen] = useState(props.open || props.defaultOpen || false);
    const [hasRendered, setHasRendered] = useState(false);
    /** 已完成首次坐标计算后再加 `-popuover-open`，避免首帧在 (0,0) `display:block` 闪现 */
    const [positionReady, setPositionReady] = useState(false);

    const anchorRef: any = useRef(null);
    const popuoverRef: any = useRef(null);
    const innerRef: any = useRef(null);
    const openRef: any = useRef(props.open || props.defaultOpen || false);
    openRef.current = open;

    // const rectRef: any = useRef(rect);
    // rectRef.current = rect;
    // anchorRef.current = targetRef?.current;
    
    const delayerRef = useRef<any>({
        timer: null,
        clear() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        },
        start(callback: Function, delay: number = 0) {
            this.clear();
            const self = this;
            this.timer = setTimeout(() => {
                self.clear();
                callback?.();
            }, delay * 1000) as any;
        }
    });

    const updatePosition = useCallback(() => {
        if (openRef.current) {
            setHasRendered(true);
        }
        const el = container || document.body;
        let xy: any;
        if (!hasRectMode) {
            if (openRef.current && anchorRef.current && popuoverRef.current) {
                xy = getAlignPos(popuoverRef.current, anchorRef.current, {
                    pos,
                    gap,
                    dxy,
                    container: el
                });
            }
        } else {
            if (openRef.current && rect && popuoverRef.current) {
                xy = getAlignPos(popuoverRef.current, rect, {
                    pos,
                    gap,
                    dxy,
                    container: el
                });
            }
        }
        if (xy) {
            let left = xy.left;
            let top = xy.top;
            // const pdom = findParentWithPosition(el);
            // if (pdom) {
            //     const containerRect = getRect(pdom);
            //     left -= containerRect.left;
            //     top -= containerRect.top;
            // }
            setPos(popuoverRef.current, { left, top }, translate);
        }
        if (popuoverRef.current && innerRef.current) {
            if (openRef.current) {
                innerRef.current.classList.add('animated');
                innerRef.current.classList.add('slideDownIn');
            } else {
                innerRef.current.classList.remove('animated');
                innerRef.current.classList.remove('slideDownIn');
            }
        }
    }, [pos, gap, dxy, translate, container, rect, hasRectMode]);

    useEffect(() => {
        const handleDocClick = (e: any) => {
            if (!hasRectMode) {
                if (!popuoverRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) {
                    if (openRef.current !== false) {
                        // if (!('open' in props)) {
                        //     setOpen(false);
                        // }
                        // onChange?.(false, {
                        //     event: e
                        // });
                        setPopupVisible(false, 'docMousedown', e);
                    }
                }
            } else {
                if (!popuoverRef.current?.contains(e.target)) {
                    if (openRef.current !== false) {
                        // if (!('open' in props)) {
                        //     setOpen(false);
                        // }
                        // onChange?.(false, {
                        //     event: e
                        // });
                        setPopupVisible(false, 'docMousedown', e);
                    }
                    return;
                }
            }
        };
        document.addEventListener('mousedown', handleDocClick, false);
        document.addEventListener('touchstart', handleDocClick, { passive: false });
        return () => {
            document.removeEventListener('mousedown', handleDocClick);
            document.removeEventListener('touchstart', handleDocClick);
        }
    }, [hasRectMode]);

    /** 绘制前完成定位，避免首帧出现在视口左上角 */
    useLayoutEffect(() => {
        if (!open) {
            setPositionReady(false);
            return;
        }
        updatePosition();
        setPositionReady(true);
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const resizeObserver = new ResizeObserver(() => {
            updatePosition();
        });
        if (!hasRectMode) {
            if (anchorRef.current) {
                resizeObserver.observe(anchorRef.current);
            }
        }
        if (popuoverRef.current) {
            resizeObserver.observe(popuoverRef.current);
        }
        if (isScroll) {
            document.addEventListener('scroll', updatePosition, true);
        }
        window.addEventListener('resize', updatePosition);

        return () => {
            resizeObserver.disconnect();
            document.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, updatePosition, hasRectMode]);

    useEffect(() => {
        if ('open' in props) {
            setOpen(props.open || false);
        }
    }, [props.open]);

    const delaySetPopupVisible = (v: boolean, action: string, event?: any) => {
        delayerRef.current.start(() => {
            if (!('open' in props)) {
                setOpen(v);
            }
            props.onChange?.({
                open: v,
                event,
                action
            });
        }, mouseLeaveDelay);
    }

    const setPopupVisible = (v: boolean, action: string, event?: any) => {
        delayerRef.current.clear();
        if (!('open' in props)) {
            setOpen(v);
        }
        props.onChange?.({
            open: v,
            event,
            action
        });
    }

    const handleContextMenu = (e: any) => {
        e.preventDefault();
        anchorRef.current = e.currentTarget as HTMLElement;
        setPopupVisible(!openRef.current, 'contextMenu', e);
    }

    const handleClick = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        anchorRef.current = e.currentTarget as HTMLElement;
        if (trigger.includes('click')) {
            setPopupVisible(!openRef.current, 'click', e);
        }
    }

    const handleMouseDown = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (trigger.includes('mouseDown')) {
            anchorRef.current = e.currentTarget as HTMLElement;
            setPopupVisible(!openRef.current, 'mouseDown', e);
        }
    }

    const handleMouseEnter = (e: any) => {
        e.preventDefault();
        anchorRef.current = e.currentTarget as HTMLElement;
        setPopupVisible(true, 'mouseEnter', e);
    }

    const handleMouseLeave = (e: any) => {
        e.preventDefault();
        anchorRef.current = e.currentTarget as HTMLElement;
        delaySetPopupVisible(false, 'mouseLeave', e);
    }

    const handleFocus = (e: any) => {
        e.preventDefault();
        anchorRef.current = e.currentTarget as HTMLElement;
        if (trigger.includes('focus')) {
            setPopupVisible(true, 'focus', e);
        } else if (trigger.includes('blur')) {
            delaySetPopupVisible(false, 'blur', e);
        }
    }

    const handleBlur = (e: any) => {
        e.preventDefault();
        anchorRef.current = e.currentTarget as HTMLElement;
        if (trigger.includes('blur')) {
            setPopupVisible(true, 'blur', e);
        } else if (trigger.includes('focus')) {
            delaySetPopupVisible(false, 'focus', e);
        }
    }

    const getChildrenProps = () => {
        const childProps: any = {};
        if (trigger.includes('contextMenu')) {
            childProps.onContextMenu = handleContextMenu;
        }
        if (trigger.includes('click')) {
            childProps.onClick = handleClick;
        }
        if (trigger.includes('mouseDown')) {
            childProps.onMouseDown = handleMouseDown;
            childProps.onTouchStart = handleMouseDown;
        }
        if (trigger.includes('hover')) {
            childProps.onMouseEnter = handleMouseEnter;
            childProps.onMouseLeave = handleMouseLeave;
        }

        if (trigger.includes('focus') || trigger.includes('blur')) {
            childProps.onFocus = handleFocus;
            childProps.onBlur = handleBlur;
        }
        return childProps;
    }

    const handlePopuoverContextMenu = (e: any) => {
        setPopupVisible(!openRef.current, 'contextMenu', e);
    }

    const handlePopuoverMouseEnter = (e: any) => {
        // e.preventDefault();
        setPopupVisible(true, 'popuoverMouseEnter', e);
    }

    const handlePopuoverMouseLeave = (e: any) => {
        e.preventDefault();
        delaySetPopupVisible(false, 'popuoverMouseLeave', e);
    }

    const getPopuoverProps = () => {
        const nextPopuoverProps: any = {
            // onPointerDown: (e: any) => e.preventDefault(),
            ...popuoverProps
        };

        if (!hasRectMode) {
            if (trigger.includes('contextMenu')) {
                nextPopuoverProps.onContextMenu = handlePopuoverContextMenu;
            }
        }

        if (trigger.includes('hover') || trigger.includes('mouseEnter')) {
            nextPopuoverProps.onMouseEnter = handlePopuoverMouseEnter;
        }
        if (trigger.includes('hover')) {
            nextPopuoverProps.onMouseLeave = handlePopuoverMouseLeave;
        }
        return nextPopuoverProps;
    }

    const renderContent = () => {
        if (distroyOnClose && !openRef.current) {
            return null;
        }
        if (!hasRendered && !openRef.current) {
            return null;
        }

        const cls = [`${CLASSNAME}-popuover-container`];
        if (props.className) {
            cls.push(props.className);
        }

        if (openRef.current && positionReady) {
            cls.push(`${CLASSNAME}-popuover-open`);
        }

        let content;
        if (hasRectMode) {
            content = children;
        } else {
            content = items;
        }
        const inner = <div
                    className={cls.join(' ')}
                    ref={popuoverRef}
                    // onPointerDown={e => e.preventDefault()}
                    style={{
                        '--popuover-z-index': zIndex,
                        // ...popuoverProps?.style,
                        ...style
                    } as any}
                >
                    <div 
                        {...getPopuoverProps()}
                        className={`${CLASSNAME}-popuover-inner`} 
                        ref={innerRef}
                    >
                        {content}
                    </div>
                    
                </div>;
        
        if (mask) {
            return ReactDOM.createPortal(
                <div className={`${CLASSNAME}-popuover-mask`}>
                    {inner}
                </div>
                , container || document.body);
        }
        return ReactDOM.createPortal(inner, container || document.body);
    };

    const renderTarget = () => {
        if (!children || hasRectMode) {
            return null;
        }
        const targetNode = React.cloneElement(children as any, getChildrenProps());
        return targetNode;
        // return <div
        //     className={`${CLASSNAME}-popuover-target`}
        //     ref={anchorRef}
        //     {...getChildrenProps()}
        // >
        //     {children}
        // </div>;
    }

    return (
        <>
            {renderTarget()}
            {renderContent()}
        </>

    );
}



export type TooltipProps = {
    className?: string;
    zIndex?: number;
    defaultOpen?: boolean;
    open?: boolean;
    gap?: number;
    trigger?: string | Array<string>;
    // hideTrigger?: string | Array<string>;
    title?: React.ReactNode;
    pos?: string;
    offset?: Array<number>;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    onChange?: (p: PopuoverChangeEventProps) => void;
    children?: React.ReactNode;
    [key: string]: unknown;
}

export const Tooltip: React.FC<TooltipProps> = props => {
    const {
        gap = 10,
        pos = 'b-t?',
        trigger = 'hover',
        title,
        className,
        ...otherProps
    } = props;

    const cls = [`${CLASSNAME}-tooltip-container`];
    if (className) {
        cls.push(className);
    }
    return <Popuover
        {...otherProps}
        gap={gap}
        pos={pos}
        items={title}
        trigger={trigger}
        className={cls.join(' ')}
    />;
}