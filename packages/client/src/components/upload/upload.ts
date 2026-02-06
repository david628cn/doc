import SparkMD5 from 'spark-md5';
import { runTasks } from './tasksPools';

const doRequest = (options: any = {}) => {
    const {
        url,
        method = 'POST',
        withCredentials,
        headers = {},
        onSuccess,
        onError,
        data,
        onProgress,
        request
    } = options;
    return new Promise((resolve, reject) => {
        const xhr = request instanceof XMLHttpRequest ? request : new XMLHttpRequest();
        xhr.open(method || 'get', url, true);
        for (let key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }
        if (headers['X-Requested-With'] !== null) {
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        }
        if (withCredentials && 'withCredentials' in xhr) {
            xhr.withCredentials = true;
        }
        xhr.onload = (event: any) => {
            if (xhr.status < 200 || xhr.status >= 300) {
                // onError?.();
                // reject();
                return;
            }
            onSuccess?.(event);
            resolve(event.target.responseText);
        }
        xhr.onerror = (err: any) => {
            onError?.(err);
            reject(err);
        };
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (event: any) => {
                onProgress?.(event);
            }
        }
        if (xhr.onprogress && onProgress) {
            xhr.onprogress = (event: any) => {
                onProgress?.(event);
            }
        }
        xhr.send(data);
    });
}

const sliceFile = (file: File, limit: number) => {
    return Math.ceil(file.size / limit);
}

// const calculateFileMD5 = (file: File) => {
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = (e: any) => {
//             const hash = SparkMD5.ArrayBuffer.hash(e.target.result);
//             resolve(hash);
//         };
//         reader.onerror = () => {
//             reject('Error reading file.');
//         };
//         reader.readAsArrayBuffer(file); // 使用ArrayBuffer来计算MD5，因为FileReader的readAsArrayBuffer方法会读取文件内容到ArrayBuffer中。
//     });
// }

const getMD5 = (file: File, { limit, total }: any) => {
    return new Promise((resolve, reject) => {
        const chunkSize = limit;
        const chunks = total;
        const spark = new SparkMD5.ArrayBuffer();
        const fileReader = new FileReader();
        let currentChunk = 0;
        const loadNext = () => {
            const start = currentChunk * chunkSize
            const end = start + chunkSize >= file.size ? file.size : start + chunkSize
            fileReader.readAsArrayBuffer(file.slice(start, end))
        }
        fileReader.onload = (e: any) => {
            spark.append(e.target.result) // Append array buffer
            currentChunk++;
            if (currentChunk < chunks) {
                loadNext();
            } else {
                resolve(spark.end());
            }
        }
        fileReader.onerror = (e: any) => {
            reject(e);
        }
        loadNext();
    });

    // const lastIndex = filename.lastIndexOf('.');
    // return filename.substring(0, lastIndex);
    // return new Date().getTime() + '_' + filename;
}

const onCheckChunks = async (file: File, md5: string) => {
    const result = await fetch(`http://127.0.0.1:8000/api/files/checkChunks?filename=${file.name}&md5=${md5}`, {
        cache: 'no-cache',
        headers: {
            'content-type': 'application/json',
            'Authorization': localStorage.getItem('token') || ''
        },
        method: 'GET',
        mode: 'cors'
    }).then(rs => rs.json());
    const { code, data } = result;
    return {
        skip: data.skip || false,
        chunksList: data.uploaded || []
    };
}

const onMergeChunks = async (file: File, md5: string) => {
    const result = await fetch(`http://127.0.0.1:8000/api/files/mergeChunks?filename=${file.name}&md5=${md5}`, {
        cache: 'no-cache',
        headers: {
            'content-type': 'application/json',
            'Authorization': localStorage.getItem('token') || ''
        },
        method: 'GET',
        mode: 'cors'
    }).then(rs => rs.json());
    const { code, data } = result;
    // console.log('result', result);
}

const uploadChunks = async (options: any = {}) => {
    const {
        file,
        limit = 5 * 1024 * 1024,
        ...config
    } = options;

    if (!file) {
        return;
    }
    // const md5 = await calculateFileMD5(file);
    const total = sliceFile(file, limit);
    const md5: any = await getMD5(file, {
        limit,
        total
    });

    const { skip, chunksList }: any = await onCheckChunks(file, md5);

    if (skip) {
        return;
    }

    // const tasks: Array<any> = [];
    // for (let i = 0; i < total; i++) {
    //     const start = i * limit;
    //     const end = (i + 1) * limit > file.size ? file.size : (i + 1) * limit;
    //     let currentFile = file.slice(start, end);
    //     if (!chunksList.includes(i)) {
    //         const chunkNumber = i;
    //         const formData: any = new FormData();
    //         formData.append('file', currentFile);
    //         formData.append('chunkNumber', chunkNumber);
    //         formData.append('md5', md5);
    //         formData.append('filename', file.name);
    //         formData.append('currentChunkSize', currentFile.size);
    //         formData.append('chunkSize', limit);
    //         formData.append('totalSize', file.size);
    //         formData.append('totalChunks', total);
    //         const params = {
    //             ...config,
    //             data: formData
    //         };
    //         // const result = await doRequest(params);
    //         tasks.push({
    //             task: () => doRequest(params)
    //         });
    //         // console.log('上传成功', result);
    //     }
    // }
    // const result = await runTasks(tasks, {
    //     limit: 10,
    //     onProgress: (params: any) => {
    //         console.log('请求完成', params);
    //     }
    // });
    // console.log('上传成功', result);
    // console.log('开始合并', result);
    // onMergeChunks(file, md5);

    for (let i = 0; i < total; i++) {
        const start = i * limit;
        const end = (i + 1) * limit > file.size ? file.size : (i + 1) * limit;
        let currentFile = file.slice(start, end);
        if (!chunksList.includes(i)) {
            const chunkNumber = i;
            const formData: any = new FormData();
            formData.append('file', currentFile);
            formData.append('chunkNumber', chunkNumber);
            formData.append('md5', md5);
            formData.append('filename', file.name);
            formData.append('currentChunkSize', currentFile.size);
            formData.append('chunkSize', limit);
            formData.append('totalSize', file.size);
            formData.append('totalChunks', total);
            const params = {
                ...config,
                data: formData
            };
            const result = await doRequest(params);
            console.log('上传成功', result);
        }
    }
    console.log('开始合并');
    onMergeChunks(file, md5);
}

const upload = (options?: any) => {
    const { type, ...opt } = options;
    if (type === 'chunks') {
        return uploadChunks(opt);
    }
    return doRequest(opt);
}

const UploadFile = (options?: any) => {
    const scope: any = Object.create(null);
    scope.options = Object.assign({}, options);
    scope.upload = (opt?: any) => {
        Object.assign(scope.options, opt);
        scope.request = new XMLHttpRequest();
        return upload({
            ...scope.options,
            request: scope.request
        });
    }
    scope.cancel = () => {
        if (scope.request) {
            scope.request.abort?.();
        }
    }
    scope.resumeUpload = () => {
        scope.upload();
    }
    return scope;
}

export {
    upload,
    UploadFile
};