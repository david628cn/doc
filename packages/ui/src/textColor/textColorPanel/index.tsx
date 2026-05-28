import { useEffect, useRef, useState } from 'react';
import { ColorList } from '../colorList';
import { Usage } from '../../utils/usage';
import { TEXT_COLORS, HIGHLIGHT_COLORS } from '../colors';
import { CLASSNAME } from '../../config';
import './index.less';

export type TextColorPanelProps = {
    value?: any;
    defaultValue?: any;
    title?: string;
    className?: string;
    keyName?: string;
    onChange?: Function;
    colors?: Array<any>;
    backgroundColors?: Array<any>;
    [key: string]: unknown
}

export const TextColorPanel = (props: TextColorPanelProps) => {
    const [value, setValue] = useState(props.value || props.defaultValue);
    const [usageColors, setUsageColors] = useState([]);

    const usageRef = useRef<any>(null);

    useEffect(() => {
        if (!usageRef.current) {
            usageRef.current = new Usage({
                limit: 8,
                key: props.keyName || 'expiring_highlightColor'
            });
        }
        const rs = usageRef.current.load();
        setUsageColors(rs);
        return () => {
            usageRef.current = null;
        }
    }, []);

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    const doChange = (params: any, isSave: boolean = false) => {
        if (isSave) {
            if (usageRef.current) {
                const newData = usageRef.current.data.filter(((n: any) => {
                    return n.type !== params.type || n.value !== params.item.value;
                }));
                usageRef.current.data = newData;
                usageRef.current.save();
                usageRef.current.add({
                    ...params.item,
                    type: params.type
                });
                setUsageColors(newData);
            }
        }
        if (!('value' in props)) {
            setValue(params.value);
        }
        props.onChange?.({
            event: params.event,
            type: params.type,
            item: params.item,
            rgba: params.rgba,
            value: params.value
        });
    }

    let cls: any = [`${CLASSNAME}-text-color-panel`];
    if (props.className !== undefined) {
        cls.push(props.className);
    }

    return (
        <div className={cls.join(' ')}>
            <ColorList
                label="最近使用"
                colors={usageColors}
                onChange={(params: any) => {
                    const newValue = {
                        ...value
                    };
                    let isHas = false;
                    if (params.item.type === 'color') {
                        isHas = params.item.value === value?.color;
                        newValue.color = isHas ?  (props.colors || TEXT_COLORS)[0].value : params.item.value;
                    } else if (params.item.type === 'backgroundColor') {
                        isHas = params.item.value === value?.backgroundColor;
                        newValue.backgroundColor = isHas ?  (props.backgroundColors || HIGHLIGHT_COLORS)[0].value : params.item.value;
                    }
                    doChange({
                        event: params.event,
                        type: params.item.type,
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    });
                }}
            />
            <ColorList
                label="文本颜色"
                colors={props.colors || TEXT_COLORS}
                value={value?.color}
                onChange={(params: any) => {
                    const isHas = params.item.value === value?.color;
                    const newValue = {
                        ...value,
                        color: isHas ?  (props.colors || TEXT_COLORS)[0].value : params.item.value
                        // backgroundColor: ''
                    }
                    doChange({
                        event: params.event,
                        type: 'color',
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    }, !isHas);
                }}
            />
            <ColorList
                label="背景颜色"
                colors={props.backgroundColors || HIGHLIGHT_COLORS}
                value={value?.backgroundColor}
                onChange={(params: any) => {
                    const isHas = params.item.value === value?.backgroundColor;
                    const newValue = {
                        ...value,
                        // color: '',
                        backgroundColor: isHas ?  (props.backgroundColors || HIGHLIGHT_COLORS)[0].value : params.item.value
                    }
                    doChange({
                        event: params.event,
                        type: 'backgroundColor',
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    }, !isHas);
                }}
            />
        </div>
    )
}