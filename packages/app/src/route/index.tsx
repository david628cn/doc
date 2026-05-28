import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import history from '@/utils/history';
import { Layout } from '@/components/layout';
import { RequireWorkspaceRole } from '@/components/routeGuards';
import { WorkspaceRole } from '@/constants';

const Login = React.lazy(() => import('@/pages/login'));
const Home = React.lazy(() => import('@/pages/home'));
const Dashboard = React.lazy(() => import('@/pages/doshboard'));
const Doc = React.lazy(() => import('@/pages/doc'));
const Message = React.lazy(() => import('@/pages/message'));
const Profile = React.lazy(() => import('@/pages/profile'));
const Workspace = React.lazy(() => import('@/pages/workspace'));
const Space = React.lazy(() => import('@/pages/space'));
const Ai = React.lazy(() => import('@/pages/ai'));
const Contacts = React.lazy(() => import('@/pages/contacts'));
const Chat = React.lazy(() => import('@/pages/chat'));
const Group = React.lazy(() => import('@/pages/group'));
const Setting = React.lazy(() => import('@/pages/setting'));
const Forbidden = React.lazy(() => import('@/pages/forbidden'));
const NotFound = React.lazy(() => import('@/pages/notFound'));

const PrivateRoute = ({ component: Component, render, ...rest }: any) => (
    <Route
        {...rest}
        render={(props: any) => {
            const isLogin = localStorage.getItem('user');
            if (!isLogin) {
                return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
            }
            if (render) return render(props);
            return Component ? <Component {...props} /> : null;
        }}
    />
);

const Routes = () => {
    return (
        <Router history={history}>
            <React.Suspense 
                // fallback={<div style={{ display: 'none' }}>Loading...</div>}
            >
                <Switch>
                    <Route path="/login" component={Login} />
                    {/* 未登录：纯落地页；已登录：带 Layout 壳，须排在 PrivateRoute 之前 */}
                    <Route
                        exact
                        path="/404"
                        render={(routeProps: any) => {
                            if (!localStorage.getItem('user')) {
                                return <NotFound />;
                            }
                            return (
                                <Layout {...routeProps}>
                                    <NotFound />
                                </Layout>
                            );
                        }}
                    />

                    <PrivateRoute
                        path="/"
                        render={(props: any) => (
                            <Layout {...props}>
                                <Switch>
                                    <Route exact path="/" component={Home} />
                                    <Route exact path="/home" component={Home} />
                                    <Route exact path="/dashboard" component={Dashboard} />
                                    <Route exact path="/profile" component={Profile} />
                                    <Route
                                        exact
                                        path="/workspace/:workspaceId/library"
                                        render={() => (
                                            <RequireWorkspaceRole minimum={WorkspaceRole.Guest}>
                                                <Space />
                                            </RequireWorkspaceRole>
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/workspace/:workspaceId"
                                        render={() => (
                                            <RequireWorkspaceRole minimum={WorkspaceRole.Guest}>
                                                <Workspace />
                                            </RequireWorkspaceRole>
                                        )}
                                    />
                                    <Route exact path="/ai" component={Ai} />
                                    <Route exact path="/contacts" component={Contacts} />
                                    <Route exact path="/chat" component={Chat} />
                                    <Route
                                        exact
                                        path="/group"
                                        render={() => (
                                            <RequireWorkspaceRole minimum={WorkspaceRole.Guest}>
                                                <Group />
                                            </RequireWorkspaceRole>
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/setting"
                                        render={() => (
                                            <RequireWorkspaceRole minimum={WorkspaceRole.Admin}>
                                                <Setting />
                                            </RequireWorkspaceRole>
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/page/:pageId"
                                        render={(routeProps: any) => (
                                            <RequireWorkspaceRole minimum={WorkspaceRole.Guest}>
                                                <Doc {...routeProps} />
                                            </RequireWorkspaceRole>
                                        )}
                                    />
                                    <Route exact path="/message" component={Message} />
                                    <Route exact path="/403" component={Forbidden} />
                                    <Route component={NotFound} />
                                </Switch>
                            </Layout>
                        )}
                    />
                </Switch>
            </React.Suspense>
        </Router>
    );
};

export default Routes;
