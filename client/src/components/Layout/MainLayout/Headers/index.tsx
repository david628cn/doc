import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Layout,
    Menu,
    Dropdown,
    Space,
    message,
    Avatar,
    Modal,
    Form,
    Input,
} from 'antd';
import {
    UserOutlined,
    // FullscreenOutlined,
    // FullscreenExitOutlined,
    DownOutlined,
    LoginOutlined,
    LockOutlined,
    // EnvironmentFilled,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import history from '@/utils/history';
import { loginOut } from '@/api';
import styles from './index.module.less';

interface HeadersProps {
    user?: any;
    visible?: boolean;
    onTrigger?: () => void;
}

const Headers: React.FC<HeadersProps> = props => {
    const state: any = useSelector(state => state);
    const [showChangePSW, setShowChangePSW] = useState(false);
    const [form] = Form.useForm();

    const onChangePSWFormFinish = async () => {
        try {
            const { oldPassword, password } = await form.validateFields();
            // 模拟修改密码
            message.loading('处理中...', 20);

            setTimeout(() => {
                message.destroy();
                message.success('密码修改成功');
                setTimeout(() => {
                    onLoginOut();
                }, 1000);
            }, 1000);
        } catch { }
    };

    const onLoginOut = async () => {
        // Storage.del('XXX_TOKEN');
        // history.push('/login');
        const result = await loginOut();
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        history.push('/');
    };

    return (
        <div className={ styles['headers-container'] }>
            <div className={ styles['trigger-container'] } onClick={props.onTrigger}>
                <div className={ styles['trigger'] }>
                    {props.visible ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>
            </div>
            <Space className={styles['headers-menu-right']}>
                <Dropdown
                    trigger={['hover']}
                    overlay={() => (
                        <Menu>
                            <Menu.Item
                                key="changePsw"
                                icon={<LockOutlined />}
                                onClick={() => {
                                    form.resetFields();
                                    setShowChangePSW(true);
                                }}
                            >
                                修改密码
                            </Menu.Item>
                            <Menu.Item
                                key="loginOut"
                                icon={<LoginOutlined />}
                                onClick={onLoginOut}
                            >
                                退出登录
                            </Menu.Item>
                        </Menu>
                    )}
                >
                    <div className={styles['headers-menu-right-inner']}>
                        <span className={styles['user-info-label']}>
                            <span className={styles['user-tip-label']}>用户:</span>
                            <span className={styles['user-name-label']}>{state.login.user.username}</span>
                        </span>
                        <span className={styles['user-header-label']}>
                            <Avatar className={styles['headers-avatar']} size="small" src={props.user?.avatar} icon={<UserOutlined />} style={{ backgroundColor: 'rgb(0, 150, 136)' }}/>
                        </span>
                        <span
                            className={styles['headers-username']}
                        >
                            {props.user?.currentUser.name || ''}
                        </span>
                        <span className={styles['headers-anticon']}>
                            <DownOutlined />
                        </span>
                    </div>
                </Dropdown>
            </Space>
            <Modal
                visible={showChangePSW}
                title="修改密码"
                onCancel={() => setShowChangePSW(false)}
                okButtonProps={{
                    htmlType: 'submit',
                }}
                // maskClosable={false}
                onOk={onChangePSWFormFinish}
            >
                <Form
                    form={form}
                    wrapperCol={{ span: 18 }}
                    labelCol={{ span: 6 }}
                    autoComplete="off"
                    onFinish={onChangePSWFormFinish}
                >
                    <Form.Item
                        label="原始密码"
                        name="oldPassword"
                        required
                        rules={[{ required: true, message: '请输入原始密码' }]}
                    >
                        <Input.Password placeholder="请输入原始密码" />
                    </Form.Item>
                    <Form.Item
                        label="新密码"
                        name="password"
                        required
                        rules={[{ required: true, message: '请输入新密码' }]}
                    >
                        <Input.Password placeholder="请输入新密码" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default Headers;