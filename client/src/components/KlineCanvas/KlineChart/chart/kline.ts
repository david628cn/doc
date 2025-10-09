import Stage from '../core/stage';
import Path from '../core/path';
import Text from '../core/text';
import Rect from '../core/rect';
import {
    formatNumberWithUnit,
    getCoordinateSplitArray,
    getCoordinateSplitArrayWithDecimal,
    getMaByClose,
    getMaByVolume
} from '../core/utils';

// export let pkyd_types = {
//     "1": "有大买盘",
//     "101": "有大卖盘",
//     "2": "大笔买入",
//     "102": "大笔卖出",
//     "201": "封涨停板",
//     "301": "封跌停板",
//     "202": "打开涨停",
//     "302": "打开跌停",
//     "203": "高开5日线",
//     "303": "低开5日线",
//     "204": "60日新高",
//     "304": "60日新低",
//     "401": "向上缺口",
//     "501": "向下缺口",
//     "402": "火箭发射",
//     "502": "高台跳水",
//     "403": "快速反弹",
//     "503": "快速下跌",
//     "404": "竞价上涨",
//     "504": "竞价下跌",
//     "405": "60日大幅上涨",
//     "505": "60日大幅下跌"
//   }

/**
 * 转换分时成交数据
 * @param list 
 * @param preprice 
 * @returns 
 */
// function tradeToData(list:Array<any>, preprice:number){
//     return list.map((v:string, index:number)=>{
//       let arr:Array<any> = v.split(',')
  
//       let c1 = 0
//       if(arr[4] == '1'){
//         c1 = -1
//       }
//       else if(arr[4] == '2'){
//         c1 = 1
//       }
  
//       //大于20万
//       if(arr[1] * parseFloat(arr[2]) * 100 >= 200000){
//         c1 = c1 * 2
//       }
  
//       let jt = '　'
//       let jtcolor = 0
//       if(index > 0){
//         let preitem = list[index - 1].split(',')
//         if(arr[1] - preitem[1] > 0){
//           jt = '↑'
//           jtcolor = 1
//         }
//         else if(arr[1] - preitem[1] < 0){
//           jt = '↓'
//           jtcolor = -1
//         }
//       }
//       // else if(index == 0){
//       //   if(arr[1] - preprice > 0){
//       //     jt = '↑'
//       //     jtcolor = 1
//       //   }
//       //   else if(arr[1] - preprice < 0){
//       //     jt = '↓'
//       //     jtcolor = -1
//       //   }
//       // }
  
//       return {
//         cjsj: arr[0],
//         cjj: tools.quoteItem(arr[1], -1, parseFloat(arr[1]) - preprice, -1),
//         cjl: tools.quoteItem(parseFloat(arr[2]), -1, c1, -1),
//         cjl2: tools.quoteItem_fscj(parseFloat(arr[2]), -1, c1, -1),
//         price_zd: tools.quoteItem(jt, -1, jtcolor, -1),
//         jtcolor: tools.quoteItem(jtcolor, -1, jtcolor, -1),
//         qq:{
//           xl: tools.quoteItem(parseFloat(arr[2]), -1, c1, -1),
//           cc: tools.quoteItem(parseFloat(arr[3]), -1, 0, -1),
//           xz: tools.quoteItem(getTypeName(arr[3], arr[4], arr[2]), -1, c1, -1)
//         }
//       }
//     })

interface KlineProps {
    container?: any;
    title?: string;
    data?: Array<any>;
    width?: number;
    height?: number;
    count?: number;
    dpr?: number;
    kline?: any;
    volume?: any;
    fund?: any;
    type?: string;
    preClose?: any;
    onMouseDown?: Function;
    onMouseMove?: Function;
    onMouseUp?: Function;
}

class Kline {
    private container: any;
    private stage: any;
    private title: any = '';
    private titleWidth: number = 0;
    private data: Array<any> = [];
    private _data: Array<any> = [];
    private width: number = 0;
    private height: number = 0;
    private count: any;
    // private _count: number = 0;
    private startXY: Array<number> = [0, 0];
    private endXY: Array<number> = [0, 0];
    private isMove: boolean = false;
    private start: number = 0;
    private end: number = 0;
    private _start: number = 0;
    private _end: number = 0;
    private dpr: number = 1;
    private xFontHeight: number = 12;
    private font: string = '12px sans-serif';
    private type: string = 'day'; // hour day week month
    private offset: Array<number> = [0, 0]; // 左右, 上下
    // private padding: Array<number> = [0, 0, 0, 0]; // 上top 右right 下bottom 左left
    private textPadding: Array<number> = [10, 10, 10, 10]; // 上top 右right 下bottom 左left
    private boxWidth: number = 1;
    private boxGrap: number = 5;
    private decimal: number = 2;
    private preClose: any;
    private linearGradient: any;
    // private axisX: any;
    // private axisY: any;
    private indicator: any = {
        // 'title': '四川九洲 000801',
        'MA5': 0,
        'MA10': 0,
        'MA30': 0,
        'MA60': 0,
        '收盘': 0,
        '开盘': 0,
        '最低': 0,
        '最高': 0,
        '昨收': 0,
        '涨跌幅': 0,
        '换手率': 0,
        '资金流入': 0
        // '最低价': 0,
        // '低价日期': ''
    };
    private kline: any = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        yPadding: 0.08,
        ySplit: 2,
        yScale: 1,
        rect: [0, 0, 0, 0],
        minY: Infinity,
        maxY: -Infinity,
        minYPos: 0,
        maxYPos: 0,
        yList: [],
        // cursorX: null,
        // cursorY: null,
        // cursorYValue: 0,
        cursorIndex: 0,
        maData: [],
        padding: [30, 0, 0, 0] // 上top 右right 下bottom 左left
    };
    private volume: any = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        ySplit: 1,
        yScale: 1,
        rect: [0, 0, 0, 0],
        minY: 0,
        maxY: -Infinity,
        minYPos: 0,
        maxYPos: 0,
        yList: [],
        // cursorX: null,
        // cursorY: null,
        // cursorYValue: 0,
        cursorIndex: 0,
        maData: [],
        padding: [30, 0, 0, 0] // 上top 右right 下bottom 左left
    };
    private fund: any = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        ySplit: 1,
        yScale: 1,
        rect: [0, 0, 0, 0],
        minY: 0,
        maxY: -Infinity,
        minYPos: 0,
        maxYPos: 0,
        yList: [],
        // cursorX: null,
        // cursorY: null,
        // cursorYValue: 0,
        cursorIndex: 0,
        maData: [],
        padding: [30, 0, 0, 0] // 上top 右right 下bottom 左left
    };
    private MA_OPTIONS: any = [
        {
            name: 'MA5',
            color: '#A0A0A0'
        },
        {
            name: 'MA10',
            color: '#DD9900'
        },
        {
            name: 'MA20',
            color: '#FF00FF'
        },
        {
            name: 'MA30',
            color: '#007130'
        },
        {
            name: 'MA60',
            color: '#0079D5'
        }
    ];
    constructor(props: KlineProps) {
        const {
            container,
            title,
            data,
            width,
            height,
            dpr,
            type,
            preClose,
            count,
            kline,
            volume,
            fund,
            onMouseDown,
            onMouseMove,
            onMouseUp
        } = props;

        if (typeof container === 'string') {
            this.container = document.getElementById(container);
        } else {
            this.container = container;
        }
        this.type = type || 'day';
        this.setPreClose(preClose);
        this.setTitle(title);
        if (dpr) {
            this.dpr = dpr;
        }

        if (count !== undefined) {
            this.count = count;
        }

        // if (typeof onMouseDown === 'function') {
        //     this.onMouseDown = onMouseDown;
        // }

        // if (typeof onMouseMove === 'function') {
        //     this.onMouseMove = onMouseMove;
        // }

        // if (typeof onMouseUp === 'function') {
        //     this.onMouseUp = onMouseUp;
        // }

        this.kline = {
            ...this.kline,
            ...kline
        };
        this.volume = {
            ...this.volume,
            ...volume
        };
        this.fund = {
            ...this.fund,
            ...fund
        };

        this.setSize(width || this.container.offsetWidth, height || this.container.offsetHeight);

        this.stage = new Stage({
            width: this.width,
            height: this.height,
            dpr: this.dpr,
            onMouseDown: (e: any) => {
                this.startXY = e.pageXY;
                this.isMove = true;
                this._start = this.start;
                this._end = this.end;
                onMouseDown?.(e);
            },
            onMouseMove: (e: any) => {
                if (!this.isMove) {
                    const offsetXY = this.getOffsetXY(e);
                    this.kline.cursorIndex = null;
                    this.volume.cursorIndex = null;
                    // this.kline.cursorY = null;
                    // this.volume.cursorY = null;
                    if (offsetXY[0] >= this.kline.rect[0] 
                        && offsetXY[0] <= this.kline.rect[0] + this.kline.rect[2]
                        && offsetXY[1] >= this.kline.rect[1] 
                        && offsetXY[1] <= this.volume.rect[1] + this.volume.rect[3]
                    ) {
                        let dix = offsetXY[0] - this.kline.rect[0];
                        let xIndex = (dix - this.boxWidth - this.boxGrap / 2) / (this.boxWidth + this.boxGrap);
                        xIndex = Math.ceil(xIndex);
                        const x = this.getXByKlineIndex(xIndex) - this.kline.rect[0];
                        let dy = 0;
                        if (offsetXY[1] >= this.kline.rect[1] && offsetXY[1] <= this.kline.rect[1] + this.kline.rect[3]) {
                            dy = offsetXY[1] - this.kline.rect[1];
                            // this.kline.cursorY = dy;
                            // this.kline.cursorYValue = this.kline.maxYPos - dy * this.kline.yScale;
                        }
                        if (offsetXY[1] >= this.volume.rect[1] && offsetXY[1] <= this.volume.rect[1] + this.volume.rect[3]) {
                            dy = offsetXY[1] - this.volume.rect[1];
                            // this.volume.cursorY = dy;
                            // this.volume.cursorYValue = this.volume.maxYPos - dy * this.volume.yScale;
                        }
                        // this.kline.cursorX = x;
                        // this.volume.cursorX = x;
                        this.kline.cursorIndex = xIndex;
                        this.volume.cursorIndex = xIndex;
                    }
                    this.draw();
                } else {
                    this.kline.cursorIndex = null;
                    this.volume.cursorIndex = null;
                    this.endXY = e.pageXY;
                    let dx = ((this.endXY[0] - this.startXY[0]) * this._data.length) / (this.kline.rect[2] - this.offset[0] * 2);
                    dx = Math.ceil(dx);
                    let start = this._start - dx;
                    let end = this._end - dx;
                    if (start <= 0) {
                        start = 0;
                        end = Math.min(this._data.length - 1, this.data.length - 1);
                    }
                    if (end >= this.data.length - 1) {
                        start = Math.max(0, this.data.length - this._data.length);
                        end = this.data.length - 1;
                    }
                    this.start = start;
                    this.end = end;
                    if (this.type === 'hour') {
                        this.loadDataByHour(start, end);
                    } else if (this.type === 'day') {
                        this.loadDataByDay(start, end);
                    }        
                }
                onMouseMove?.({
                    ...e,
                    // offsetXY
                });
            },
            onMouseUp: (e: any) => {
                this.isMove = false;
                onMouseUp?.(e);
            }
        });
        this.container.appendChild(this.stage.canvas);
        if (data && data.length) {
            this.load(data);
        }
    }
    getEventPageXY(e: any) {
        if (e.touches) {
            return [e.touches[0].pageX, e.touches[0].pageY];
        }
        return [e.pageX, e.pageY];
    }
    getOffsetXY(e: any) {
        const pageXY = e.pageXY;
        const scrollX = (document.documentElement.scrollLeft || document.body.scrollLeft || 0);
        const scrollY = (document.documentElement.scrollTop || document.body.scrollTop || 0);
        // const scrollX = 0;
        // const scrollY = 0;
        const stageRect = this.stage.canvas.getBoundingClientRect();
        const OrigX = stageRect.x + scrollX;
        const OrigY = stageRect.y + scrollY;
        const startX = pageXY[0] - OrigX;
        const startY = pageXY[1] - OrigY;
        return [startX, startY];
    }
    // getPosByDom(dom: any) {
    //     let xy = dom.style.transform.split(/[(|,|)]/g);
    //     return {
    //         x: parseFloat(xy[1]),
    //         y: parseFloat(xy[2])
    //     };
    // }
    // setPos(dom: any, pos: Array<number>) {
    //     dom.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    //     //dom.style.left = pos[0] + 'px';
    //     //dom.style.top = pos[1] + 'px';
    // }
    setSize(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.kline.width = this.kline.width || this.width;
        this.kline.height = 0.7 * this.height;
        // this.kline.x = this.kline.x || 0;
        // this.kline.y = this.kline.y || 0;

        this.volume.width = this.volume.width || this.width;
        this.volume.height = 0.3 * this.height;
        // this.volume.x = this.volume.x || 0;
        // this.volume.y = this.volume.y || 0;


        this.fund.width = this.fund.width || this.width;
        this.fund.height = 0 * this.height;
        // this.fund.x = this.fund.x || 0;
        // this.fund.y = this.fund.y || 0;

        // if (!this.kline.height) {
        //     this.kline.height = this.height - this.volume.height;
        // }
        // if (!this.volume.height) {
        //     this.volume.height = this.height - this.kline.height;
        // }
        // if (!this.fund.height) {
        //     this.fund.height = this.height - this.kline.height;
        // }

        this.kline.x = 0;
        this.kline.y = 0;

        this.volume.x = 0;
        this.volume.y = this.kline.y + this.kline.height;

        this.fund.x = 0;
        this.fund.y = this.kline.y + this.kline.height + this.volume.height;
    }
    getXByKlineIndex(index: number) {
        // if (this.type === 'hour') {
        //     return this.kline.rect[0] + this.offset[0] + index * (this.kline.rect[2] / (this._data - 1));
        // }
        return this.kline.rect[0] + this.offset[0] + this.boxWidth / 2 + index * (this.boxWidth + this.boxGrap);
    }
    getYByKlineValue(v: number) {
        return this.kline.rect[1] + this.kline.rect[3] - (v - this.kline.minYPos) / this.kline.yScale;
    }
    // getKlineValueByY(d: number) {
    //     return d * this.kline.yScale;
    // }
    getXByVolumeIndex(index: number) {
        return this.volume.rect[0] + this.offset[0] + this.boxWidth / 2 + index * (this.boxWidth + this.boxGrap);
    }
    getYByVolumeValue(v: number) {
        return this.volume.rect[1] + this.volume.rect[3] - ((v - this.volume.minYPos) / this.volume.yScale);
    }
    // getVolumeValueByY(d: number) {
    //     return d * this.volume.yScale;
    // }
    setPreClose(preClose: number) {
        this.preClose = preClose;
    }
    setTitle(title: any) {
        this.title = title;
    }
    loadDataByHour(start: number, end: number) {
        this.kline.maData = [];
        this.volume.maData = [];
        this._data = this.data.slice(start, end + 1);
        let leftTextWidth = 0;
        this.kline.minY = Infinity;
        this.kline.maxY = -Infinity;

        this.volume.minY = 0;
        this.volume.maxY = -Infinity;

        this.kline.rect = [0, 0, 0, 0];
        this.volume.rect = [0, 0, 0, 0];

        let item: any;
        let dateStr: string; // 时间
        let current: number; // 当前价格
        let volumeTotal: number; // 成交量
        let orderCount: number; // 单数(手)
        for (let i = 0; i < this._data.length; i++) {
            item = this._data[i];
            dateStr = item['date'];
            current = item['current'];
            volumeTotal = item['volume'];
            orderCount = item['count'];
            if (this.kline.minY >= current) {
                this.kline.minY = current;
            }
            if (this.kline.maxY <= current) {
                this.kline.maxY = current;
            }
            if (this.volume.maxY <= volumeTotal) {
                this.volume.maxY = volumeTotal;
            }
            leftTextWidth = Math.max(
                leftTextWidth,
                this.stage.ctx.measureText(current).width,
                this.stage.ctx.measureText(`${formatNumberWithUnit(volumeTotal)}  `).width
            );
        }
        const xLabelWidth = leftTextWidth + this.textPadding[1] + this.textPadding[3];
        const lrWidth = 2 * xLabelWidth;
        const tbHeight = this.textPadding[0] + this.textPadding[2] + 2 * this.xFontHeight;
        this.kline.rect = [
            this.kline.padding[3] + xLabelWidth,
            this.kline.y + this.kline.padding[0] + this.xFontHeight,
            this.kline.width - this.kline.padding[3] - this.kline.padding[1] - lrWidth,
            this.kline.height - this.kline.padding[0] - this.kline.padding[2] - tbHeight
        ];
        this.volume.rect = [
            this.volume.padding[3] + xLabelWidth,
            this.kline.y + this.kline.height + this.volume.padding[0] + this.xFontHeight,
            this.volume.width - this.volume.padding[3] - this.volume.padding[1] - lrWidth,
            this.volume.height - this.volume.padding[0] - this.volume.padding[2] - tbHeight
        ];
        this.fund.rect = [
            this.fund.x + this.fund.padding[3] + xLabelWidth,
            this.kline.y + this.kline.height + this.volume.height + this.fund.padding[0] + this.xFontHeight,
            this.fund.width - this.fund.padding[3] - this.fund.padding[1] - lrWidth,
            this.fund.height - this.fund.padding[0] - this.fund.padding[2] - tbHeight
        ];

        let klineMinY = this.kline.minY;
        let klineMaxY = this.kline.maxY;

        // const klineAverageY = (klineMaxY + klineMinY) / 2;
        const klineAverageY = this.preClose;

        // if (this.kline.yPadding > 0) {
        //     const heightSpan = (klineMaxY - klineAverageY) * this.kline.yPadding;
        //     klineMinY -= heightSpan;
        //     klineMaxY += heightSpan;
        // }
        this.kline.yList = getCoordinateSplitArrayWithDecimal(klineMinY, klineMaxY, klineAverageY, this.kline.ySplit, this.decimal);

        this.kline.minYPos = this.kline.yList[0]['price'];
        this.kline.maxYPos = this.kline.yList[this.kline.yList.length - 1]['price'];
        this.kline.yScale = (this.kline.maxYPos - this.kline.minYPos) / this.kline.rect[3];

        let volumeMinY = this.volume.minY;
        let volumeMaxY = this.volume.maxY;     
        this.volume.yList = getCoordinateSplitArray(volumeMinY, volumeMaxY, this.volume.ySplit).map(item => parseInt(item, 10));
        this.volume.minYPos = volumeMinY;
        this.volume.maxYPos = volumeMaxY;
        this.volume.yScale = (this.volume.maxYPos - this.volume.minYPos) / this.volume.rect[3];

        this.kline.cursor = [0, 0];
        this.volume.cursor = [0, 0];
        this.draw();
    }
    loadDataByDay(start: number, end: number) {
        // this.start = start;
        // this.end = end;
        this.kline.maData = [];
        this.volume.maData = [];
        this._data = this.data.slice(start, end + 1);
        let leftTextWidth = 0;
        this.kline.minY = Infinity;
        this.kline.maxY = -Infinity;

        this.volume.minY = 0;
        this.volume.maxY = -Infinity;

        this.fund.minY = 0;
        this.fund.maxY = -Infinity;

        this.kline.rect = [0, 0, 0, 0];
        this.volume.rect = [0, 0, 0, 0];
        this.fund.rect = [0, 0, 0, 0];

        for (let i = 0; i < this._data.length; i++) {
            if (this._data[i]['low'] >= 1 && this.kline.minY >= this._data[i]['low']) {
                this.kline.minY = this._data[i]['low'];
            }
            if (this._data[i]['high'] >= 1 && this.kline.maxY <= this._data[i]['high']) {
                this.kline.maxY = this._data[i]['high'];
            }
            if (this.volume.maxY <= this._data[i]['volume']) {
                this.volume.maxY = this._data[i]['volume'];
            }
            leftTextWidth = Math.max(
                leftTextWidth,
                this.stage.ctx.measureText(this._data[i]['low']).width,
                this.stage.ctx.measureText(this._data[i]['high']).width,
                this.stage.ctx.measureText(`${formatNumberWithUnit(this._data[i]['volume'])}  `).width
            );
        }
        const xLabelWidth = leftTextWidth + this.textPadding[1] + this.textPadding[3];
        const lrWidth = 2 * xLabelWidth;
        const tbHeight = this.textPadding[0] + this.textPadding[2] + 2 * this.xFontHeight;
        this.kline.rect = [
            this.kline.padding[3] + xLabelWidth,
            this.kline.y + this.kline.padding[0] + this.xFontHeight,
            this.kline.width - this.kline.padding[3] - this.kline.padding[1] - lrWidth,
            this.kline.height - this.kline.padding[0] - this.kline.padding[2] - tbHeight
        ];
        this.volume.rect = [
            this.volume.padding[3] + xLabelWidth,
            this.kline.y + this.kline.height + this.volume.padding[0] + this.xFontHeight,
            this.volume.width - this.volume.padding[3] - this.volume.padding[1] - lrWidth,
            this.volume.height - this.volume.padding[0] - this.volume.padding[2] - tbHeight
        ];
        this.fund.rect = [
            this.fund.x + this.fund.padding[3] + xLabelWidth,
            this.kline.y + this.kline.height + this.volume.height + this.fund.padding[0] + this.xFontHeight,
            this.fund.width - this.fund.padding[3] - this.fund.padding[1] - lrWidth,
            this.fund.height - this.fund.padding[0] - this.fund.padding[2] - tbHeight
        ];

        let klineMinY = this.kline.minY;
        let klineMaxY = this.kline.maxY;

        let preCurrent = 0;
        const klineCopyData = this.data.map((item: any, index: number) => {
            let current = item['current'];
            if (index === 0) {
                preCurrent = item['current'];
            } else {
                if (current < 1) {
                    current = preCurrent;
                }
                preCurrent = current;
            }
            return {
                ...item,
                current
            }
        });
        // const klineCopyData = this.data.slice();
        const klineMa = getMaByClose(klineCopyData);
        // const _klineMa = klineMa.slice(start, end + 1);
        this.kline.maData = klineMa.slice(start, end + 1);

        let maMax = -Infinity
        let maMin = Infinity
        for (let i = 0; i < this.kline.maData.length; i++) {
            for (let j = 0; j < this.kline.maData[i].length; j++) {
                if (!isNaN(this.kline.maData[i][j])) {
                    if (this.kline.maData[i][j] > maMax) {
                        maMax = this.kline.maData[i][j];
                    }
                    if (this.kline.maData[i][j] < maMin) {
                        maMin = this.kline.maData[i][j];
                    }
                }
            }
        }
        if (maMax > klineMaxY) {
            klineMaxY = maMax;
        }
        if (maMin < klineMinY) {
            klineMinY = maMin;
        }

        const klineAverageY = (klineMaxY + klineMinY) / 2;
        if (this.kline.yPadding > 0) {
            const heightSpan = (klineMaxY - klineAverageY) * this.kline.yPadding;
            klineMinY -= heightSpan;
            klineMaxY += heightSpan;
        }

        this.kline.yList = getCoordinateSplitArray(klineMinY, klineMaxY, this.kline.ySplit * 2 + 1);
        this.kline.minYPos = klineMinY;
        this.kline.maxYPos = klineMaxY;
        this.kline.yScale = (this.kline.maxYPos - this.kline.minYPos) / this.kline.rect[3];

        let volumeMinY = this.volume.minY;
        let volumeMaxY = this.volume.maxY;
        this.volume.yList = getCoordinateSplitArray(volumeMinY, volumeMaxY, this.volume.ySplit).map(item => parseInt(item, 10));
        this.volume.minYPos = volumeMinY;
        this.volume.maxYPos = volumeMaxY;
        this.volume.yScale = (this.volume.maxYPos - this.volume.minYPos) / this.volume.rect[3];

        const volumeCopyData = this.data.slice();
        const volumeMa = getMaByVolume(volumeCopyData);
        // const _volumeMa = volumeMa.slice(start, end + 1);
        this.volume.maData = volumeMa.slice(start, end + 1);

        this.kline.cursor = [0, 0];
        this.volume.cursor = [0, 0];
        this.fund.cursor = [0, 0];
        this.draw();
    }
    load(data: Array<any> = []) {
        if (this.type === 'hour') {
            if (this.preClose === undefined || this.preClose === null) {
                this.data = data.map((item: any) => {
                    const itemArr = item.split(',');
                    if (this.preClose === undefined || this.preClose === null) {
                        this.setPreClose(parseFloat(itemArr[1]));
                    }
                    return {
                        date: itemArr[0],
                        current: parseFloat(itemArr[1]),
                        volume: parseFloat(itemArr[2]),
                        count: parseFloat(itemArr[3]),
                        type: parseFloat(itemArr[4]),
                        price: (((parseFloat(itemArr[1]) - this.preClose) / this.preClose) * 100).toFixed(this.decimal)
                    };
                });
            } else {
                this.data = ([`09:15:00,${ this.preClose },0,0,4`].concat(data)).map((item: any) => {
                    const itemArr = item.split(',');
                    return {
                        date: itemArr[0],
                        current: parseFloat(itemArr[1]),
                        volume: parseFloat(itemArr[2]),
                        count: parseFloat(itemArr[3]),
                        type: parseFloat(itemArr[4]),
                        price: (((parseFloat(itemArr[1]) - this.preClose) / this.preClose) * 100).toFixed(this.decimal)
                    };
                });
            }
            let count = this.count;
            if (this.count === undefined || this.count === null) {
                count = this.data.length;
            }
            const dataLastIndex = this.data.length - 1;
            let start = dataLastIndex - count + 1;
            if (start < 0) {
                start = 0;
            }
            const end = dataLastIndex;
            this.start = start;
            this.end = end;
            this.loadDataByHour(start, end);
        } else if (this.type === 'day') {
            // this.data = data;
            this.data = data.map((item: any, index: number) => {
                // let current = item['current'];
                // if (index > 0 && item['current'] < 1) {
                //     current = data[index - 1]['current'];
                // }
                return {
                    ...item,
                    // current,
                    // current: item['current'].toFixed(this.decimal),
                    low: parseFloat(item['low'].toFixed(this.decimal)),
                    high: parseFloat(item['high'].toFixed(this.decimal)),
                    price: parseFloat(item['price'].toFixed(this.decimal)),
                    date: new Date(item['date']).toLocaleDateString(),
                };
            });
            let count = this.count;
            if (this.count === undefined || this.count === null) {
                count = this.data.length;
            }
            const dataLastIndex = this.data.length - 1;
            let start = dataLastIndex - count + 1;
            if (start < 0) {
                start = 0;
            }
            const end = dataLastIndex;
            this.start = start;
            this.end = end;
            this.loadDataByDay(start, end);
        }
    }
    draw() {
        this.stage.clear();
        if (this.type === 'hour') {
            this.drawHourKlineAxis(this.kline.yList);
            this.drawHourVolumeAxis(this.volume.yList);
            this.drawHourData(this._data);
            // this.drawHourKlineMa(this.kline.maData);
            // this.drawHourVolumeMa(this.volume.maData);
            this.drawTitle();
            this.drawCursor();
        } else if (this.type === 'day') {
            this.drawKlineAxis(this.kline.yList);
            this.drawVolumeAxis(this.volume.yList);
            this.drawData(this._data);
            this.drawKlineMa(this.kline.maData);
            this.drawVolumeMa(this.volume.maData);
            this.drawTitle();
            this.drawCursor();
        }
    }
    drawHourKlineAxis(dataList: Array<any> = []) {
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0], this.kline.rect[1]], [this.kline.rect[0], this.kline.rect[1] + this.kline.rect[3]]],
        //     style: {
        //         strokeStyle: 'rgba(0, 0, 0, 1)'
        //     }
        // }));
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1]], [this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1] + this.kline.rect[3]]],
        //     style: {
        //         strokeStyle: 'rgba(0, 0, 0, 1)'
        //     }
        // }));
        this.stage.add(new Path({
            points: [[this.kline.rect[0], this.kline.rect[1] + this.kline.rect[3]], [this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1] + this.kline.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0], this.kline.height], [this.kline.rect[0] + this.kline.rect[2], this.kline.height]],
        //     style: {
        //         strokeStyle: 'red'
        //     }
        // }));
        for (let i = 0; i < dataList.length; i++) {
            const leftItem = dataList[i]['price'];
            const rightItem = dataList[i]['percent'];
            const pos = this.getYByKlineValue(leftItem);
            let color = 'rgba(0, 0, 0, 1)';
            if (leftItem < this.preClose) {
                color = 'rgba(3,123,102,1)';
            } else if (leftItem > this.preClose) {
                color = 'rgba(214,10,34,1)';
            }
            if (i > 0) {
                this.stage.add(new Path({
                    points: [[this.kline.rect[0], pos], [this.kline.rect[0] + this.kline.rect[2], pos]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
            }
            const text = leftItem.toFixed(this.decimal);
            this.stage.add(new Text({
                text,
                x: this.kline.rect[0] - this.textPadding[1],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: color,
                    textAlign: 'right'
                }
            }));
            this.stage.add(new Text({
                text: rightItem,
                x: this.kline.rect[0] + this.kline.rect[2] + this.textPadding[3],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: color,
                    textAlign: 'left'
                }
            }));
        }
    }
    drawHourVolumeAxis(dataList: Array<number> = []) {
        // this.stage.add(new Path({
        //     points: [[this.volume.rect[0], this.volume.rect[1]], [this.volume.rect[0], this.volume.rect[1] + this.volume.rect[3]]],
        //     style: {
        //         strokeStyle: 'rgba(0, 0, 0, 1)'
        //     }
        // }));
        // this.stage.add(new Path({
        //     points: [[this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1]], [this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1] + this.volume.rect[3]]],
        //     style: {
        //         strokeStyle: 'rgba(0, 0, 0, 1)'
        //     }
        // }));
        this.stage.add(new Path({
            points: [[this.volume.rect[0], this.volume.rect[1] + this.volume.rect[3]], [this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1] + this.volume.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0], this.volume.y + this.volume.height], [this.kline.rect[0] + this.volume.rect[2], this.volume.y + this.volume.height]],
        //     style: {
        //         strokeStyle: 'red'
        //     }
        // }));
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getYByVolumeValue(dataList[i]);
            if (i > 0) {
                this.stage.add(new Path({
                    points: [[this.volume.rect[0], pos], [this.volume.rect[0] + this.volume.rect[2], pos]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
            }
            const text = dataList[i] === 0 ? '0' : formatNumberWithUnit(dataList[i]);
            this.stage.add(new Text({
                text,
                x: this.volume.rect[0] - this.textPadding[1],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'right'
                }
            }));
            this.stage.add(new Text({
                text,
                x: this.volume.rect[0] + this.volume.rect[2] + this.textPadding[3],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'left'
                }
            }));
        }
    }
    drawHourData(dataList: Array<any> = []) {
        const dateTextWidth = this.stage.ctx.measureText('09:30:00').width;
        const count = dataList.length;
        this.boxGrap = this.kline.rect[2] / (count - 1);
        const dateTextGrap = Math.floor(count / (this.kline.rect[2] / (dateTextWidth + this.textPadding[1] + this.textPadding[3]))) * 2;
        this.boxWidth = (this.kline.rect[2] - 2 * this.offset[0] - (count - 1) * this.boxGrap) / count;
        let item: any;
        let dateStr: string; // 时间
        let current: number; // 当前价格
        let volumeTotal: number; // 成交量(手)
        let orderCount: number; // 单数
        let orderType: number; // 内/外盘
        const points = [];
        const _points = [];
        let prePrice = this.preClose;
        for (let i = 0; i < dataList.length; i++) {
            item = this._data[i];
            dateStr = item['date'];
            current = item['current'];
            volumeTotal = item['volume'];
            orderCount = item['count'];
            orderType = item['type'];
            const pos = this.getXByKlineIndex(i);
            if (i % dateTextGrap === 0) {
                this.stage.add(new Path({
                    points: [[pos, this.kline.rect[1]], [pos, this.kline.rect[1] + this.kline.rect[3]]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
                this.stage.add(new Text({
                    text: dateStr,
                    x: pos,
                    y: this.kline.rect[1] + this.kline.rect[3] + this.textPadding[0] + this.xFontHeight,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign: 'left'
                    }
                }));
            }
            const curentY = this.getYByKlineValue(current);
            points.push([pos, curentY]);
            _points.push([pos, curentY]);

            const volumeBoxGrap = 0;
            let volumeBoxWidth = (this.volume.rect[2] - 2 * this.offset[0] - (count - 1) * volumeBoxGrap) / count;
            volumeBoxWidth = volumeBoxWidth || 1;
            const volumeMinPos = this.getYByVolumeValue(0);
            const volumePos = this.getXByVolumeIndex(i);
            const volume = volumeTotal;
            let volumeX = volumePos - volumeBoxWidth / 2;
            const volumeY = this.getYByVolumeValue(volume);
            const volumeW = volumeBoxWidth;

            let color = 'rgba(0, 0, 0, 1)';
            // if (current < prePrice) {
            //     color = 'rgba(3,123,102,1)';
            // } else if (current > prePrice) {
            //     color = 'rgba(214,10,34,1)';
            // }
            if (orderType === 1) {
                color = 'rgba(3,123,102,1)';
            } else if (orderType === 2) {
                color = 'rgba(214,10,34,1)';
            } else {
                if (current < prePrice) {
                    color = 'rgba(3,123,102,1)';
                } else if (current >= prePrice) {
                    color = 'rgba(214,10,34,1)';
                }
            }
            if (i % dateTextGrap === 0) {
                // if (i > 0) {
                this.stage.add(new Path({
                    points: [[volumePos, this.volume.rect[1]], [volumePos, this.volume.rect[1] + this.volume.rect[3]]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
                // }
                this.stage.add(new Text({
                    text: dateStr,
                    x: volumePos,
                    y: this.volume.rect[1] + this.volume.rect[3] + this.textPadding[0] + this.xFontHeight,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign: 'left'
                    }
                }));
            }
            if (i === 0) {
                this.stage.add(new Rect({
                    x: volumeX + volumeW / 2,
                    y: volumeY,
                    width: volumeW / 2,
                    height: volumeMinPos - volumeY,
                    style: {
                        fillStyle: color
                        // strokeStyle: 'rgba(255, 255, 255, 1)',
                        // strokeWidth: 1
                    }
                }));
            } else if (i === this._data.length - 1) {
                this.stage.add(new Rect({
                    x: volumeX,
                    y: volumeY,
                    width: volumeW / 2,
                    height: volumeMinPos - volumeY,
                    style: {
                        fillStyle: color
                        // strokeStyle: 'rgba(255, 255, 255, 1)',
                        // strokeWidth: 1
                    }
                }));
            } else {
                this.stage.add(new Rect({
                    x: volumeX,
                    y: volumeY,
                    width: volumeW,
                    height: volumeMinPos - volumeY,
                    style: {
                        fillStyle: color
                        // strokeStyle: 'rgba(255, 255, 255, 1)',
                        // strokeWidth: 1
                    }
                }));
            }
            
            prePrice = current;
        }
        if (_points.length) {
            _points.push([
                this.kline.rect[0] + this.kline.rect[2],
                points[points.length - 1][1]
            ]);
            _points.push([
                this.kline.rect[0] + this.kline.rect[2],
                this.kline.rect[1] + this.kline.rect[3]
            ]);
            _points.push([
                this.kline.rect[0],
                this.kline.rect[1] + this.kline.rect[3]
            ]);
        }
        if (!this.linearGradient) {
            this.linearGradient = this.stage.ctx.createLinearGradient(this.kline.rect[0], this.kline.rect[1], this.kline.rect[0], this.kline.rect[1] + this.kline.rect[3]);
            this.linearGradient.addColorStop(0, 'rgba(48, 106, 218, 0.3)');
            this.linearGradient.addColorStop(1, 'rgba(48, 106, 218, 0)');
        }
        this.stage.add(new Path({
            points,
            style: {
                strokeStyle: 'rgba(48, 106, 218, 1)'
            }
        }));
        this.stage.add(new Path({
            points: _points,
            style: {
                fillStyle: this.linearGradient,
                strokeStyle: 'rgba(48, 106, 218, 0)'
            }
        }));
    }
    drawKlineAxis(dataList: Array<number> = []) {
        this.stage.add(new Path({
            points: [[this.kline.rect[0], this.kline.rect[1]], [this.kline.rect[0], this.kline.rect[1] + this.kline.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        this.stage.add(new Path({
            points: [[this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1]], [this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1] + this.kline.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        this.stage.add(new Path({
            points: [[this.kline.rect[0], this.kline.rect[1] + this.kline.rect[3]], [this.kline.rect[0] + this.kline.rect[2], this.kline.rect[1] + this.kline.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0], this.kline.height], [this.kline.rect[0] + this.kline.rect[2], this.kline.height]],
        //     style: {
        //         strokeStyle: 'red'
        //     }
        // }));
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getYByKlineValue(dataList[i]);
            if (i > 0) {
                this.stage.add(new Path({
                    points: [[this.kline.rect[0], pos], [this.kline.rect[0] + this.kline.rect[2], pos]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
            }
            const text = dataList[i].toFixed(this.decimal);
            this.stage.add(new Text({
                text,
                x: this.kline.rect[0] - this.textPadding[1],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'right'
                }
            }));
            this.stage.add(new Text({
                text,
                x: this.kline.rect[0] + this.kline.rect[2] + this.textPadding[3],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'left'
                }
            }));
        }
    }
    drawVolumeAxis(dataList: Array<number> = []) {
        this.stage.add(new Path({
            points: [[this.volume.rect[0], this.volume.rect[1]], [this.volume.rect[0], this.volume.rect[1] + this.volume.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        this.stage.add(new Path({
            points: [[this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1]], [this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1] + this.volume.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        this.stage.add(new Path({
            points: [[this.volume.rect[0], this.volume.rect[1] + this.volume.rect[3]], [this.volume.rect[0] + this.volume.rect[2], this.volume.rect[1] + this.volume.rect[3]]],
            style: {
                strokeStyle: 'rgba(0, 0, 0, 1)'
            }
        }));
        // this.stage.add(new Path({
        //     points: [[this.kline.rect[0], this.volume.y + this.volume.height], [this.kline.rect[0] + this.volume.rect[2], this.volume.y + this.volume.height]],
        //     style: {
        //         strokeStyle: 'red'
        //     }
        // }));
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getYByVolumeValue(dataList[i]);
            if (i > 0) {
                this.stage.add(new Path({
                    points: [[this.volume.rect[0], pos], [this.volume.rect[0] + this.volume.rect[2], pos]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
            }
            const text = dataList[i] === 0 ? '0' : formatNumberWithUnit(dataList[i]);
            this.stage.add(new Text({
                text,
                x: this.volume.rect[0] - this.textPadding[1],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'right'
                }
            }));
            this.stage.add(new Text({
                text,
                x: this.volume.rect[0] + this.volume.rect[2] + this.textPadding[3],
                y: pos,
                style: {
                    font: this.font,
                    fillStyle: 'rgba(0, 0, 0, 1)',
                    textAlign: 'left'
                }
            }));
        }
    }
    drawData(dataList: Array<any> = []) {
        const dateTextWidth = this.stage.ctx.measureText('2025-05-22').width;
        // const count = this.end - this.start + 1;
        const count = dataList.length;
        const dateTextGrap = Math.floor(count / (this.kline.rect[2] / (dateTextWidth + this.textPadding[1] + this.textPadding[3]))) * 2;
        this.boxWidth = (this.kline.rect[2] - 2 * this.offset[0] - (count - 1) * this.boxGrap) / count;

        const volumeMinPos = this.getYByVolumeValue(0);
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getXByKlineIndex(i);
            if (i % dateTextGrap === 0) {
                // if (i > 0) {
                this.stage.add(new Path({
                    points: [[pos, this.kline.rect[1]], [pos, this.kline.rect[1] + this.kline.rect[3]]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
                // this.stage.add(new Path({
                //     points: [[pos, this.volume.rect[1]], [pos, this.volume.rect[1] + this.volume.rect[3]]],
                //     style: {
                //         strokeStyle: 'rgba(0, 0, 0, 0.1)'
                //     }
                // }));
                // }
                this.stage.add(new Text({
                    text: dataList[i]['date'],
                    x: pos,
                    y: this.kline.rect[1] + this.kline.rect[3] + this.textPadding[0],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign: 'left',
                        textBaseline: 'top'
                    }
                }));
                // this.stage.add(new Text({
                //     text: dataList[i]['date'],
                //     x: pos,
                //     y: this.volume.rect[1] + this.volume.rect[3] + this.textPadding[0] + this.xFontHeight,
                //     style: {
                //         font: this.font,
                //         fillStyle: 'rgba(0, 0, 0, 1)',
                //         textAlign: 'left'
                //     }
                // }));
            }

            let close = dataList[i]['close'];
            if (close === undefined || close === null) {
                close = dataList[i]['current'];
            }
            let open = dataList[i]['open'];
            let high = dataList[i]['high'];
            let low = dataList[i]['low'];
            let prev = dataList[i]['prev'];
            if (prev === undefined || prev === null) {
                prev = dataList[i]['pre_close'];
            }
            const highY = this.getYByKlineValue(high);
            const lowY = this.getYByKlineValue(low);
            const closeY = this.getYByKlineValue(close);
            const openY = this.getYByKlineValue(open);

            let color = 'rgba(102, 102, 102, 1)';
            if (prev > close) {
                color = 'rgba(3,123,102,1)';
            } else if (prev < close) {
                color = 'rgba(214,10,34,1)';
            }
            // if (close >= open) {
            //     color = 'rgba(214,10,34,1)';
            // } else if (close < open) {
            //     color = 'rgba(3,123,102,1)';
            // }
            const x = pos - this.boxWidth / 2;
            const w = this.boxWidth;
            let y = openY;
            if (open === close) {
                this.stage.add(new Path({
                    points: [[x, y], [x + this.boxWidth, y]],
                    style: {
                        strokeStyle: color
                    }
                }));
                this.stage.add(new Path({
                    points: [[pos, highY], [pos, lowY]],
                    style: {
                        strokeStyle: color
                    }
                }));
            } else {
                let h = (close - open) / this.kline.yScale;
                y = closeY;
                // let top = y;
                // let bottom = openY;
                if (h > 0) {
                    // 实心
                    y = closeY;
                    // y = top = closeY;
                    // bottom = openY;
                } else if (h < 0) {
                    // 空心
                    y = openY;
                    // y = top = openY;
                    // bottom = closeY;
                }
                h = Math.abs(h);
                // if (close < prev && high > prev) {
                //     drawStrokRect(this.context, x, y, w, h, {
                //         'strokeStyle': 'rgba(214,10,34,1)'
                //     });
                // } else {
                //     drawRect(this.context, x, y, w, h, {
                //         'fillStyle': color
                //     });
                // }
                this.stage.add(new Rect({
                    x,
                    y,
                    width: w,
                    height: h,
                    style: {
                        fillStyle: color
                        // strokeStyle: 'rgba(0, 0, 0, 0)',
                        // strokeWidth: 1
                    }
                }));
                this.stage.add(new Path({
                    points: [[pos, highY], [pos, y]],
                    style: {
                        strokeStyle: color
                    }
                }));
                this.stage.add(new Path({
                    points: [[pos, y + h], [pos, lowY]],
                    style: {
                        strokeStyle: color
                    }
                }));
            }
            let valueXY = [[pos, highY], [pos - this.boxWidth * 4, highY]];
            let valueTextXY = [pos - this.boxWidth * 4, highY];
            let textAlign = 'right';
            let textBaseline  = 'middle';
            if (high === this.kline.maxY) {
                if (i <= count / 2) {
                    valueXY = [[pos, highY], [pos + this.boxWidth * 4, highY]];
                    valueTextXY = [pos + this.boxWidth * 4, highY];
                    textAlign = 'left';
                }
                this.stage.add(new Path({
                    points: valueXY,
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 1)'
                    }
                }));
                this.stage.add(new Text({
                    text: high.toFixed(this.decimal),
                    x: valueTextXY[0],
                    y: valueTextXY[1],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign,
                        textBaseline
                    }
                }));
            }
            valueXY = [[pos, lowY], [pos - this.boxWidth * 4, lowY]];
            valueTextXY = [pos - this.boxWidth * 4, lowY];
            textAlign = 'right';
            if (low === this.kline.minY) {
                if (i <= count / 2) {
                    valueXY = [[pos, lowY], [pos + this.boxWidth * 4, lowY]];
                    valueTextXY = [pos + this.boxWidth * 4, lowY];
                    textAlign = 'left';
                }
                this.stage.add(new Path({
                    points: valueXY,
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 1)'
                    }
                }));
                this.stage.add(new Text({
                    text: low.toFixed(this.decimal),
                    x: valueTextXY[0],
                    y: valueTextXY[1],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign,
                        textBaseline
                    }
                }));
            }


            // const volumeDateTextGrap = Math.floor(this._count / (this.volume.rect[2] / (dateTextWidth + this.textPadding[1] + this.textPadding[3]))) * 2;
            // this.boxWidth = (this.volume.rect[2] - 2 * this.offset[0] - (this._count - 1) * this.boxGrap) / this._count;
            const volumePos = this.getXByVolumeIndex(i);
            const volume = dataList[i]['volume'];
            const volumeX = volumePos - this.boxWidth / 2;
            const volumeY = this.getYByVolumeValue(volume);
            const volumeW = this.boxWidth;
            if (i % dateTextGrap === 0) {
                // if (i > 0) {
                this.stage.add(new Path({
                    points: [[volumePos, this.volume.rect[1]], [volumePos, this.volume.rect[1] + this.volume.rect[3]]],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.1)'
                    }
                }));
                // }
                this.stage.add(new Text({
                    text: dataList[i]['date'],
                    x: volumePos,
                    y: this.volume.rect[1] + this.volume.rect[3] + this.textPadding[0],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(0, 0, 0, 1)',
                        textAlign: 'left',
                        textBaseline: 'top'
                    }
                }));
            }
            this.stage.add(new Rect({
                x: volumeX,
                y: volumeY,
                width: volumeW,
                height: volumeMinPos - volumeY,
                style: {
                    fillStyle: color
                    // strokeStyle: 'rgba(0, 0, 0, 0)',
                    // strokeWidth: 1
                }
            }));

        }
    }
    drawKlineMa(dataList: Array<any> = []) {
        // const copyData = dataList.slice();
        // const maData = getMaByClose(copyData);
        // const _maData = maData.slice(-this._count);
        const maObj: any = {
            MA5: [],
            MA10: [],
            MA20: [],
            MA30: [],
            MA60: []
        };
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getXByKlineIndex(i);
            if (dataList[i][1] !== '-') {
                maObj.MA5.push([pos, this.getYByKlineValue(dataList[i][1])]);
            }
            if (dataList[i][2] !== '-') {
                maObj.MA10.push([pos, this.getYByKlineValue(dataList[i][2])]);
            }
            if (dataList[i][3] !== '-') {
                maObj.MA20.push([pos, this.getYByKlineValue(dataList[i][3])]);
            }
            if (dataList[i][4] !== '-') {
                maObj.MA30.push([pos, this.getYByKlineValue(dataList[i][4])]);
            }
            if (dataList[i][5] !== '-') {
                maObj.MA60.push([pos, this.getYByKlineValue(dataList[i][5])]);
            }
        }
        let index = 0;
        for (let key in maObj) {
            this.stage.add(new Path({
                points: maObj[key],
                style: {
                    strokeStyle: this.MA_OPTIONS[index].color
                }
            }));
            index++;
        }
        // this.stage.add(new Path({
        //     points: maObj.ma5,
        //     style: {
        //         strokeStyle: this.MA_OPTIONS[0].color
        //     }
        // }));

        // this.stage.add(new Path({
        //     points: maObj.ma10,
        //     style: {
        //         strokeStyle: this.MA_OPTIONS[1].color
        //     }
        // }));

        // this.stage.add(new Path({
        //     points: maObj.ma20,
        //     style: {
        //         strokeStyle: this.MA_OPTIONS[2].color
        //     }
        // }));

        // this.stage.add(new Path({
        //     points: maObj.ma30,
        //     style: {
        //         strokeStyle: this.MA_OPTIONS[3].color
        //     }
        // }));

        // this.stage.add(new Path({
        //     points: maObj.ma60,
        //     style: {
        //         strokeStyle: this.MA_OPTIONS[4].color
        //     }
        // }));
    }
    drawVolumeMa(dataList: Array<any> = []) {
        const maObj: any = {
            ma5: [],
            ma10: []
        };
        for (let i = 0; i < dataList.length; i++) {
            const pos = this.getXByVolumeIndex(i);
            if (dataList[i][1] !== '-') {
                maObj.ma5.push([pos, this.getYByVolumeValue(dataList[i][1])]);
            }
            if (dataList[i][2] !== '-') {
                maObj.ma10.push([pos, this.getYByVolumeValue(dataList[i][2])]);
            }
        }
        this.stage.add(new Path({
            points: maObj.ma5,
            style: {
                strokeStyle: '#A0A0A0'
            }
        }));
        this.stage.add(new Path({
            points: maObj.ma10,
            style: {
                strokeStyle: '#DD9900'
            }
        }));
    }
    drawKlineMaLabel(maItem: Array<any> = []) {
        const [dateStr, ...maArr] = maItem;
        const arr = maArr.map((item: any, index: number) => {
            return {
                name: this.MA_OPTIONS[index].name,
                value: item,
                color: this.MA_OPTIONS[index].color
            };
        }).sort((a: any, b: any) => {
            return b.value - a.value;
        });
        let w = 0;
        const titleWidth = this.titleWidth > 0 ? this.titleWidth + 10 : 0;
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i].value !== '-' ? arr[i].value.toFixed(this.decimal) : arr[i].value;
            const text = `${ arr[i].name }: ${ v }`;
            this.stage.add(new Text({
                text,
                x: this.kline.rect[0] + titleWidth + w,
                y: this.kline.y + this.xFontHeight + this.textPadding[0],
                style: {
                    font: this.font,
                    fillStyle: arr[i].color,
                    textAlign: 'left',
                    textBaseline: 'middle'
                }
            }));
            w = w + this.stage.ctx.measureText(text).width + 20;
        }
    }
    drawVolumeMaLabel(maItem: Array<any> = []) {
        const [dateStr, ...maArr] = maItem;
        const arr = maArr.map((item: any, index: number) => {
            return {
                name: this.MA_OPTIONS[index].name,
                value: item,
                color: this.MA_OPTIONS[index].color
            };
        }).sort((a: any, b: any) => {
            return b.value - a.value;
        });
        let w = 0;
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i].value !== '-' ? formatNumberWithUnit(arr[i].value) : arr[i].value;
            const text = `${ arr[i].name }: ${ v }`;
            this.stage.add(new Text({
                text,
                x: this.volume.rect[0] + w,
                y: this.volume.y + this.xFontHeight + this.textPadding[0],
                style: {
                    font: this.font,
                    fillStyle: arr[i].color,
                    textAlign: 'left',
                    textBaseline: 'middle'
                }
            }));
            w = w + this.stage.ctx.measureText(text).width + 24;
        }
    }
    drawTitle() {
        if (this.title !== null && this.title !== undefined) {
            this.stage.ctx.save();
            this.stage.ctx.font = '16px sans-serif';
            this.titleWidth = this.stage.ctx.measureText(this.title).width;
            this.stage.ctx.restore();
            this.stage.add(new Text({
                text: this.title,
                x: this.kline.rect[0],
                y: this.kline.y + 11 + this.textPadding[0],
                style: {
                    font: '16px sans-serif',
                    fillStyle: 'rgba(0, 0, 0, 0.88)',
                    textAlign: 'left',
                    textBaseline: 'middle'
                }
            }));
            // this.stage.add(new Text({
            //     text: this.title,
            //     x: this.volume.rect[0],
            //     y: this.volume.y + 11 + this.textPadding[0],
            //     style: {
            //         font: '16px sans-serif',
            //         fillStyle: 'rgba(0, 0, 0, 0.88)',
            //         textAlign: 'left',
            //         textBaseline: 'middle'
            //     }
            // }));
        } else {
            this.titleWidth = 0;
        }
    }
    drawCursor() {
        if (this.kline.cursorIndex !== null) {
            const klineX = this.getXByKlineIndex(this.kline.cursorIndex);
            let klineItem = this._data[this.kline.cursorIndex];
            const klineMaItem = this.kline.maData[this.kline.cursorIndex];
            this.stage.add(new Path({
                points: [
                    [klineX, this.kline.rect[1]], 
                    [klineX, this.kline.rect[1] + this.kline.rect[3]]
                ],
                style: {
                    strokeStyle: 'rgba(0, 0, 0, 0.6)',
                    lineWidth: 1,
                    setLineDash: [3, 2]
                }
            }));
            if (klineItem) {
                let klineDateTextWidth = this.stage.ctx.measureText(klineItem['date']).width + this.textPadding[1] + this.textPadding[3];
                this.stage.add(new Rect({
                    x: klineX - klineDateTextWidth / 2,
                    y: this.kline.rect[1] + this.kline.rect[3] + this.textPadding[0] - 3,
                    width: klineDateTextWidth,
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: 'rgba(102, 102, 102, 0.8)',
                        // strokeStyle: 'rgba(0, 0, 0, 1)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: klineItem['date'],
                    x: klineX - klineDateTextWidth / 2 + this.textPadding[3] / 2 + 1,
                    y: this.kline.rect[1] + this.kline.rect[3] + this.xFontHeight + this.textPadding[0],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'left'
                    }
                }));

                const klineY = this.getYByKlineValue(klineItem['current']);
                let color = 'rgba(102,102,102,0.8)';
                if (klineItem['price'] < 0) {
                    color = 'rgba(3,123,102,0.8)';
                } else if (klineItem['price'] > 0) {
                    color = 'rgba(214,10,34,0.8)';
                }
                this.stage.add(new Path({
                    points: [
                        [this.kline.rect[0], klineY], 
                        [this.kline.rect[0] + this.kline.rect[2], klineY]
                    ],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        lineWidth: 1,
                        setLineDash: [3, 2]
                    }
                }));
                this.stage.add(new Rect({
                    x: 0,
                    y: klineY - (this.xFontHeight + 10) / 2,
                    width: this.kline.rect[0],
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: color,
                        // strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: (klineItem['current']).toFixed(this.decimal),
                    x: this.kline.rect[0] - this.textPadding[1],
                    y: klineY + 5,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'right'
                    }
                }));

                this.stage.add(new Rect({
                    x: this.kline.rect[0] + this.kline.rect[2],
                    y: klineY - (this.xFontHeight + 10) / 2,
                    width: this.kline.rect[0],
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: color,
                        // strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: `${klineItem['price']}%`,
                    x: this.kline.rect[0] + this.kline.rect[2] + this.textPadding[3],
                    y: klineY + 5,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'left'
                    }
                }));
                if (this.type === 'day') {
                    if (klineMaItem) {
                        this.drawKlineMaLabel(klineMaItem);
                    }
                }
            }
            
        }
        if (this.volume.cursorIndex !== null) {
            const volumeX = this.getXByVolumeIndex(this.volume.cursorIndex);
            let volumeItem = this._data[this.volume.cursorIndex];
            const volumeMaItem = this.volume.maData[this.volume.cursorIndex]
            this.stage.add(new Path({
                points: [
                    [volumeX, this.volume.rect[1]], 
                    [volumeX, this.volume.rect[1] + this.volume.rect[3]]
                ],
                style: {
                    strokeStyle: 'rgba(0, 0, 0, 0.6)',
                    lineWidth: 1,
                    setLineDash: [3, 2]
                }
            }));
            if (volumeItem) {
                let volumeDateTextWidth = this.stage.ctx.measureText(volumeItem['date']).width + this.textPadding[1] + this.textPadding[3];
                this.stage.add(new Rect({
                    x: volumeX - volumeDateTextWidth / 2,
                    y: this.volume.rect[1] + this.volume.rect[3] + this.textPadding[0] - 3,
                    width: volumeDateTextWidth,
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: 'rgba(102, 102, 102, 0.8)',
                        // strokeStyle: 'rgba(0, 0, 0, 1)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: volumeItem['date'],
                    x: volumeX - volumeDateTextWidth / 2 + this.textPadding[3] / 2 + 1,
                    y: this.volume.rect[1] + this.volume.rect[3] + this.xFontHeight + this.textPadding[0],
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'left'
                    }
                }));

                const volumeY = this.getYByVolumeValue(volumeItem['volume']);
                const volumeStr = formatNumberWithUnit(volumeItem['volume']);
                let color = 'rgba(102,102,102,0.8)';
                if (this.type === 'hour') {
                    if (volumeItem['type'] === 1) {
                        color = 'rgba(3,123,102,0.8)';
                    } else if (volumeItem['type'] === 2) {
                        color = 'rgba(214,10,34,0.8)';
                    }
                } else if (this.type === 'day') {
                    if (volumeItem['price'] < 0) {
                        color = 'rgba(3,123,102,0.8)';
                    } else if (volumeItem['price'] > 0) {
                        color = 'rgba(214,10,34,0.8)';
                    }
                }
                this.stage.add(new Path({
                    points: [
                        [this.volume.rect[0], volumeY], 
                        [this.volume.rect[0] + this.volume.rect[2], volumeY]
                    ],
                    style: {
                        strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        lineWidth: 1,
                        setLineDash: [3, 2]
                    }
                }));
                this.stage.add(new Rect({
                    x: 0,
                    y: volumeY - (this.xFontHeight + 10) / 2,
                    width: this.volume.rect[0],
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: color,
                        // strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: volumeStr,
                    x: this.volume.rect[0] - this.textPadding[1],
                    y: volumeY + 5,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'right'
                    }
                }));
                
                this.stage.add(new Rect({
                    x: this.volume.rect[0] + this.volume.rect[2],
                    y: volumeY - (this.xFontHeight + 10) / 2,
                    width: this.volume.rect[0],
                    height: this.xFontHeight + 10,
                    style: {
                        fillStyle: color,
                        // strokeStyle: 'rgba(0, 0, 0, 0.6)',
                        strokeWidth: 1
                    }
                }));
                this.stage.add(new Text({
                    text: volumeStr,
                    x: this.volume.rect[0] + this.volume.rect[2] + this.textPadding[3],
                    y: volumeY + 5,
                    style: {
                        font: this.font,
                        fillStyle: 'rgba(255, 255, 255, 1)',
                        textAlign: 'left'
                    }
                }));
            }
            if (this.type === 'day') {
                if (volumeMaItem) {
                    this.drawVolumeMaLabel(volumeMaItem);
                }
            }
        }
    }
}

export default Kline;