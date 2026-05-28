import { forwardRef } from 'react';
import { toUnit, View, ViewProps } from '../view';

/**
 * Text 組件：處理基礎文本
 */
export type TextProps<T extends React.ElementType = 'span'> = ViewProps<T> & {
    /** 文本类型：基础样式 */
    type?: 'default' | 'secondary' | 'danger' | 'success' | 'warning';
    /** 是否单行截断（通常配合 overflow: hidden 使用） */
    ellipsis?: boolean;
    /** 是否加粗 */
    strong?: boolean;
    /** 是否显示下划线 */
    underline?: boolean;
    /** 是否显示删除线 */
    delete?: boolean;
};

export const Text = forwardRef<any, TextProps>(({
    type = 'default',
    ellipsis,
    strong,
    underline,
    delete: del,
    style,
    color,
    fontWeight,
    ...props
}, ref) => {
    // 1. 顏色映射改為優先使用主題變量
    const typeColors: Record<string, string> = {
        secondary: 'var(--text-secondary, rgba(128, 128, 128, 0.65))',
        danger: '#ff4d4f',
        success: '#52c41a',
        warning: '#faad14',
        default: 'var(--text-main)', // 對接到主題變量
    };
    
    const textStyle: React.CSSProperties = {
        color: color || typeColors[type],
        fontWeight: strong ? 'none' : fontWeight,
        textDecoration: [
            underline ? 'underline' : '',
            del ? 'line-through' : ''
        ].filter(Boolean).join(' '),
        // 處理省略號邏輯
        ...(ellipsis && {
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
        }),
        ...style,
    };

    // 透過 Box 渲染，這樣 Text 也能支持 p, m, px, py 等屬性
    return <View as="span" ref={ref} style={textStyle} {...props} />;
});