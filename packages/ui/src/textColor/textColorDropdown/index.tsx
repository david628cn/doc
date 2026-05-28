import { useEffect, useRef, useState } from 'react';
import { Popuover } from '../../popuover';
import { Button } from '../../button';
import { TextColorPanel } from '../textColorPanel';
import { TEXT_COLORS, HIGHLIGHT_COLORS } from '../colors';
import { CLASSNAME } from '../../config';
import './index.less';

export type TextColorDropdownProps = {
    value?: any;
    defaultValue?: any;
    open?: boolean;
    defaultOpen?: boolean;
    title?: string;
    // label?: string;
    placement?: string;
    trigger?: string;
    keyName?: string;
    onChange?: Function;
    onDropdownChange?: Function;
    colors?: Array<any>;
    backgroundColors?: Array<any>;
    // [key: string]: unknown
}

export const TextColorDropdown = (props: TextColorDropdownProps) => {
    const textColorProps: any = {
        onChange: props.onChange,
        keyName: props.keyName,
        colors: props.colors,
        backgroundColors: props.backgroundColors
    };

    let curTextColorValue = props.value

    if (('defaultValue' in props)) {
        curTextColorValue = textColorProps.defaultValue = {
            color: props.defaultValue.color || TEXT_COLORS[0].value,
            backgroundColor: props.defaultValue.backgroundColor || HIGHLIGHT_COLORS[0].value
        };
    }

    if (('value' in props)) {
        curTextColorValue = textColorProps.value = {
            color: props.value.color || TEXT_COLORS[0].value,
            backgroundColor: props.value.backgroundColor || HIGHLIGHT_COLORS[0].value
        };
    }


    const dropdownProps: any = {
        placement: props.placement || 'tl-bl?',
        trigger: props.trigger || 'click',
        onChange: props.onDropdownChange
    };

    if (('defaultOpen' in props)) {
        dropdownProps.defaultOpen = props.defaultOpen;
    }

    if (('open' in props)) {
        dropdownProps.open = props.open;
    }

    return (
        <Button
            className={`${CLASSNAME}-text-color-dropdown-container`}
            variant="soft"
            title={props.title}
        >
            <div className={`${CLASSNAME}-text-color-dropdown`}
                style={{
                    '--highlight-color': curTextColorValue.backgroundColor
                } as any}
                onClick={() => {
                    props.onChange?.({
                        value: curTextColorValue
                    });
                }}
            >
                <span className={`${CLASSNAME}-text-color-dropdown-text`}
                    style={{
                        '--highlight-color': curTextColorValue.backgroundColor
                    } as any}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            color: curTextColorValue.color,
                            flexGrow: 1
                        }}
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12.8944 5.55279C12.725 5.214 12.3787 5 12 5C11.6212 5 11.2749 5.214 11.1055 5.55279L5.10555 17.5528C4.85856 18.0468 5.05878 18.6474 5.55276 18.8944C6.04674 19.1414 6.64741 18.9412 6.8944 18.4472L8.64957 14.9369C8.75862 14.9777 8.87671 15 9 15H15C15.1233 15 15.2413 14.9777 15.3504 14.9369L17.1055 18.4472C17.3525 18.9412 17.9532 19.1414 18.4472 18.8944C18.9412 18.6474 19.1414 18.0468 18.8944 17.5528L12.8944 5.55279ZM14.3819 13L12 8.23607L9.61801 13H14.3819Z"
                            fill="currentColor"
                        ></path>
                    </svg>
                </span>
            </div>
            <div className={`${CLASSNAME}-text-color-dropdown-inner`}>
                <Popuover
                    { ...dropdownProps }
                    items={
                        <TextColorPanel 
                            {...textColorProps}
                        />
                    }
                    // onChange={(params: any) => {
                    //     setOpen(params.open);
                    // }}
                >
                    <span className={`${CLASSNAME}-text-color-dropdown-icon`}>
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
                                fill="currentColor"
                            ></path>
                        </svg>
                    </span>
                </Popuover>
            </div>
        </Button>
    )
}