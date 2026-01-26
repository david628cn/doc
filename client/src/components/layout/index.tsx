import React, { useEffect, useState } from 'react';
import { Switch, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import DocumentTitle from 'react-document-title';
import history from '@/utils/history';
import Headers from './headers';
import Siders from './siders';
import styles from './index.module.less';

const NoMatch = () => (
    <div></div>
);

interface MainLayoutProps {
    title?: string;
    location?: any;
    user?: any;
}

const MainLayout: React.FC<MainLayoutProps> = props => {
    const {
        title = 'App'
    } = props;

    const [collapsed, setCollapsed] = useState(false);
    const [menus, setMenus] = useState<Array<any>>([]);
    // const [redirectData, setRedirectData] = useState<Array<any>>([]);

    useEffect(() => {
        setMenus([
            {
                "name": "home",
                "path": "/home",
                "title": "首页",
                "icon": "home"
            },
            {
                "name": "monitor",
                "path": "/monitor",
                "title": "实时看板",
                "icon": "permissions"
            },
            {
                "name": "doshboard",
                "path": "/doshboard",
                "title": "仪表盘",
                "icon": "permissions"
            },
            // {
            //     "name": "Project",
            //     "path": "/project",
            //     "title": "我的项目",
            //     "icon": "page"
            // },
            // {
            //     "name": "StockDict",
            //     "path": "/stockDict",
            //     "title": "股票信息",
            //     "icon": "permissions"
            // },
            {
                "name": "stock",
                "path": "/stock",
                "title": "股票详情",
                "icon": "permissions"
            },
            // {
            //     "name": "Metronome",
            //     "path": "/metronome",
            //     "title": "节拍器",
            //     "icon": "permissions"
            // },
            {
                "name": "task",
                "path": "/task",
                "title": "任务调度",
                "icon": "permissions"
            },
            {
                "name": "doc",
                "path": "/doc",
                "title": "文档编辑",
                "icon": "permissions"
            },
            {
                "name": "fileSystem",
                "path": "/fileSystem",
                "title": "文件管理",
                "icon": "permissions"
            },
            {
                "name": "user",
                "path": "/user",
                "title": "用户管理",
                "icon": "permissions"
            },
            {
                "name": "role",
                "path": "/role",
                "title": "角色管理",
                "icon": "permissions"
            },
            {
                "name": "demo",
                "path": "/demo",
                "title": "测试页面",
                "icon": "permissions"
            }
        ]);
    }, []);

    const onTrigger = () => {
        setCollapsed(!collapsed);
    };

    // const redirectData: Array<any> = [];
    // const getRedirect = (item: any) => {
    //     if (item && item.children) {
    //         item.children.forEach((children: any) => {
    //             getRedirect(children);
    //         });
    //     } else {
    //         //try {
    //         redirectData.push({
    //             name: `${item.name}`,
    //             path: `${item.path}`,
    //             title: `${item.title}`,
    //             icon: `${item.icon}`,
    //             // component: require(`@/pages/${item.name}`).default
    //         });
    //         //} catch(err) {
    //         //}
    //     }
    // };
    // menus.forEach((item: any) => getRedirect(item));

    const getRedirectData = (dataList: Array<any> = []) => {
        const redirectData: Array<any> = [];
        const getRedirect = (item: any) => {
            if (item && item.children) {
                item.children.forEach((children: any) => {
                    getRedirect(children);
                });
            } else {
                try {
                    redirectData.push({
                        name: `${item.name}`,
                        path: `${item.path}`,
                        title: `${item.title}`,
                        icon: `${item.icon}`,
                        component: require(`@/pages/${item.name}`).default
                    });
                } catch(err) {
                }
            }
        };
        dataList.forEach(getRedirect);
        return redirectData;
    }
    const redirectData = getRedirectData(menus);
    let pathname = props.location.pathname;
    if (redirectData.length && pathname === '/') {
        pathname = redirectData[0].path;
        history.push(pathname);
    }

    return (
        <DocumentTitle title={title}>
            <div className={ styles['layout-main'] }>
                <div className={ styles['layout-left'] }>
                    <Siders
                        menus={menus}
                        pathname={pathname}
                        collapsed={collapsed}
                    />
                </div>
                
                <div className={ styles['layout-center'] }>
                    <div className={ styles['layout-header'] }>
                        <div className={ styles['layout-header-inner'] }>
                            <Headers 
                                visible={collapsed}
                                onTrigger={onTrigger}
                                user={props.user}
                            />
                        </div>
                    </div>
                    <div className={ styles['layout-right'] }>
                        <Switch>
                            {
                                redirectData.map((route: any, index: number) => {
                                    return <Route key={index} path={route.path} component={route.component} />
                                })
                            }
                            <Route component={NoMatch} />
                        </Switch>
                    </div>
                </div>
            </div>
        </DocumentTitle>
    );
}

const mapStateToProps = ({ user }: { user: any }) => ({
    user
});

export default connect(mapStateToProps)(MainLayout);