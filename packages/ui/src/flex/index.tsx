import { forwardRef } from 'react';
import { toUnit, View, ViewProps } from '../view';
/**
 * Flex 組件：現在可以更簡潔，直接透傳給 Box
 */
export type FlexProps<T extends React.ElementType = 'div'> = ViewProps<T> & {
    direction?: React.CSSProperties['flexDirection'];
    align?: React.CSSProperties['alignItems'];
    justify?: React.CSSProperties['justifyContent'];
    gap?: React.CSSProperties['gap'];
    wrap?: React.CSSProperties['flexWrap'];
    shrink?: React.CSSProperties['flexShrink'];
    flex?: React.CSSProperties['flex'];
    alignSelf?: React.CSSProperties['alignSelf'];
    order?: React.CSSProperties['order'];
    position?: React.CSSProperties['position'];
};

export const Flex = forwardRef<HTMLDivElement, FlexProps>(({
    direction, align, justify, gap, wrap, shrink, flex, position, style, ...rest
}, ref) => (
    <View
        ref={ref}
        style={{
            display: 'flex',
            flexDirection: direction,
            alignItems: align,
            justifyContent: justify,
            flexWrap: wrap,
            gap: toUnit(gap),
            flexShrink: shrink,
            flex,
            position,
            ...style,
        }}
        {...rest} // m, p, px, py 等屬性都在 rest 裡，會被 Box 處理
    />
));

/**
 * FlexItem 同理優化
 */
export const FlexItem = forwardRef<any, FlexProps>(({ flex, alignSelf, order, style, ...rest }, ref) => (
    <View
        ref={ref}
        style={{
            flex,
            alignSelf,
            order,
            ...style,
        }}
        {...rest}
    />
));

// 这一行非常关键，能显著提升 VS Code 的识别率
// Flex.displayName = 'Flex'; 
// FlexItem.displayName = 'FlexItem'; 