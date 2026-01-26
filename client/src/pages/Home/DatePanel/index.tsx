import React, { useEffect, useState } from 'react';
import { getPervMonthLastDays, eq } from './dateUtil';
import styles from './index.module.less';

const WEEK_ARR = [
    '一',
    '二',
    '三',
    '四',
    '五',
    '六',
    '日'
];

interface DatePanelProps {
    value?: any;
    weeks?: Array<any>;
}

const DatePanel: React.FC<DatePanelProps> = props => {
    const [value, setValue] = useState(props.value);

    useEffect(() => {
        
    }, []);

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    const handleClick = (item: any) => {
        return (e: any) => {

        }
    }

    const checkDate = (v: any) => {
        if(!v) {
            return false;
        }
        const d: any = v instanceof Date ? v : new Date(v);
        return d !== 'Invalid Date';
    }

    const renderView = (sd: any) => {
        const is = checkDate(sd);
        const nowDate = new Date();
        const v = is ? sd : nowDate;
        const arr = getPervMonthLastDays(v);
        let count = 0;
        const row = [];
        console.log(arr);
        for(let i = 1; i < 7; i++) {
            let cell = [];
            for(let j = 0; j < 7; j++) {
                let type = [styles['datePanel-day']];
                if (arr[count].type === 'pervMonth') {
                    type.push(styles['datePanel-day-perv']);
                } else if (arr[count].type === 'curMonth') {
                    type.push(styles['datePanel-day-cur']);
                } else if (arr[count].type === 'nextMonth') {
                    type.push(styles['datePanel-day-next']);
                }
                if(eq(nowDate, arr[count].value, 'day')) {
                    type.push(styles['datePanel-day-today']);
                }
                if(is && eq(sd, arr[count].value, 'day')) {
                    type.push(styles['datePanel-day-selected']);
                }
                cell.push(
                    <div 
                        key={ `${ i }-${ j }` } 
                        className={ type.join(' ') } 
                        onClick={ handleClick(arr[count]) } 
                    >
                        <div className={styles['datePanel-day-label']}>
                            { arr[count].value.getDate() }
                        </div>
                    </div>
                );
                count++;
            }
            row.push(<div className={styles['datePanel-day-row']} key={ i }>{ cell }</div>);
        }
        return row;
    }

    return (
        <div className={styles['datePanel-container']}>
            <div className={styles['datePanel-inner']}>
                <div className={styles['datePanel-header']}>
                    <div className={styles['datePanel-title']}>日期</div>
                </div>
                <div className={styles['datePanel-body']}>
                    <div className={styles['datePanel-week-content']}>
                        <div className={styles['datePanel-week-row']}>
                            {
                                (props.weeks || WEEK_ARR).map((item: any, index: number) => {
                                    return (
                                        <div className={styles['datePanel-week']} key={index}>
                                            <div className={styles['datePanel-week-label']}>{ item }</div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                    <div className={styles['datePanel-day-content']}>
                        { renderView(value) }
                    </div>
                </div>
                <div className={styles['datePanel-footer']}></div>
            </div>
            
        </div>
    );
};

export default DatePanel;