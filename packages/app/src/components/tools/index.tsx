import React from 'react';
import { CLASSNAME } from '@/config';
import './index.less';

type ToolsProps = {
    label?: React.ReactNode;
    menus?: Array<any>;
    /** 右侧「···」 */
    onMoreClick?: (e: React.MouseEvent) => void;
    /** 右侧「+」新建 */
    onCreateClick?: (e: React.MouseEvent) => void;
}

export const Tools: React.FC<ToolsProps> = props => {
    const {
        label,
        onMoreClick,
        onCreateClick,
    } = props;

    return (
        <div className={`${CLASSNAME}-tools`}>
            <div className={`${CLASSNAME}-tools-label`}>{label}</div>
            <div className={`${CLASSNAME}-tools-content`}>
                <span className={`${CLASSNAME}-tools-icon`} onClick={onMoreClick} role="presentation">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M597 512.014q0 35-25 60t-60 25-60-25-25-60 25-60 60-25 60 25 25 60m299 0q0 35-25 60t-60 25q-36 0-61-25t-25-60 25-60 61-25q35 0 60 25t25 60m-597 0q0 35-25 60t-61 25q-35 0-60-25t-25-60 25-60 60-25q36 0 61 25t25 60"/></svg>
                </span>
                <span className={`${CLASSNAME}-tools-icon`} onClick={onCreateClick} role="presentation">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M811 469.014H555v-256q0-19-12-30.5t-31-11.5-31 11.5-12 30.5v256H213q-19 0-30.5 12t-11.5 31 11.5 31 30.5 12h256v256q0 19 12 30.5t31 11.5 31-11.5 12-30.5v-256h256q19 0 30.5-12t11.5-31-11.5-31-30.5-12"/></svg>
                </span>
            </div>
        </div>
    );
}

export default Tools;