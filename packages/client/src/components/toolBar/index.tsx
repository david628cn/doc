import { useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@/components/button';
// import { DropdownMenu } from '@/components/dropdownMenu';
import { TextColorDropdown } from '@/components/textColor';
import { TextAlign } from '@/components/textAlign';
import { CLASSNAME } from '@/global';
import {
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
    style?: any;
}

export const ToolbarBase: React.FC<ToolbarBaseProps> = props => {
    const { className, children, style } = props;
    let cls: any = [`${CLASSNAME}-toolbar-container`];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return <div className={cls} style={style}>{children}</div>;
};

export const Separator = () => <div className={`${CLASSNAME}-toolbar-separator`}></div>;
export const Space = () => <div className={`${CLASSNAME}-toolbar-space`}></div>;
export const Divider = () => <div className={`${CLASSNAME}-toolbar-divider`}></div>;

export type ToolBarProps = {
    data?: any;
    defaultData?: any;
    onChange?: Function;
    style?: any;
}

export const ToolBar: React.FC<ToolBarProps> = props => {
    const { data, defaultData, onChange, ...otherProps } = props;
    return (
        <ToolbarBase {...otherProps}>
            <Space />
            {/* <ButtonGroup>
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
            <Separator /> */}
            <TextAlign
                value={data.textAlign}
                onChange={(params: any) => {
                    onChange?.({
                        type: 'textAlign',
                        name: 'textAlign',
                        value: params.value,
                        data: {
                            ...data,
                            textAlign: params.value
                        }
                    });
                }}
            />
            {/* <ButtonGroup>
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
            </ButtonGroup> */}
            <Separator />
            <ButtonGroup>
                <Button
                    type="link"
                    title="Bold"
                    active={data.strong}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'strong',
                            value: !data.strong,
                            data: {
                                ...data,
                                strong: !data.strong
                            }
                        });
                    }}
                >
                    {BoldIcon}
                </Button>
                <Button
                    type="link"
                    title="Italic"
                    active={data.em}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'em',
                            value: !data.em,
                            data: {
                                ...data,
                                em: !data.em
                            }
                        });
                    }}
                >
                    {ItalicIcon}
                </Button>
                <Button
                    type="link"
                    title="Strikethrough"
                    active={data.s}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 's',
                            value: !data.s,
                            data: {
                                ...data,
                                s: !data.s
                            }
                        });
                    }}
                >
                    {StrikethroughIcon}
                </Button>
                <Button
                    type="link"
                    title="Underlined"
                    active={data.u}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'u',
                            value: !data.u,
                            data: {
                                ...data,
                                u: !data.u
                            }
                        });
                    }}
                >
                    {UnderlinedIcon}
                </Button>
                <Button
                    type="link"
                    title="link"
                    active={data.link}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'link',
                            value: !data.link,
                            data: {
                                ...data,
                                link: !data.link
                            }
                        });
                    }}
                >
                    {LinkIcon}
                </Button>
                <Button
                    type="link"
                    title="Code"
                    active={data.code}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'code',
                            value: !data.code,
                            data: {
                                ...data,
                                code: !data.code
                            }
                        });
                    }}
                >
                    {CodeIcon}
                </Button>
                <TextColorDropdown
                    value={{
                        color: data.textStyle.color,
                        backgroundColor: data.textStyle.backgroundColor
                    }}
                    onChange={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'textStyle',
                            value: {
                                color: params.value?.color,
                                backgroundColor: params.value?.backgroundColor
                            },
                            data: {
                                ...data,
                                textStyle: {
                                    color: params.value?.color,
                                    backgroundColor: params.value?.backgroundColor
                                }
                            }
                        });
                    }}
                />
                <Button
                    type="link"
                    title="Superscript"
                    active={data.sup}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'sup',
                            value: !data.sup,
                            data: {
                                ...data,
                                sup: !data.sup
                            }
                        });
                    }}
                >
                    {SuperscriptIcon}
                </Button>
                <Button
                    type="link"
                    title="Subscript"
                    active={data.sub}
                    onClick={(params: any) => {
                        onChange?.({
                            type: 'mark',
                            name: 'sub',
                            value: !data.sub,
                            data: {
                                ...data,
                                sub: !data.sub
                            }
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