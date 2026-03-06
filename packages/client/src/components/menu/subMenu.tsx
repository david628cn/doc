import React, { useEffect, useRef, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { setAlignPos } from '@/components/utils/align';
import { CLASSNAME } from '@/global';
import '@/global/animate.less';
// import { PopupMenu } from './popupMenu';

export type SubMenuProps = {
    className?: string;
    title?: string;
    icon?: ReactNode;
    label?: ReactNode;
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
    children?: ReactNode;
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
        if (mode === 'bubble') {
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
        if (isOpen) {
            if (titleDomRef.current && dropdownDomRef.current) {
                setAlignPos(dropdownDomRef.current, titleDomRef.current, {
                    placement: 'tl-tr?',
                    // gap: 10
                });
                // dropdownDomRef.current.style.animationFillMode = 'both';
                // dropdownDomRef.current.style.animationDuration = '0.5s';
                // dropdownDomRef.current.style.animationName = 'slideInUp';
                // dropdownDomRef.current.style.left = `${pos.left}px`;
                // dropdownDomRef.current.style.top = `${pos.top}px`;
            }
        }
    }, [isOpen]);

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
        if (mode === 'bubble' && trigger !== 'click') {

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
            if (mode === 'bubble' && trigger !== 'click') {
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
            if (mode === 'bubble' && trigger !== 'click') {
                onOpenChange?.({
                    key: item.key,
                    action: 'cancel'
                });
            }
            
        }, 0.1);
    }

    const handlePopupMouseEnter = (e: any) => {
        if (mode === 'bubble' && trigger !== 'click') {
            delayerRef.current.start(() => {
                onOpenChange?.({
                    key: item.key,
                    action: 'active'
                });
            }, 0.1);
        }
        
    }

    const handlePopupMouseLeave = (e: any) => {
        if (mode === 'bubble' && trigger !== 'click') {
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
                    mode === 'bubble'
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