import React, { useState, forwardRef } from 'react';
import { CLASSNAME } from '../config';
import './index.less';

export type InputProps = {
    className?: string;
    autoFocus?: boolean;
    type?: string;
    value?: string;
    name?: string;
    status?: string;
    defaultValue?: string;
    placeholder?: string;
    autoComplete?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    onChange?: (v: string, params: any) => void;
    style?: React.CSSProperties;
    rows?: number;
    maxLength?: number;
    // [key: string]: unknown;
}

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>((props, ref) => {
    const {
        className,
        type,
        name,
        value,
        status,
        defaultValue,
        onChange,
        ...otherProps
    } = props;

    const isControlled = 'value' in props;
    const [internalText, setInternalText] = useState(
        () => (isControlled ? '' : (value ?? defaultValue ?? ''))
    );

    /** 受控时必须直接跟 props.value，用 useEffect 同步会晚一帧，易与 Form 提交竞态 */
    const displayValue = isControlled ? String(value ?? '') : internalText;

    const handleChange = (event: any) => {
        const newValue = event.target.value || '';
        if (!isControlled) {
            setInternalText(newValue);
        }
        onChange?.(newValue, event);
    };

    const cls = [
        `${CLASSNAME}-input`,
        status === 'error' ? `${CLASSNAME}-input-error` : '',
        className
    ].filter(Boolean).join(' ');

    if (type === 'textarea') {
        return <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={cls}
            autoComplete="off"
            value={displayValue}
            name={name}
            onChange={handleChange}
            {...otherProps}
        ></textarea>
    }

    return <input
        ref={ref as React.Ref<HTMLInputElement>}
        className={cls}
        autoComplete="off"
        type={type}
        value={displayValue}
        name={name}
        onChange={handleChange}
        {...otherProps}
    />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, InputProps>((props, ref) => <Input ref={ref} {...props} type="textarea"/>);

Input.displayName = 'Input';