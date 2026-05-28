import { Button, ButtonGroup, TextColorDropdown } from '@carvy/ui';
import { TextAlign } from '../textAlign';
import { CLASSNAME } from '../config';
import {
    BoldIcon,
    ItalicIcon,
    StrikethroughIcon,
    UnderlinedIcon,
    LinkIcon,
    CodeBlockIcon,
    SuperscriptIcon,
    SubscriptIcon
    // LightIcon, 
    // DarkIcon
} from '../config/Icon';
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
            <Separator />
            <ButtonGroup>
                <Button
                    variant="soft"
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
                    variant="soft"
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
                    variant="soft"
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
                    variant="soft"
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
                    variant="soft"
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
                    variant="soft"
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
                    {CodeBlockIcon}
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
                    variant="soft"
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
                    variant="soft"
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
        </ToolbarBase>
    );
};