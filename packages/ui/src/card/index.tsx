import { forwardRef } from 'react';
import { Flex } from '../flex';
import { View, ViewProps } from '../view';
import { CLASSNAME } from '../config';
import './index.less';

export type CardProps = ViewProps<'div'> & {
    title?: React.ReactNode;
    extra?: React.ReactNode;
    bordered?: boolean;
}

export const Card = forwardRef<any, CardProps>(({ className, title, extra, bordered = true, children, style, ...props }, ref) => (
    <View
        className={`${CLASSNAME}-card ${className || ''}`}
        ref={ref}
        bg="card" // 對接 themeMapping 中的 var(--bg-card)
        borderRadius={8}
        // 使用主題變量控制邊框顏色
        style={{ position: 'relative', border: bordered ? `1px solid var(--border-color)` : 'none', ...style }}
        {...props}
    >
        {title && (
            <Flex 
                align="center" 
                justify="space-between" 
                px={16} 
                py={12} 
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                <View fontWeight={600} color="text">{title}</View>
                <View fontSize={12}>{extra}</View>
            </Flex>
        )}
        {/* 如果 props 裡沒傳 p，則默認內容區 padding 為 16px */}
        <View p={props.p ?? props.px ?? props.py ?? 16}>
            {children}
        </View>
    </View>
));