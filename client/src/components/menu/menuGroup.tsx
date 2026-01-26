import React, { type ReactNode } from 'react';
import { CLASSNAME } from '@/global';

export type MenuGroupProps = {
    className?: string;
    title?: string;
    icon?: ReactNode;
    label?: ReactNode;
    style?: any;
    item?: any;
    mode?: string;
    trigger?: string;
    // data?: any;
    // isActived?: boolean;
    onClick?: Function;
    // onActiveChange?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const MenuGroup: React.FC<MenuGroupProps> = props => {
    const { 
        className,
        title,
        label,
        icon,
        style,
        // isActived,
        // onActiveChange
        // onClick,
        // ...otherProps
     } = props;

    const cls = [`${CLASSNAME}-menu-item-basic`, `${CLASSNAME}-menu-group`];
    if (className) {
        cls.push(className);
    }

    const itemCls = [`${CLASSNAME}-menu-group-title`];
    // if (isActived) {
    //     cls.push(`${CLASSNAME}-menu-item-active`);
    // }

    // const handleMouseEnter = (e: any) => {
    //     onActiveChange?.({
    //         key: props.item.key,
    //         action: 'active'
    //     });
    // }

    // const handleMouseLeave = (e: any) => {
    //     onActiveChange?.({
    //         key: props.item.key,
    //         action: 'cancel'
    //     });
    // }

    // const hanldeClick = (e: any) => {
    //     onClick?.(e);
    // }

    return (
        <li
            // key={item.key}
            // key={index}
            className={cls.join(' ')}
            title={title}
            // onMouseEnter={handleMouseEnter(item, type)}
            // onMouseLeave={handleMouseLeave(item, type)}
            // onClick={handleSelect(item, type)}
        >
            <div
                className={itemCls.join(' ')}
                title={title}
                // onClick={hanldeClick}
                style={style}
                // onMouseEnter={handleMouseEnter}
                // onMouseLeave={handleMouseLeave}
            >
                {icon && <span className={`${CLASSNAME}-menu-item-icon`}>{icon}</span>}
                {label && <span className={`${CLASSNAME}-menu-item-content`}>{label}</span>}
            </div>
            { props.children }
        </li>
    );
}