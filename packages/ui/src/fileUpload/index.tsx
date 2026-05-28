import React, { useRef, useState, type ReactNode } from 'react';
import { CLASSNAME } from '../config';
import './index.less';

const defaultRequest = (opt: any) => {
        let formData = new FormData();
        if (opt.data) {
            Object.keys(opt.data).forEach(key => {
                const value = opt.data[key];
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        formData.append(`${key}[]`, item);
                    });
                    return;
                }
                formData.append(key, value);
            });
        }
        const onProgress = opt.onProgress;
        // let name = opt.name !== undefined ? opt.name : opt.file.name;
        const name = opt.name;
        if (opt.file && name) {
            if (opt.file instanceof Blob) {
                formData.append(name, opt.file, opt.file.name);
            } else {
                formData.append(name, opt.file);
            }
        }
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open(opt.method || 'get', opt.url, true);
            for (let key in opt.headers || {}) {
                xhr.setRequestHeader(key, opt.headers[key]);
            }
            if (opt?.headers['X-Requested-With'] !== null) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            }
            if (opt.withCredentials && 'withCredentials' in xhr) {
                xhr.withCredentials = true;
            }
            xhr.onload = (e: any) => {
                if (xhr.status < 200 || xhr.status >= 300) {
                    // opt?.onError();
                    // reject();
                    return;
                }
                opt?.onSuccess();
                resolve(e.target.responseText);
            }
            xhr.onerror = (err: any) => {
                opt?.onError(err);
                reject(err);
            };
            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (e: any) => {
                    opt?.onProgress(e);
                }
            }
            if (xhr.onprogress && onProgress) {
                xhr.onprogress = (e: any) => {
                    opt?.onProgress(e);
                }
            }
            xhr.send(formData);
        });
    }

// export type FileItem = {
//     name?: string;
//     status?: 'uploading' | 'done' | 'error' | 'removed';
//     percent?: number;
//     url?: string;
//     response?: string;
//     file?: File; // 原生文件对象，用于上传
//     type?: string;
// };

export type FileUploadProps = {
    className?: string;
    fileList?: any[];
    showUploadList?: boolean;
    url?: any;
    data?: any;
    customRequest?: (params: any) => void;
    onDel?: (fileItem: any, fileItems: any[]) => void;
    onSuccess?: (params: any) => void;
    onError?: (params: any) => void;
    onProgress?: (e: any, fileItem: any, fileItems: any[]) => void;
    onBeforeRequest?: (params: any) => void;
    method?: string | null;
    headers?: any;
    name?: string | null;
    withCredentials?: boolean;
    onBeforeUpload?: (fileItem: any, fileItems: any[]) => void;
    onChange?: (fileItems: any[]) => void;
    children?: ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = props => {
    const {
        className,
        // fileList,
        showUploadList,
        url,
        data,
        customRequest,
        onDel,
        onSuccess,
        onError,
        onProgress,
        onBeforeRequest,
        method,
        headers, 
        name, 
        withCredentials,
        onBeforeUpload,
        onChange,
        children
    } = props;

    const [fileList, setFileList] = useState(props.fileList || [])

    const inputRef = useRef<any>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const { files } = e.target;
        hanldeUploadFileList(files);
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (inputRef.current) {
            inputRef.current.click();
        }
    }

    const handleDelClick = (fileItem: any, index: number) => {
        return (e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => {
            e.preventDefault();
            const newFileList = fileList.filter((list, key) => {
                return index !== key;
            });
            if (!('fileList' in props)) {
                setFileList(newFileList);
            }
            onDel?.(fileItem, newFileList);
            onChange?.(newFileList);
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        hanldeUploadFileList(files);
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }

    const hanldeUploadFileList = (files: FileList | null | undefined) => {
        if (!files) {
            return;
        }
        const arr: any[] = [];
        for (let i = 0; i < files.length; i++) {
            arr.push({
                name: files[i].name,
                status: 'uploading',
                percent: 0,
                url: null,
                response: null,
                file: files[i],
                type: files[i].type
            });
        }
        promiseFileItems(arr);
    }

    const promiseFileItems = (fileItems: any[]) => {
        const promises = fileItems.map((fileItem: any) => {
            // console.log('file', file);
            return sendFileItems(fileItem, fileItems);
        });
        Promise.all(promises).then(pmf => {
            const prvFileItems = fileItems;
            const currentFileItems: any[] = [];
            pmf.forEach((item: any) => {
                if (item !== false && item.file) {
                    sendFileItem(item);
                    currentFileItems.push(item.file);
                }
            });
            const newFileList = [...prvFileItems, ...currentFileItems];
            if (!('fileList' in props)) {
                setFileList(newFileList);
            }
            onChange?.(newFileList);
        });
    }

    const sendFileItems = async (fileItem: any, fileItems: any[]) => {
        let result;
        if (onBeforeUpload) {
            try {
                result = await onBeforeUpload(fileItem, fileItems);
                console.log('result', result);
            } catch (e) {
                result = null;
            }
            if (!result) {
                return null;
            }
        }
        let actionUrl = url;
        if (typeof url === 'function') {
            actionUrl = await url(fileItem);
        }
        let bodyData = data;
        if (typeof bodyData === 'function') {
            bodyData = await bodyData(fileItem);
        }
        return {
            fileList: fileItems,
            // file: fileItem.file,
            fileItem,
            url: actionUrl,
            data: bodyData
        };
    }

    const sendFileItem = (params: any) => {
        if (onBeforeRequest) {
            onBeforeRequest(params);
        }
        const options = {
            url: params.url,
            data: params.data,
            fileList: params.fileList,
            file: params.fileItem.file,
            name,
            fileItem: params.fileItem,
            headers: headers || {},
            withCredentials,
            method: method || 'POST',
            onProgress: (e: any) => {
                handleProgress(e, params);
            },
            onSuccess: (ret: any, xhr: XMLHttpRequest) => {
                handleSuccess(ret, params, xhr);
            },
            onError: (err: any, ret: any) => {
                handleError(err, ret, params);
            },
        };
        (customRequest || defaultRequest)(options);
    }

    const handleProgress = (e: any, params: any) => {
        const { fileItem } = params;
        const { loaded, total } = e;
        fileItem.status = 'uploading';
        fileItem.percent = loaded / total;
        let newFileList = [...fileList];
        if (!('fileList' in props)) {
            setFileList(newFileList);
        }
        onProgress?.(e, fileItem, newFileList);
        onChange?.(newFileList);
    }

    const handleSuccess = (ret: any, params: any, xhr: XMLHttpRequest) => {
        const { fileItem } = params;
        try {
            if (typeof ret === 'string') {
                ret = JSON.parse(ret);
            }
        } catch (e) {
        }
        fileItem.response = ret;
        fileItem.xhr = xhr;
        fileItem.percent = 100;
        fileItem.status = 'done';
        const newFileList = [...fileList];
        if (!('fileList' in props)) {
            setFileList(newFileList);
        }
        onSuccess?.(newFileList);
        onChange?.(newFileList);
    }

   const  handleError = (err: any, ret: any, params: any) => {
        const { filItems } = params;
        filItems.error = err;
        filItems.response = ret;
        filItems.status = 'error';
        const newFileList = [...fileList];
        if (!('fileList' in props)) {
            setFileList(newFileList);
        }
        onError?.(newFileList);
        onChange?.(newFileList);
    }

    const renderUploadList = () => {
        if (!showUploadList) {
            return null;
        }
        return (
            <div className={`${CLASSNAME}-file-upload-list`}>
                <div className={`${CLASSNAME}-file-upload-list-content`}></div>
                {
                    fileList.map((item, index) => {
                        return (
                            <div key={index} className={`${CLASSNAME}-file-upload-list-item`}>
                                <div className={`${CLASSNAME}-file-upload-list-item-info`}>
                                    <span className={`${CLASSNAME}-file-upload-list-item-info-list`}>
                                        <div className={`${CLASSNAME}-file-upload-list-item-info-icon`}>
                                            {
                                                item.status === 'uploading' ? (
                                                    <span className={`${CLASSNAME}-file-upload-antion-loading`}>
                                                        <svg viewBox="0 0 1024 1024" focusable="false" data-icon="loading" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                                            <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
                                                        </svg>
                                                    </span>
                                                ) : (
                                                    <span className={`${CLASSNAME}-file-upload-list-item-info-anticon`}>
                                                        <svg viewBox="64 64 896 896" focusable="false" data-icon="paper-clip" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                                            <path d="M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z"></path>
                                                        </svg>
                                                    </span>
                                                )
                                            }
                                        </div>
                                        <a target="_blank" rel="noopener noreferrer" className={`${CLASSNAME}-file-upload-list-item-info-name`} title={item.name} href={item.url}>{item.name}</a>
                                        <span className={`${CLASSNAME}-file-upload-list-item-info-action`} onClick={handleDelClick(item, index)}>
                                            <a title={item.name} className={`${CLASSNAME}-file-upload-list-item-info-oper`}>
                                                <svg viewBox="64 64 896 896" focusable="false" data-icon="delete" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                                    <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"></path>
                                                </svg>
                                            </a>
                                        </span>
                                    </span>
                                </div>
                                <div className={`${CLASSNAME}-file-upload-list-item-progress`}>
                                    {
                                        item.status === 'uploading' ? (
                                            <>
                                                <div className={`${CLASSNAME}-file-upload-list-item-progress-outer`}>
                                                    <div className={`${CLASSNAME}-file-upload-list-item-progress-inner`}>
                                                        <div className={`${CLASSNAME}-file-upload-list-item-progress-bg`} style={{ width: (item.percent * 100).toFixed(0) + '%' }}></div>
                                                    </div>
                                                </div>
                                                <div className={`${CLASSNAME}-file-upload-list-item-progress-text`}></div>
                                            </>
                                        ) : null
                                    }
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }

    const cls = [`${CLASSNAME}-file-upload-container`];
    if (className) {
        cls.push(className);
    }

    return (
        <div className={cls.join(' ')}>
            <div 
                className={`${CLASSNAME}-file-upload-inner`}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    className={`${CLASSNAME}-file-upload-input`}
                    // {...inputOther}
                    ref={inputRef}
                    type="file"
                    onChange={handleChange}
                />
                {children}
            </div>
            {renderUploadList()}
        </div>
    );
}