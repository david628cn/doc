import React, { useEffect, useRef, useState } from 'react';
import { Kline } from './klineChart';
import styles from './index.module.less';

// const getPosByDom = (dom: any) => {
//     let xy = dom.style.transform.split(/[(|,|)]/g);
//     return {
//         x: parseFloat(xy[1]),
//         y: parseFloat(xy[2])
//     };
// }
// const setPos = (dom: any, pos: Array<number>) => {
//     dom.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
//     //dom.style.left = pos[0] + 'px';
//     //dom.style.top = pos[1] + 'px';
// }

interface KlinesProps {
    title?: string;
    data?: Array<any>;
    count?: number;
    type?: string;
    preClose?: number;
    axisXPos?: Array<number>;
    axisYPos?: Array<number>;
}

const Klines: React.FC<KlinesProps> = props => {
    const [data, setData] = useState<Array<any>>(props.data || []);
    const [preClose, setPreClose] = useState<any>(props.preClose);
    const [title, setTitle] = useState(props.title);
    // const [axisXPos, setAxisXPos] = useState<Array<any>>(props.axisXPos || [0, 0]);
    // const [axisYPos, setAxisYPos] = useState<Array<any>>(props.axisYPos || [0, 0]);
    const containerRef = useRef<any>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!chartRef.current) {
            chartRef.current = new Kline({
                container: containerRef.current,
                count: props.count,
                type: props.type,
                preClose: props.preClose,
                onMouseMove: ({
                    offsetXY
                }: any) => {
                    // console.log('pageXY', pageXY);
                    // setAxisXPos([offsetXY[0], 0]);
                    // setAxisYPos([0, offsetXY[1]]);
                }
            });
            // console.log(data);
            // chartRef.current.load(data);
        }
        // console.log('chartRef.current', chartRef.current, data);
        chartRef.current.load(data);
    }, []);

    useEffect(() => {
        const newData = props.data || [];
        const newPreClose = props.preClose;
        const newTitle = props.title;
        setPreClose(newPreClose);
        setTitle(newTitle);
        setData(newData);
        if (chartRef.current) {
            chartRef.current.setTitle(newTitle);
            chartRef.current.setPreClose(newPreClose);
            chartRef.current.load(newData);
        }
    }, [props.data, props.preClose, props.title]);

    // useEffect(() => {
    //     const newPreClose = props.preClose || 0;
    //     setPreClose(newPreClose);
    //     if (chartRef.current) {
    //         chartRef.current.setPreClose(newPreClose);
    //     }
    // }, [props.preClose]);

    return (
        <div className={styles['kline-container']} ref={containerRef}>
            {/* <div className={styles['kline-axis-x']} style={{
                transform: `translate(${axisXPos[0]}px, ${axisXPos[1]}px)`
            }}></div>
            <div className={styles['kline-axis-y']} style={{
                transform: `translate(${axisYPos[0]}px, ${axisYPos[1]}px)`
            }}></div> */}
        </div>
    );
}

export default Klines;