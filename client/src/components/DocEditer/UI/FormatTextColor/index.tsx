import { useEffect, useState } from 'react';
import { Dropdown } from 'antd';
import FormatButton from '../FormatButton';
import { DropdownIcon, TextColorIcon } from '../Icon';
import './index.less';

const TEXT_COLORS = [
    { label: '黑色', value: 'rgba(31,35,41,1)' },
    { label: '灰色', value: 'rgba(143,149,158,1)' },
    { label: '红色', value: 'rgba(216,57,49,1)' },
    { label: '橙色', value: 'rgba(222,120,2,1)' },
    { label: '黄色', value: 'rgba(220,155,4,1)' },
    { label: '绿色', value: 'rgba(46,161,33,1)' },
    { label: '蓝色', value: 'rgba(36,91,219,1)' },
    { label: '紫色', value: 'rgba(100,37,208,1)' }
];
const HIGHLIGHT_COLORS = [
    { label: '透明', value: 'rgba(255,255,255,0)' },
    { label: '浅灰色', value: 'rgba(242,243,245,1)' },
    { label: '浅红色', value: 'rgba(251,191,188,1)' },
    { label: '浅橙色', value: 'rgba(254,212,164,0.8)' },
    { label: '浅黄色', value: 'rgba(255,246,122,0.8)' },
    { label: '浅绿色', value: 'rgba(183,237,177,0.8)' },
    { label: '浅蓝色', value: 'rgba(186,206,253,0.7)' },
    { label: '浅紫色', value: 'rgba(205,178,250,0.7)' },
    { label: '中灰色', value: 'rgba(222,224,227,0.8)' },
    { label: '灰色', value: 'rgba(187,191,196,1)' },
    { label: '红色', value: 'rgba(247,105,100,1)' },
    { label: '橙色', value: 'rgba(255,165,61,1)' },
    { label: '黄色', value: 'rgba(255,233,40,1)' },
    { label: '绿色', value: 'rgba(98,210,86,1)' },
    { label: '蓝色', value: 'rgba(78,131,253,0.55)' },
    { label: '紫色', value: 'rgba(147,90,246,0.55)' }
];

interface FormatTextColorProps {
    value?: any;
    title?: string;
    className?: string;
    onSelect?: Function;
    render?: Function;
    textColors?: Array<any>;
    highlightColors?: Array<any>;
    [key: string]: unknown
}

const FormatTextColor = (props: FormatTextColorProps) => {
    const { className, label, render, title, textColors, highlightColors, onSelect, ...otherProps } = props;

    const [value, setValue] = useState(props.value || {
        color: 'rgba(31,35,41,1)',
        highlight: 'rgba(255,255,255,0)'
    });

    useEffect(() => {
        setValue(props.value || {
            color: 'rgba(31,35,41,1)',
            highlight: 'rgba(255,255,255,0)'
        });
    }, [props.value])

    // const handlePointerDown = (e: any) => {
    //     e.preventDefault();
    // }

    const handleClickColor = (item: any) => {
        return (e: any) => {
            const newValue = {
                ...value,
                color: item['value']
            }
            // onSelect?.(newValue);
            setValue(newValue);
        }
    }

    const handleClickHighlight = (item: any) => {
        return (e: any) => {
            const newValue = {
                ...value,
                highlight: item['value']
            }
            // onSelect?.(newValue);
            setValue(newValue);
        }
    }

    const dropdownRender = (v: any) => {
        return (
            <div className="docEditer-formatTextColor-dropdown-overlay">
                <div className="docEditer-formatTextColor-group">
                    <div className="docEditer-formatTextColor-label">Text Color</div>
                    <div className="docEditer-formatTextColor-group">
                        <ul>
                            {
                                (textColors || TEXT_COLORS).map((item: any, index: number) => {
                                    return (
                                        <li key={index}>
                                            <FormatButton 
                                                title={item['label']}
                                                onClick={handleClickColor(item)}
                                                active={item['value'] === value['color']}
                                            >
                                                <span className="docEditer-formatTextColor-text" style={{
                                                    borderColor: item['value']
                                                }}>
                                                    <svg
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        style={{
                                                            color: item['value']
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
                                            </FormatButton>
                                        </li>
                                    )
                                })
                            }
                        </ul>
                    </div>
                </div>
                <div className="docEditer-formatTextColor-group">
                    <div className="docEditer-formatTextColor-label">Highlight Color</div>
                    <div className="docEditer-formatTextColor-group">
                        <ul className="docEditer-formatTextColor-highlight-items">
                            {
                                (highlightColors || HIGHLIGHT_COLORS).map((item: any, index: number) => {
                                    return (
                                        <li className="docEditer-formatTextColor-highlight-item" key={index}>
                                            <FormatButton 
                                                title={item['label']}
                                                onClick={handleClickHighlight(item)}
                                                active={item['value'] === value['highlight']}
                                            >
                                                <span className="docEditer-formatTextColor-highlight" style={{
                                                    borderColor: item['value'],
                                                    backgroundColor: item['value']
                                                }}></span>
                                            </FormatButton>
                                        </li>
                                    )
                                })
                            }
                        </ul>
                    </div>
                </div>
            </div>
        )
    }

    let cls: any = ['docEditer-formatTextColor-button'];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return (
        <Dropdown
            trigger={["click"]}
            {...otherProps}
            dropdownRender={dropdownRender}
        >
            <FormatButton 
                title={title}
                // active={value !== '' && value !== undefined}
            >
                <span className="docEditer-formatTextColor-label-color" style={{
                    borderColor: value['highlight'],
                    backgroundColor: value['highlight']
                }}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            color: value['color']
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
                {DropdownIcon}
            </FormatButton>
        </Dropdown>
    )
}

export default FormatTextColor;