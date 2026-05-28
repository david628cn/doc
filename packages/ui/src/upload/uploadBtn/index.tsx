import React, { useRef, useState } from 'react';
// import { createUploader } from '../upload';
import { getBase64 } from '../../utils/image';
import { CLASSNAME } from '../../config';
import './index.less';

// const uploadFile = createUploader({ limit: 4 });

export type FileItem = {
    name?: string;
    status?: 'uploading' | 'done' | 'error' | 'removed';
    percent?: number;
    url?: string;
    response?: string;
    file?: File; // 原生文件对象，用于上传
    type?: string;
};

export type UploadBtndProps = {
    className?: string;
    onBeforeUpload?: (files: FileList | null | undefined) => boolean;
    onComplete?: Function;
    children?: React.ReactNode;
    // onChange?: (index: number) => void;
    // [key: string]: unknown
}

export const UploadBtn: React.FC<UploadBtndProps> = props => {
    const {
        className,
        onBeforeUpload,
        onComplete
    } = props;

    const [url, setUrl] = useState<any>(null);

    const inputRef = useRef<any>(null);

    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (inputRef.current) {
            inputRef.current.click();
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const { files } = e.target;
        beforeUpload(files);
    }

    const beforeUpload = async (files: FileList | null | undefined) => {
        const is = typeof onBeforeUpload === 'function' ? await onBeforeUpload(files) : true;
        if (is) {
            // const uploadPromises = Array.from(files).map((file) => {
            //     const fr = new FormData();
            //     fr.set('file', file);
            //     return uploadFile.upload({
            //         url: 'http://127.0.0.1:8000/api/files/upload',
            //         headers: {
            //             'Authorization': localStorage.getItem('token') || ''
            //         },
            //         data: fr,
            //         onProgress: (event: any) => {
            //             console.log(`文件 ${file.name} 进度:`, event);
            //         }
            //     });
            // });
            // try {
            //     const results = await Promise.all(uploadPromises);
            //     console.log('所有文件上传成功:', results);
            // } catch (error) {
            //     console.error('上传过程中出现错误:', error);
            // }
            doUploadFiles(files)
        }
    }

    const doUploadFiles = async (files: FileList | null | undefined) => {
        if (files && files.length > 0) {
            doUploadFile(files[0]);
        }
    }

    const doUploadFile = async (file: File) => {
        const newUrl = await getBase64(file);
        setUrl(newUrl);
        onComplete?.({
            file: newUrl,
            status: 'done'
        });
    }

    const cls = [`${CLASSNAME}-upload-btn-container`];
    if (className) {
        cls.push(className);
    }

    return (
        <div className={cls.join(' ')}>
            <input
                ref={inputRef}
                className={`${CLASSNAME}-upload-btn-input`}
                type="file"
                onChange={handleChange}
            />
            {/* {
                url ? <div className={`${CLASSNAME}-upload-btn-preview`}>
                                <img className={`${CLASSNAME}-upload-btn-preview-img`} src={url}/>
                            </div> : null
            } */}
            <button
                className={`${CLASSNAME}-upload-btn-submit`}
                onClick={handleClick}
            >上传</button>
        </div>
    );
}