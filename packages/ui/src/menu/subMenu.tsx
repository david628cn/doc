import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getAlignPos, getRect, setPos, findParentWithPosition } from '../utils/align';
import { CLASSNAME } from '../config';
import '../config/animate.less';
// import { PopupMenu } from './popupMenu';

export type SubMenuProps = {
    className?: string;
    title?: string;
    icon?: React.ReactNode;
    label?: React.ReactNode;
    style?: any;
    mode?: string;
    item?: any;
    trigger?: string;
    // data?: any;
    isOpen?: boolean;
    isActived?: boolean;
    // onNodeClick?: Function;
    onOpenChange?: Function;
    onSelect?: Function;
    onActiveChange?: Function;
    onMouseEnter?: Function;
    onMouseLeave?: Function;
    children?: React.ReactNode;
    // [key: string]: unknown
}

export const SubMenu: React.FC<SubMenuProps> = props => {
    const {
        className,
        title,
        label,
        icon,
        isOpen,
        style,
        mode,
        item,
        trigger,
        isActived,
        onSelect,
        onActiveChange,
        onOpenChange
        // onMouseEnter,
        // onMouseLeave
    } = props;

    const titleDomRef = useRef<any>(null);
    const dropdownDomRef = useRef<any>(null);

    const isOpenRef = useRef<any>(isOpen);
    isOpenRef.current = isOpen;

    const itemRef = useRef<any>(item);
    itemRef.current = item;

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
            const el = document.body;
            let xy: any;
            const pos = 'tl-tr?';
            const gap = 0;
            if (isOpenRef.current && titleDomRef.current && dropdownDomRef.current) {
                // setTimeout(() => {
                xy = getAlignPos(dropdownDomRef.current, titleDomRef.current, {
                    pos,
                    gap,
                    container: el
                });
                // setPos(dropdownDomRef.current, xy, translate);
                // }, 1000);

            }
            if (xy) {
                let left = xy.left;
                let top = xy.top;
                // if (el) {
                    const pdom = findParentWithPosition(el);
                    if (pdom) {
                        const containerRect = getRect(pdom);
                        left -= containerRect.left;
                        top -= containerRect.top;
                    }
                // }
                setPos(dropdownDomRef.current, { left, top });
            }
            if (dropdownDomRef.current) {
                if (isOpenRef.current) {
                    dropdownDomRef.current.classList.add('animated');
                    dropdownDomRef.current.classList.add('slideDownIn');
                    dropdownDomRef.current.classList.add(`${CLASSNAME}-popuover-open`);
                } else {
                    dropdownDomRef.current.classList.remove('animated');
                    dropdownDomRef.current.classList.remove('slideDownIn');
                    dropdownDomRef.current.classList.remove(`${CLASSNAME}-popuover-open`);
                }
            }
            
            
        }, [isOpenRef.current]);

    useEffect(() => {
        const handleDocClick = (e: any) => {
            if (titleDomRef.current?.contains(e.target) || dropdownDomRef.current?.contains(e.target)) {
                return;
            }
            if (isOpenRef.current) {
                onOpenChange?.({
                    item: itemRef.current
                });
            }

        }
        if (mode === 'popuover') {
            document.addEventListener('mousedown', handleDocClick, false);
            document.addEventListener('touchstart', handleDocClick, { passive: false });
        }
        return () => {
            document.removeEventListener('mousedown', handleDocClick);
            document.removeEventListener('touchstart', handleDocClick);
            delayerRef.current.clear();
        }
    }, []);

    useEffect(() => {
        if (isOpenRef.current) {
            updatePosition();
            const resizeObserver = new ResizeObserver(() => {
                // 在下一帧或绘制后同步位置
                updatePosition();
            });
            if (!('rect' in props)) {
                if (titleDomRef.current) {
                    resizeObserver.observe(titleDomRef.current);
                }
            }
            if (dropdownDomRef.current) {
                resizeObserver.observe(dropdownDomRef.current);
            }
            document.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                resizeObserver.disconnect();
                document.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }

    }, [isOpenRef.current]);

    const cls = [`${CLASSNAME}-menu-item-basic`, `${CLASSNAME}-menu-submenu`];

    if (className) {
        cls.push(className);
    }

    const titleCls = [`${CLASSNAME}-menu-submenu-title`];

    if (isOpen) {
        titleCls.push(`${CLASSNAME}-menu-submenu-open`);
    }

    if (isActived) {
        titleCls.push(`${CLASSNAME}-menu-item-active`);
    }

    // const handleNodeClick = (e: any) => {
    //     onNodeClick?.(e);
    // }

    const handleSelect = (e: any) => {
        if (mode === 'popuover' && trigger !== 'click') {

            return;
        }
        onOpenChange?.({
            key: item.key,
            action: isOpen ? 'cancel' : 'active'
        });
    }

    const handleMouseEnter = (e: any) => {
        delayerRef.current.start(() => {
            onActiveChange?.({
                key: item.key,
                action: 'active'
            });
            if (mode === 'popuover' && trigger !== 'click') {
                onOpenChange?.({
                    key: item.key,
                    action: 'active'
                });
            }
            
        }, 0.1);

    }

    const handleMouseLeave = (e: any) => {
        delayerRef.current.start(() => {
            onActiveChange?.({
                key: item.key,
                action: 'cancel'
            });
            if (mode === 'popuover' && trigger !== 'click') {
                onOpenChange?.({
                    key: item.key,
                    action: 'cancel'
                });
            }
            
        }, 0.1);
    }

    const handlePopupMouseEnter = (e: any) => {
        if (mode === 'popuover' && trigger !== 'click') {
            delayerRef.current.start(() => {
                onOpenChange?.({
                    key: item.key,
                    action: 'active'
                });
            }, 0.1);
        }
        
    }

    const handlePopupMouseLeave = (e: any) => {
        if (mode === 'popuover' && trigger !== 'click') {
            delayerRef.current.start(() => {
                onOpenChange?.({
                    key: item.key,
                    action: 'cancel'
                });
            }, 0.1);
        }
        
    }

    return (
        <li
            className={cls.join(' ')}
            title={title}
        >
            <div
                className={titleCls.join(' ')}
                title={title}
                style={style}
                onClick={handleSelect}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                ref={titleDomRef}
            >
                {icon && <span className={`${CLASSNAME}-menu-item-icon`}>{icon}</span>}
                {label && <span className={`${CLASSNAME}-menu-item-content`}>{label}</span>}
                <i className={`${CLASSNAME}-menu-submenu-arrow`}></i>
            </div>
            {
                !isOpen ? null : (
                    mode === 'popuover'
                        ? ReactDOM.createPortal(
                            <div
                                className={`${CLASSNAME}-menu-dropdown animated slideInUp`}
                                ref={dropdownDomRef}
                                onMouseEnter={handlePopupMouseEnter}
                                onMouseLeave={handlePopupMouseLeave}
                            >
                                {props.children}
                            </div>,
                            document.body)
                        : props.children
                )
            }
        </li>
    );
}