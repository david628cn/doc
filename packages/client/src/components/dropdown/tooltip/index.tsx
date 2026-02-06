import React, { type ReactNode } from 'react';
import { CLASSNAME } from '@/global';
import './index.less';
import { Dropdown } from '../dropdown';

export type TooltipProps = {
    className?: string;
    defaultOpen?: boolean;
    open?: boolean;
    trigger?: string | Array<string>;
    // hideTrigger?: string | Array<string>;
    title?: ReactNode;
    placement?: string;
    offset?: Array<number>;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    onChange?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const Tooltip: React.FC<TooltipProps> = props => {
    return <Dropdown 
            gap={10}
            placement={'b-t'}
            {...props} 
            items={props.title} 
            trigger={'hover'}
            className={`${CLASSNAME}-tooltip-container`}
        >{props.children}</Dropdown>;
}