import React, { useEffect, useMemo, useState } from 'react';
import { CLASSNAME } from '../config';
import './index.less';

export type TabProps = {
    className?: string;
    defaultActiveKey?: string;
    activeKey?: string;
    items?: Array<any>;
    distroyOnClose?: boolean;
    onTabChange?: (key: any) => void;
    navStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    /** 右侧扩展区（如：移除/清空按钮） */
    extra?: React.ReactNode;
    // [key: string]: unknown
}

export const Tab: React.FC<TabProps> = props => {
    const {
        navStyle,
        contentStyle,
        distroyOnClose = true
    } = props;
    const isControlled = props.activeKey !== undefined;
    const defaultKey = useMemo(
        () => props.defaultActiveKey || (props.items || [])[0]?.key,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.defaultActiveKey, (props.items || [])[0]?.key]
    );
    const [innerActiveKey, setInnerActiveKey] = useState(props.activeKey ?? defaultKey);
    const activeKey = isControlled ? props.activeKey : innerActiveKey;

    useEffect(() => {
        if (isControlled) {
            setInnerActiveKey(props.activeKey);
        }
    }, [isControlled, props.activeKey]);

    const handleClick = (key: any) => {
        return (e: any) => {
            e.preventDefault();
            if (!isControlled) {
                setInnerActiveKey(key);
            }
            props.onTabChange?.(key);
        }
    }

    const nav: any = [];
    const content: any = [];
    (props.items || []).forEach((item: any, index: number) => {
        nav.push(
            <div
                key={index}
                className={item.key && (item.key === activeKey) ? `${CLASSNAME}-tab-nav ${CLASSNAME}-tab-nav-active` : `${CLASSNAME}-tab-nav`}
                onClick={handleClick(item.key)}
            >
                <div className={`${CLASSNAME}-tab-nav-label`}>{item.label}</div>
            </div>
        );
        if (distroyOnClose) {
            if (item.key === activeKey) {
                content.push(
                    <div key={index} className={`${CLASSNAME}-tab-content ${CLASSNAME}-tab-content-active`}>
                        {item.children}
                    </div>
                );
            }
        } else {
            content.push(
                <div key={index} className={item.key && (item.key === activeKey) ? `${CLASSNAME}-tab-content ${CLASSNAME}-tab-content-active` : `${CLASSNAME}-tab-content`}>
                    {item.children}
                </div>
            );
        }
    })

    return (
        <div className={`${CLASSNAME}-tab-container`}>
            <div className={`${CLASSNAME}-tab-nav-container`} style={navStyle}>
                <div className={`${CLASSNAME}-tab-nav-left`}>
                    { nav }
                </div>
                {props.extra ? <div className={`${CLASSNAME}-tab-nav-extra`}>{props.extra}</div> : null}
            </div>
            <div className={`${CLASSNAME}-tab-content-container`} style={contentStyle}>
                { content }
            </div>
        </div>
    );
}