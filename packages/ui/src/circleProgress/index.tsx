import React from 'react';
import { CLASSNAME } from '../config';
import './index.less';

export type CircleProgressProps = {
    radius?: number;
    percent?: number;
    strokeWidth?: number;
    type?: 'hash' | 'uploading' | 'idle';
    status?: 'active' | 'paused' | 'error' | 'success';
    style?: React.CSSProperties;
}

export const CircleProgress: React.FC<CircleProgressProps> = ({ strokeWidth = 8, percent = 0, type = 'hash', radius = 20, status }) => {
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    // 根據狀態決定顏色 Class
    const getStatusClass = () => {
        if (status === 'success') return `${CLASSNAME}-circle-progress-status-upload`;
        if (status === 'paused') return `${CLASSNAME}-circle-progress-status-pause`;
        if (status === 'error') return `${CLASSNAME}-circle-progress-status-error`;
        return type === 'hash' ? `${CLASSNAME}-circle-progress-status-hash` : `${CLASSNAME}-circle-progress-status-upload`;
    };

    // const labelMap = {
    //     hash: '校检中...',
    //     uploading: '上传中...',
    //     idle: '等待中'
    // };

    return (
        <div className={`${CLASSNAME}-circle-progress ${status === 'success' ? `${CLASSNAME}-circle-pprogress-pcompleted` : ''}`}>
            <div className={`${CLASSNAME}-circle-progress-inner`}>
                <svg className={`${CLASSNAME}-circle-progress-svg`} width="1em" height="1em" viewBox="0 0 100 100">
                    <circle 
                        className={`${CLASSNAME}-circle-progress-circle-bg`}
                        cx="50" 
                        cy="50" r={radius} 
                        fill="none" 
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        className={`${CLASSNAME}-circle-progress-active ${getStatusClass()}`}
                        cx="50" 
                        cy="50" 
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference} // 必须：总长度
                        strokeDashoffset={offset}       // 偏移量
                        // strokeLinecap="round"           // 让边缘圆润
                        transform="rotate(-90 50 50)"   // 从顶部开始
                    />
                </svg>
                <div className={`${CLASSNAME}-circle-progress-content`}>
                    {Math.floor(percent)}%
                    {/* <svg className={`${CLASSNAME}-circle-progress-success-tick`} viewBox="0 0 24 24">
                        <path d="M4.1 12.7L9 17.6 20.3 6.3" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg> */}
                </div>
                {/* <p className={`${CLASSNAME}-circle-progress-status-label`}>
                    {status === 'success' ? '上傳成功' : (status === 'paused' ? '已暫停' : labelMap[type])}
                </p> */}
            </div>
            
        </div>
    );
};

export * from './baseCircleProgress';