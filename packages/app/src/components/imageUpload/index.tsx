
import {
    ImageUpload as ImageUploadBase,
    createUploader
} from '@carvy/ui';
import { checkFile, uploadFile, mergeFile, imageBasePath } from '@/api';
import { useState } from 'react';

export type ImageUploadProps = {
    onChange?: (v: any) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = props => {
    const {
        onChange
    } = props;

    const [percent, setPercent] = useState(0);

    const handleUpload = (file: File) => {
        return new Promise((resolve, reject) => {
            const uploader = createUploader({
                limit: 4
            })
            uploader.start({
                file,
                onCheck: async (hash: string, file: File) => {
                    const res = await checkFile({
                        hash,
                        filename: file.name,
                        related_type: 'avatar'
                    });
                    return {
                        skip: res.data.skip,
                        uploadedList: res.data.uploaded || [],
                        file: res.data.file
                    }
                },
                onUpload: (params) => uploadFile(params, {
                    related_type: 'avatar'
                }),
                onMerge: (hash: string, file: File) => mergeFile({
                    hash,
                    filename: file.name,
                    related_type: 'avatar'
                }),
                onProgress: (p) => {
                    if (p.type === 'uploading') {
                        setPercent(p.percent);
                    }
                },
                onSuccess: (res) => {
                    if (res.data) {
                        setPercent(0);
                        resolve(null);
                        onChange?.({
                            value: `${imageBasePath}/${res.data?.path}`
                        });
                    }
                }
            });
        });
    }

    return <ImageUploadBase
        percent={percent}
        onUpload={handleUpload}
    ></ImageUploadBase>;
}