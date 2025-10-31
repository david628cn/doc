import React, { useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Tabs, Form, Input, Button, message } from 'antd';
import { UserOutlined, UnlockOutlined } from '@ant-design/icons';
import { useIntl } from "react-intl";
import {
    login,
    register,
    checkUsername
} from '@/api';
import history from '@/utils/history';
import styles from './index.module.less';

const debounce = (fn: Function, delay: number = 500) => {
    let timer: any;
    return (...args: any) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

interface IProps {
    login?: any;
}

const Page: React.FC<IProps> = props => {
    const { formatMessage } = useIntl();
    const [submitLoading, setSubmitLoading] = useState(false);
    const [activeKey, setActiveKey] = useState('1');

    const handleSubmit = async (values: any) => {
        setSubmitLoading(true);
        const result = await login(values);
        setSubmitLoading(false);
        console.log('values', values, result);
        const { code, data } = result;
        let current = values;
        if (code === 200) {
            const token = `${data.tokenHead || ''}${data.token}`;
            localStorage.setItem('token', token);
            if (data.user) {
                current = data.user;
            }
            delete current.password;
            localStorage.setItem('user', JSON.stringify(current));
            props.login(current);
            history.push('/');
        } else {
            localStorage.setItem('token', '');
            localStorage.setItem('user', '');
            props.login(null);
            message.error(
                formatMessage({ id: 'page.user.login.form.login-error' })
            );
        }
    };

    const handleSignUpSubmit = async (values: any) => {
        setSubmitLoading(true);
        const result = await register(values);
        setSubmitLoading(false);
        const { code, data } = result;
        if (code === 200) {
            message.success(
                formatMessage({ id: 'page.user.register.form.register-success' })
            );
        } else {
            message.error(
                formatMessage({ id: 'page.user.register.form.register-error' })
            );
        }
    };

    const accountItem = (
        <div className={styles['login-box']}>
            {/* <h1 className={styles['login-title']}>
                {formatMessage({ id: 'page.user.login.form.title' })}
            </h1> */}
            <Form name="login" size="large" onFinish={handleSubmit}>
                <Form.Item
                    label=""
                    name="username"
                    rules={[
                        {
                            required: true,
                            message: formatMessage({
                                id: 'page.user.login.form-item-username.required',
                            }),
                        },
                    ]}
                >
                    <Input
                        placeholder={formatMessage({
                            id: 'page.user.login.form-item-username',
                        })}
                    // prefix={<UserOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    label=""
                    name="password"
                    rules={[
                        {
                            required: true,
                            message: formatMessage({
                                id: 'page.user.login.form-item-password.required',
                            }),
                        },
                    ]}
                >
                    <Input.Password
                        placeholder={formatMessage({
                            id: 'page.user.login.form-item-password',
                        })}
                    // prefix={<UnlockOutlined />}
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        className={styles['login-submit']}
                        htmlType="submit"
                        loading={submitLoading}
                    >
                        {formatMessage({ id: 'page.user.login.form.btn-submit' })}
                    </Button>
                    <div className="text-align-right">
                        {/* <Link to="/user/register">
                            {formatMessage({ id: 'page.user.login.form.btn-jump' })}
                        </Link> */}
                    </div>
                </Form.Item>

                {/* {loginStatus === 'error' && !submitLoading && (
                    <Alert
                        message={formatMessage({ id: 'page.user.login.form.login-error' })}
                        type="error"
                        showIcon
                    />
                )} */}
            </Form>
        </div>
    );

    const registerItem = (
        <div className={styles['register-box']}>
            {/* <h1 className={styles['register-title']}>
                {formatMessage({ id: 'page.user.register.form.title' })}
            </h1> */}
            <Form name="register" size="large" onFinish={handleSignUpSubmit}>
                <Form.Item
                    label=""
                    name="username"
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: formatMessage({
                                id: 'page.user.register.form-item-username.required',
                            }),
                        },
                        {
                            validator: debounce(async (_: any, value: any, callback: Function) => {
                                if (value !== '') {
                                    const res = await checkUsername({
                                        username: value
                                    });
                                    res.data ? callback("用户已存在") : callback();
                                }
                            })
                        }
                    ]}
                >
                    <Input
                        placeholder={formatMessage({
                            id: 'page.user.register.form-item-username',
                        })}
                    // prefix={<UserOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    label=""
                    name="password"
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: formatMessage({
                                id: 'page.user.register.form-item-password.required',
                            }),
                        },
                    ]}
                >
                    <Input.Password
                        placeholder={formatMessage({
                            id: 'page.user.register.form-item-password',
                        })}
                    // prefix={<UnlockOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    label=""
                    name="rePassword"
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: formatMessage({
                                id: 'page.user.register.form-item-rePassword.required',
                            }),
                        },
                        ({ getFieldValue }) => ({
                            validator: (_: any, value) => {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(formatMessage({ id: 'page.user.register.form-item-rePassword.error' })));
                            }
                        })
                    ]}
                >
                    <Input.Password
                        placeholder={formatMessage({
                            id: 'page.user.register.form-item-rePassword',
                        })}
                    // prefix={<UnlockOutlined />}
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        className={styles['register-submit']}
                        htmlType="submit"
                        loading={submitLoading}
                    >
                        {formatMessage({ id: 'page.user.register.form.btn-submit' })}
                    </Button>
                    <div className="text-align-right">
                        {/* <Link to="/user/register">
                            {formatMessage({ id: 'page.user.register.form.btn-jump' })}
                        </Link> */}
                    </div>
                </Form.Item>

                {/* {loginStatus === 'error' && !submitLoading && (
                    <Alert
                        message={formatMessage({ id: 'page.user.register.form.login-error' })}
                        type="error"
                        showIcon
                    />
                )} */}
            </Form>
        </div>
    );

    // const handleSubmit = async (values: any) => {
    // 	setSubmitLoading(true);
    //     // const result = await login(values);
    //     setSubmitLoading(false);
    //     // console.log('values', values, result);
    //     // const { code, data } = result;
    //     // if (code === 200) {
    //     //     const token = `${ data.tokenHead }${ data.token }`;
    //     //     localStorage.setItem('token', token);
    //     //     localStorage.setItem('user', JSON.stringify(values));
    //     //     history.push('/');
    //     // } else {
    //     //     localStorage.setItem('token', '');
    //     //     localStorage.setItem('user', '');
    //     //     message.error(
    // 	// 		formatMessage({ id: 'page.user.login.form.login-error' })
    // 	// 	);
    //     // }

    //     localStorage.setItem('token', 'token');
    //     localStorage.setItem('user', JSON.stringify(values));
    //     history.push('/');

    // };

    return (
        <div className={styles['login-container']}>
            <div className={styles['login-header']}></div>
            <div className={styles['login-center']}>
                <div className={styles['login-inner']}>
                    <Tabs activeKey={activeKey} items={[
                        // {
                        //   key: '0',
                        //   label: '手机号登录',
                        //   children: phoneItem,
                        // },
                        {
                            key: '1',
                            label: '帐号登录',
                            children: accountItem,
                        },
                        {
                            key: '2',
                            label: '帐号注册',
                            children: registerItem,
                        }
                    ]} onChange={(v: any) => {
                        setActiveKey(v);
                    }} />
                </div>
            </div>
        </div>
    );
}

export default connect(
    (mapStateToProps: any) => mapStateToProps.login,
    (dispatch: any) => bindActionCreators({
        login: (params: any) => {
            return (dispatch: any) => {
                dispatch({
                    type: 'login',
                    user: params
                });
            }
        }
    }, dispatch)
)(Page);