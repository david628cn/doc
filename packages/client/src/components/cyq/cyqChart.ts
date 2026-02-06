const calc = (klinedata: Array<any> = [], index: number, accuracyFactor?: number, range?: number) => {
    let maxprice: any = 0;
    let minprice: any = 0;
    const factor: number = accuracyFactor || 150;
    const start: number = range ? Math.max(0, index - range + 1) : 0;
    const createNumberArray = (count: number) => {
        const array: Array<any> = [];
        for (let i = 0; i < count; i++) {
            array.push(0);
        }
        return array;
    }
    /**
     * 获取指定筹码处的成本
     * @param {number} chip 堆叠筹码
     */
    const getCostByChip = (chip: number) => {
        let result: number = 0;
        let sum: number = 0;
        for (let i = 0; i < factor; i++) {
            const x: number = xdata[i].toPrecision(12) / 1;
            if (sum + x > chip) {
                result = minprice + i * accuracy;
                break;
            }
            sum += x;
        }
        return result;
    }
    /**
    * 筹码分布数据
    */
    const CYQData = (...arg: any) => {
        /**
         * 筹码堆叠
         * @type {Array.<number>} 
         */
        const obj: any = {};
        obj.x = arg[0];
        /**
         * 价格分布
         * @type {Array.<number>} 
         */
        obj.y = arg[1];
        /**
         * 获利比例
         * @type {number} 
         */
        obj.benefitPart = arg[2];
        /**
         * 平均成本
         * @type {number} 
         */
        obj.avgCost = arg[3];
        /**
         * 百分比筹码
         * @type {{Object.<string, {{priceRange: number[], concentration: number}}>}}
         */
        obj.percentChips = arg[4];
        /**
         * 计算指定百分比的筹码
         * @param {number} percent 百分比大于0，小于1
         */
        obj.computePercentChips = (percent: number) => {
            if (percent > 1 || percent < 0) {
                throw 'argument "percent" out of range';
            }
            const ps = [(1 - percent) / 2, (1 + percent) / 2];
            const pr = [getCostByChip(totalChips * ps[0]), getCostByChip(totalChips * ps[1])];
            return {
                priceRange: [pr[0].toFixed(2), pr[1].toFixed(2)],
                concentration: pr[0] + pr[1] === 0 ? 0 : (pr[1] - pr[0]) / (pr[0] + pr[1])
            };
        };
        /**
         * 获取指定价格的获利比例
         * @param {number} price 价格
         */
        obj.getBenefitPart = (price: number) => {
            let below = 0;
            for (let i = 0; i < factor; i++) {
                const x = xdata[i].toPrecision(12) / 1;
                if (price >= minprice + i * accuracy) {
                    below += x;
                }
            }
            return totalChips == 0 ? 0 : below / totalChips;
        };
        return obj;
    }
    /**
     * K图数据[time,open,close,high,low,volume,amount,amplitude,turnoverRate]
     */
    const kdata: Array<any> = klinedata.slice(start, Math.max(1, index + 1));
    if (kdata.length === 0) {
        throw 'invaild index';
    }
    for (let i = 0; i < kdata.length; i++) {
        const elements: any = kdata[i];
        maxprice = !maxprice ? elements.high : Math.max(maxprice, elements.high);
        minprice = !minprice ? elements.low : Math.min(minprice, elements.low);
    }

    // 精度不小于0.01 产品逻辑
    const accuracy: number = Math.max(0.01, (maxprice - minprice) / (factor - 1));
    /** 
     * 值域
     * @type {Array.<number>} 
     */
    const yrange: Array<number> = [];
    for (let i = 0; i < factor; i++) {
        yrange.push((minprice + accuracy * i).toFixed(2) / 1);
    }
    /**
     * 横轴数据
     */
    const xdata: Array<any> = createNumberArray(factor);

    for (let i = 0; i < kdata.length; i++) {
        const eles = kdata[i];
        const open = eles.open;
        const close = eles.close;
        const high = eles.high;
        const low = eles.low;
        const avg = (open + close + high + low) / 4;
        const turnoverRate = Math.min(1, eles.hsl / 100 || 0);
        const H = Math.floor((high - minprice) / accuracy);
        const L = Math.ceil((low - minprice) / accuracy);
        // G点坐标, 一字板时, X为进度因子
        const GPoint = [high == low ? factor - 1 : 2 / (high - low), Math.floor((avg - minprice) / accuracy)];
        // 衰减
        for (let n = 0; n < xdata.length; n++) {
            xdata[n] *= (1 - turnoverRate);
        }
        if (high === low) {
            // 一字板时，画矩形面积是三角形的2倍
            xdata[GPoint[1]] += GPoint[0] * turnoverRate / 2;
        } else {
            for (let j = L; j <= H; j++) {
                const curprice = minprice + accuracy * j;
                if (curprice <= avg) {
                    // 上半三角叠加分布分布
                    if (Math.abs(avg - low) < 1e-8) {
                        xdata[j] += GPoint[0] * turnoverRate;
                    } else {
                        xdata[j] += (curprice - low) / (avg - low) * GPoint[0] * turnoverRate;
                    }
                } else {
                    // 下半三角叠加分布分布
                    if (Math.abs(high - avg) < 1e-8) {
                        xdata[j] += GPoint[0] * turnoverRate;
                    } else {
                        xdata[j] += (high - curprice) / (high - avg) * GPoint[0] * turnoverRate;
                    }
                }
            }
        }
    }


    const currentprice: number = klinedata[index].close;
    let totalChips: number = 0;
    for (let i = 0; i < factor; i++) {
        const x: number = xdata[i].toPrecision(12) / 1;
        // if (x < 0) {
        //     xdata[i] = 0;
        // }
        totalChips += x;
    }
    const result: any = CYQData();
    result.x = xdata;
    result.y = yrange;
    result.benefitPart = result.getBenefitPart(currentprice);
    result.avgCost = getCostByChip(totalChips * 0.5).toFixed(2);
    result.percentChips = {
        '90': result.computePercentChips(0.9),
        '70': result.computePercentChips(0.7)
    };
    return result;
}

/**
 * 修整坐标数字+0.5
 */
const axisIntAdd = (input: number) => {
    return Math.trunc(input) + 0.5;
}

interface CYQChartProp {
    el?: any;
}

class CYQChart {
    canvas: any;
    ctx: any;
    container: any;
    el: any;
    data: Array<any> = [];
    constructor(props?: CYQChartProp) {
        // this.canvas = document.createElement('canvas');
        this.container = document.createElement('div');
        this.container.className = 'cyqChart-container';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.el = typeof props?.el === 'string' ? document.getElementById(props.el) : props?.el;
        this.el.appendChild(this.container);
    }
    getEl() {

    }
    getCanvas() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = '270';
            this.canvas.height = '328';
            // this.canvas.style.width = '100%';
            // this.canvas.style.height = '100%';
            this.ctx = this.canvas.getContext('2d');
            this.container.appendChild(this.canvas);
        }
        return this.canvas;
    }
    getCtx() {
        if (!this.ctx) {
            const canvas = this.getCanvas();
            this.ctx = canvas.getContext('2d');
        }
        return this.ctx;
    }
    render(data: Array<any> = []) {
        this.data = data;
        const index = this.data.length - 1;
        const result = calc(this.data, index);
        console.log('result', result);
const yMax = 17.93;
const yScale = 0.01568807339449541;
    const xMax: number = Math.max(...result.x);
const xScale = (280 - 50) / xMax;
    const closeprice = this.data[index].close;
        const ctx = this.getCtx();
        ctx.save();
        //下半部分
        ctx.beginPath();

        const downList = result.y.filter((v: number) => v < closeprice);
        downList.forEach((v: any, index: number) => {
            ctx.lineTo(
                result.x[index] * xScale,
                (yMax - v) / yScale
            )
        });
        ctx.lineTo(0, (yMax - downList[downList.length - 1]) / yScale);
        ctx.lineTo(0, (yMax - downList[0]) / yScale);
        // ctx.lineTo(result.x[0] * xScale, (yMax - downList[0]) / yScale);
        const linear = ctx.createLinearGradient(0, 0, 250, 0);
        linear.addColorStop(0.0, '#F0927D');
        linear.addColorStop(1.0, '#FCE6DF');
        ctx.fillStyle = linear;
        ctx.fill();


        //上半部分
        ctx.beginPath();
        let upList: any = result.y.filter((v: number) => v >= closeprice);
        upList.forEach((v: any, index: number) => {
            ctx.lineTo(
                result.x[downList.length + index] * xScale,
                (yMax - v) / yScale
            )
        });
        upList = [downList[downList.length - 1]].concat(upList);
        ctx.lineTo(0, (yMax - upList[upList.length - 1]) / yScale);
        ctx.lineTo(0, (yMax - upList[0]) / yScale);
        ctx.lineTo(result.x[downList.length] * xScale, (yMax - upList[0]) / yScale);
        const linear2 = ctx.createLinearGradient(0, 0, 250, 0);
        linear2.addColorStop(0.0, '#88B4FB');
        linear2.addColorStop(1.0, '#C4E2FF');
        ctx.fillStyle = linear2;
        ctx.fill();
        ctx.restore();

        //平均成本线
        let averageIndex = 0; //与平均成本最接近的序号
        ctx.save();
        result.x.forEach((v: any, index: number) => {
            if (Math.abs(result.y[index] - result.avgCost) <= Math.abs(result.y[averageIndex] - result.avgCost)) {
                averageIndex = index;
            }
        });
        if (averageIndex > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, (yMax - result.avgCost) / yScale);
            ctx.lineTo(result.x[averageIndex] * xScale - 3, (yMax - result.avgCost) / yScale);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#F97400';
            ctx.setLineDash([6, 2]);
            ctx.stroke();
            ctx.restore();

            ctx.beginPath();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#F97400';
            ctx.arc(result.x[averageIndex] * xScale, (yMax - result.avgCost) / yScale, 3.5, 0, Math.PI * 2, true);  // 右眼
            ctx.stroke();

        }
        ctx.restore();

        //绘制右侧坐标系
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.font = '12px sans-serif';

const priceList: Array<any> = [
    12.8, 13.655000000000001, 14.51, 15.365, 16.22, 17.075, 17.93
];
        const fontNumberHeight: number = 12;
const decimal: number = 2;
const width = 270;

        priceList.forEach((v: any, i: number) => {
            let y = axisIntAdd((yMax - v) / yScale);

            let font_y = y + Math.round(fontNumberHeight / 2);

            if (i == 0) {
                font_y -= Math.round(fontNumberHeight);
            }
            else if (i == priceList.length - 1) {
                font_y += Math.round(fontNumberHeight * 0.5);
            }
            ctx.textAlign = 'right';
            ctx.fillText(
                v.toFixed(decimal),
                width,
                font_y
            );
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        });

        //平均成本
        ctx.save()
        ctx.textAlign = 'right';
        ctx.font = 'bold 110% sans-serif';
        ctx.fillText(
            result.avgCost,//
            width,
            axisIntAdd((yMax - result.avgCost) / yScale + fontNumberHeight / 2)
        )
        ctx.restore();
    }
}

export default CYQChart;