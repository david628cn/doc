// n * boxWidth + (n + 1) * d = width

// const idPool: any = {};

// export const idToRgba = (id: string) => {
//     return id.split("-");
// }

// export const rgbaToId = (rgba: [number, number, number, number]) => {
//     return rgba.join("-");
// }

// export const createId = () => {
//     let id = createOnceId();
//     while (idPool[id]) {
//         id = createOnceId();
//     }
//     return id;
// }

// export const createOnceId = () => {
//     return Array(3)
//         .fill(0)
//         .map(() => Math.ceil(Math.random() * 255))
//         .concat(255)
//         .join("-");
// }


/**
 * 提取出K线图X轴日期列表
 * @param input 日期列表
 * @param showcount 显示的K线根数
 * @param kline_type K线图类型
 * @returns 
 */
export const getKlineDateList = (data: any, {
    width,
}: any) => {
    const dateWidth = 52;
    const fontNumberWidth = 52;
    const count = data.length;
    let rs: Array<any> = [];
    let dw = dateWidth * 1.8; //日期宽度,留有空白
    let kWidth = (width - fontNumberWidth) / count; //柱子宽度

    let datestr = data[0]['date'].substring(0, 7);
    let linejoinWidth = 0;

    for (let i = 0; i < data.length; i++) {
        let str = data[i]['date'].substring(0, 7);
        if (str !== datestr) {
            if ((kWidth * i - linejoinWidth) >= (dw / 2)) {
                rs.push({
                    date: str,
                    index: i
                });
                linejoinWidth = kWidth * i + (dw / 2);
                datestr = str;
            }
        }
    }

    //判断后面能不能显示下日期
    if (rs.length > 0) {
        const afterWidth = kWidth * (count - rs[rs.length - 1].index);
        if (afterWidth < dw / 2) {
            rs = rs.slice(0, rs.length - 1);
        }
    }

    return rs;
}


/**
 * 修整坐标数字+0.5
 */
export const axisIntAdd = (v: number) => {
    return Math.trunc(v) + 0.5;
}

/**
 * 获取最小值和最大值平分的数字数组
 * @param minNumber 最小值
 * @param maxNumber 最大值
 * @param seg 平分数量 >=0
 * @param avg 指定中间值
 */
export const getCoordinateSplitArray = (minNumber: number, maxNumber: number, coordinateSplit: number, avg?: number) => {
    let arr: Array<any> = [];
    let min = minNumber;
    let max = maxNumber;
    if (min > max) {
        min = maxNumber;
        max = minNumber;
    }
    if (avg === undefined || avg === null) {
        arr.push(min);
        for (let i = 0; i < coordinateSplit; i++) {
            arr.push(
                (max - min) / (coordinateSplit + 1) * (i + 1) + min
            );
        }
        arr.push(max);
    } else {
        const maxspan = Math.max(Math.abs(max - avg), Math.abs(min - avg));
        max = avg + maxspan;
        min = avg - maxspan;

        if (coordinateSplit === 0) {
            arr.push(min);
            arr.push(avg);
            arr.push(max);
        } else {
            arr = arr.concat(getCoordinateSplitArray(min, avg, coordinateSplit)).slice(0, arr.length - 1).concat(getCoordinateSplitArray(avg, max, coordinateSplit));
        }
    }
    return arr;
}

/**
 * 获取最小值，最大值，中间值，平分之后的数组，考虑小数点数误差
 */
export const getCoordinateSplitArrayWithDecimal = (min: number, max: number, average: number, split: number, decimal: number) => {
    let ylist = getCoordinateSplitArray(min, max, split, average);

    let wc = false;

    do {
        wc = false;
        //判断tofixed误差是否超过阈值
        let wc_value = Math.abs(ylist[1] - ylist[0]);
        let show_wc_value = Math.abs(dealFloatDecimal(ylist[1], decimal) - ylist[1]);
        if (show_wc_value / wc_value > 0.05) wc = true;

        if (wc) {
            max = dealFloatDecimal(max + Math.pow(10, -decimal), decimal);
            min = dealFloatDecimal(min - Math.pow(10, -decimal), decimal);
            ylist = getCoordinateSplitArray(min, max, split, average);
        }
    } while (wc)

    let list = ylist.map(v => {
        return {
            price: parseFloat(v.toFixed(decimal)),
            percent: ((v - average) / average * 100).toFixed(2) + '%'
        };
    })

    return list;
}

/**
 * 解决浮点数操作丢失精度问题
 * @param input 
 * @param decimal 
 * @returns 
 */
export const dealFloatDecimal = (input: number, decimal: number) => {
    return parseFloat(input.toFixed(decimal));
}

/** 前pre日之和 */
export const getSum = (klines: any, callback: Function, thisindex: number, pre: number) => {
    const arr = klines.filter((v: any, index: number) => {
        return index <= thisindex && index > (thisindex - pre);
    }).map((v: any) => {
        return callback(v);
    })
    return arr.reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0);
}

/** 简单平均 */
export const getMa = (klines: any, callback: Function, thisindex: number, pre: number) => {
    return getSum(klines, callback, thisindex, pre) / pre;
}

/**
 * 计算价格均线
 * @param data 
 * @returns 
 */
export const getMaByClose = (klines: Array<any> = []) => {
    return klines.map((v: any, index: number) => {
        let ma5: number | string = '-';
        if (index >= 5) {
            ma5 = getMa(
                klines,
                (v2: any) => {
                    return v2.current || v2.close;
                },
                index,
                5
            );
        }
        let ma10: number | string = '-';
        if (index >= 10) {
            ma10 = getMa(
                klines,
                (v2: any) => {
                    return v2.current || v2.close;
                },
                index,
                10
            );
        }
        let ma20: number | string = '-';
        if (index >= 20) {
            ma20 = getMa(
                klines,
                (v2: any) => {
                    return v2.current || v2.close;
                },
                index,
                20
            );
        }
        let ma30: number | string = '-';
        if (index >= 30) {
            ma30 = getMa(
                klines,
                (v2: any) => {
                    return v2.current || v2.close;
                },
                index,
                30
            );
        }
        let ma60: number | string = '-';
        if (index >= 60) {
            ma60 = getMa(
                klines,
                (v2: any) => {
                    return v2.current || v2.close;
                },
                index,
                60
            );
        }
        return [
            v.date,
            ma5,
            ma10,
            ma20,
            ma30,
            ma60
        ];
    });
}

/**
 * 计算成交量均线
 * @param data 
 * @returns 
 */
export const getMaByVolume = (klines: Array<any> = []) => {
    return klines.map((v: any, index: number) => {
        let ma5: number | string = '-';
        if (index >= 5) {
            ma5 = getMa(
                klines,
                (v2: any) => {
                    return v2.volume;
                },
                index,
                5
            )
        }

        let ma10: number | string = '-';
        if (index >= 10) {
            ma10 = getMa(
                klines,
                (v2: any) => {
                    return v2.volume;
                },
                index,
                10
            )
        }

        return [
            v.date,
            ma5,
            ma10
        ]
    });
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