import React, { Component } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
//import Login from '@/views/login';
//import Home from '@/views/home';

const Login = React.lazy(() => import('../pages/Login'));
// const Home = React.lazy(() => import('@/pages/Home'));
// const Editor = React.lazy(() => import('@/pages/Editor'));
// const Screen = React.lazy(() => import('@/pages/Screen'));
// const Test = React.lazy(() => import('@/pages/Test'));
const Layout = React.lazy(() => import('../components/Layout/MainLayout'));

const PrivateRoute = ({ component: Component, ...rest }: any) => (
    <Route {...rest} render={
        (props: any) => {
            // console.log(localStorage.getItem('user'));
            return localStorage.getItem('user') ? <Component {...props} /> : <Redirect to={{ pathname: '/login' }} />
        }
    } />
)
const IRoutes = () => {
    return (
        <HashRouter>
            <React.Suspense fallback>
                <Switch>
                    <Route path='/login' component={(props: any) => <Login {...props} />} />
                    {/* <Route path="/platform" component={(props: any) => <Editor {...props} />} />
                    <Route path="/screen" component={(props: any) => <Screen {...props} />} />
                    <Route path="/test" component={(props: any) => <Test {...props} />} /> */}
                    <PrivateRoute path='/' component={(props: any) => <Layout {...props} />} />
                </Switch>
            </React.Suspense>
        </HashRouter>
    );
}
export default IRoutes;