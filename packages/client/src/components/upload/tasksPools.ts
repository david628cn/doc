// const arr: Array<any> = [];
// for (let i = 0; i < 20; i++) {
//     let promise: any;
//     if (i % 2 === 0) {
//         promise = new Promise((resolve, reject) => {
//             // console.log(`fetch ${ i }`);
//             setTimeout(() => {
//                 resolve(`${ i }-${ new Date().getTime() }`);
//             }, 1000);
//         });
//     } else {
//         promise = new Promise((resolve, reject) => {
//             // console.log(`fetch ${ i }`);
//             setTimeout(() => {
//                 resolve(`${ i }-${ new Date().getTime() }`);
//             }, 2000);
//         });
//     }
//     arr.push(promise);
// }

// interface TasksPoolsProps {

// }

// class TasksPools {
//     tasksQueue = [];
//     options: any;
//     maxCount = 0;
//     count = 0;
//     constructor(props: TasksPoolsProps) {
//         this.options = Object.assign({
//             tasks: []
//         }, props);
//     }
//     setTasks(tasks: any) {
//         this.options.tasks = [];
//         this.push(tasks);
//     }
//     push(task: any) {
//         let tasks = task;
//         if (!Array.isArray(task)) {
//             tasks = [task];
//         }
//         for (let i = 0; i < tasks.length; i++) {
//             this.options.tasks.push(tasks[i]);
//         }
//     }
//     runTask(task: any, index: number) {
//         task.then((rs: any) => {
//             this.options.onProgress?.({
//                 // index,
//                 response: rs
//             });
//             return rs;
//         }).catch((rs: any) => {
//             this.options.onProgress?.({
//                 // index,
//                 response: rs
//             });
//             return rs;
//         }).finally((rs: any) => {
//             this.maxCount++;
//             this.count++;
//             this.runTasks();
//         });
//     }
//     runTasks() {
//         if (this.count >= this.options.tasks.length) {
//             // console.log('请求全部完成', this.maxCount, this.tasksQueue.length, this.count);
//             this.options.onComplete?.();
//             return;
//         }
//         const len = Math.min(this.maxCount, this.tasksQueue.length);        
//         for (let i = 0; i < len; i++) {
//             const task = this.tasksQueue.shift();
//             this.maxCount--;
//             this.runTask(task, i);
//         }
//     }
//     start() {
//         console.log('start>>>');
//         this.tasksQueue = this.options.tasks.slice();
//         this.maxCount = this.options.limit;
//         this.count = 0;
//         this.runTasks();
//         console.log('end>>>');
//     }
// }

// const fp = new FetchPools({
//     limit: 10,
//     tasks: arr,
//     onProgress: (params) => {
//         console.log('请求完成', params.response);
//     },
//     onComplete: () => {
//         console.log('请求全部完成');
//     }
// });
// // fp.setTasks(arr);
// fp.start();

const tasksPools = (tasks: Array<any>, options: any = {
    limit: 10
}) => {
    let count = 0;
    let maxCount = options.limit;
    let tasksQueue = tasks.slice();
    let total = tasks.length;
    const runTask = (task: any, index: number) => {
        task.task().then((rs: any) => {
            options.onProgress?.({
                // index,
                response: rs
            });
            return rs;
        }).catch((rs: any) => {
            options.onError?.({
                // index,
                response: rs
            });
            return rs;
        }).finally((rs: any) => {
            maxCount++;
            count++;
            runTasks();
        });
    }
    const runTasks = () => {
        if (count >= total) {
            options.onComplete?.();
            return;
        }
        const len = Math.min(maxCount, tasksQueue.length);        
        for (let i = 0; i < len; i++) {
            const task = tasksQueue.shift();
            maxCount--;
            runTask(task, i);
        }
    }
    runTasks();
}

// tasksPools(arr, {
//     limit: 10,
//     onProgress: (params) => {
//         console.log('请求完成', params.response);
//     },
//     onComplete: () => {
//         console.log('请求全部完成');
//     }
// });

const runTasks = (task: any, options?: any) => {
    const tasks = Array.isArray(task) ? task : [task];
    return new Promise((resolve, rejects) => {
        tasksPools(tasks, {
            limit: options?.limit,
            onProgress: (params: any) => {
                options?.onProgress?.(params);
            },
            onComplete: (params: any) => {
                options?.onComplete?.(params);
                resolve(params);
            }
        });
    });
}

export {
    // TasksPools,
    tasksPools,
    runTasks
};