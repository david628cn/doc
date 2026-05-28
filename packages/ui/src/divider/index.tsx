import { forwardRef } from 'react';
import { toUnit, View, ViewProps } from '../view';

export type DividerProps = ViewProps<'div'> & {
    vertical?: boolean;
    dashed?: boolean;
    thickness?: number | string;
    color?: string;
}

export const Divider = forwardRef<any, DividerProps>(({
    vertical = false,
    dashed = false,
    thickness = 1,
    color = 'var(--border-color)', // 默認使用主題邊框色
    style,
    ...props
}, ref) => {
    const t = toUnit(thickness);
    const borderStyle = dashed ? `${t} dashed ${color}` : `${t} solid ${color}`;

    return (
        <View
            ref={ref}
            // 利用 Box 的單位處理能力
            w={vertical ? t : "100%"}
            h={vertical ? "1em" : (dashed ? 0 : t)}
            // 如果用戶沒傳 m/my/mx，水平線默認 12px 0，垂直線默認 0 8px
            my={props.my ?? props.m ?? (vertical ? 0 : 12)}
            mx={props.mx ?? props.m ?? (vertical ? 8 : 0)}
            style={{
                display: vertical ? 'inline-block' : 'block',
                [vertical ? 'borderLeft' : 'borderBottom']: borderStyle,
                verticalAlign: vertical ? 'middle' : 'baseline',
                backgroundColor: dashed ? 'transparent' : 'transparent',
                ...style
            }}
            {...props}
        />
    );
});