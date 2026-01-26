import React, { useEffect, useRef, type ReactNode } from 'react';
import { MenuGroup } from './menuGroup';
import { MenuItem } from './menuItem';
import { SubMenu } from './subMenu';
import { CLASSNAME } from '@/global';
import './index.less';

export type MenuNodeProps = {
    className?: string;
    // subClassName?: string;
    mode?: string;
    trigger?: string;
    defaultSelectedKeys?: Array<string>;
    defaultOpenKeys?: Array<string>;
    defaultActiveKey?: Array<string>;
    openKeys?: Array<string>;
    selectedKeys?: Array<string>;
    activeKey?: string;
    selectable?: boolean;
    multiple?: boolean;
    inlineIndent?: any;
    items?: Array<any>;
    level?: number;
    style?: any;
    // stateRef?: any;
    // item?: any;
    // data?: any;
    onClick?: Function;
    onSelect?: Function;
    onOpenChange?: Function;
    onActiveChange?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const MenuNode: React.FC<MenuNodeProps> = props => {

    // const stateRef: any = useRef([]);

    // useEffect(() => {
    //     console.log('stateRef>>>>>>>', stateRef);
    // });

    const cls = [`${CLASSNAME}-menu`];
    if (props.className) {
        cls.push(props.className);
    }

    if (props.mode === 'bubble') {
        cls.push(`${CLASSNAME}-menu-bubble`);
    }

    const handlePointerDown = (e: any) => {
        e.preventDefault();
    }

    const currentLevel = props.level || 0;
    const currentInlineIndentValue = isNaN(props.inlineIndent) ? 20 : props.inlineIndent;

    const getStyle = (type: string) => {
        const style = {
            ...props.style
        };
        if (props.mode === 'bubble') {
            style.paddingLeft = `${currentInlineIndentValue}px`;
        } else {
            if (type === 'group') {
                style.paddingLeft = `${(currentLevel + 1) * currentInlineIndentValue}px`;
            } else if (type === 'submenu') {
                style.paddingLeft = `${(currentLevel + 1) * currentInlineIndentValue}px`;
            } else if (type === 'item') {
                style.paddingLeft = `${(currentLevel + 1) * currentInlineIndentValue}px`;
            }
        }
        return style;
    }

    return (
        <ul className={cls.join(' ')} onPointerDown={handlePointerDown}>
            {
                // React.Children.map(props.children, (item: any, index: number) => renderCommonMenuItem(item, index))
                (props.items || []).map((item: any, index: number) => {
                    if (item.type === 'divider') {
                        return <li key={index} className={`${CLASSNAME}-menu-divider`}></li>;
                    } else if (item.type === 'group') {
                        return (
                            <MenuGroup
                                key={index}
                                title={item.title}
                                label={item.label}
                                item={item}
                                mode={props.mode}
                                trigger={props.trigger}
                                // data={props.items}
                                // onActiveChange={props.onActiveChange}
                                style={getStyle('group')}
                            >
                                {
                                    <MenuNode
                                        // {...props}
                                        mode={props.mode}
                                        trigger={props.trigger}
                                        selectedKeys={props.selectedKeys}
                                        openKeys={props.openKeys}
                                        activeKey={props.activeKey}
                                        items={item.children}
                                        // data={props.items}
                                        className={`${CLASSNAME}-menu-group-list`}
                                        inlineIndent={currentInlineIndentValue}
                                        level={currentLevel}
                                        onSelect={props.onSelect}
                                        onOpenChange={props.onOpenChange}
                                        onActiveChange={props.onActiveChange}
                                    // style={{
                                    //     ...props.style,
                                    //     paddingLeft: `${inlineIndentValue * (levelValue + 1)}px`
                                    // }}
                                    />
                                }
                            </MenuGroup>
                        );
                    } else if (item.children && item.children.length > 0) {
                        // stateRef.current.push(item.key);
                        return (
                            <SubMenu
                                key={index}
                                mode={props.mode}
                                trigger={props.trigger}
                                title={item.title}
                                label={item.label}
                                icon={item.icon}
                                item={item}
                                // data={props.items}
                                style={getStyle('submenu')}
                                isOpen={props.openKeys?.includes(item.key)}
                                isActived={props.activeKey === item.key}
                                // onTitleClick={props.onTitleClick}
                                onOpenChange={props.onOpenChange}
                                onActiveChange={props.onActiveChange}
                            >
                                <MenuNode
                                    // {...props}
                                    mode={props.mode}
                                    trigger={props.trigger}
                                    selectedKeys={props.selectedKeys}
                                    openKeys={props.openKeys}
                                    activeKey={props.activeKey}
                                    items={item.children}
                                    // data={props.items}
                                    className={`${CLASSNAME}-menu-sub-list`}
                                    inlineIndent={currentInlineIndentValue}
                                    level={currentLevel + 1}
                                    onSelect={props.onSelect}
                                    onOpenChange={props.onOpenChange}
                                    onActiveChange={props.onActiveChange}
                                // style={{
                                //     ...props.style,
                                //     paddingLeft: `${inlineIndentValue * (levelValue + 1)}px`
                                // }}
                                />
                            </SubMenu>
                        );
                    }
                    // stateRef.current.push(item.key);
                    return <MenuItem 
                        key={index} 
                        mode={props.mode}
                        trigger={props.trigger}
                        title={item.title} 
                        label={item.label} 
                        icon={item.icon}
                        item={item}
                        // data={props.items}
                        isSelected={props.selectedKeys?.includes(item.key)} 
                        isActived={props.activeKey === item.key}
                        onSelect={() => {
                            props.onSelect?.({ key: item.key });
                        }}
                        onActiveChange={props.onActiveChange}
                        style={getStyle('item')} 
                    />;
                })
            }
        </ul>
    );
}