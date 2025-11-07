// import { useEffect, useState } from 'react';
// import {
//     Button,
//     Dropdown
// } from 'antd';

import './index.less';

interface ToolbarBaseProps {
    className?: string;
    children?: any;
}

const ToolbarBase: React.FC<ToolbarBaseProps> = props => {
    const { className, children } = props;

    let cls: any = ['docEditer-toolbarBase-container'];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return <div className={cls}>{ children }</div>;
};

export const Separator = () => <div className="docEditer-toolbarBase-separator"></div>;
export const Space = () => <div className="docEditer-toolbarBase-space"></div>;

export default ToolbarBase;