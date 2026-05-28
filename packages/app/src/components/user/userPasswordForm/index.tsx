import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Form, Input, Flex, View, Button, Text, message } from '@carvy/ui';
import { changePassword } from '@/api';
import { logoutAsync } from '@/store/features/authSlice';
import type { AppDispatch } from '@/store';
import history from '@/utils/history';

export type UserPasswordFormProps = {
    /** 修改成功并已退出登录后的回调 */
    onAfterChange?: () => void;
};

type PwdFormValues = {
    old_password: string;
    new_password: string;
    confirm_password: string;
};

export const UserPasswordForm: React.FC<UserPasswordFormProps> = ({ onAfterChange }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [form] = Form.useForm<PwdFormValues>();
    const [loading, setLoading] = useState(false);

    const handleFinish = async (values: PwdFormValues) => {
        setLoading(true);
        try {
            const rs: any = await changePassword({
                old_password: values.old_password,
                new_password: values.new_password,
            });
            if (rs.code === 200) {
                message.success(rs.message || '密码已修改，请重新登录');
                form.resetFields();
                await dispatch(logoutAsync(null));
                onAfterChange?.();
                history.push('/login');
            } else {
                message.error(rs.message || '修改失败');
            }
        } catch {
            message.error('修改失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View w="100%" style={{ maxWidth: 420 }}>
            <View px={12} py={8} borderRadius={8} fontSize={14} color="rgba(0,0,0,0.88)" bg="#fffbe6" mb={16} style={{
                border: '1px solid #ffe58f'
            }}>
                修改成功后需要重新登录。
            </View>
            <Form<PwdFormValues>
                form={form}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Form.Item
                    name="old_password"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                >
                    <Input type="password" placeholder="当前密码" autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                    name="new_password"
                    label="新密码"
                    rules={[
                        { required: true, message: '请输入新密码' },
                        { min: 6, message: '至少 6 位' },
                    ]}
                >
                    <Input type="password" placeholder="至少 6 位" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                    name="confirm_password"
                    label="确认新密码"
                    dependencies={['new_password']}
                    rules={[
                        { required: true, message: '请再次输入新密码' },
                        ({ getFieldValue }) => ({
                            validator(_: unknown, value: string) {
                                if (!value || getFieldValue('new_password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('两次输入不一致'));
                            },
                        }),
                    ]}
                >
                    <Input type="password" placeholder="再次输入新密码" autoComplete="new-password" />
                </Form.Item>
                <Flex justify="end" mt={8}>
                    <Button type="submit" variant="soft" color="black" loading={loading}>
                        确认修改
                    </Button>
                </Flex>
            </Form>
        </View>
    );
};
