import React, { forwardRef } from 'react';
import { Tooltip } from '../popuover';
import { View, ViewProps } from '../view'; // 引入之前的 View
import { Flex } from '../flex';
import { CLASSNAME } from '../config';
import './index.less';

export type ButtonProps = {
    className?: string;
    title?: string;
    active?: boolean;
    loading?: boolean;
    disabled?: boolean;
    radius?: 'none' | 'small' | 'medium' | 'large' | 'full';
    color?: 'purple' | 'yellow' | 'cyan' | 'dark' | 'black' | 'text' | 'blue' | 'green' | 'red' | 'orange';
    variant?: 'outline' | 'link' | 'soft' | 'solid';
    pos?: string;
    type?: string;
    defaultOpen?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    onPointerDown?: (e: React.PointerEvent) => void;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const { 
        className, title, active, pos = 'b-t?', defaultOpen = false,
        disabled = false, loading = false, variant, color, radius,
        children, type = 'button', onClick, style, ...rest 
    } = props;

    // 处理样式类名
    const classes = [
        `${CLASSNAME}-button`,
        variant && `${CLASSNAME}-button-variant-${variant}`,
        color && `${CLASSNAME}-button-color-${color}`,
        radius && `${CLASSNAME}-button-radius-${radius}`,
        active && `${CLASSNAME}-button-active`,
        loading && `${CLASSNAME}-button-loading`,
        className
    ].filter(Boolean).join(' ');

    // const handlePointerDown = (e: React.PointerEvent) => {
    //     // 防止点击时产生焦点环（根据需求保留）
    //     // e.preventDefault(); 
    // };

    // const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    //     // 防止点击时产生焦点环（根据需求保留）
    //     // e.preventDefault(); 
    //     onClick?.(e);
    // };

    // 使用 View 作为底座，自动处理 m, p, w, h 等布局属性
    const btnCmp = (
        <View
            as="button"
            ref={ref}
            className={classes}
            disabled={disabled || loading}
            // onPointerDown={handleClick}
            onClick={onClick}
            type={type}
            style={{ 
                // position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style 
            }}
            {...rest}
        >
            {loading && (
                <span className={`${CLASSNAME}-button-loading-spin`}>
                    <svg viewBox="0 0 1024 1024" fill="currentColor" width="1em" height="1em">
                        <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
                    </svg>
                </span>
            )}
            {children}
        </View>
    );

    if (title === undefined) return btnCmp;

    return (
        <Tooltip title={title} defaultOpen={defaultOpen} pos={pos}>
            {btnCmp}
        </Tooltip>
    );
});

/**
 * ButtonGroup 同样可以继承 View 获得间距处理能力
 */
export const ButtonGroup = (props: ViewProps) => (
    <Flex 
        className={`${CLASSNAME}-button-group`} 
        {...props} 
    ></Flex>
);
