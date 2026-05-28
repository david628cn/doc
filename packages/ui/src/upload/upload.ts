import SparkMD5 from 'spark-md5';

// --- 通用併發池類型 ---
export type TaskFunction<T = any> = (signal: AbortSignal) => Promise<T>;

export interface TaskPoolOptions<T = any> {
    limit: number;
    retryLimit?: number;
    onProgress?: (data: { index: number; res: T; finishedCount: number }) => void;
    onSuccess?: (results: (T | null)[]) => void;
    onError?: (error: { index: number; err: any; isFinal: boolean }) => void;
    onComplete?: () => void;
}

// --- 上傳業務類型 ---
export interface CheckResult {
    skip: boolean;
    uploadedList: number[];
    file?: any;
}

export interface UploadChunkParams {
    chunk: Blob;
    index: number;
    hash: string;
    signal: AbortSignal;
    data?: any;
}

export interface UploaderOptions {
    file: File;
    limit?: number;
    chunkSize?: number;
    retry?: number;
    onCheck?: (hash: string, file: File) => Promise<CheckResult>;
    onUpload?: (params: UploadChunkParams) => Promise<any>;
    onMerge?: (hash: string, file: File) => Promise<any>;
    onProgress?: (data: { type: 'hash' | 'uploading'; percent: number }) => void;
    onSuccess?: (res: any) => void;
    onError?: (err: any) => void;
    onComplete?: () => void;
}

/**
 * 1. 非阻塞增量 Hash 計算
 */
export const getHashIncremental = (
    file: File,
    chunkSize: number,
    onProgress?: (percent: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const total = Math.ceil(file.size / chunkSize);
        const spark = new SparkMD5.ArrayBuffer();
        const reader = new FileReader();
        let current = 0;

        const loadNext = () => {
            const start = current * chunkSize;
            const end = Math.min(file.size, start + chunkSize);
            reader.readAsArrayBuffer(file.slice(start, end));
        };

        reader.onload = (e: any) => {
            spark.append(e.target.result);
            current++;
            onProgress?.(Number(((current / total) * 100).toFixed(2)));

            if (current < total) {
                (window as any).requestIdleCallback
                    ? requestIdleCallback(() => loadNext())
                    : setTimeout(loadNext, 0);
            } else {
                resolve(spark.end());
            }
        };
        reader.onerror = () => reject(new Error('Hash calculation failed'));
        loadNext();
    });
};

/**
 * 2. 通用併發池調度器
 */
export const createTaskPool = () => {
    let tasksQueue: any[] = [];
    let controllers: Map<number, AbortController> = new Map();
    let isPaused = false;
    let finishedCount = 0;
    let results: any[] = [];

    const _drive = async (poolOptions: TaskPoolOptions) => {
        if (isPaused || tasksQueue.length === 0 || controllers.size >= poolOptions.limit) {
            return;
        }

        const taskObj = tasksQueue.shift();
        const { index, taskFn, retry } = taskObj;
        const ctrl = new AbortController();
        controllers.set(index, ctrl);

        try {
            const res = await taskFn(ctrl.signal);
            controllers.delete(index);
            finishedCount++;
            results[index] = res;

            poolOptions.onProgress?.({ index, res, finishedCount });

            if (tasksQueue.length === 0 && controllers.size === 0) {
                poolOptions.onSuccess?.(results);
                poolOptions.onComplete?.();
            }
        } catch (err: any) {
            controllers.delete(index);
            if (err.name === 'AbortError') return;

            if (retry < (poolOptions.retryLimit || 3)) {
                taskObj.retry++;
                tasksQueue.unshift(taskObj);
                setTimeout(() => _drive(poolOptions), 1000);
            } else {
                results[index] = err;
                poolOptions.onError?.({ index, err, isFinal: true });
                _drive(poolOptions);
            }
        }
        _drive(poolOptions);
    };

    return {
        run: <T>(tasks: TaskFunction<T>[], options: TaskPoolOptions<T>) => {
            isPaused = false;
            const startIdx = results.length;
            const formatted = tasks.map((fn, i) => ({ index: startIdx + i, taskFn: fn, retry: 0 }));
            tasksQueue.push(...formatted);
            results.push(...new Array(tasks.length).fill(null));
            for (let i = 0; i < options.limit; i++) _drive(options);
        },
        pause: () => { isPaused = true; controllers.forEach(c => c.abort()); controllers.clear(); },
        resume: (options: TaskPoolOptions) => { isPaused = false; for (let i = 0; i < options.limit; i++) _drive(options); },
        cancel: () => { isPaused = true; tasksQueue = []; controllers.forEach(c => c.abort()); controllers.clear(); results = []; finishedCount = 0; }
    };
};

/**
 * 将对象转换为 URL 查询字符串
 */
export const objectToQueryString = (obj: Record<string, any> = {}): string => {
    const params = new URLSearchParams();
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
            params.append(key, String(obj[key]));
        }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

/**
 * 將 URL 查詢字符串或完整 URL 轉換為物件
 * @param urlOrQuery '?hash=123&name=test' 或 'http://xxx.com'
 */
export const queryStringToObject = (urlOrQuery: string): Record<string, string> => {
    // 如果傳入的是完整 URL，URLSearchParams 會自動處理問號後面的部分
    const params = new URLSearchParams(
        urlOrQuery.includes('?') ? urlOrQuery.split('?')[1] : urlOrQuery
    );

    const obj: Record<string, string> = {};

    // 遍歷所有鍵值對
    params.forEach((value, key) => {
        obj[key] = value;
    });

    return obj;
};



export const createUploadRequests = (config: {
    baseUrl?: string,
    headers?: () => Record<string, string>,
    // data?: Record<string, any>
    onCheck?: Function,
    onUpload?: Function
    onMerge?: Function

}) => {
    // const getHeaders = () => ({
    //     // 'Authorization': localStorage.getItem('token') || '',
    //     ...config.headers?.()
    // });

    return {
        onCheck: config?.onCheck,
        onUpload: config?.onUpload,
        onMerge: config?.onMerge
    };
};

export const createUploader = (globalOptions: Partial<UploaderOptions> = {}) => {
    const pool = createTaskPool();
    let currentConf: Required<UploaderOptions>;
    let fileHash = '';

    const start = async (localOptions: UploaderOptions) => {
        // 合併配置並強制斷言為必填，解決 TS undefined 報錯
        currentConf = {
            limit: 3,
            chunkSize: 5 * 1024 * 1024,
            retry: 3,
            ...globalOptions,
            ...localOptions
        } as Required<UploaderOptions>;

        try {
            // 1. Hash 計算
            fileHash = await getHashIncremental(currentConf.file, currentConf.chunkSize, (percent) => {
                currentConf.onProgress?.({ type: 'hash', percent });
            });

            // 2. 預檢
            const { skip, uploadedList, file, ...rst } = await currentConf.onCheck(fileHash, currentConf.file);
            
            if (skip) {
                currentConf.onProgress?.({ type: 'uploading', percent: 100 });
                return currentConf.onSuccess?.({
                    ...rst,
                    // code: 200,
                    data: file
                });
            }

            // 3. 併發上傳
            const total = Math.ceil(currentConf.file.size / currentConf.chunkSize);
            const tasks = [];
            for (let i = 0; i < total; i++) {
                if (uploadedList.includes(i)) continue;
                tasks.push((signal: AbortSignal) => currentConf.onUpload({
                    chunk: currentConf.file.slice(i * currentConf.chunkSize, Math.min(currentConf.file.size, (i + 1) * currentConf.chunkSize)),
                    index: i,
                    hash: fileHash,
                    signal
                }));
            }

            pool.run(tasks, {
                limit: currentConf.limit,
                retryLimit: currentConf.retry,
                onProgress: ({ finishedCount }) => {
                    const percent = Number((((uploadedList.length + finishedCount) / total) * 100).toFixed(2));
                    currentConf.onProgress?.({ type: 'uploading', percent });
                },
                onSuccess: async () => {
                    const res = await currentConf.onMerge(fileHash, currentConf.file);
                    currentConf.onSuccess?.(res);
                },
                onError: (err) => currentConf.onError?.(err),
                onComplete: currentConf.onComplete
            });
        } catch (err) {
            currentConf.onError?.(err);
        }
    };

    return { start, pause: pool.pause, resume: () => pool.resume(currentConf as any), cancel: pool.cancel };
};

// --- 使用範例 ---
// const avatarRequests = createUploadRequests({
//     baseUrl: 'http://example.com',
//     data: { type: 'avatar' }
// });

// const uploader = createUploader({ limit: 5 });

// uploader.start({
//     file: someFile,
//     ...avatarRequests, // 展開請求配置
//     onProgress: (p) => console.log(`${p.type === 'hash' ? '校驗' : '上傳'}中: ${p.percent}%`),
//     onSuccess: (res) => console.log('完成', res)
// });