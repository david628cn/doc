import React, { forwardRef } from 'react';
import './index.less';

// 輔助函數：自動將數字轉換為 px 字符串
export const toUnit = (value?: string | number) => {
    // 显式排除 null 和 undefined，React style 遇到这两者不会生成 CSS 属性
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'number' ? `${value}px` : value;
};

// 2. 主題映射表：將語義化名稱對接到 CSS 變量
const themeMapping: Record<string, string> = {
    'layout': 'var(--bg-layout)',
    'sider': 'var(--bg-sider)',
    'card': 'var(--bg-card)',
    'text': 'var(--text-main)',
    'border': 'var(--border-color)',
};

export type ViewStyleProps = {
    m?: string | number; mt?: string | number; mb?: string | number;
    ml?: string | number; mr?: string | number; mx?: string | number; my?: string | number;
    p?: string | number; pt?: string | number; pb?: string | number;
    pl?: string | number; pr?: string | number; px?: string | number; py?: string | number;
    w?: string | number; h?: string | number;
    bg?: string;
    flex?: string | number;
    borderRadius?: string | number;
    fontSize?: string | number;
    fontWeight?: string | number;
    color?: string;
    cursor?: string;
    loading?: boolean;
    overflow?: 'auto' | 'hidden' | 'visible' | 'scroll';
    // [key: string]: any;
}

export type ViewProps<T extends React.ElementType = 'div'> = ViewStyleProps & 
  // 使用 Omit 排除掉 ViewStyleProps 中已有的同名属性，防止类型冲突
  Omit<React.ComponentPropsWithRef<T>, keyof ViewStyleProps | 'as'> & {
    /** 允许动态改变渲染的标签或组件 */
    as?: any;
    children?: React.ReactNode;
    style?: React.CSSProperties;
  };

export const View = forwardRef<any, ViewProps<any>>(({
    as,
    m, mt, mb, ml, mr, mx, my,
    p, pt, pb, pl, pr, px, py,
    w, h, flex, bg, borderRadius, fontSize, fontWeight, color, cursor, overflow,
    position,
    loading = true,
    style,
    top,
    left,
    right,
    bottom,
    zIndex,
    ...rest
}, ref) => {
    const Component = as || 'div';

    // 顯式提取樣式屬性，並處理 mx/my/px/py 的優先級邏輯
    const boxStyle: any = {
        // 利用 toUnit 的特性，直接透传 undefined
        marginTop: toUnit(mt ?? my ?? m),
        marginBottom: toUnit(mb ?? my ?? m),
        marginLeft: toUnit(ml ?? mx ?? m),
        marginRight: toUnit(mr ?? mx ?? m),

        paddingTop: toUnit(pt ?? py ?? p),
        paddingBottom: toUnit(pb ?? py ?? p),
        paddingLeft: toUnit(pl ?? px ?? p),
        paddingRight: toUnit(pr ?? px ?? p),

        width: toUnit(w),
        height: toUnit(h),
        flex,
        backgroundColor: themeMapping[bg!] ?? bg,
        color: (color && themeMapping[color]) || color,
        borderRadius: toUnit(borderRadius),
        fontSize: toUnit(fontSize),
        fontWeight,
        cursor,
        overflow,
        position,
        top: toUnit(top),
        left: toUnit(left),
        right: toUnit(right),
        bottom: toUnit(bottom),
        zIndex,
        ...style
    };

    // 清理 undefined
    // Object.keys(boxStyle).forEach(key => {
    //     if (boxStyle[key] === undefined || boxStyle[key] === null) {
    //         delete boxStyle[key];
    //     }
    // });

    return <Component ref={ref} style={boxStyle} {...rest} />;
});