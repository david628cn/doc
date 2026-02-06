import React, { useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Tabs, Form, Input, Button, message } from 'antd';
import { UserOutlined, UnlockOutlined } from '@ant-design/icons';
import { useIntl } from "react-intl";
import {
    login
} from '@/api';
import history from '@/utils/history';
import styles from './index.module.less';

interface IProps {
    login?: Function;
}

const Page: React.FC<IProps> = props => {
    const { formatMessage } = useIntl();
    const [submitLoading, setSubmitLoading] = useState(false);

    const handleSubmit = async (values: any) => {
		setSubmitLoading(true);
        const result = await login(values);
        setSubmitLoading(false);
        console.log('values', values, result);
        const { code, data } = result;
        if (code === 200) {
            const token = `${ data.tokenHead || '' }${ data.token }`;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(values));
            history.push('/');
        } else {
            localStorage.setItem('token', '');
            localStorage.setItem('user', '');
            message.error(
				formatMessage({ id: 'page.user.login.form.login-error' })
			);
        }
	};

    const phoneItem = (
        <div className={styles['login-box']}>
            {/* <h1 className={styles['login-title']}>
                {formatMessage({ id: 'page.user.login.form.title' })}
            </h1> */}
            <Form name="basic" onFinish={handleSubmit}>
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
                        prefix={<UserOutlined />}
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
                        prefix={<UnlockOutlined />}
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

    const accountItem = (
        <div className={styles['login-box']}>
            {/* <h1 className={styles['login-title']}>
                {formatMessage({ id: 'page.user.login.form.title' })}
            </h1> */}
            <Form name="basic" size="large" onFinish={handleSubmit}>
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

    const items: Array<any> = [
        // {
        //   key: '0',
        //   label: '手机号登录',
        //   children: phoneItem,
        // },
        {
          key: '1',
          label: '帐号登录',
          children: accountItem,
        }
      ];

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
                    <Tabs defaultActiveKey="1" items={items} />
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