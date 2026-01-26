import { useEffect, useRef, useState } from 'react';
import { ColorList } from '../colorList';
import { Usage } from '@/components/utils/usage';
import { CLASSNAME } from '@/global';
import './index.less';

const TEXT_COLORS = [
    { label: '黑色', value: 'rgba(31,35,41,1)', type: 'text' },
    { label: '灰色', value: 'rgba(143,149,158,1)', type: 'text' },
    { label: '红色', value: 'rgba(216,57,49,1)', type: 'text' },
    { label: '橙色', value: 'rgba(222,120,2,1)', type: 'text' },
    { label: '黄色', value: 'rgba(220,155,4,1)', type: 'text' },
    { label: '绿色', value: 'rgba(46,161,33,1)', type: 'text' },
    { label: '蓝色', value: 'rgba(36,91,219,1)', type: 'text' },
    { label: '紫色', value: 'rgba(100,37,208,1)', type: 'text' }
];

const HIGHLIGHT_COLORS = [
    { label: '透明', value: 'rgba(255,255,255,0)', type: 'highlight' },
    { label: '浅灰色', value: 'rgba(242,243,245,1)', type: 'highlight' },
    { label: '浅红色', value: 'rgba(251,191,188,1)', type: 'highlight' },
    { label: '浅橙色', value: 'rgba(254,212,164,0.8)', type: 'highlight' },
    { label: '浅黄色', value: 'rgba(255,246,122,0.8)', type: 'highlight' },
    { label: '浅绿色', value: 'rgba(183,237,177,0.8)', type: 'highlight' },
    { label: '浅蓝色', value: 'rgba(186,206,253,0.7)', type: 'highlight' },
    { label: '浅紫色', value: 'rgba(205,178,250,0.7)', type: 'highlight' },
    { label: '中灰色', value: 'rgba(222,224,227,0.8)', type: 'highlight' },
    { label: '灰色', value: 'rgba(187,191,196,1)', type: 'highlight' },
    { label: '红色', value: 'rgba(247,105,100,1)', type: 'highlight' },
    { label: '橙色', value: 'rgba(255,165,61,1)', type: 'highlight' },
    { label: '黄色', value: 'rgba(255,233,40,1)', type: 'highlight' },
    { label: '绿色', value: 'rgba(98,210,86,1)', type: 'highlight' },
    { label: '蓝色', value: 'rgba(78,131,253,0.55)', type: 'highlight' },
    { label: '紫色', value: 'rgba(147,90,246,0.55)', type: 'highlight' }
];

export type TextColorPanelProps = {
    value?: any;
    defaultValue?: any;
    title?: string;
    className?: string;
    keyName?: string;
    onChange?: Function;
    textColors?: Array<any>;
    highlightColors?: Array<any>;
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
            domEvent: params.domEvent,
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
                    if (params.item.type === 'text') {
                        isHas = params.item.value === value?.textColor;
                        newValue.textColor = isHas ?  (props.textColors || TEXT_COLORS)[0].value : params.item.value;
                    } else if (params.item.type === 'highlight') {
                        isHas = params.item.value === value?.highlightColor;
                        newValue.highlightColor = isHas ?  (props.highlightColors || HIGHLIGHT_COLORS)[0].value : params.item.value;
                    }
                    doChange({
                        domEvent: params.domEvent,
                        type: params.item.type,
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    });
                }}
            />
            <ColorList
                label="文本颜色"
                colors={props.textColors || TEXT_COLORS}
                value={value?.textColor}
                onChange={(params: any) => {
                    const isHas = params.item.value === value?.textColor;
                    const newValue = {
                        ...value,
                        textColor: isHas ?  (props.textColors || TEXT_COLORS)[0].value : params.item.value
                        // highlightColor: ''
                    }
                    doChange({
                        domEvent: params.domEvent,
                        type: 'text',
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    }, !isHas);
                }}
            />
            <ColorList
                label="背景颜色"
                colors={props.highlightColors || HIGHLIGHT_COLORS}
                value={value?.highlightColor}
                onChange={(params: any) => {
                    const isHas = params.item.value === value?.highlightColor;
                    const newValue = {
                        ...value,
                        // textColor: '',
                        highlightColor: isHas ?  (props.highlightColors || HIGHLIGHT_COLORS)[0].value : params.item.value
                    }
                    doChange({
                        domEvent: params.domEvent,
                        type: 'highlight',
                        item: params.item,
                        rgba: params.rgba,
                        value: newValue
                    }, !isHas);
                }}
            />
        </div>
    )
}