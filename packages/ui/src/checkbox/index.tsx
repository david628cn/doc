import React, { useState, useEffect, type ReactNode } from 'react';
import { CLASSNAME } from '../config';
import './index.less';

export type CheckboxProps = {
    className?: string;
    defaultChecked?: boolean;
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    children?: ReactNode;
    onChange?: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = props => {
    const { className, checked, indeterminate, disabled, onChange, children, ...others } = props;
    const [value, setValue] = useState(props.checked || props.defaultChecked || false);

    useEffect(() => {
        if ('checked' in props) {
            setValue(props.checked || false);
        }
    }, [props.checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const nextChecked = e.target.checked;
        if (!('checked' in props)) {
            setValue(nextChecked)
        }
        onChange?.(nextChecked);
    }

    const cls = [`${CLASSNAME}-checkbox-container`];
    if (className) {
        cls.push(className);
    }

    const innerCls = [`${CLASSNAME}-checkbox-inner`];
    if (indeterminate) {
        innerCls.push(`${CLASSNAME}-checkbox-indeterminate`);
    }

    return (
        <span className={cls.join(' ')}>
            <span className={checked ? `${CLASSNAME}-checkbox ${CLASSNAME}-checkbox-checked` : `${CLASSNAME}-checkbox`}>
                <span className={innerCls.join(' ')}></span>
                <input className={`${CLASSNAME}-checkbox-input`} type="checkbox" {...others} disabled={disabled} checked={value} onChange={handleChange} />
            </span>
            {!('children' in props) ? null : <span>{children}</span>}
        </span>
    );
};


export type CheckboxGroupProps = {
    className?: string;
    children?: ReactNode;
}

export const CheckboxGroup = (props: CheckboxGroupProps) => {
    const { className, children } = props;

    return <div className={className ? `checkbox-group ${className}` : "checkbox-group"}>{children}</div>;
}