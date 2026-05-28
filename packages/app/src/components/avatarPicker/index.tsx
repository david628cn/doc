import { useEffect, useState, forwardRef } from 'react';
import {
    Button,
    Popuover,
    Avatar,
    Tab,
    Emoji
} from '@carvy/ui';
import { ImageUpload } from '@/components/imageUpload';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
// import { CLASSNAME } from '../config';
// import './index.less';

export type AvatarPickerProps = {
    defaultValue?: string;
    value?: string;
    label?: string;
    size?: string | number;
    radius?: string | number;
    onChange?: (v: any) => void;
}

export const AvatarPicker = forwardRef<HTMLDivElement, AvatarPickerProps>((props, ref) => {
    const {
        defaultValue,
        value,
        label,
        onChange,
        ...rest
    } = props;

    const [content, setContent] = useState(value || defaultValue || '');

    useEffect(() => {
        if ('value' in props) {
            setContent(value || '');
        }
    }, [value]);

    const handleChange = (p: any) => {
        const newContent = p.value || '';
        if (!('value' in props)) {
            setContent(newContent);
        }
        onChange?.(newContent);
    }

    return (
        <Popuover
            items={
                <div>
                    <Tab
                        items={[
                            {
                                key: 'image',
                                label: '上传',
                                children: <ImageUpload onChange={handleChange}></ImageUpload>
                            },
                            {
                                key: 'emoji',
                                label: '表情',
                                children: <Emoji onChange={handleChange}></Emoji>
                            }
                        ]}
                    ></Tab>
                    <Button
                        variant='link'
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '10px'
                        }}
                        onClick={() => {
                            handleChange?.({
                                value: ''
                            });
                        }}
                    >清空</Button>
                </div>
            }
            style={{
                width: '460px'
            }}
        >
            <Avatar
                bg="#dfdfdf"
                icon={(() => {
                    const src = resolveMediaSrcForImg(content);
                    return src ? <img src={src} alt="" /> : content;
                })()}
                title={label}
                {...rest}
            ></Avatar>
        </Popuover>
    );
});