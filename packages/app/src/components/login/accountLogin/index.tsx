import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { Location } from 'history';
import { type RootState, type AppDispatch } from '@/store';
import { 
    message,
    Form,
    Input,
    Button 
} from '@carvy/ui';
import { loginAsync } from '@/store/features/authSlice';
import { useIntl } from 'react-intl';
import history from '@/utils/history';
import './index.less';

export type AccountLoginProps = {

}

type LoginLocationState = { from?: Location };

export const AccountLogin: React.FC<AccountLoginProps> = props => {
    const { formatMessage } = useIntl();
    const dispatch = useDispatch<AppDispatch>();
    const location = useLocation<LoginLocationState>();
    const { loading } = useSelector((state: RootState) => state.auth);

    const handleSubmit = async (values: any) => {
        const resultAction = await dispatch(loginAsync(values));
        if (loginAsync.fulfilled.match(resultAction)) {
            const from = location.state?.from;
            if (from?.pathname) {
                history.push(`${from.pathname}${from.search || ''}${from.hash || ''}`);
            } else {
                history.push('/');
            }
        } else {
            const errorMsg = resultAction.payload as string;
            message.error(
                errorMsg || formatMessage({ id: 'user-login-error' })
            );
        }
    }

    return <div className="account-login-box">
        {/* <h1 className={styles['login-title']}>
                {formatMessage({ id: 'page.user.login.form.title' })}
            </h1> */}
        <Form onFinish={handleSubmit}>
            <Form.Item
                name="username"
                normalize={(value) => value.trim()} // 自动去除首尾空格
                rules={[
                    {
                        required: true,
                        message: formatMessage({
                            id: 'user-username-required',
                        }),
                    },
                ]}
            >
                <Input
                    placeholder={formatMessage({
                        id: 'user-username-required',
                    })}
                // prefix={<UserOutlined />}
                />
            </Form.Item>

            <Form.Item
                name="password"
                normalize={(value) => value.trim()} // 自动去除首尾空格
                rules={[
                    {
                        required: true,
                        message: formatMessage({
                            id: 'user-password-required',
                        }),
                    },
                ]}
            >
                <Input type="password"
                    placeholder={formatMessage({
                        id: 'user-password',
                    })}
                    autoComplete={"off"}
                // prefix={<UnlockOutlined />}
                />
            </Form.Item>

            <Form.Item>
                <Button
                    className="account-login-submit"
                    type="submit"
                    color="black"
                    loading={loading}
                >
                    {formatMessage({ id: 'user-login-submit' })}
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
    </div>;
}