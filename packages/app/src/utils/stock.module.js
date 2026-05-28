// https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=1000&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:1+t:2&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171517

// let DATA_JSON = [];

export const reqMainStock = () => {
    return fetch(`https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=5000&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:1+t:2&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171517`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
            'Content-Type': 'text/html',
            // 'Access-Control-Allow-Origin': '*',
            // 'Access-Control-Allow-Credentials': true
        }
    }).then(rs => rs.text()).then(rs => {
        const str = rs.replace(/^.+\(/, '').replace(/\);$/, '');
        return JSON.parse(str);
    }).then(rs => {
        // DATA_JSON = rs.data.diff;
        return rs.data.diff;
    });
}

export const reqSaveStock = (stock) => {
    return fetch('/api/stock/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: stock.code,
            name: stock.name
        })
    }).then(res => res.json());
}

export const reqSaveAStock = (stock) => {
    return fetch('/api/astock/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(stock)
    }).then(res => res.json());
}

export const reqSaveKlines = (klines) => {
    return fetch('/api/klines/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(klines)
    }).then(res => res.json());
}

export const getKlineDataByParams = async ({
    secid
}) => {
    const date = new Date();
    const end_yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    return fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${ secid }&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=${ end_yyyymmdd }&lmt=210&cb=quote_jp1`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
            'Content-Type': 'text/html',
            // 'Access-Control-Allow-Origin': '*',
            // 'Access-Control-Allow-Credentials': true
        }
    }).then(rs => rs.text()).then(rs => {
        const str = rs.replace(/^quote_jp1\(/, '').replace(/\);$/, '');
        return JSON.parse(str);
    });
}

export const getQtClist = async ({
    pageNum
}) => {
    return fetch(`https://push2.eastmoney.com/api/qt/clist/get?np=1&fltt=1&invt=2&cb=jQuery371035501021617052775_1745421375385&fs=m%3A0%2Bt%3A6%2Cm%3A0%2Bt%3A80%2Cm%3A1%2Bt%3A2%2Cm%3A1%2Bt%3A23%2Cm%3A0%2Bt%3A81%2Bs%3A2048&fields=f12%2Cf13%2Cf14%2Cf1%2Cf2%2Cf4%2Cf3%2Cf152%2Cf5%2Cf6%2Cf7%2Cf15%2Cf18%2Cf16%2Cf17%2Cf10%2Cf8%2Cf9%2Cf23&fid=f3&pn=${pageNum}&pz=20&po=1&dect=1&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&_=1745421375446`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
            'Content-Type': 'text/html',
            // 'Access-Control-Allow-Origin': '*',
            // 'Access-Control-Allow-Credentials': true
        }
    }).then(rs => rs.text()).then(rs => {
        const str = rs.replace(/^.+\(/, '').replace(/\);$/, '');
        return JSON.parse(str);
    }).then(rs => {
        // DATA_JSON = rs.data.diff;
        return {
            list: rs.data.diff,
            total: rs.data.total
        };
    });
}

export const saveStocks = async (DATA_JSON) => {
    for (let i = 0; i < DATA_JSON.length; i++) {
        await reqSaveStock({
            code: DATA_JSON[i].f12,
            name: DATA_JSON[i].f14
        })
    }
}

export const saveKlines = async (DATA_JSON) => {
    for (let i = 0; i < DATA_JSON.length; i++) {
        const { data } = await getKlineDataByParams({
            secid: `${ DATA_JSON[i].f13 }.${ DATA_JSON[i].f12 }`
        });
        if (data) {
            const {
                code,
                name,
                klines
            } = data;
            for (let j = 0; j < klines.length; j++) {
                const kl = klines[j];
                const klArr = kl.split(',');
                await reqSaveKlines({
                    code,
                    name,
                    // type: DATA_JSON[i].f13,
                    date: klArr[0],
                    open: klArr[1],
                    last: klArr[2],
                    max: klArr[3],
                    min: klArr[4],
                    quantity: klArr[5], // 成交量
                    volume: klArr[6], // 成交额
                    amplitude: klArr[7] * 100, // 振幅
                    price: klArr[8] * 100, // 涨跌幅
                    amount: klArr[9], // 涨跌额
                    turnover: klArr[10] * 100, // 换手率
                });
            }
        }
    }
}

export const getMinStocks = async (DATA_JSON) => {
    // await reqMainStock();
    const rs = [];
    const currentDate = new Date().getTime();
    console.log('开始...');
    for (let i = 0; i < DATA_JSON.length; i++) {
        const { data } = await getKlineDataByParams({
            secid: `${ DATA_JSON[i].f13 }.${ DATA_JSON[i].f12 }`
        });
        if (data) {
            const {
                code,
                name,
                klines
            } = data;
            let min = 999999;
            let max = 0;
            let stock = {
                code: code,
                name: name
            };
            for (let j = 0; j < klines.length; j++) {
                const kl = klines[j];
                const klArr = kl.split(',');
                if (min >= parseFloat(klArr[4])) {
                    stock.minest = parseFloat(klArr[4]);
                    stock.minDate = klArr[0];
                    min = klArr[4];
                }
                // if (max <= klArr[3]) {
                // 	stock.max = klArr[3];
                // 	stock.maxDate = klArr[0];
                // 	max = klArr[3];
                // }
                // await reqSaveKlines({
                // 	code,
                // 	name,
                // 	date: klArr[0],
                // 	open: klArr[1],
                // 	last: klArr[2],
                // 	max: klArr[3],
                // 	min: klArr[4],
                // 	quantity: klArr[5], // 成交量
                // 	volume: klArr[6], // 成交额
                // 	amplitude: klArr[7] * 100, // 振幅
                // 	price: klArr[8] * 100, // 涨跌幅
                // 	amount: klArr[9], // 涨跌额
                // 	turnover: klArr[10] * 100, // 换手率
                // });
            }
            stock.current = DATA_JSON[i]['f2'] === '-' ? 0 : DATA_JSON[i]['f2'];
            stock.price = DATA_JSON[i]['f3'] === '-' ? 0 : DATA_JSON[i]['f3'];
            stock.increasei = DATA_JSON[i]['f4'] === '-' ? 0 : DATA_JSON[i]['f4'];
            stock.turnover = DATA_JSON[i]['f5'] === '-' ? 0 : DATA_JSON[i]['f5'];
            stock.volume = DATA_JSON[i]['f6'] === '-' ? 0 : DATA_JSON[i]['f6'];
            stock.amplitude = DATA_JSON[i]['f7'] === '-' ? 0 : DATA_JSON[i]['f7'];
            stock.high = DATA_JSON[i]['f15'] === '-' ? 0 : DATA_JSON[i]['f15'];
            stock.low = DATA_JSON[i]['f16'] === '-' ? 0 : DATA_JSON[i]['f16'];
            stock.open = DATA_JSON[i]['f17'] === '-' ? 0 : DATA_JSON[i]['f17'];
            stock.prev = DATA_JSON[i]['f18'];
            stock.turnover_rate = DATA_JSON[i]['f8'];
            stock.pe = DATA_JSON[i]['f9'];
            stock.pb = DATA_JSON[i]['f23'];
            stock.prefix = DATA_JSON[i]['f13'];
            const tenDay = 70 * 24 * 60 * 60 * 1000;
            const d = new Date(stock.minDate).getTime();
            if (currentDate - d <= tenDay && stock.minest >= 2) {
                rs.push(stock);
                // console.log('start save');
                console.table([stock]);
                // await reqSaveAStock(stock);
                // console.log('end save');
            }
        }
    }
    console.log('结束...');
    console.table(rs);
}

export const getMaxMinInDate = async (dj) => {
    const getF13 = (st) => {
        const a = st.f12[0];
        let rs = '0';
        switch (a) {
            case '0':
                rs = '0';
                break;
            case '6':
                rs = '1';
                break;
            default:
                break;
        }
        return rs;
    }
    // const rs = [];
    // const dj = [
    //     {
    //         // name: '恒生电子',
    //         f12: '600570'
    //     }, 
    //     {
    //         // name: '药明康德',
    //         f12: '603259'
    //     },
    //     {
    //         // name: '拓维信息',
    //         f12: '002261'
    //     }, 
    //     {
    //         // name: '星网宇达',
    //         f12: '002829'
    //     }, 
    //     {
    //         // name: '北汽蓝谷',
    //         f12: '600733'
    //     },
    //     {
    //         // name: '国金证券',
    //         f12: '600109'
    //     },
    //     {
    //         // name: '比亚迪',
    //         f12: '002594'
    //     },
    //     {
    //         // name: '神火股份',
    //         f12: '000933'
    //     },
    //     {
    //         // name: '大众交通',
    //         f12: '600611'
    //     },
    //     {
    //         // name: '中公教育',
    //         f12: '002607'
    //     },
    //     {
    //         // name: '农业银行',
    //         f12: '601288'
    //     },
    //     {
    //         // name: '工商银行',
    //         f12: '601398'
    //     },
    //     {
    //         // name: '鲁抗医药',
    //         f12: '600789'
    //     },
    //     {
    //         // name: '深圳华强',
    //         f12: '000062'
    //     },
    //     {
    //         // name: '酒鬼酒',
    //         f12: '000799'
    //     },
    //     {
    //         // name: '金龙汽车',
    //         f12: '600686'
    //     },
    //     {
    //         // name: '常山北明',
    //         f12: '000158'
    //     },
    //     {
    //         // name: '四川长虹',
    //         f12: '600839'
    //     },
    //     {
    //         // name: '海能达',
    //         f12: '002583'
    //     },
    //     {
    //         // name: '遥望科技',
    //         f12: '002291'
    //     },
    //     {
    //         // name: '永辉超市',
    //         f12: '601933'
    //     }
    // ];
    const currentDate = new Date().getTime();
    for (let i = 0; i < dj.length; i++) {
        const { data } = await getKlineDataByParams({
            // secid: `${ dj[i].f13 }.${ dj[i].f12 }`
            secid: `${ getF13(dj[i]) }.${ dj[i].f12 }`
        });
        if (data) {
            const {
                code,
                name,
                klines
            } = data;
            const days = 23;
            const newKlines = klines.slice(-days);
            const _dj = newKlines.pop();
            const _dj_open = parseFloat(_dj.split(',')[1]);
            const tb = [];
            let minRateTotal = 0;
            let maxRateTotal = 0;
            let rateTotal = 0;

            for (let j = 0; j < newKlines.length; j++) {
                let stock = {
                    // code,
                    name
                };
                const klArr = newKlines[j].split(',');
                const date = klArr[0];
                const open = parseFloat(klArr[1]);
                const max = parseFloat(klArr[3]);
                const min = parseFloat(klArr[4]);
                const last = parseFloat(klArr[2]);
                const price = parseFloat(klArr[8]);
                const amount = parseFloat(klArr[9]);

                const minRate = (min - open) / open;
                const maxRate = (max - open) / open;

                minRateTotal += minRate;
                maxRateTotal += maxRate;

                const weekDay = [
                    '周日',
                    '周一',
                    '周二',
                    '周三',
                    '周四',
                    '周五',
                    '周六'
                ][new Date(date).getDay()]

                stock.dateTime = `${ date } - ${ weekDay }`;
                stock.minRate = minRate;
                stock.maxRate = maxRate;
                stock.open = open;
                stock.min = min;
                stock.max = max;

                stock.last = last;
                
                stock.price = `${ price }%`;
                stock.amount = amount;
                stock.rate = parseFloat((max - min).toFixed(2));
                rateTotal += stock.rate;

            // 	// await reqSaveKlines({
            // 	// 	code,
            // 	// 	name,
            // 	// 	date: klArr[0],
            // 	// 	open: klArr[1],
            // 	// 	last: klArr[2],
            // 	// 	max: klArr[3],
            // 	// 	min: klArr[4],
            // 	// 	quantity: klArr[5], // 成交量
            // 	// 	volume: klArr[6], // 成交额
            // 	// 	amplitude: klArr[7] * 100, // 振幅
            // 	// 	price: klArr[8] * 100, // 涨跌幅
            // 	// 	amount: klArr[9], // 涨跌额
            // 	// 	turnover: klArr[10] * 100, // 换手率
            // 	// });

                // rs.push(stock);
                tb.push(stock);
            }
            const obj = {};
            const _minRateTotal = minRateTotal / days;
            const _maxRateTotal = maxRateTotal / days;

            const _min = _dj_open * (1 + _minRateTotal);
            const _max = _dj_open * (1 + _maxRateTotal);

            const rate = rateTotal / days;
            const __min = _dj_open - rate;
            const __max = _dj_open + rate;

            obj.open = _dj_open;
            obj.min = `${ _min.toFixed(2) } (${ _minRateTotal }) - ${ __min.toFixed(2) }`;
            obj.max = `${ _max.toFixed(2) } (${ _maxRateTotal }) - ${ __max.toFixed(2) }`;
            obj.rate = parseFloat(rate.toFixed(2));

            console.table(tb);
            console.table([obj]);
        }
    }
    // console.table(rs);
}

export const getLastStocks = async () => {

}