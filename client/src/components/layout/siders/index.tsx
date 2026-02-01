import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'antd';
import pathToRegexp from 'path-to-regexp';
import IconSvg from '@/components/IconSvg';
import styles from './index.module.less';

const getDefaultCollapsedSubMenus = (pathname: any, menuData: any, path?: Array<any>) => {
    if (!path) {
        path = [];
    }
    for (let i = 0; i < menuData.length; i++) {
        const result = [...path];
        result.push(menuData[i].path);
        if (`/${ menuData[i].path }` === pathname) {
            return result;
        }
        if (menuData[i].children) {
            const rs: any = getDefaultCollapsedSubMenus(pathname, menuData[i].children, result);
            if (rs) {
                return rs;
            }
        }
    }
    return [];
}

const getFlatMenuKeys = (menus: Array<any> = []) => {
    let keys: Array<any> = [];
    menus.forEach(item => {
        if (item.children) {
            keys = keys.concat(getFlatMenuKeys(item.children));
        }
        keys.push(item.path);
    });
    return keys;
}

interface SidersProps {
    menus?: Array<any>;
    collapsed?: boolean;
    isMobile?: boolean;
    // openKeys?: Array<any>;
    Authorized?: any;
    pathname?: string;
    // onCollapse?: Function;
}

const Siders: React.FC<SidersProps> = props => {

    const {
        pathname = '',
        menus = []
    } = props;

    // const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<Array<any>>([]);
    // const [menus, setMenus] = useState<Array<any>>([]);

    // useEffect(() => {
    //     setCollapsed(props.collapsed || false);
    // }, [props.collapsed]);

    useEffect(() => {
        setOpenKeys(getDefaultCollapsedSubMenus(pathname, menus));
    }, [menus, pathname]);
    
    const flatMenuKeys: any = getFlatMenuKeys(menus);

    const handleOpenChange = (openKeys: Array<any> = []) => {
        const lastOpenKey = openKeys[openKeys.length - 1];
        const moreThanOne = openKeys.filter(openKey => isMainMenu(openKey)).length > 1;
        const newOpenKeys = moreThanOne ? [lastOpenKey] : [...openKeys];
        setOpenKeys(newOpenKeys);
    }

    const isMainMenu = (key: any) => {
        return menus.some((item: any) => key && (item.key === key || item.path === key));
    }

    const getMeunMatcheys = (path: string) => {
        return flatMenuKeys.filter((item: any) => {
            return pathToRegexp(item).test(path);
        });
    }

    const getSelectedMenuKeys = () => {
        const arr = urlToList(pathname);
        return arr.map((itemPath: any) => getMeunMatcheys(itemPath).pop());
    }

    const urlToList = (url: string) => {
        const urllist = url.split('/').filter(i => i);
        return urllist.map((urlItem: any, index: number) => {
            return `/${urllist.slice(0, index + 1).join('/')}`;
        });
    }

    const checkPermissionItem = (authority: any, ItemDom: any) => {
        if (props.Authorized && props.Authorized.check) {
            const { check } = props.Authorized;
            return check(authority, ItemDom);
        }
        return ItemDom;
    }

    const getIcon = (icon: any) => {
        if (typeof icon === 'string' && icon.indexOf('http') === 0) {
            return <img src={icon} alt="icon" className={`sider-menu-item-img`} />;
        }
        if (typeof icon === 'string') {
            console.log(IconSvg);
            return <IconSvg type={icon} className="anticon" />;
        }
        return icon;
    }

    const conversionPath = (path: string) => {
        if (path && path.indexOf('http') === 0) {
            return path;
        } else {
            return `/${path || ''}`.replace(/\/+/g, '/');
        }
    }

    const getMenuItemPath = (item: any) => {
        const itemPath = conversionPath(item.path);
        const icon = getIcon(item.icon);
        const { target, name, title } = item;
        if (/^https?:\/\//.test(itemPath)) {
            return (
                <a href={itemPath} target={target}>
                    {icon}
                    <span>{title}</span>
                </a>
            );
        }
        return (
            <Link
                to={itemPath}
                //target={ target }
                //replace={ itemPath === this.props.location.pathname }
                // onClick={
                //     props.isMobile ? () => {
                //         props.onCollapse?.(true);
                //     } : undefined
                // }
            >
                {icon}
                <span>{title}</span>
            </Link>
        );
    }

    const getSubMenuOrItem = (item: any) => {
        if (item.children && item.children.some((child: any) => child.name)) {
            const childrenItems = getNavMenuItems(item.children);
            // 当无子菜单时就不展示菜单
            if (childrenItems && childrenItems.length > 0) {
                return (
                    <Menu.SubMenu
                        title={
                            item.icon ? (
                                <span>
                                    {getIcon(item.icon)}
                                    <span>{item.title}</span>
                                </span>
                            ) : (
                                    item.title
                                )
                        }
                        key={item.path}
                    >
                        {childrenItems}
                    </Menu.SubMenu>
                );
            }
            return null;
        } else {
            return <Menu.Item key={item.path}>{getMenuItemPath(item)}</Menu.Item>;
        }
    }

    const getNavMenuItems = (menusData: Array<any> = []) => {
        if (!menusData) {
            return [];
        }
        return menusData.filter(item => item.name && !item.hideInMenu).map(item => {
            const ItemDom = getSubMenuOrItem(item);
            return checkPermissionItem(item.authority, ItemDom);
        }).filter(item => item);
    }

    // const openKeys = getDefaultCollapsedSubMenus(pathname, menus);

    const cls = [styles['sider-container']];
    if (props.collapsed) {
        cls.push(styles['narrow']);
    }

    return (
        <div
            //trigger={ null }
            //collapsible
            //collapsed={collapsed}
            //onCollapse={onCollapse}
            //width={ 250 }
            className={ cls.join(' ') }
        >
            <div className={styles['layout-logo']}>
                <div className={styles['layout-logo-wrapper']}>
                    {props.collapsed ? (
                        <img alt="logo" src="data:image/x-icon;base64,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" width="30"></img>
                    ) : (
                        <h1 className={styles['layout-title']}></h1>
                    )}
                </div>
            </div>
            <div className={ styles['sider-menu-container'] }>
                <Menu
                    key="Menu"
                    theme="dark"
                    mode="inline"
                    inlineCollapsed={props.collapsed}
                    // {...menuProps}
                    onOpenChange={handleOpenChange}
                    openKeys={openKeys}
                    selectedKeys={getSelectedMenuKeys()}
                    style={{ width: '100%', height: '100%' }}
                >
                    {getNavMenuItems(menus)}
                </Menu>
            </div>
        </div>
    );
}

export default Siders;