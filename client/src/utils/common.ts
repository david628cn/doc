export const formatCurrency = (amount: any = 0, fix: number = 0) => {
    let [integerPart, decimalPart] = amount.toString().split('.');
    let formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decimalPart === undefined) {
        return formattedInteger;
    }
    return `${formattedInteger}.${decimalPart}`;
}

export const formatNumberWithUnit = (amount: any = 0, unitsArr?: any) => {
    const sign = amount >= 0 ? 1 : -1;
    const units = unitsArr || ['', '万', '亿'];
    let num = Math.abs(amount);
    let unitIndex = 0;
    while (num >= 10000) {
        num /= 10000;
        unitIndex++;
    }
    num *= sign;
    return num.toFixed(2) + units[unitIndex];
}

export const formatBytes = (bytes: any = 0, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const offsetLimit = (pageNum: any = 1, pageSize: any = 10) => {
    const limit = pageSize
    const offset = (pageNum - 1) * limit
    return {
        offset,
        limit
    }
}

// 不包含end索引无素
export const startEnd = (pageNum: any = 1, pageSize: any = 10) => {
    const start = (pageNum - 1) * pageSize
    const end = start + pageSize
    return {
        start,
        end
    }
}

export const deepClone = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const clone: any = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = deepClone(obj[key]);
        }
    }
    return clone;
}