import { useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { DropdownMenu } from '@/components/dropdownMenu';
import { TextColorDropdown } from '@/components/textColor';
import { CLASSNAME } from '@/global';
import { 
    TextIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    Heading4Icon,
    BulletListIcon,
    OrderedListIcon,
    TaskListIcon,
    BlockquoteIcon,
    CodeBlockIcon,
    TableIcon,
    AlignLeftIcon,
    AlignCenterIcon,
    AlignRightIcon,
    AlignJustifyIcon,
    BoldIcon,
    ItalicIcon,
    StrikethroughIcon,
    UnderlinedIcon,
    LinkIcon,
    CodeIcon,
    SuperscriptIcon,
    SubscriptIcon
    // LightIcon, 
    // DarkIcon
 } from '@/assets/Icon';
import './index.less';

export type ToolbarBaseProps = {
    className?: string;
    children?: any;
}

export const ToolbarBase: React.FC<ToolbarBaseProps> = props => {
    const { className, children } = props;

    let cls: any = [`${CLASSNAME}-toolbar-container`];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return <div className={cls}>{children}</div>;
};

export const Separator = () => <div className={`${CLASSNAME}-toolbar-separator`}></div>;
export const Space = () => <div className={`${CLASSNAME}-toolbar-space`}></div>;
export const Divider = () => <div className={`${CLASSNAME}-toolbar-divider`}></div>;

export type ToolBarProps = {
    data?: any;
    onChange?: Function;
}

export const ToolBar: React.FC<ToolBarProps> = props => {
    const [data, setData] = useState(props.data || {
        node: null,
        mark: []
    });
    return (
        <ToolbarBase>
            <Space />
            <ButtonGroup>
                <DropdownMenu
                    value={data.node}
                    title={"Turn into"}
                    items={[
                        {
                            label: 'Text',
                            key: 'text',
                            icon: TextIcon
                        },
                        {
                            label: 'Heading 1',
                            key: 'heading1',
                            icon: Heading1Icon
                        },
                        {
                            label: 'Heading 2',
                            key: 'heading2',
                            icon: Heading2Icon
                        },
                        {
                            label: 'Heading 3',
                            key: 'heading3',
                            icon: Heading3Icon
                        },
                        {
                            label: 'Heading 4',
                            key: 'heading4',
                            icon: Heading4Icon
                        },
                        {
                            label: 'Bullet list',
                            key: 'bulletList',
                            icon: BulletListIcon
                        },
                        {
                            label: 'Ordered list',
                            key: 'orderedList',
                            icon: OrderedListIcon
                        },
                        {
                            label: 'Task list',
                            key: 'taskList',
                            icon: TaskListIcon
                        },

                        {
                            label: 'Blockquote',
                            key: 'blockquote',
                            icon: BlockquoteIcon
                        },
                        {
                            label: 'CodeBlock',
                            key: 'codeBlock',
                            icon: CodeBlockIcon
                        },
                        {
                            label: 'Table',
                            key: 'table',
                            icon: TableIcon
                        }
                    ]}
                    onChange={(params: any) => {
                        console.log('params', params)
                    }}
                />
            </ButtonGroup>
            <Separator />
            <ButtonGroup>
                <DropdownMenu
                    value={'alignCenter'}
                    title={"Text align"}
                    items={[
                        {
                            label: 'Align left',
                            key: 'alignLeft',
                            icon: AlignLeftIcon
                        },
                        {
                            label: 'Align center',
                            key: 'alignCenter',
                            icon: AlignCenterIcon
                        },
                        {
                            label: 'Align right',
                            key: 'alignRight',
                            icon: AlignRightIcon
                        },
                        {
                            label: 'Align justify',
                            key: 'alignJustify',
                            icon: AlignJustifyIcon
                        }
                    ]}
                    onChange={(params: any) => {
                        console.log('params', params)
                    }}
                />
            </ButtonGroup>
            <Separator />
            <ButtonGroup>
                <Button
                    type="link"
                    title="Bold"
                    // active={data['bold']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'strong'
                        });
                    }}
                >
                    {BoldIcon}
                </Button>
                <Button
                    type="link"
                    title="Italic"
                    // active={data['italic']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'em'
                        });
                    }}
                >
                    {ItalicIcon}
                </Button>
                <Button
                    type="link"
                    title="Strikethrough"
                    // active={data['strikethrough']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 's'
                        });
                    }}
                >
                    {StrikethroughIcon}
                </Button>
                <Button
                    type="link"
                    title="Underlined"
                    // active={data['underlined']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'u'
                        });
                    }}
                >
                    {UnderlinedIcon}
                </Button>
                <Button
                    type="link"
                    title="link"
                    // active={data['link']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'link'
                        });
                    }}
                >
                    {LinkIcon}
                </Button>
                <Button
                    type="link"
                    title="Code"
                    // active={data['code']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'code'
                        });
                    }}
                >
                    {CodeIcon}
                </Button>
                <TextColorDropdown 
                    onChange={(params: any) => {
                        if (params.type === 'text') {
                            props.onChange?.({
                                type: 'mark',
                                name: 'color',
                                value: {
                                    color: params.value.textColor
                                }
                            });
                        } else if (params.type === 'highlight') {
                            props.onChange?.({
                                type: 'mark',
                                name: 'backgroundColor',
                                value: {
                                    color: params.value.highlightColor
                                }
                            });
                        }
                    }}
                />
                <Button
                    type="link"
                    title="Superscript"
                    // active={data['superscript']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'sup'
                        });
                    }}
                >
                    {SuperscriptIcon}
                </Button>
                <Button
                    type="link"
                    title="Subscript"
                    // active={data['subscript']}
                    onClick={(params: any) => {
                        props.onChange?.({
                            type: 'mark',
                            name: 'sub'
                        });
                    }}
                >
                    {SubscriptIcon}
                </Button>
            </ButtonGroup>
            <Space />
            {/* <Separator />
            <ButtonGroup>
                <Button
                    type="link"
                    title="Light"
                // active={data['light']}
                // onClick={handleClick(TOOLBAR_CONFIG['light']['key'])}
                >
                    {LightIcon}
                </Button>
                <Button
                    type="link"
                    title="Dark"
                // active={data['dark']}
                // onClick={handleClick(TOOLBAR_CONFIG['dark']['key'])}
                >
                    {DarkIcon}
                </Button>
            </ButtonGroup>
            <ButtonGroup>
                <Button type="link">
                    <span className={`${CLASSNAME}-toolbar-avatar`}>
                        <span className={`${CLASSNAME}-toolbar-avatar-item`}>
                            <img className={`${CLASSNAME}-toolbar-avatar-image`} src="./images/memoji_10.png" />
                        </span>
                    </span>
                </Button>
            </ButtonGroup>
            <Space /> */}
        </ToolbarBase>
    );
};