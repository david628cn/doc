import React from 'react';
import { Tooltip } from '@/components/dropdown';
import { getRgba, rgbaToString } from '@/components/colorPicker/color';
import { CLASSNAME } from '@/global';
import './index.less';

export type ColorListProps = {
    value?: any;
    // title?: string;
    label?: string;
    colors?: Array<any>;
    className?: string;
    onChange?: Function;
    // [key: string]: unknown
}

export const ColorList = (props: ColorListProps) => {
    const cls = [`${CLASSNAME}-color-list`];
    if (props.className) {
        cls.push(props.className);
    }

    const hanldeClick = (color: string, item: any) => {
        return (e: React.MouseEvent) => {
            e.preventDefault();
            props.onChange?.({
                domEvent: e,
                value: item.value,
                rgba: color,
                item
            });
        }
    }

    const renderGroup = () => {
        const rs = [];
        const arr = props.colors || [];
        for (let i = 0; i < arr.length; i++) {
            const colorObj = getRgba(arr[i].value);
            const color = rgbaToString(colorObj);
            const itemCls = [`${CLASSNAME}-color-list-item`];
            if (arr[i].type === 'highlight') {
                itemCls.push(`${CLASSNAME}-color-list-highlight-item`);
            }
            if (colorObj.a === 0) {
                itemCls.push(`${CLASSNAME}-color-list-transparent`);
            }
            const valueColor = rgbaToString(getRgba(props.value || ''));
            if (valueColor === color) {
                itemCls.push(`${CLASSNAME}-color-list-selected`);
            }
            rs.push(
                <Tooltip key={i} title={arr[i].label}>
                    <div
                        className={itemCls.join(' ')}
                        style={{
                            '--highlight-color': color
                        } as any}
                        onClick={hanldeClick(color, arr[i])}
                        onPointerDown={(e: any) => {
                            e.preventDefault();
                        }}
                    >
                        <span className={`${CLASSNAME}-color-list-text`}>
                            {
                                arr[i].type === 'text' ? <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{
                                        color,
                                        flexGrow: 1
                                    }}
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M12.8944 5.55279C12.725 5.214 12.3787 5 12 5C11.6212 5 11.2749 5.214 11.1055 5.55279L5.10555 17.5528C4.85856 18.0468 5.05878 18.6474 5.55276 18.8944C6.04674 19.1414 6.64741 18.9412 6.8944 18.4472L8.64957 14.9369C8.75862 14.9777 8.87671 15 9 15H15C15.1233 15 15.2413 14.9777 15.3504 14.9369L17.1055 18.4472C17.3525 18.9412 17.9532 19.1414 18.4472 18.8944C18.9412 18.6474 19.1414 18.0468 18.8944 17.5528L12.8944 5.55279ZM14.3819 13L12 8.23607L9.61801 13H14.3819Z"
                                        fill="currentColor"
                                    ></path>
                                </svg> : (colorObj.a === 0 ?
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 1024 1024"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                        style={{
                                            color: 'red',
                                            flexGrow: 1,
                                            transform: `scaleX(-1)`
                                        }}
                                    >
                                        <path
                                            d="M51.61290313 32.16298813l940.06112062 940.06112062-19.55857406 19.55857406L32 51.72156219z"
                                            fill="currentColor"
                                        ></path>
                                    </svg> : null
                                )
                            }
                        </span>
                    </div>
                </Tooltip>
            );
        }
        return rs;
    }

    return (
        <div className={cls.join(' ')}>
            <div className={`${CLASSNAME}-color-list-label`}>{props.label}</div>
            <div className={`${CLASSNAME}-color-list-group`}>
                {renderGroup()}
            </div>

        </div>
    );
}