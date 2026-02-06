import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import '@/global/animate.less';
import './index.less';

// const findParentWithPosition = (dom: any) => {
//     let curDom = dom;
//     while (curDom) {
//         // const style = window.getComputedStyle(curDom);
//         if (getStyle(curDom, 'position') !== 'static') {
//             return curDom;
//         }
//         curDom = curDom.parentElement;
//     }
//     return null;
// }

// const cloneChildren = (elment: ReactNode, props?: any) =>
//     Children.map(elment, (child: any, index: number) => {
//         return cloneElement(child, {
//             ...child.props,
//             ...props
//         });
//     });


export type DropdownProps = {
    className?: string;
    defaultOpen?: boolean;
    open?: boolean;
    items?: ReactNode;
    trigger?: string | Array<string>;
    // hideTrigger?: string | Array<string>;
    placement?: string;
    gap?: number;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    // defaultOpen?: boolean;
    // onMouseEnter?: Function;
    // onMouseLeave?: Function;
    // onMouseDown?: Function;
    // onTouchStart?: Function;
    onChange?: Function;
    // onPopupMouseDown?: Function;
    // onPortalMouseEnter?: Function;
    // onPopupMouseEnter?: Function;
    // onPopupMouseLeave?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const Dropdown: React.FC<DropdownProps> = props => {
    const {
        mouseEnterDelay = 0,
        mouseLeaveDelay = 0.1,
        gap = 0
    } = props;
    const [open, setOpen] = useState(props.open || props.defaultOpen);
    
    const anchorRef: any = useRef(null);
    const popupRef: any = useRef(null);
    const curOpenRef: any = useRef(null);

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

    curOpenRef.current = open;

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
        const handleDocClick = (e: any) => {
            // e.preventDefault();
            if (!popupRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) {
                if (curOpenRef.current !== false) {
                    setPopupVisible(false, 'docMousedown', e);
                }
                return;
            }
            // console.log('>>>SFS>>>>,', popupRef.current, anchorRef.current, e.target);
            // delaySetPopupVisible(false, 'docMousedown', e);
            // props.onChange?.({
            //     open: true,
            //     domEvent: e,
            //     action: 'docMousedown'
            // });
            // setPopupVisible(true, 'docMousedown', e);
            // if (popupRef.current && anchorRef.current) {
            //     if (!popupRef.current.contains(e.target) && !anchorRef.current.contains(e.target)) {
            //         setPopupVisible(true, 'docMousedown', e);
            //         return;
            //     }
            // }
            // if (popupRef.current) {
                // if (popupRef?.current?.contains?.(e.target)) {
                //     return;
                // }
                // setPopupVisible(false, 'docMousedown', e);
                // return;
            // }
            // setPopupVisible(true, 'docMousedown', e);
        }
        // const handleContextMenuClose = (e: any) => {

        // }
        document.addEventListener('mousedown', handleDocClick, false);
        document.addEventListener('touchstart', handleDocClick, { passive: false });

        // document.addEventListener('scroll', handleContextMenuClose, false);
        // document.addEventListener('blur', handleContextMenuClose, false);
        return () => {
            document.removeEventListener('mousedown', handleDocClick);
            document.removeEventListener('touchstart', handleDocClick);

            // document.removeEventListener('scroll', handleContextMenuClose);
            // document.removeEventListener('blur', handleContextMenuClose);
            delayerRef.current.clear();
        }
    }, []);

    useEffect(() => {
        if (popupRef.current) {
            // if (open && popupRef.current && anchorRef.current) {
            // if (open && popupRef.current) {
            if (open) {
                // popupRef.current.style.opacity = 0;
                // popupRef.current.classList.add(`${CLASSNAME}-dropdown-open`);
                // popupRef.current.classList.remove(`${CLASSNAME}-dropdown-hidden`);
                // popupRef.current.classList.remove(`animated`);
                // popupRef.current.classList.remove(`slideOutUp`);
                // popupRef.current.classList.add(`animated`);
                // popupRef.current.classList.add(`slideInUp`);
                // popupRef.current.style.visibility = 'visible';
                // popupRef.current.style.pointerEvents = 'auto';
                popupRef.current.style.display = 'block';
                // if (openTimerRef.current) {
                //     clearTimeout(openTimerRef.current);
                // }
                // openTimerRef.current = setTimeout(() => {
                //     popupRef.current.classList.remove(`animated`);
                //     popupRef.current.classList.remove(`slideInUp`);
                //     clearTimeout(openTimerRef.current);
                // }, 200);
                setAlignPos(popupRef.current, anchorRef.current, {
                    placement: props.placement || 'tl-tr?',
                    gap
                });
                // if (props.container) {
                //     const pdom = findParentWithPosition(props.container);
                //     if (pdom) {
                //         const containerRect = getRect(pdom);
                //         left -= containerRect.left;
                //         top -= containerRect.top;
                //     }
                // }
                // popupRef.current.style.opacity = 1;
            } else {
                // popupRef.current.classList.remove(`${CLASSNAME}-dropdown-open`);
                // popupRef.current.classList.remove(`animated`);
                // popupRef.current.classList.add(`animated`);
                // popupRef.current.classList.remove(`slideInUp`);
                // popupRef.current.classList.add(`slideOutUp`);
                // if (hiddenTimerRef.current) {
                //     clearTimeout(hiddenTimerRef.current);
                // }
                // hiddenTimerRef.current = setTimeout(() => {
                //     popupRef.current.classList.remove(`animated`);
                //     popupRef.current.classList.remove(`slideOutUp`);
                //     popupRef.current.style.display = 'none';
                //     // popupRef.current.classList.add(`${CLASSNAME}-dropdown-hidden`);
                //     clearTimeout(hiddenTimerRef.current);
                // }, 200);
                // popupRef.current.style.pointerEvents = 'none';
                // popupRef.current.style.visibility = 'hidden';
                popupRef.current.style.display = 'none';
            }
            
            // }
        }
    }, [open, props.defaultOpen]);

    const delaySetPopupVisible = (v: boolean, action: string, domEvent?: any) => {
        delayerRef.current.start(() => {
            if (!('open' in props)) {
                setOpen(v);
            }
            props.onChange?.({
                open: v,
                domEvent,
                action
            });
        }, mouseLeaveDelay);
    }

    const setPopupVisible = (v: boolean, action: string, domEvent?: any) => {
        delayerRef.current.clear();
        if (!('open' in props)) {
            setOpen(v);
        }
        props.onChange?.({
            open: v,
            domEvent,
            action
        });
    }

    const handleMouseEnter = (e: any) => {
        delaySetPopupVisible(true, 'mouseEnter', e);
        // setPopupVisible(true, 'mouseEnter', e);
    }

    const handleMouseLeave = (e: any) => {
        delaySetPopupVisible(false, 'mouseLeave', e);
        // setPopupVisible(false, 'mouseLeave', e);
    }

    const handleMouseDown = (e: any) => {
        // e.preventDefault();
        // e.stopPropagation();
        // console.log('1');
    }

    const handleContextMenu = (e: any) => {
        e.preventDefault();
        // delaySetPopupVisible(!open, 'contextMenu', e);
        delaySetPopupVisible(!open, 'contextMenu', e);
    }

    const handleClick = (e: any) => {
        if (props.trigger?.includes('click')) {
            // delaySetPopupVisible(!open, 'click', e);
            delaySetPopupVisible(!open, 'click', e);
        }
    }

    const handleFocus = (e: any) => {
        if (props.trigger?.includes('focus')) {
            delaySetPopupVisible(true, 'focus', e);
            /// setPopupVisible(true, 'focus', e);
        }
    }

    const handleBlur = (e: any) => {
        if (props.trigger?.includes('blur')) {
            delaySetPopupVisible(false, 'blur', e);
            // setPopupVisible(false, 'blur', e);
        }
    }

    const handlePopupMouseEnter = (e: any) => {
        delaySetPopupVisible(true, 'popupMouseEnter', e);
        // setPopupVisible(true, 'popupMouseEnter', e);
    }

    const handlePopupMouseLeave = (e: any) => {
        delaySetPopupVisible(false, 'popupMouseLeave', e);
        /// setPopupVisible(false, 'popupMouseLeave', e);
    }

    // const handlePopupMouseDown = (e: any) => {
    //     let inPopup = false;
    //     if (popupRef.current.contains(e.target)) {
    //         // e.preventDefault();
    //         // props.onPopupMouseDown?.({
    //         //     domEvent: e,
    //         //     open: false
    //         // });
    //         // return;
    //         inPopup = true;
    //     }
    //     if (!('open' in props)) {
    //         setOpen(false);
    //     }
    //     // setOpen(false);
    //     props.onPopupMouseDown?.({
    //         domEvent: e,
    //         open: false,
    //         inPopup
    //     });
    // }

    const getChildrenProps = () => {
        const childProps: any = {};
        if (props.trigger?.includes('contextMenu')) {
            childProps.onContextMenu = handleContextMenu;
        }
        if (props.trigger?.includes('click')) {
            childProps.onClick = handleClick;
            childProps.onMouseDown = handleMouseDown;
            childProps.onTouchStart = handleMouseDown;
        }
        if (props.trigger?.includes('hover')) {
            childProps.onMouseEnter = handleMouseEnter;
            childProps.onMouseLeave = handleMouseLeave;
        }
        if (props.trigger?.includes('focus') || props.trigger?.includes('blur')) {
            childProps.onFocus = handleFocus;
            childProps.onBlur = handleBlur;
        }
        return childProps;
    }

    const getPopupProps = () => {
        // onMouseEnter={handlePopupMouseEnter}
        // onMouseLeave={handlePopupMouseLeave}
        // // onMouseDown={handlePopupMouseDown}
        // onTouchStart={handlePopupMouseDown}
        const popupProps: any = {
            // onMouseEnter: props.onPopupMouseEnter,
            // onMouseLeave: props.onPopupMouseLeave
            // onMouseDown: handlePopupMouseDown,
            // onTouchStart: handlePopupMouseDown
        };
        if (props.trigger?.includes('contextMenu')) {
            popupProps.onContextMenu = handleContextMenu;
        }
        // if (props.showTrigger?.includes('click') || props.hideTrigger?.includes('click')) {
        //     popupProps.onClick = handleClick;
        //     popupProps.onMouseDown = handleMouseDown;
        //     popupProps.onTouchStart = handleTouchStart;
        // }
        if (props.trigger?.includes('hover') || props.trigger?.includes('mouseEnter')) {
            popupProps.onMouseEnter = handlePopupMouseEnter;
        }
        if (props.trigger?.includes('hover')) {
           popupProps.onMouseLeave = handlePopupMouseLeave;
        }
        // if (props.showTrigger?.includes('focus') || props.hideTrigger?.includes('blur')) {
        //     childProps.onFocus = handleFocus;
        //     childProps.onBlur = handleBlur;
        // }
        return popupProps;
    }

    const cls = [`${CLASSNAME}-dropdown-container animated slideInUp`];
    if (props.className) {
        cls.push(props.className);
    }

    // const handleChildrenTraversal = (elment: ReactNode) => {
    //     const childrenArray: any = Children.toArray(elment);
    //     for (let i = 0; i < childrenArray.length; i++) {
    //         // childrenArray[i].ref = (el: any) => {
    //         //     if (el) {
    //         //         console.log(`DOM element:`, el);
    //         //     }
    //         // }
    //         console.log('childrenArray:', childrenArray[i]);
    //     }

    // };

    // const cloneChildrenWithRef = (elment: ReactNode) => {
    //     const clonedChildren = Children.map(elment, (child: any, index: number) => {
    //         return cloneElement(child, {
    //             ...child.props,
    //             ref: (el: any) => {
    //                 if (el) {
    //                     console.log(`DOM element:`, el);
    //                 }
    //             }
    //         });
    //     });
    //     return clonedChildren;
    // };

    let portal;
    if (open) {
        portal = ReactDOM.createPortal(
            <div
                {...getPopupProps()}
                className={cls.join(' ')}
                ref={popupRef}
            // style={{
            //     left: `${pos.left}px`,
            //     top: `${pos.top}px`,
            //     display: `${open ? 'block' : 'none'}`
            // }}
            >
                { props.items }
            </div>,
            document.body
        );
        
    }

    return (
        <>
            {/* {
                props?.rect ? null :
                // <>
                //     {
                //         cloneChildren(props.children, { 
                //             ...getChildrenProps(), 
                //             ref: anchorRef
                //         })
                //     }
                // </>
            } */}
            {
                // cloneChildren(props.children, {
                //     ...getChildrenProps(), 
                //     ref: anchorRef
                // }) 
                <div {...getChildrenProps()} ref={anchorRef}>{props.children}</div>
            }
            {portal}
        </>
    );
}