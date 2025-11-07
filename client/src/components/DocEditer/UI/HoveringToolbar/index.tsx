import { useEffect, useState } from 'react';
import ToolbarBase, { Separator, Space } from '../ToolbarBase';
import FormatButton from '../FormatButton';
import FormatDropdown from '../FormatDropdown';
import FormatTextColor from '../FormatTextColor';
import { TOOLBAR_CONFIG } from '../config';
import './index.less';

const getActiveKeys = (ds: any): Array<string> => {
    const arr: Array<any> = [];
    for (let key in ds) {
        if (ds[key]) {
            arr.push(key);
        }
    }
    return arr;
}

interface HoveringToolbarProps {
    // className?: string;
    // children?: any;
    data?: any;
    onSelect?: Function;
}

const HoveringToolbar: React.FC<HoveringToolbarProps> = props => {
    const { data = {}, onSelect } = props;
    // const [activeKeys, setActiveKeys] = useState(getActiveKeys(data));

    // useEffect(() => {
    //     setActiveKeys(getActiveKeys(active));
    // }, [active]);

    const handleSelect = (activeKey: any) => {
        return (e: any) => {
            handleClickFunc(activeKey, e.key);
        }
    }

    const handleClick = (activeKey: string) => {
        return (e: any) => {
            console.log('e', e);
            handleClickFunc(activeKey, !data[activeKey]);
        }
    }

    const handleClickFunc = (activeKey: string, value: any) => {
        // const newData = {
        //     ...data,
        //     [activeKey]: value
        // }
        onSelect?.({
            // data: newData,
            activeKey,
            value,
            group: TOOLBAR_CONFIG[activeKey]['group']
        });
    }

    return (
        <ToolbarBase>
            <Space/>
            {/* <FormatButton.Group>
                <FormatButton onClick={handleClick(TOOLBAR_CONFIG['prev']['key'], TOOLBAR_CONFIG['prev']['group'])}>
                    {TOOLBAR_CONFIG['prev']['icon']}
                </FormatButton>
                <FormatButton onClick={handleClick(TOOLBAR_CONFIG['next']['key'], TOOLBAR_CONFIG['next']['group'])}>
                    {TOOLBAR_CONFIG['next']['icon']}
                </FormatButton>
            </FormatButton.Group>
            <Separator /> */}
            <FormatButton.Group>
                <FormatDropdown
                    value={data['block']}
                    title={TOOLBAR_CONFIG['text']['label']}
                    label={TOOLBAR_CONFIG['text']['icon']}
                    items={
                        [
                            {
                                label: TOOLBAR_CONFIG['text']['label'],
                                key: TOOLBAR_CONFIG['text']['key'],
                                icon: TOOLBAR_CONFIG['text']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['heading1']['label'],
                                key: TOOLBAR_CONFIG['heading1']['key'],
                                icon: TOOLBAR_CONFIG['heading1']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['heading2']['label'],
                                key: TOOLBAR_CONFIG['heading2']['key'],
                                icon: TOOLBAR_CONFIG['heading2']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['heading3']['label'],
                                key: TOOLBAR_CONFIG['heading3']['key'],
                                icon: TOOLBAR_CONFIG['heading3']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['heading4']['label'],
                                key: TOOLBAR_CONFIG['heading4']['key'],
                                icon: TOOLBAR_CONFIG['heading4']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['bulletList']['label'],
                                key: TOOLBAR_CONFIG['bulletList']['key'],
                                icon: TOOLBAR_CONFIG['bulletList']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['orderedList']['label'],
                                key: TOOLBAR_CONFIG['orderedList']['key'],
                                icon: TOOLBAR_CONFIG['orderedList']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['taskList']['label'],
                                key: TOOLBAR_CONFIG['taskList']['key'],
                                icon: TOOLBAR_CONFIG['taskList']['icon']
                            },

                            {
                                label: TOOLBAR_CONFIG['blockquote']['label'],
                                key: TOOLBAR_CONFIG['blockquote']['key'],
                                icon: TOOLBAR_CONFIG['blockquote']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['codeBlock']['label'],
                                key: TOOLBAR_CONFIG['codeBlock']['key'],
                                icon: TOOLBAR_CONFIG['codeBlock']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['table']['label'],
                                key: TOOLBAR_CONFIG['table']['key'],
                                icon: TOOLBAR_CONFIG['table']['icon']
                            }
                        ]
                    }
                    onSelect={handleSelect('block')}
                />
            </FormatButton.Group>
            <Separator />
            <FormatButton.Group>
                <FormatDropdown
                    value={data['align']}
                    title={TOOLBAR_CONFIG['alignLeft']['label']}
                    label={TOOLBAR_CONFIG['alignLeft']['icon']}
                    items={
                        [
                            {
                                label: TOOLBAR_CONFIG['alignLeft']['label'],
                                key: TOOLBAR_CONFIG['alignLeft']['key'],
                                icon: TOOLBAR_CONFIG['alignLeft']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['alignCenter']['label'],
                                key: TOOLBAR_CONFIG['alignCenter']['key'],
                                icon: TOOLBAR_CONFIG['alignCenter']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['alignRight']['label'],
                                key: TOOLBAR_CONFIG['alignRight']['key'],
                                icon: TOOLBAR_CONFIG['alignRight']['icon']
                            },
                            {
                                label: TOOLBAR_CONFIG['alignJustify']['label'],
                                key: TOOLBAR_CONFIG['alignJustify']['key'],
                                icon: TOOLBAR_CONFIG['alignJustify']['icon']
                            }
                        ]
                    }
                    onSelect={handleSelect('align')}
                />
            </FormatButton.Group>            
            <Separator />
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
                    value={data['textColor']}
                    title={TOOLBAR_CONFIG['textColor']['label']}
                    onSelect={handleClick(TOOLBAR_CONFIG['textColor']['key'])}
                />
                <FormatButton 
                    title={TOOLBAR_CONFIG['link']['label']} 
                    active={data['link']} 
                    onClick={handleClick(TOOLBAR_CONFIG['link']['key'])}
                >
                    {TOOLBAR_CONFIG['link']['icon']}
                </FormatButton>
                <FormatButton 
                    title={TOOLBAR_CONFIG['image']['label']} 
                    active={data['image']} 
                    onClick={handleClick(TOOLBAR_CONFIG['image']['key'])}
                >
                    {TOOLBAR_CONFIG['image']['icon']}
                </FormatButton>
            </FormatButton.Group>
            <Separator />
            <FormatButton.Group>
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
            <Space/>
            {/* <FormatButton.Group>
                <FormatButton 
                    title={TOOLBAR_CONFIG['light']['label']} 
                    active={data['light']} 
                    onClick={handleClick(TOOLBAR_CONFIG['light']['key'])}
                >
                    {TOOLBAR_CONFIG['light']['icon']}
                </FormatButton>
                <FormatButton 
                    title={TOOLBAR_CONFIG['dark']['label']} 
                    active={data['dark']} 
                    onClick={handleClick(TOOLBAR_CONFIG['dark']['key'])}
                >
                    {TOOLBAR_CONFIG['dark']['icon']}
                </FormatButton>
            </FormatButton.Group>
            <FormatButton.Group>
                <FormatButton>
                    <span className="docEditer-toolbarBase-avatar">
                        <span className="docEditer-toolbarBase-avatar-item">
                            <img className="docEditer-toolbarBase-avatar-image" src="./images/memoji_10.png" />
                        </span>
                    </span>
                </FormatButton>
            </FormatButton.Group> */}
        </ToolbarBase>
    );
};

export default HoveringToolbar;