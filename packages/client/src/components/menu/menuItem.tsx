import React, { type ReactNode } from 'react';
import { CLASSNAME } from '@/global';

export type MenuItemProps = {
    className?: string;
    title?: string;
    icon?: ReactNode;
    label?: ReactNode;
    item?: any;
    // data?: any;
    mode?: string;
    trigger?: string;
    style?: any;
    isSelected?: boolean;
    isActived?: boolean;
    onSelect?: Function;
    onActiveChange?: Function;
    children?: ReactNode;
}

export const MenuItem: React.FC<MenuItemProps> = props => {
    const { 
        className,
        title,
        label,
        icon,
        item,
        isSelected,
        isActived,
        onSelect,
        onActiveChange,
        style
     } = props;

    const cls = [`${CLASSNAME}-menu-item-basic`, `${CLASSNAME}-menu-item`];
    if (className) {
        cls.push(className);
    }
    if (isSelected) {
        cls.push(`${CLASSNAME}-menu-item-selected`);
    }

    const titleCls = [`${CLASSNAME}-menu-item-title`];

    if (isActived) {
        titleCls.push(`${CLASSNAME}-menu-item-active`);
    }

    // const handlePointerDown = (e: any) => {
    //     e.preventDefault();
    // }

    // const handleNodeClick = (e: any) => {
    //     onNodeClick?.(e);
    // }

    const handleSelect = (e: any) => {
        onSelect?.(e);
    }

    // const handleMouseEnter = (e: any) => {
    //     onActiveChange?.({
    //         key: item.key,
    //         action: 'active'
    //     });
    // }

    // const handleMouseLeave = (e: any) => {
    //     onActiveChange?.({
    //         key: item.key,
    //         action: 'cancel'
    //     });
    // }

    return (
        <li
            // key={item.key}
            // key={index}
            className={cls.join(' ')}
            title={title}
            role={item.key}
            // onMouseEnter={handleMouseEnter(item, type)}
            // onMouseLeave={handleMouseLeave(item, type)}
            // onClick={handleNodeClick}
        >
            <div
                // key={index}
                className={titleCls.join(' ')}
                title={title}
                style={style}
                onClick={handleSelect}
                // onPointerDown={handlePointerDown}
                // { ...otherProps }
                // onMouseEnter={handleMouseEnter}
                // onMouseLeave={handleMouseLeave}
            >
                {icon && <span className={`${CLASSNAME}-menu-item-icon`}>{icon}</span>}
                {label && <span className={`${CLASSNAME}-menu-item-content`}>{label}</span>}
                {/* <i className={`${CLASSNAME}-menu-submenu-arrow`}></i> */}
            </div>
        </li>
    );
}