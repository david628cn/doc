import React from 'react';
import { Tab } from '../tab';
// import { UploadBtn } from '../upload';
import { LinkForm } from '../linkForm';
import { CLASSNAME } from '../config';
import './index.less';

export type MediaUploadProps = {
    className?: string;
    defaultActiveKey?: number;
    activeKey?: number;
    children?: React.ReactNode;
    onComplete?: Function;
    onTabChange?: (index: number) => void;
    // [key: string]: unknown
}

export const MediaUpload: React.FC<MediaUploadProps> = props => {

    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        // console.log('>>>>>');
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const { files } = e.target;
    }

    return (
        <div className={`${CLASSNAME}-media-upload-container`}>
            <Tab 
                defaultActiveKey={'upload'}
                items={
                    [
                        {
                            label: '上传',
                            key: 'upload',
                            // children: <UploadBtn className={`${CLASSNAME}-media-upload-btn-container`} onComplete={props.onComplete}/>
                        }, {
                            label: '链接',
                            key: 'link',
                            children: <LinkForm className={`${CLASSNAME}-media-upload-link-container`} onComplete={props.onComplete}/>
                        }
                    ]
                }
            />
        </div>
    );
}