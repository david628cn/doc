import React, { useState } from 'react';
import {
    message,
    View,
    Form,
    Input,
    Button
} from '@carvy/ui';
import { useIntl } from 'react-intl';
import {
    checkUsername,
    checkEmail,
    register
} from '@/api';
import './index.less';
type RegisterProps = {
    login?: Function;
}

const Register: React.FC<RegisterProps> = props => {
    const { formatMessage } = useIntl();
    const [submitLoading, setSubmitLoading] = useState(false);

    const handleSubmit = async (values: any) => {
        setSubmitLoading(true);
        const result = await register(values);
        setSubmitLoading(false);
        const { code, data } = result;
        if (code === 200) {
            message.success('注册成功');
        } else {
            message.error(result.message || '注册失败');
        }
    }


    return (
        <View py={10}>
            <Form onFinish={handleSubmit}>
                <Form.Item
                    name="email"
                    label="E-mail"
                    normalize={(value) => value.trim()} // 自动去除首尾空格
                    rules={[
                        {
                            type: 'email',
                            message: '请输入有效的邮箱地址!',
                        },
                        {
                            required: true,
                            message: '邮箱不能为空!',
                        },
                        {
                            // 自定义异步校验逻辑
                            validator: async (_, value) => {
                                // 如果值为空或格式错误，直接跳过异步校验（由前面的 rules 处理）
                                if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
                                    return Promise.resolve();
                                }

                                // 调用你的后端 API
                                try {
                                    const response: any = await checkEmail(value);
                                    if (response.data) {
                                        return Promise.reject(new Error('该邮箱已被注册！'));
                                    }
                                    return Promise.resolve();
                                } catch (error) {
                                    return Promise.reject(new Error('邮箱检测失败'));
                                }
                            },
                        }
                    ]}
                >
                    <Input
                        placeholder={'example@domain.com'}
                    // prefix={<UserOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    name="username"
                    label="用户名"
                    normalize={(value) => value.trim()} // 自动去除首尾空格
                    // tooltip="What do you want others to call you?"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your username!',
                            whitespace: true
                        },
                        {
                            // 自定义异步校验逻辑
                            validator: async (_, value) => {
                                if (!value) return Promise.resolve();
                                // 移除刚才那个错误的邮箱正则判断
                                try {
                                    const response: any = await checkUsername(value);
                                    if (response.data) {
                                        return Promise.reject(new Error('该用户名已被注册!'));
                                    }
                                    return Promise.resolve();
                                } catch (error) {
                                    return Promise.reject(new Error('用户名检测失败'));
                                }
                            }
                        }
                    ]}
                >
                    <Input
                        placeholder={formatMessage({
                            id: 'user-username',
                        })}
                    // prefix={<UserOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="密码"
                    normalize={(value) => value.trim()} // 自动去除首尾空格
                    rules={[
                        {
                            required: true,
                            message: '请输入密码!',
                        },
                    ]}
                >
                    <Input
                        type="password"
                        placeholder={formatMessage({
                            id: 'user-password',
                        })}
                        autoComplete={"off"}
                    // prefix={<UnlockOutlined />}
                    />
                </Form.Item>

                <Form.Item
                    name="rePassword"
                    label="确认密码"
                    normalize={(value) => value.trim()} // 自动去除首尾空格
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: '请输入确认密码!',
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('密码不一致!'));
                            },
                        }),
                    ]}
                >
                    <Input
                        type="password"
                        placeholder={formatMessage({
                            id: 'user-password',
                        })}
                        autoComplete={"off"}
                    // prefix={<UnlockOutlined />}
                    />
                </Form.Item>

                {/* <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
                {
                    validator: (_, value) =>
                        value ? Promise.resolve() : Promise.reject(new Error('Should accept agreement')),
                },
            ]}
            wrapperCol={{
                // xs: {
                //     span: 24,
                //     offset: 0,
                // },
                sm: {
                    span: 16,
                    offset: 5,
                }
            }}
        >
            <Checkbox>
                I have read the <a href="">agreement</a>
            </Checkbox>
        </Form.Item> */}

                <Form.Item
                >
                    <Button
                        color="black"
                        className="account-login-submit"
                        type="submit"
                        loading={submitLoading}
                        style={{ width: '100%' }}
                    >
                        {formatMessage({ id: 'user-register-submit' })}
                    </Button>
                </Form.Item>
            </Form>
        </View>
    );
}

export default Register;