import { useEffect, useState } from 'react';
import { Dropdown } from 'antd';
import FormatButton from '../FormatButton';
import { DropdownIcon } from '../Icon';
import './index.less';


const queryItem = (v: any, arr: Array<any> = []) => {
    const rs = arr.filter((item: any) => {
        return v === item['key'];
    });
    return rs[0];
}

interface FormatDropdownProps {
    value?: any;
    title?: string;
    label?: string;
    items?: Array<any>;
    className?: string;
    onSelect?: Function;
    renderLabel?: Function;
    render?: Function;
    [key: string]: unknown
}

const FormatDropdown = (props: FormatDropdownProps) => {
    const { className, label, render, renderLabel, title, items, onSelect, ...otherProps } = props;

    const [value, setValue] = useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value])

    const handlePointerDown = (e: any) => {
        e.preventDefault();
    }

    const handleDropdownClick = (e: any) => {
        if (e.domEvent) {
            e.domEvent.preventDefault?.();
        }
        onSelect?.(e);
    }

    const defaultRender = (v: any) => {
        const item = queryItem(value, items);
        if (typeof render === 'function') {
            return render?.(value, item, items);
        }
        if (item === undefined) {
            return label;
        }
        if (item['icon'] !== undefined) {
            return item['icon'];
        }
        return item['label'];
    }

    return (
        <Dropdown
            overlayClassName="docEditer-formatDropdown-dropdown-overlay"
            trigger={["click"]}
            {...otherProps}
            menu={{
                items: typeof renderLabel === 'function' ? renderLabel?.(items) : items?.map((item: any) => {
                    let cls: any = ['docEditer-formatDropdown-dropdown-item'];
                    if (value === item['key']) {
                        cls.push('docEditer-formatDropdown-dropdown-item-active');
                    }
                    cls = cls.join(' ');
                    return {
                        label: item['icon'] ? <FormatButton className={cls}>{item['icon']}{item['label']}</FormatButton> : <FormatButton className={cls}>{item['label']}</FormatButton>,
                        key: item['key']
                    };
                }),
                selectedKeys: [value],
                onPointerDown: handlePointerDown,
                onClick: handleDropdownClick
            }}
        >
            <FormatButton 
                title={title}
                active={value !== '' && value !== undefined}
            >
                { defaultRender(value) }
                {DropdownIcon}
            </FormatButton>
        </Dropdown>
    )
}

export default FormatDropdown;