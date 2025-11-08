import { useEffect, useState } from 'react';
import ToolbarBase, { Separator, Space } from '../ToolbarBase';
import FormatButton from '../FormatButton';
import FormatDropdown from '../FormatDropdown';
import FormatTextColor from '../FormatTextColor';
import { TOOLBAR_CONFIG } from '../config';
import './index.less';

interface MarkBarProps {
    data?: any;
    onSelect?: Function;
}

const MarkBar: React.FC<MarkBarProps> = props => {
    const { data = {}, onSelect } = props;

    // useEffect(() => {
    //     setActiveKeys(getActiveKeys(active));
    // }, [active]);

    const handleClickTextColor = (action: string, v: any, ds: any) => {
        handleClickFunc(action, v);
    }

    const handleClick = (key: any) => {
        return (params: any) => {
            handleClickFunc(key, params);
        }
    }

    const handleClickFunc = (key: string, value?: any) => {
        onSelect?.(key, value);
    }

    return (
        <FormatButton.Group>
            <FormatButton
                title={TOOLBAR_CONFIG['bold']['label']}
                active={data['bold']}
                onClick={handleClick(TOOLBAR_CONFIG['bold']['key'])}
            >
                {TOOLBAR_CONFIG['bold']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['italic']['label']}
                active={data['italic']}
                onClick={handleClick(TOOLBAR_CONFIG['italic']['key'])}
            >
                {TOOLBAR_CONFIG['italic']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['strikethrough']['label']}
                active={data['strikethrough']}
                onClick={handleClick(TOOLBAR_CONFIG['strikethrough']['key'])}
            >
                {TOOLBAR_CONFIG['strikethrough']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['code']['label']}
                active={data['code']}
                onClick={handleClick(TOOLBAR_CONFIG['code']['key'])}
            >
                {TOOLBAR_CONFIG['code']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['underlined']['label']}
                active={data['underlined']}
                onClick={handleClick(TOOLBAR_CONFIG['underlined']['key'])}
            >
                {TOOLBAR_CONFIG['underlined']['icon']}
            </FormatButton>
            <FormatTextColor
                value={{
                    color: data['color'],
                    highlight: data['highlight']
                }}
                title={TOOLBAR_CONFIG['color']['label']}
                onSelect={handleClickTextColor}
            />
            <FormatButton
                title={TOOLBAR_CONFIG['link']['label']}
                active={data['link']}
                onClick={handleClick(TOOLBAR_CONFIG['link']['key'])}
            >
                {TOOLBAR_CONFIG['link']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['superscript']['label']}
                active={data['superscript']}
                onClick={handleClick(TOOLBAR_CONFIG['superscript']['key'])}
            >
                {TOOLBAR_CONFIG['superscript']['icon']}
            </FormatButton>
            <FormatButton
                title={TOOLBAR_CONFIG['subscript']['label']}
                active={data['subscript']}
                onClick={handleClick(TOOLBAR_CONFIG['subscript']['key'])}
            >
                {TOOLBAR_CONFIG['subscript']['icon']}
            </FormatButton>
        </FormatButton.Group>
    );
};

export default MarkBar;