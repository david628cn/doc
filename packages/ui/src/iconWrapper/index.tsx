import { forwardRef } from 'react';
import { Flex } from '../flex';
import { toUnit, ViewProps } from '../view';

export type IconWrapperProps = ViewProps<'div'> &  {
    size?: number | string;
    iconSize?: number | string;
    hoverBg?: string; // 現在可以傳入 "var(--color-hover)"
    activeScale?: number;
}

export const IconWrapper = forwardRef<any, IconWrapperProps>(({
    children,
    size = 24,
    iconSize = '1em',
    hoverBg = 'var(--bg-hover, rgba(0,0,0,0.06))', // 對接主題變量
    activeScale = 0.92,
    style,
    ...props
}, ref) => (
    <Flex
        ref={ref}
        align="center"
        justify="center"
        w={size} 
        h={size}
        borderRadius="50%"
        // cursor="pointer"
        fontSize={toUnit(iconSize)}
        // 增加一個簡單的 CSS 類名，方便在 less 中寫 hover 邏輯
        className="icon-wrapper-hover" 
        style={{
            transition: 'all 0.2s',
            // 這裡可以根據需要添加 transform 等 active 效果
            ...style
        }}
        {...props}
    >
        {children}
    </Flex>
));