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

// /**
//  * 多级排序函数
//  * @param {Array} list - 待排序的对象数组
//  * @param {Array} config - 排序配置
//  *    { 
//  *      key: 属性名, 
//  *      order: 模板数组(可选), 
//  *      desc: 是否降序(默认false), 
//  *      emptyLast: 空值是否排最后(默认true),
//  *      ignoreCase: 忽略大小写(默认false)
//  *    }
//  */
// const multiSort = (list: any[], config: any[]) => {
//     return [...list].sort((a, b) => {
//         for (const item of config) {
//             const { key, order, desc = false, emptyLast = true, ignoreCase = false } = item;

//             let valA = a[key];
//             let valB = b[key];

//             // 1. 处理 null / undefined
//             const isAEmpty = valA == null;
//             const isBEmpty = valB == null;
//             if (isAEmpty || isBEmpty) {
//                 if (isAEmpty && isBEmpty) continue;
//                 const result = isAEmpty ? 1 : -1;
//                 return emptyLast ? result : -result;
//             }

//             // 2. 处理忽略大小写
//             let compareA = valA;
//             let compareB = valB;
//             if (ignoreCase && typeof valA === 'string' && typeof valB === 'string') {
//                 compareA = valA.toLowerCase();
//                 compareB = valB.toLowerCase();
//             }

//             // 3. 核心比较逻辑
//             let diff = 0;
//             if (order && Array.isArray(order)) {
//                 // 如果有模板，模板内的匹配通常也要考虑大小写一致性
//                 // 这里建议将模板也处理一下，或者保持原样
//                 const finalOrder = ignoreCase ? order.map(v => String(v).toLowerCase()) : order;
//                 const idxA = finalOrder.indexOf(ignoreCase ? String(compareA) : valA);
//                 const idxB = finalOrder.indexOf(ignoreCase ? String(compareB) : valB);

//                 const weightA = idxA === -1 ? Infinity : idxA;
//                 const weightB = idxB === -1 ? Infinity : idxB;
//                 diff = weightA - weightB;
//             } else {
//                 // 普通比较
//                 if (compareA !== compareB) {
//                     diff = compareA < compareB ? -1 : 1;
//                 }
//             }

//             // 4. 处理升降序
//             if (diff !== 0) {
//                 return desc ? -diff : diff;
//             }
//         }
//         return 0;
//     });
// }

// /**
//  * 分组排序函数
//  * @param {Array} list - 原始对象数组
//  * @param {Array} config - 排序配置（同上，第一项将作为分组依据）
//  */
// const groupSort = (list: any[], config: any[]) => {
//     // 1. 先进行完整的多级排序
//     const sortedList = multiSort(list, config);

//     // 2. 获取分组依据的 key（通常是 config 的第一项）
//     const groupKey = config[0].key;

//     // 3. 执行分组逻辑
//     const grouped = sortedList.reduce((acc, item) => {
//         const keyVal = item[groupKey] ?? 'Others'; // 处理 null/undefined 的组名

//         // 寻找是否已有该分组
//         let group = acc.find(g => g.group === keyVal);

//         if (!group) {
//             group = { group: keyVal, items: [] };
//             acc.push(group);
//         }

//         group.items.push(item);
//         return acc;
//     }, []);

//     return grouped;
// }

/**
 * 分组排序
 * @param {Array} list - 目标数组
 * @param {string} key - 分组/排序的属性名
 * @param {Array} order - 排序模板
 */
const groupAndSort = (list: any[], key: string, order: string[] = []) => {
    // 1. 先进行整体排序
    const sorted = [...list].sort((a, b) => {
        const getIdx = (v: any) => (v == null ? Infinity : order.indexOf(v) === -1 ? 999 : order.indexOf(v));

        const idxA = getIdx(a[key]);
        const idxB = getIdx(b[key]);

        if (idxA === idxB) {
            return String(a[key]).localeCompare(String(b[key]));
        }
        return idxA - idxB;
    });

    // 2. 通过 reduce 构建有序的数组结构
    return sorted.reduce((acc: { group: string, items: any[] }[], item) => {
        const groupName = item[key] ?? '其他';

        // 检查数组中最后一个分组是否是当前组
        const lastGroup = acc[acc.length - 1];

        if (lastGroup && lastGroup.group === groupName) {
            lastGroup.items.push(item);
        } else {
            acc.push({ group: groupName, items: [item] });
        }

        return acc;
    }, []);
    /*
    返回结构：
    [
    { group: 'owner', items: [...] },
    { group: 'admin', items: [...] },
    { group: '其他', items: [...] }
    ]
    */

}

export type MemberListValue = {
    id?: string;
    icon?: string;
    name?: string;
    label?: string;
    desc?: string;
    keywords?: string[];
    group_role: string;
}

export type MemberListGroupValue = {
    group?: string;
    items?: MemberListValue[];
}

export type MemberListProps = {
    showOper?: boolean;
    searchPlaceholder?: string;
    searchShow?: boolean;
    data?: MemberListValue[];
    defaultSelectedKeys?: string[];
    selectedKeys?: string[];
    autoFocus?: boolean;
    header?: React.ReactNode;
    order?: any;
    style?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    onChange?: (keys: string[], item: MemberListValue) => void;
    renderItem?: (item: MemberListValue) => React.ReactNode;
    renderGroup?: (item: MemberListGroupValue) => React.ReactNode;
}

export const MemberList: React.FC<MemberListProps> = props => {
    const {
        searchPlaceholder = '搜索...',
        searchShow = true,
        data,
        header,
        style,
        autoFocus,
        contentStyle,
        order = {
            key: 'role',
            value: []
        },
        renderItem,
        renderGroup,
        onChange
    } = props;

    const [dataList, setDataList] = useState<MemberListValue[]>(data || []);
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
        const q = (searchValue || '').trim().toLowerCase();
        const base = !q
            ? dataList
            : dataList.filter((member) =>
                  (member?.keywords || []).some((k) =>
                      String(k ?? '')
                          .toLowerCase()
                          .includes(q)
                  )
              );
        return groupAndSort(base, order.key, order.value);
    }, [dataList, searchValue, order]);

    return (
        <Flex w="100%" h="100%" direction="column" className={`${CLASSNAME}-member-list`} style={style}>
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
            <Flex direction="column" flex={1} className={`${CLASSNAME}-member-list-menu`} style={contentStyle}>
                {filteredData.map((groupObj: { group: string; items: MemberListValue[] }) => (
                    // 外层容器：每个分组一个块
                    <View key={groupObj.group} className={`${CLASSNAME}-member-group`}>
                        {/* 分组标题：显示如 Owner, Admin 等 */}
                        {
                            renderGroup ? renderGroup(groupObj) : <View px={10} py={5} fontSize={12} color="gray" fontWeight="bold" bg="rgba(0,0,0,0.02)">
                                {groupObj.group.toUpperCase()}
                            </View>
                        }
                        {/* 内层列表：渲染该组下的所有成员 */}
                        {groupObj.items.map((item: MemberListValue) => {
                            const cls = [`${CLASSNAME}-member-list-menu-item`];
                            if (selectedKeys?.includes(item.id)) {
                                cls.push(`${CLASSNAME}-member-list-menu-item-selected`);
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
                                        />
                                        <View px={6}>
                                            <Text as="div" fontSize={14} fontWeight="bold">{item?.label}</Text>
                                            <Text as="div" fontSize={14} color="gray">{item?.desc}</Text>
                                        </View>
                                    </Flex>
                                    {renderItem?.(item)}
                                </Flex>
                            );
                        })}
                    </View>
                ))}
            </Flex>
        </Flex>
    );
}