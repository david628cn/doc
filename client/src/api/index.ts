import request from './request';

// const contextPath = '';
const contextPath = 'http://127.0.0.1:8000';

export const login = async (params: any) => {
    const result = await request.post({
        url: `${ contextPath }/oauth/login`,
        data: JSON.stringify(params)
    });
    return result;
}

export const loginOut = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/oauth/logout`,
        data: JSON.stringify(params)
    });
    return result;
}

export const addProject = async (params: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/project/create`,
        data: JSON.stringify(params)
    });
    return result;
}

export const listProject = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/project/list`,
        data: params
    });
    return result;
}

export const delProject = async (params: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/project/delete`,
        data: JSON.stringify(params)
    });
    return result;
}

export const addStock = async (params: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/stock/add`,
        data: JSON.stringify(params)
    });
    return result;
}

export const listStock = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/stock/list`,
        data: JSON.stringify(params)
    });
    return result;
}

export const listMinStocks = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/listMinStocks`,
        data: params
    });
    return result;
}

export const syncStock = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/sync`,
        data: params
    });
    return result;
}

export const syncAllStock = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/syncAll`,
        data: params
    });
    return result;
}

export const syncBatStock = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/syncBat`,
        data: params
    });
    return result;
}

// export const addStockDict = async (params: any) => {
//     const result = await request.post({
//         url: `${ contextPath }/api/stockDict/add`,
//         data: JSON.stringify(params)
//     });
//     return result;
// }

// export const listStockDict = async (params?: any) => {
//     const result = await request.get({
//         url: `${ contextPath }/api/stockDict/list`,
//         data: params
//     });
//     return result;
// }

export const listStockDict = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/stock/dict`,
        data: JSON.stringify(params)
    });
    return result;
}

export const listStockTrade = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/stock/trade`,
        data: JSON.stringify(params)
    });
    return result;
}

export const stockToJson = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/json`,
        data: params
    });
    return result;
}

export const listStockDoshboard = async (params?: any) => {
    const result = await request.get({
        url: `${ contextPath }/api/stock/doshboard`,
        data: params
    });
    return result;
}

export const taskStart = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/task/start`,
        data: JSON.stringify(params)
    });
    return result;
}

export const taskStop = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/task/stop`,
        data: JSON.stringify(params)
    });
    return result;
}

export const taskReStart = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/task/reStart`,
        data: JSON.stringify(params)
    });
    return result;
}


export const listFiles = async (params?: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/files/list`,
        data: JSON.stringify(params)
    });
    return result;
}

export const delFiles = async (params: any) => {
    const result = await request.post({
        url: `${ contextPath }/api/files/delete`,
        data: JSON.stringify(params)
    });
    return result;
}