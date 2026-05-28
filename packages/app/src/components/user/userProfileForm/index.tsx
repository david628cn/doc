import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Form,
    Input,
    Flex,
    View,
    Button,
    Text,
    message,
    Select,
    TextArea,
} from '@carvy/ui';
import { AvatarPicker } from '@/components/avatarPicker';
import { me, updateUserProfile } from '@/api';
import { setUser } from '@/store/features/authSlice';
import type { AppDispatch, RootState } from '@/store';

export type UserProfileFormProps = {
    onSaved?: () => void;
};

type ProfileFormValues = {
    head_sculpture?: string;
    username?: string;
    real_name?: string;
    email?: string;
    mobile?: string;
    address?: string;
    sex?: number;
    birthday?: string;
    identity_card?: string;
};

const sexOptions = [
    { label: '未知', value: 0 },
    { label: '男', value: 1 },
    { label: '女', value: 2 },
];

/** 中国大陆手机号：11 位，1 开头，第二位 3–9 */
const CN_MOBILE_RE = /^1[3-9]\d{9}$/;

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** 18 位二代身份证校验码（GB 11643） */
function validateCnId18(id: string): boolean {
    const v = id.trim().toUpperCase();
    if (!/^\d{17}[\dX]$/.test(v)) return false;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkChars = '10X98765432';
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += parseInt(v[i], 10) * weights[i];
    }
    return checkChars[sum % 11] === v[17];
}

/** 空表示不校验；有值则校验格式（15 位老证仅长度，18 位含校验码） */
function validateIdentityCard(_: unknown, value: unknown): Promise<void> {
    const raw = String(value ?? '').trim();
    if (!raw) return Promise.resolve();
    if (/^\d{15}$/.test(raw)) return Promise.resolve();
    if (validateCnId18(raw)) return Promise.resolve();
    return Promise.reject(new Error('请输入正确的居民身份证号码（15 或 18 位）'));
}

function validateEmail(_: unknown, value: unknown): Promise<void> {
    const raw = String(value ?? '').trim();
    if (!raw) return Promise.resolve();
    if (EMAIL_RE.test(raw)) return Promise.resolve();
    return Promise.reject(new Error('请输入正确的邮箱地址'));
}

function validateMobile(_: unknown, value: unknown): Promise<void> {
    const raw = String(value ?? '').trim();
    if (!raw) return Promise.resolve();
    if (CN_MOBILE_RE.test(raw)) return Promise.resolve();
    return Promise.reject(new Error('请输入正确的 11 位中国大陆手机号'));
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ onSaved }) => {
    const dispatch = useDispatch<AppDispatch>();
    const authUser = useSelector((s: RootState) => s.auth.user);
    const [form] = Form.useForm<ProfileFormValues>();
    const [loading, setLoading] = useState(false);
    const nameWatch = Form.useWatch('real_name', form);

    const avatarLabel = useMemo(() => {
        const n = String(nameWatch ?? '').trim();
        return n || authUser?.username || '';
    }, [nameWatch, authUser?.username]);

    const loadMe = async () => {
        try {
            const rs: any = await me();
            if (rs.code !== 200 || !rs.data?.user) return;
            const u = rs.data.user;
            let birthdayStr = '';
            if (u.birthday) {
                const raw = typeof u.birthday === 'string' ? u.birthday : String(u.birthday);
                birthdayStr = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
            }
            form.setFieldsValue({
                head_sculpture: u.head_sculpture ?? '',
                username: u.username ?? '',
                real_name: u.real_name ?? '',
                email: u.email ?? '',
                mobile: u.mobile ?? '',
                address: u.address ?? '',
                sex: u.sex ?? 0,
                birthday: birthdayStr,
                identity_card: u.identity_card ?? '',
            });
        } catch {
            message.error('加载用户信息失败');
        }
    };

    useEffect(() => {
        loadMe();
    }, []);

    const handleFinish = async (values: ProfileFormValues) => {
        setLoading(true);
        try {
            const body: Record<string, unknown> = {};
            if (values.head_sculpture !== undefined) body.head_sculpture = values.head_sculpture;
            if (values.real_name !== undefined) body.real_name = String(values.real_name).trim();
            if (values.email !== undefined) body.email = String(values.email).trim();
            if (values.mobile !== undefined) body.mobile = String(values.mobile).trim();
            if (values.address !== undefined) body.address = String(values.address).trim();
            if (values.identity_card !== undefined) body.identity_card = String(values.identity_card).trim();
            if (values.sex !== undefined) {
                body.sex = Number(values.sex);
            }
            if (values.birthday !== undefined) {
                body.birthday = String(values.birthday).trim();
            }

            const rs: any = await updateUserProfile(body);
            if (rs.code === 200 && rs.data) {
                message.success(rs.message || '保存成功');
                dispatch(setUser(rs.data));
                onSaved?.();
            } else {
                message.error(rs.message || '保存失败');
            }
        } catch {
            message.error('保存失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View w="100%" style={{ maxWidth: `520px` }}>
            {/* <Flex gap={8} mb={12} align="center">
                <Text fontSize={13} color="rgba(0,0,0,0.55)" style={{ minWidth: `72px` }}>
                    用户名
                </Text>
                <Text fontSize={14}>{authUser?.username ?? '—'}</Text>
            </Flex> */}

            <Form<ProfileFormValues>
                form={form}
                layout="vertical"
                initialValues={{
                    head_sculpture: '',
                    username: '',
                    real_name: '',
                    email: '',
                    mobile: '',
                    address: '',
                    sex: 0,
                    birthday: '',
                    identity_card: '',
                }}
                onFinish={handleFinish}
            >
                {/* <Text as="div" fontSize={13} fontWeight={600} color="#37352f" mb={8}>
                    头像
                </Text> */}
                <Flex gap={10} align="center" justify="center" mb={16}>
                    <Form.Item name="head_sculpture" style={{ marginBottom: 0 }}>
                        <AvatarPicker radius="full" label={avatarLabel} size={80} />
                    </Form.Item>
                    {/* <Text fontSize={12} color="rgba(0,0,0,0.45)">
                        支持上传图片或选择表情
                    </Text> */}
                </Flex>
                <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ max: 50, message: '不超过 50 字' }]}
                >
                    <Input placeholder="用户名" autoComplete="username" />
                </Form.Item>
                <Form.Item
                    name="real_name"
                    label="姓名"
                    rules={[{ max: 50, message: '不超过 50 字' }]}
                >
                    <Input placeholder="真实姓名（可选）" autoComplete="name" />
                </Form.Item>
                <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[{ validator: validateEmail }]}
                >
                    <Input placeholder="邮箱" autoComplete="email" />
                </Form.Item>
                <Form.Item name="mobile" label="手机" rules={[{ validator: validateMobile }]}>
                    <Input placeholder="11 位手机号" autoComplete="tel" maxLength={11} />
                </Form.Item>
                <Form.Item name="sex" label="性别">
                    <Select options={sexOptions} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="birthday" label="生日">
                    <Input type="date" placeholder="YYYY-MM-DD" />
                </Form.Item>
                <Form.Item name="address" label="地址">
                    <TextArea placeholder="联系地址（可选）" />
                </Form.Item>
                <Form.Item
                    name="identity_card"
                    label="身份证"
                    rules={[{ validator: validateIdentityCard }]}
                >
                    <Input placeholder="选填，18 位或 15 位" autoComplete="off" maxLength={18} />
                </Form.Item>
                <Flex justify="end" mt={8}>
                    <Button type="submit" variant="soft" color="black" loading={loading}>
                        保存
                    </Button>
                </Flex>
            </Form>
        </View>
    );
};
