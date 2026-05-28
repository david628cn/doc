import { forwardRef } from 'react';
import { Text, TextProps } from '../text';

/**
 * Title 組件：處理標題
 */
export type TitleProps = TextProps & {
    level?: 1 | 2 | 3 | 4 | 5;
}

export const Title = forwardRef<any, TitleProps>(({ level = 1, style, ...props }, ref) => {
    // const fontSizeMap: any = { 1: 38, 2: 30, 3: 24, 4: 20, 5: 16 };
    
    return (
        <Text
            as={`h${level}` as any}
            ref={ref}
            // fontSize={fontSizeMap[level]}
            strong
            mb={props.mb ?? props.my ?? props.m ?? "0.5em"} // 默認下邊距，但允許被傳入的 m 屬性覆蓋
            style={style}
            {...props}
        />
    );
});