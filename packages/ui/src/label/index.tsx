import { forwardRef } from 'react';
import { View } from '../view';
import { Text, TextProps } from '../text';

/**
 * Label 組件：表單標籤
 */
export type LabelProps = TextProps & {
    required?: boolean;
    requiredColor?: string;
    colon?: boolean; 
}

export const Label = forwardRef<any, LabelProps>(({
    required,
    requiredColor = '#ff4d4f',
    colon = false,
    children,
    style,
    ...props
}, ref) => (
    <View 
        as="label" 
        ref={ref} 
        display="inline-flex" 
        alignItems="center"
        mb={props.mb ?? props.my ?? props.m ?? 8} // 優先使用用戶傳入的間距
        style={{ cursor: 'default', ...style }}
        {...props}
    >
        {required && (
            <View as="span" color={requiredColor} mr={4} style={{ userSelect: 'none' }}>
                *
            </View>
        )}
        <Text 
            fontSize={14} 
            fontWeight={500} 
            color="var(--text-main)" // 對接到主題主色
        >
            {children}
            {colon && ' :'}
        </Text>
    </View>
));