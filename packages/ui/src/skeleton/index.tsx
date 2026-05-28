import { forwardRef } from 'react';
import { ViewProps, View } from '../view';

export type SkeletonProps = ViewProps<'div'> & {
    variant?: 'text' | 'rect' | 'circle';
    loading?: boolean; // 是否處於加載中，false 則顯示 children
}

export const Skeleton = forwardRef<any, SkeletonProps>(({
    variant = 'rect',
    loading = true,
    children,
    w,
    h,
    borderRadius,
    className = '',
    style,
    ...props
}, ref) => {
    // 如果不處於加載狀態，直接返回內容
    if (!loading) return <>{children}</>;

    // 根據變體設置默認寬高和圓角
    const isCircle = variant === 'circle';
    const isText = variant === 'text';

    return (
        <View
            ref={ref}
            w={w || (isCircle ? 40 : '100%')}
            h={h || (isText ? '1em' : (isCircle ? 40 : 16))}
            borderRadius={borderRadius || (isCircle ? '50%' : (isText ? 4 : 8))}
            bg="var(--skeleton-bg)"
            className={`skeleton-animate ${className}`}
            style={{
                display: isCircle || isText ? 'inline-block' : 'block',
                ...style
            }}
            {...props}
        />
    );
});