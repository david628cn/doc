import React, { useState, useRef, useEffect, useLayoutEffect, forwardRef } from 'react';
import { Popuover } from '../popuover';
import { Menu } from '../menu';
import { CLASSNAME } from '../config';
import './index.less';

const findNode = (tree: Array<any> = [], v: string, k: string = 'value') => {
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

export type SelectProps = {
    zIndex?: number;           // 支持显式传入层级
    className?: string;
    menuClassName?: string;
    value?: any;
    defaultValue?: any;
    title?: string;
    label?: string;
    options?: any;
    onChange?: (v: any) => void;
    labelRender?: React.ReactNode;
    style?: React.CSSProperties;
    // [key: string]: unknown
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
    const {
        className,
        menuClassName,
        style,
        value,
        defaultValue,
        options,
        onChange
    } = props;

    const [open, setOpen] = useState(false);
    const [popuoverWidth, setPopuoverWidth] = useState('auto');
    const [selectedKeys, setSelectedKeys] = useState([value || defaultValue]);
    const elRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if ('value' in props) {
            setSelectedKeys([value]);
        }
    }, [value]);

    useLayoutEffect(() => {
        if (!ref) return;
        if (typeof ref === 'function') {
            ref(elRef.current);
        } else {
            (ref as any).current = elRef.current;
        }
    });

    useEffect(() => {
        if (elRef.current) {
            setPopuoverWidth(`${elRef.current.offsetWidth}px`);
        }
    }, [open])

    return (
        <Popuover
            placement="tl-bl?"
            trigger="click"
            open={open}
            onChange={e => setOpen(e.open)}
            items={
                <div
                    className={[
                        `${CLASSNAME}-select-menu`,
                        menuClassName ? menuClassName : ''
                    ].filter(Boolean).join(' ')}
                    style={{
                        width: popuoverWidth
                    }}
                >
                    <Menu
                        selectedKeys={selectedKeys}
                        items={options.map((item: any) => {
                            return {
                                ...item,
                                key: item.value
                            }
                        })}
                        onSelect={(params: any) => {
                            if (!('value' in props)) {
                                setSelectedKeys(params.selectedKeys);
                            }
                            setOpen(false);
                            onChange?.(params.selectedKeys[0]);
                        }}
                    />
                </div>
            }
        >
            <div className={[
                `${CLASSNAME}-select`,
                open ? `${CLASSNAME}-select-open` : '',
                className ? className : ''
            ].filter(Boolean).join(' ')}
                style={style}
                ref={elRef}
            >
                <div className={`${CLASSNAME}-select-value`}>
                    {findNode(options, selectedKeys[0])?.label}
                </div>
                <span className={`${CLASSNAME}-select-small`}>
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
            </div>
        </Popuover>
    );
});