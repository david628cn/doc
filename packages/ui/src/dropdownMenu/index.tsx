import React from 'react';
import { Popuover } from '../popuover';
import { Menu } from '../menu';
import { Button } from '../button';
import { CLASSNAME } from '../config';
import './index.less';

const findNode = (tree: Array<any> = [], v: string, k: string = 'id') => {
    for (let i = 0; i < tree.length; i++) {
        if (tree[i][k] === v) {
            return tree[i];
        }
        if (tree[i].children && tree[i].children.length > 0) {
            findNode(tree[i].children, v, k);
        }
    }
    return null;
}

export type DropdownMenuProps = {
    zIndex?: number;           // 支持显式传入层级
    value?: any;
    defaultValue?: any;
    open?: boolean;
    defaultOpen?: boolean;
    title?: string;
    label?: string;
    items?: any;
    mode?: string;
    placement?: string;
    trigger?: string;
    onChange?: Function;
    onDropdownChange?: Function;
    children?: React.ReactNode;
    // [key: string]: unknown
}

export const DropdownMenu: React.FC<DropdownMenuProps> = props => {
    const menuProps: any = {
        mode: props.mode || 'bubble',
        items: props.items,
        onSelect: props.onChange
    };

    let value;
    if (('defaultValue' in props)) {
        value = menuProps.defaultSelectedKeys = Array.isArray(props.defaultValue) ? props.defaultValue[0] : props.defaultValue;
    }

    if (('value' in props)) {
        value = menuProps.selectedKeys = Array.isArray(props.value) ? props.value[0] : props.value;
    }

    const dropdownProps: any = {
        placement: props.placement || 'tl-bl?',
        trigger: props.trigger || 'click',
        onChange: props.onDropdownChange
    };

    if (('defaultOpen' in props)) {
        dropdownProps.defaultOpen = props.defaultOpen;
    }

    if (('open' in props)) {
        dropdownProps.open = props.open;
    }

    return (
        <Popuover
            {...dropdownProps}
            items={
                <Menu
                    {...menuProps}
                    // mode={'bubble'}
                    // items={props.items}
                    // selectedKeys={Array.isArray(value) ? value : [value]}
                    // onSelect={(params: any) => {
                    //     setValue(params.selectedKeys);
                    //     setOpen(false);
                    // }}
                />
            }
        >
            <Button
                type={"link"}
                title={props.title}
                active={value !== undefined}
            >
                <span className={`${CLASSNAME}-dropdown-value`}>
                    { findNode(props.items, Array.isArray(value) ? value[0] : value, 'key')?.icon }
                </span>
                <span className={`${CLASSNAME}-dropdown-small`}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
                            fill="currentColor"
                        ></path>
                    </svg>
                </span>
            </Button>
        </Popuover>
    );
}