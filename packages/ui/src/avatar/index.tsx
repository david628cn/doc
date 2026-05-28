import React, { forwardRef, useState, useEffect } from 'react';
import { View, type ViewProps } from '../view';
import { Flex } from '../flex';
// import { Tooltip } from '../tooltip';
import { CLASSNAME } from '../config';
import './index.less';

export type AvatarProps = ViewProps & {
    className?: string;
    status?: 'none' | 'online' | 'offline';
    size?: 'small' | 'medium' | 'large' | number | string;
    radius?: 'none' | 'small' | 'medium' | 'large' | 'full' | number | string;
    icon?: React.ReactNode;
    title?: React.ReactNode;
    titleLength?: number;
    children?: React.ReactNode;
    number?: number | any;
    numberSize?: 'none' | 'small' | 'medium' | 'large' | 'full' | number | string;
    bg?: string;
    borderColor?: string;
    onClick?: (e: any) => void;
    style?: React.CSSProperties;
}

const numberSizeMapping: any = { small: 12, medium: 24, large: 32 };
const sizeMapping: any = { small: 24, medium: 32, large: 48 };
const radiusMapping: any = { none: 0, small: 2, medium: 4, large: 6, full: '50%' };

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>((props, ref) => {
    const { 
        className,
        status: propsStatus, 
        size = 'medium', 
        radius = 10, 
        icon, 
        children, 
        title, 
        titleLength = 1,
        number,
        numberSize = 'medium',
        onClick, 
        bg, 
        borderColor = '#fff', // 建議這裡預設顏色
        style, 
        ...rest 
    } = props;
    const [localStatus, setLocalStatus] = useState(propsStatus);
    useEffect(() => { setLocalStatus(propsStatus); }, [propsStatus]);

    const finalSize = typeof size === 'number' ? size : sizeMapping[size];
    const borderRadius = typeof radius === 'number' ? radius : radiusMapping[radius];
    const numSize = typeof numberSize === 'number' ? numberSize : numberSizeMapping[numberSize];

    const cls = [
        `${CLASSNAME}-avatar`,
        // `${CLASSNAME}-avatar-${type}`,
        className,
        localStatus === 'offline' && `${CLASSNAME}-avatar-offline-mode`
    ].filter(Boolean).join(' ');;

    const avatarNode = (
        <View
            ref={ref} 
            className={cls} 
            w={finalSize} 
            h={finalSize} 
            bg={bg}
            borderRadius={borderRadius} // 確保圓角生效
            position="relative" // 必須開啟 relative 以定位 status
            style={{ 
                // 2. 關鍵：用 box-shadow 代替 border，實現留白且不影響布局
                boxShadow: `0 0 0 2px ${borderColor}`, 
                ...style 
            }}
            onClick={(e: any) => onClick?.(e)} 
            {...rest}
        >
            <div className={`${CLASSNAME}-avatar-content`}>
                {/* {typeof icon === 'string' ? <img src={icon} alt="" /> : icon} */}
                { icon ? icon : (title || '').slice(0, titleLength).toLocaleUpperCase()}
                {/* {children} */}
            </div>
            {localStatus && (
                <span 
                    className={`${CLASSNAME}-avatar-status ${CLASSNAME}-avatar-status-${localStatus}`} 
                    style={{
                        position: 'absolute',
                        bottom: 0, // 圓形時向中心偏移
                        right: 0,
                        transform: 'translate(50%, 50%)',
                        zIndex: 2,
                        border: `1.5px solid ${borderColor}` // 狀態點也要邊框
                    }}
                />
            )}
            {
                number !== undefined && number > 0 && (
                    <View className={`${CLASSNAME}-avatar-number`} w={numSize} h={numSize}>
                        {number > 99 ? '99+' : number}
                    </View>
                )
            }
            
        </View>
    );

    return avatarNode;
});

export type AvatarGroupProps = ViewProps & {
    className?: string;
    status?: 'none' | 'online' | 'offline';
    size?: 'small' | 'medium' | 'large' | number | string;
    radius?: 'none' | 'small' | 'medium' | 'large' | 'full' | number | string;
    icon?: React.ReactNode;
    title?: React.ReactNode;
    children?: React.ReactNode;
    bg?: string;
    borderColor?: string;
    maxCount?: number;
    onClick?: (e: any) => void;
    style?: React.CSSProperties;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ 
    children, 
    maxCount, 
    size = 'medium', 
    radius = 'medium', 
    borderColor, 
    status, 
    ...rest 
}) => {
    const childrenArray = React.Children.toArray(children);
    const displayChildren = maxCount ? childrenArray.slice(0, maxCount) : childrenArray;
    const remainingCount = childrenArray.length - (maxCount || 0);
    
    return (
        <Flex className={`${CLASSNAME}-avatar-group`} align="center" {...rest}>
            {displayChildren.map((child: any, i) => {
                return React.cloneElement(child, {
                    key: i,
                    // 1. 確保 size 和 type 都能傳遞給子組件
                    size: child.props.size || size,
                    radius: child.props.radius || radius, 
                    status: status || child.props.status,
                    bg: child.props.bg, 
                    borderColor: child.props.borderColor || borderColor,
                    style: { ...child.props.style, marginLeft: i === 0 ? 0 : -8, transitionDelay: `${i * 0.05}s` }
                });
            })}
            {maxCount && childrenArray.length > maxCount && (
                // 2. 這裡也要傳遞 type，否則 "+N" 的那個塊也會是方的
                <Avatar size={size} radius={radius} className={`${CLASSNAME}-avatar-count`} title={`+${remainingCount > 99 ? '99+' : remainingCount}`} titleLength={3} bg={'#f0f0f0'} color={'#555'} borderColor={borderColor}></Avatar>
            )}
        </Flex>
    );
};