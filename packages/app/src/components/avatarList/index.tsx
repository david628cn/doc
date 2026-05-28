import React, { useEffect, useState, useMemo } from 'react';
import {
    Avatar,
    Flex,
    View,
    Text,
    SearchInput
} from '@carvy/ui';
import { CLASSNAME } from '@/config';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import './index.less';

/** 通讯录搜索等场景可挂载后端 social 关系字段 */
export type AvatarListValue = {
    id?: string;
    icon?: string;
    name?: string;
    label?: string;
    desc?: string;
    keywords?: string[];
    social?: {
        is_following?: boolean;
        is_followed_by?: boolean;
        is_mutual_follow?: boolean;
        is_friend?: boolean;
        friend_pending?: string;
    };
}

export type AvatarListProps = {
    showOper?: boolean;
    searchPlaceholder?: string;
    searchShow?: boolean;
    data?: AvatarListValue[];
    defaultSelectedKeys?: string[];
    selectedKeys?: string[];
    autoFocus?: boolean;
    header?: React.ReactNode;
    style?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    onChange?: (keys: string[], item: AvatarListValue) => void;
    renderItem?: (item: AvatarListValue) => React.ReactNode;
}

export const AvatarList: React.FC<AvatarListProps> = props => {
    const {
        searchPlaceholder = '搜索...',
        searchShow = true,
        data,
        header,
        style,
        contentStyle,
        autoFocus,
        renderItem,
        onChange
    } = props;

    const [dataList, setDataList] = useState<AvatarListValue[]>(data || []);
    const [selectedKeys, setSelectedKeys] = useState<string[]>(props.selectedKeys || props.defaultSelectedKeys || []);
    const [searchValue, setSearchValue] = useState((''));

    useEffect(() => {
        setDataList(data || []);
    }, [data]);

    useEffect(() => {
        if ('selectedKeys' in props) {
            setSelectedKeys(props.selectedKeys || []);
        }
    }, [props.selectedKeys]);

    const handleClick = (item: any) => {
        return (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            const nextSelectedKeys = selectedKeys.includes(item.id) ? selectedKeys.filter(k => k !== item.id) : [item.id];
            if (!('selectedKeys' in props)) {
                setSelectedKeys(nextSelectedKeys);
            }
            onChange?.(nextSelectedKeys, nextSelectedKeys.includes(item.id) ? item : null);
        }
    }

    const filteredData = useMemo(() => {
        if (!searchValue) {
            return dataList;
        }
        return dataList.filter(member => (member?.keywords || []).some((k: string) => k.includes(searchValue)));
    }, [dataList, searchValue]);

    return (
        <Flex w="100%" h="100%" direction="column" className={`${CLASSNAME}-avatar-list`} style={style}>
            {
                searchShow ? <Flex gap={10} mb={12} justify="space-between" align="center">
                    <Flex flex={1}>
                        <SearchInput
                            placeholder={searchPlaceholder}
                            onSearch={(value) => {
                                setSearchValue(value.trim().toLowerCase());
                            }}
                            autoFocus={autoFocus}
                        ></SearchInput>
                    </Flex>
                    {
                        header && <Flex>{header}</Flex>
                    }
                </Flex> : null
            }
            <Flex direction="column" flex={1} className={`${CLASSNAME}-avatar-list-menu`} style={contentStyle}>
                {filteredData.map((item: AvatarListValue) => {
                    const cls = [`${CLASSNAME}-avatar-list-menu-item`];
                    if (selectedKeys?.includes(item.id)) {
                        cls.push(`${CLASSNAME}-avatar-list-menu-item-selected`);
                    }
                    return (
                        <Flex
                            w="100%"
                            key={item.id}
                            px={10}
                            py={10}
                            className={cls.join(' ')}
                            justify="space-between"
                            onClick={handleClick(item)}
                        >
                            <Flex gap={3}>
                                <Avatar
                                    radius="full"
                                    size={42}
                                    title={item?.name}
                                    icon={(() => {
                                        const src = resolveMediaSrcForImg(item?.icon);
                                        return src ? <img src={src} alt="" /> : item?.icon;
                                    })()}
                                    bg={'rgb(160, 137, 255)'}
                                    color={'#fff'}
                                ></Avatar>
                                <View px={6}>
                                    <Text as="div" fontSize={14} fontWeight="bold">{item?.label}</Text>
                                    <Text as="div" fontSize={14} color="gray">{item?.desc}</Text>
                                </View>
                            </Flex>
                            {
                                renderItem?.(item)
                            }
                        </Flex>
                    )
                })}
            </Flex>
        </Flex>
    );
}