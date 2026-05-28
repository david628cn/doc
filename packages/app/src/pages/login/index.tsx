import React from 'react';
import { Tab } from '@carvy/ui';
import { AccountLogin } from '@/components/login/accountLogin';
import Register from '@/components/register';
import { CLASSNAME } from '@/config';
import './index.less';

const L = `${CLASSNAME}-page-login`;

type LoginProps = {
}

const Login: React.FC<LoginProps> = props => {

    // const phoneItem = (
    //     <div className={styles['login-box']}>
    //         {/* <h1 className={styles['login-title']}>
    //             {formatMessage({ id: 'page.user.login.form.title' })}
    //         </h1> */}
    //         <Form name="basic" onFinish={handleSubmit}>
    //             <Form.Item
    //                 label=""
    //                 name="username"
    //                 rules={[
    //                     {
    //                         required: true,
    //                         message: formatMessage({
    //                             id: 'page.user.login.form-item-username.required',
    //                         }),
    //                     },
    //                 ]}
    //             >
    //                 <Input
    //                     placeholder={formatMessage({
    //                         id: 'page.user.login.form-item-username',
    //                     })}
    //                     prefix={<UserOutlined />}
    //                 />
    //             </Form.Item>

    //             <Form.Item
    //                 label=""
    //                 name="password"
    //                 rules={[
    //                     {
    //                         required: true,
    //                         message: formatMessage({
    //                             id: 'page.user.login.form-item-password.required',
    //                         }),
    //                     },
    //                 ]}
    //             >
    //                 <Input.Password
    //                     placeholder={formatMessage({
    //                         id: 'page.user.login.form-item-password',
    //                     })}
    //                     prefix={<UnlockOutlined />}
    //                 />
    //             </Form.Item>

    //             <Form.Item>
    //                 <Button
    //                     type="primary"
    //                     className={styles['login-submit']}
    //                     htmlType="submit"
    //                     loading={submitLoading}
    //                 >
    //                     {formatMessage({ id: 'page.user.login.form.btn-submit' })}
    //                 </Button>
    //                 <div className="text-align-right">
    //                     {/* <Link to="/user/register">
    //                         {formatMessage({ id: 'page.user.login.form.btn-jump' })}
    //                     </Link> */}
    //                 </div>
    //             </Form.Item>

    //             {/* {loginStatus === 'error' && !submitLoading && (
    //                 <Alert
    //                     message={formatMessage({ id: 'page.user.login.form.login-error' })}
    //                     type="error"
    //                     showIcon
    //                 />
    //             )} */}
    //         </Form>
    //     </div>
    // );

    const items: Array<any> = [
        // {
        //   key: 'phoneLogin',
        //   label: '手机号登录',
        //   children: phoneItem,
        // },
        {
            key: 'accountLogin',
            label: '登录',
            children: <AccountLogin />
        },
        {
            key: 'register',
            label: '注册',
            children: <Register />
        }
    ];

    return (
        <div className={`${L}-container`}>
            {/* <div className="login-header"></div> */}
            <div className={`${L}-center`}>
                <div className={`${L}-inner`}>
                    <Tab defaultActiveKey="accountLogin" items={items} />
                </div>
            </div>
        </div>
    );
}

export default Login;