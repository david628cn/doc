import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { MenuNode } from './menuNode';
import { CLASSNAME } from '@/global';
// import { TruckFilled } from '@ant-design/icons';
// import './index.less';

const recursiveMerge = (tree: any, childrenField: string = 'children', parentKeyField: string = 'parentKey', typeKeyField: string = 'type') => {
    if (!tree) {
        return [];
    }
    const result: any = Array.isArray(tree) ? [] : {};
    if (Array.isArray(tree)) {
        for (const node of tree) {
            const processedNode: any = recursiveMerge(node);
            if (processedNode[typeKeyField] === 'group') {
                if (processedNode.children && processedNode.children.length > 0) {
                    result.push(...processedNode.children);
                }
            } else if (processedNode[typeKeyField] !== 'divider') {
                result.push(processedNode);
            }
        }
    } else {
        for (const key in tree) {
            if (key === childrenField && Array.isArray(tree[key])) {
                result[key] = recursiveMerge(tree[key]);
            } else {
                result[key] = tree[key];
            }
        }
    }
    return result;
}

const treeToAdjacency = (tree: any, keyField: string = 'key', childrenField: string = 'children', parentKeyField = 'parentKey') => {
    if (!tree || !Array.isArray(tree)) return [];
    const result: Array<any> = [];
    const nodeMap = new Map();
    // 一次遍历完成转换
    const traverse = (nodes: Array<any>, parentId = null) => {
        for (const node of nodes) {
            // 创建自连接节点
            const adjNode = {
                ...node,
                [keyField]: node[keyField],
                [parentKeyField]: parentId
            };

            result.push(adjNode);
            if (node[keyField] !== undefined && node[keyField] !== null) {
                nodeMap.set(node[keyField], adjNode);
            }
            // 递归处理子节点
            if (node[childrenField] && Array.isArray(node[childrenField])) {
                traverse(node[childrenField], node[keyField]);
            }
        }
    }
    traverse(tree);
    return {
        list: result,
        map: nodeMap
    };
}

const findParentKeys = (tree: any = [], targetKey: string, keyField: string = 'key', childrenField: string = 'children') => {
    // 存储路径上的key
    const path: Array<string> = [];
    // 递归查找函数
    const find = (node: any, target: string) => {
        // 如果当前节点匹配目标key
        if (node[keyField] === target) {
            return true;
        }
        // 如果有子节点
        if (node[childrenField] && node[childrenField].length > 0) {
            // 将当前节点key加入路径
            if (node[keyField]) {
                path.push(node[keyField]);
            }
            // 遍历子节点
            for (let i = 0; i < node[childrenField].length; i++) {
                if (find(node[childrenField][i], target)) {
                    return true;
                }
            }
            // 如果没找到，回溯
            path.pop();
        }
        return false;
    }
    // 遍历树的根节点
    for (let i = 0; i < tree.length; i++) {
        if (find(tree[i], targetKey)) {
            // 找到目标key，返回路径（包含目标key本身）
            // return [...path, targetKey];
            return [...path];
        }
    }
    // 未找到目标key
    return null;
}

const findChildrenKeys = (tree: any = [], targetKey: string, keyField = 'key', childrenField = 'children') => {
    // 存储所有子级key
    const childrenKeys: Array<string> = [];
    // 递归查找函数
    const find = (node: any, target: string) => {
        // 如果当前节点匹配目标key
        if (node[keyField] && node[keyField] === target) {

            // 收集所有子节点的key
            collectChildren(node[childrenField], childrenKeys);
            return true;
        }
        // 如果有子节点
        if (node[childrenField] && node[childrenField].length > 0) {
            // 遍历子节点
            for (let i = 0; i < node[childrenField].length; i++) {
                if (find(node[childrenField][i], target)) {
                    return true;
                }
            }
        }
        return false;
    }
    // 收集子节点key的辅助函数
    const collectChildren = (nodes: any, keysArray: Array<string>) => {
        if (!nodes || !Array.isArray(nodes)) {
            return;
        }
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i][keyField] && nodes[i][childrenField]) {
                keysArray.push(nodes[i][keyField]);
            }
            // 递归收集更深层的子节点
            collectChildren(nodes[i][childrenField], keysArray);
        }
    }
    // 遍历树的根节点
    for (let i = 0; i < tree.length; i++) {
        if (find(tree[i], targetKey)) {
            return childrenKeys;
        }
    }
    // 未找到目标key
    return null;
}

const Keys = Object.freeze({
    ENTER: 'Enter',
    // ESC: 'Escape',
    // SPACE: ' ',
    // HOME: 'Home',
    // END: 'End',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown'
});

export type MenuProps = {
    className?: string;
    // subClassName?: string;
    mode?: string; // bubble
    trigger?: string;
    defaultSelectedKeys?: Array<string>;
    defaultOpenKeys?: Array<string>;
    defaultActiveKey?: Array<string>;
    openKeys?: Array<string>;
    selectedKeys?: Array<string>;
    activeKey?: any;
    selectable?: boolean;
    multiple?: boolean;
    inlineIndent?: any;
    items?: any;
    // data?: Array<any> | undefined | null;
    level?: number;
    shortKey?: boolean;
    // style?: any;
    onSelect?: Function;
    onOpenChange?: Function;
    onActiveChange?: Function;
    children?: ReactNode;
    // [key: string]: unknown
}

export const Menu: React.FC<MenuProps> = props => {
    const [selectedKeys, setSelectedKeys] = useState(props.selectedKeys || props.defaultSelectedKeys || []);
    const [openKeys, setOpenKeys] = useState(props.openKeys || props.defaultOpenKeys || []);
    const [activeKey, setActiveKey] = useState(props.activeKey || props.defaultActiveKey);

    const containerRef: any = useRef(null);

    const mergeRef: any = useRef(recursiveMerge(props.items));
    mergeRef.current = recursiveMerge(props.items);

    const flatRef: any = useRef(treeToAdjacency(recursiveMerge(props.items)));
    flatRef.current = treeToAdjacency(recursiveMerge(props.items));

    // console.log('treeToAdjacency', flatRef.current);
    const selectedKeysRef: any = useRef(props.selectedKeys || props.defaultSelectedKeys || []);
    selectedKeysRef.current = selectedKeys;

    const openKeysRef: any = useRef(props.openKeys || props.defaultOpenKeys || []);
    openKeysRef.current = openKeys;

    const activeKeyRef: any = useRef(props.activeKey || props.defaultActiveKey);
    activeKeyRef.current = activeKey;

    const shortKeyRef = useRef(props.shortKey);
    shortKeyRef.current = props.shortKey;


    useEffect(() => {
        document.addEventListener('keydown', doShortcut, true);
        return () => {
            document.removeEventListener('keydown', doShortcut);
        }
    }, []);

    useEffect(() => {
        if ('selectedKeys' in props) {
            setSelectedKeys(props.selectedKeys || []);
        }
    }, [props.selectedKeys]);

    useEffect(() => {
        if ('activeKey' in props) {
            setActiveKey(props.activeKey || [] || (props.items || [])[0]?.key);
        }
    }, [props.activeKey]);

    useEffect(() => {
        const activeElement = document.querySelector(`.${CLASSNAME}-menu-item-active`);
        if (activeElement) {
            activeElement.scrollIntoView({
                block: 'nearest',   // 关键：如果可见则不滚动，不可见则滚动至最近边缘
                behavior: 'smooth'  // 丝滑动画
            });
        }
    }, [activeKeyRef.current]);

    useEffect(() => {
        if ('openKeys' in props) {
            setOpenKeys(props.openKeys || []);
        }
    }, [props.openKeys]);

    useEffect(() => {
        // const newActiveKey = (props.items || [])[0]?.key;
        // activeKeyRef.current = newActiveKey;
        // setActiveKey(newActiveKey);
        setActiveKey(null);
    }, [props.items]);

    const handleOpenChange = (params: any) => {
        const { key, action } = params;
        const newOpenKeys: any = getOpenKeysByChange(key, action);
        if (!('openKeys' in props)) {
            setOpenKeys(newOpenKeys);
        }
        props.onOpenChange?.({
            key,
            openKeys: newOpenKeys
        });
    }

    const getOpenKeysByChange = (key: string, action: any) => {
        let newOpenKeys;
        if (props.mode === 'bubble') {
            if (action === 'clear' || action === undefined || action === null) {
                return [];
            }
            newOpenKeys = (openKeysRef.current || []).slice();
            if (action === 'cancel') {
                const childrenKeys: any = findChildrenKeys(mergeRef.current, key);
                const arr = [key].concat(childrenKeys || []);
                newOpenKeys = newOpenKeys.filter((node: any) => !arr.includes(node));
            } else if (action === 'active') {
                const parentKeys: any = findParentKeys(mergeRef.current, key);
                newOpenKeys = (parentKeys || []).concat([key]);
            }
        } else {
            newOpenKeys = (openKeysRef.current || []).slice();
            if (action === 'cancel') {
                newOpenKeys = newOpenKeys.filter((node: any) => !key.includes(node));
            } else if (action === 'active') {
                if (!newOpenKeys.includes(key)) {
                    newOpenKeys.push(key);
                }
            }
        }
        return newOpenKeys;
    }

    const handleSelect = (params: any) => {
        const { key } = params;
        let newSelectedKeys: Array<any> = (selectedKeysRef.current || []).slice();
        if (props.mode === 'bubble') {
            if (props.multiple && !newSelectedKeys.includes(key)) {
                newSelectedKeys.push(key);
            } else {
                newSelectedKeys = [key];
            }
            if (!('selectedKeys' in props)) {
                setSelectedKeys(newSelectedKeys);
            }
            let newOpenKeys: Array<string> = [];
            newSelectedKeys.forEach(node => {
                const parentKeys: any = findParentKeys(mergeRef.current, node);
                newOpenKeys = newOpenKeys.concat(parentKeys || []);
            });
            if (!('openKeys' in props)) {
                setOpenKeys(newOpenKeys);
            }
            props.onOpenChange?.({
                key,
                openKeys: newOpenKeys
            });
        } else {
            if (props.multiple && !newSelectedKeys.includes(key)) {
                newSelectedKeys.push(key);
            } else {
                newSelectedKeys = [key];
            }
            if (!('selectedKeys' in props)) {
                setSelectedKeys(newSelectedKeys);
            }
        }
        props.onSelect?.({
            key,
            selectedKeys: newSelectedKeys,
            item: flatRef.current.map.get(key)
        });
    }

    const handleActiveChange = (params: any) => {
        const { key, action } = params;
        let newActiveKey;
        if (action === 'active') {
            newActiveKey = key;
        }
        if (!('activeKey' in props)) {
            setActiveKey(newActiveKey);
        }
        props.onActiveChange?.({
            key,
            activeKey: newActiveKey
        });
    }

    const getKeyInParenIndex = (key: string) => {
        if (key === null || key === undefined) {
            return {
                index: -1,
                list: []
            };
        }
        const { map } = flatRef.current;
        const curItem = map.get(key);
        if (curItem && curItem.parentKey !== null && curItem.parentKey !== undefined) {
            const parentItem = map.get(curItem.parentKey);
            if (parentItem) {
                const index = (parentItem.children || []).findIndex((node: any) => node.key === key);
                return {
                    index,
                    list: (parentItem.children || []).map((node: any) => node.key)
                }
            }
        }
        const curList = mergeRef.current.map((node: any) => node.key);
        return {
            index: curList.indexOf(key),
            list: curList
        };
    }

    const doShortcut = (e: any) => {
        if (!shortKeyRef.current) {
            return;
        }
        const keyCode = e.key;
        let isIn = Object.values(Keys).includes(keyCode);
        if (!isIn) {
            return;
        }
        const { map } = flatRef.current;
        if (keyCode === Keys.ENTER) {
            if (activeKeyRef.current === null || activeKeyRef.current === undefined) {
                return;
            }
            if (map.get(activeKeyRef.current) && !map.get(activeKeyRef.current).children) {
                e.preventDefault();
                handleSelect({
                    key: activeKeyRef.current
                });
            }
            return;
        }
        e.preventDefault();
        // e.stopPropagation();
        let curActiveKey = activeKeyRef.current || -1;
        let reActiveKey;
        const curItem = map.get(curActiveKey);
        let { index, list }: any = getKeyInParenIndex(curActiveKey);
        switch (keyCode) {
            case Keys.UP:
                index -= 1;
                if (index < 0) {
                    index = list.length - 1;
                }
                reActiveKey = list[index];
                break;
            case Keys.DOWN:
                index += 1;
                if (index > list.length - 1) {
                    index = 0;
                }
                reActiveKey = list[index];
                break;
            case Keys.LEFT:
                if (curItem && curItem.parentKey !== null && curItem.parentKey !== undefined) {
                    const m = getKeyInParenIndex(curItem.parentKey);
                    reActiveKey = m.list[m.index];
                }
                break;
            case Keys.RIGHT:
                if (curItem && curItem.children && curItem.children.length > 0) {
                    reActiveKey = curItem.children[0].key;
                }
                break;
            // case Keys.ESC:
            default:
                return;
        }

        if (reActiveKey === null || reActiveKey === undefined) {
            return;
        }

        handleActiveChange({
            key: reActiveKey,
            action: 'active'
        });

        // const sub = map.get(reActiveKey);
        // if (sub.children && sub.children.length > 0) {
        //     handleOpenChange({
        //         key: reActiveKey,
        //         action: 'active'
        //     });
        // }

        const parentKeys: any = findParentKeys(mergeRef.current, reActiveKey);
        // const sub = map.get(reActiveKey);
        const newOpenKeys: Array<string> = [].concat(parentKeys || []);
        const sub = map.get(reActiveKey);
        if (sub && sub.children && sub.children.length > 0 && !openKeysRef.current.includes(reActiveKey)) {
            newOpenKeys.push(reActiveKey);
        }
        if (!('openKeys' in props)) {
            setOpenKeys(newOpenKeys);
        }
        props.onOpenChange?.({
            // key,
            openKeys: newOpenKeys
        });
    }

    // const onKeyDown = (e: any) => {
    //     doShortcut(e.key);

    //     // switch (e.key) {
    //     //     case Keys.UP:
    //     //         console.log('UP>>>>>>>>>>>>>>', e.key);
    //     //         break;

    //     //     case Keys.DOWN:
    //     //         console.log('DOWN>>>>>>>>>>>>>>', Keys.DOWN);
    //     //         break;

    //     //     case Keys.LEFT:
    //     //         console.log('LEFT>>>>>>>>>>>>>>', Keys.DOWN);
    //     //         break;

    //     //     case Keys.RIGHT:
    //     //         console.log('RIGHT>>>>>>>>>>>>>>', Keys.DOWN);
    //     //         break;

    //     //     default:
    //     //         return;
    //     // }
    // }

    return (
        <div
            className={`${CLASSNAME}-menu-container`}
            tabIndex={0}
            // onKeyDown={doShortcut}
            ref={containerRef}
        // onMouseEnter={() => {
        //     if (containerRef.current) {
        //         containerRef.current.focus();
        //     }
        // }}
        // onTouchStart={() => {
        //     if (containerRef.current) {
        //         containerRef.current.focus();
        //     }
        // }}
        >
            <MenuNode
                {...props}
                // data={props.items}
                // stateRef={stateRef}
                selectedKeys={selectedKeys}
                openKeys={openKeys}
                activeKey={activeKey}
                onSelect={handleSelect}
                onOpenChange={handleOpenChange}
                onActiveChange={handleActiveChange}
            ></MenuNode>
        </div>
    );
}