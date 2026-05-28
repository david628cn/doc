import React, { useState, useMemo, useEffect } from 'react';
import {
    Flex,
    View,
    Button,
    Text,
    Form,
    Input,
    TextArea,
    Select,
    Confirm,
    message,
    Avatar,
} from '@carvy/ui';
import { AvatarPicker } from '@/components/avatarPicker';
import { useIntl } from 'react-intl';
import { createSpace, updateSpace, deleteSpace, leaveSpace } from '@/api';
import { SpaceAccessRenderConfig, SpaceVisibility } from '@/constants';
import { useSpaceSession } from '@/hooks';
import { canDeleteSpace, canLeaveSpace } from '@/permissions';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';

type CreateSpaceFormValues = {
    id?: string;
    name: string;
    description: string;
    icon: string;
    role?: string;
    visibility: SpaceVisibility; // 对应后端 visibility 字段
};

export type SpaceBasicFormProps = {
    type?: 'create' | 'editor' | 'viwer';
    data?: CreateSpaceFormValues;
    onSuccess?: (newWorkspace: any) => void;
}

export const SpaceBasicForm: React.FC<SpaceBasicFormProps> = props => {
    const {
        type = 'viwer',
        data,
        onSuccess
    } = props;

    const [loading, setLoading] = useState(false);
    const { formatMessage } = useIntl();
    const { role: spaceRole } = useSpaceSession(data?.id, data?.role);
    const [form] = Form.useForm<CreateSpaceFormValues>();
    const nameWatch = Form.useWatch('name', form);
    const isReadOnly = type === 'viwer';

    // 自动生成图标首字母
    const iconChar = useMemo(() => {
        if (isReadOnly) return String(data?.name ?? '').trim();
        return String(nameWatch ?? '').trim();
    }, [nameWatch, isReadOnly, data?.name]);

    useEffect(() => {
        if (!isReadOnly && data) {
            form.setFieldsValue(data);
        }
    }, [isReadOnly, data, form]);

    const selectOptions = useMemo(() => {
        return Object.entries(SpaceAccessRenderConfig)
            .filter(([key]) => key !== SpaceVisibility.Default)
            .map(([key, config]) => ({
                value: key, // 此时这里的值是 'workspace'，后端 binding:"oneof" 正好识别
                titleText: config.label,
                label: (
                    <View py={4}>
                        <Text as="div" fontSize={14} fontWeight={600}>{config.label}</Text>
                        <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)">{config.desc}</Text>
                    </View>
                ),
            }));
    }, []);

    const handleFinish = (values: CreateSpaceFormValues) => {
        if (type === 'create') {
            handleCreate(values);
        } else if (type === 'editor') {
            handleUpdate(values);
        }
    }

    const handleCreate = async (values: CreateSpaceFormValues) => {
        setLoading(true);
        try {
            // 字段名与后端 model 保持一致使用 visibility
            const rs = await createSpace({
                ...values,
                name: values.name.trim()
            });

            if (rs.code === 200) {
                message.success('创建成功');
                onSuccess?.(rs.data);
            } else {
                message.error(rs.message || '创建失败');
            }
        } catch (err) {
            message.error('系统错误');
        } finally {
            setLoading(false);
        }
    }

    const handleUpdate = async (values: CreateSpaceFormValues) => {
        setLoading(true);
        try {
            // 字段名与后端 model 保持一致使用 visibility
            const rs = await updateSpace({
                name: values.name.trim(),
                description: values.description.trim(),
                icon: values.icon,
                id: data.id
            });

            if (rs.code === 200) {
                message.success('修改成功');
                onSuccess?.(rs.data);
            } else {
                message.error(rs.message || '修改失败');
            }
        } catch (err) {
            message.error('系统错误');
        } finally {
            setLoading(false);
        }
    }

    const showDeleteSpace = type === 'editor' && canDeleteSpace(spaceRole);
    const showLeaveSpace = type === 'editor' && canLeaveSpace(spaceRole);

    const handleRemoveSpace = async () => {
        Confirm({
            title: "删除库",
            content: <View>是否确定删除<Text
                    as="span"
                    py={2}
                    px={7}
                    // borderRadius={6} 
                    // bg="#377dff"
                    // color="#fff" 
                    fontWeight={600}
                    fontSize={16}
                >{data?.name}</Text>库？</View>,
            onOk: async () => {
                const rs = await deleteSpace(data.id);
                if (rs.code === 200) {
                    message.success('删除成功');
                    onSuccess?.(rs.data);
                } else {
                    message.error(rs.message || '删除失败');
                }
            }
        });
    }

    const handleLevelSpace = () => {
        Confirm({
            title: "退出库",
            content: <View>是否确定退出<Text
                    as="span"
                    py={2}
                    px={7}
                    // borderRadius={6} 
                    // bg="#377dff"
                    // color="#fff" 
                    fontWeight={600}
                    fontSize={16}
                >{data?.name}</Text>库？</View>,
            onOk: async () => {
                const rs = await leaveSpace(data.id);
                if (rs.code === 200) {
                    message.success('退出成功');
                    onSuccess?.(rs.data);
                } else {
                    message.error(rs.message || '退出失败');    
                }
            }
        });
    }

    if (isReadOnly) {
        const icon = data?.icon;
        const name = data?.name ?? '—';
        const desc = (data?.description ?? '').trim();
        const visCfg = data?.visibility ? SpaceAccessRenderConfig[data.visibility] : null;
        const iconSrc = resolveMediaSrcForImg(icon);
        return (
            <View w="100%" h="100%">
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>
                    图标和名称
                </Text>
                <Flex gap={8} align="center" mb={16}>
                    <Avatar
                        size={50}
                        icon={
                            iconSrc ? (
                                <img src={iconSrc} alt="" />
                            ) : (
                                (icon as React.ReactNode) || undefined
                            )
                        }
                        title={name}
                    />
                    <Text as="div" fontSize={16} color="rgba(0,0,0,0.88)">
                        {name}
                    </Text>
                </Flex>
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>
                    描述（可选）
                </Text>
                <Text as="div" fontSize={14} color="rgba(0,0,0,0.65)" mb={16} style={{ whiteSpace: 'pre-wrap' }}>
                    {desc || '—'}
                </Text>
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>
                    权限
                </Text>
                {visCfg ? (
                    <View>
                        <Text as="div" fontSize={14} fontWeight={600}>
                            {visCfg.label}
                        </Text>
                        <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)">
                            {visCfg.desc}
                        </Text>
                    </View>
                ) : (
                    <Text as="div" fontSize={14} color="rgba(0,0,0,0.45)">
                        —
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View w="100%" h="100%">
            <Form<CreateSpaceFormValues>
                form={form}
                layout="vertical"
                initialValues={data || {
                    name: '',
                    icon: '',
                    description: '',
                    visibility: SpaceVisibility.Workspace
                }}
                // initialValues={{
                //     name: '',
                //     icon: '',
                //     description: '',
                //     visibility: SpaceVisibility.Workspace
                // }}
                onFinish={handleFinish}
            >
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>图标和名称</Text>
                <Flex gap={8} align="flex-start">
                    <Form.Item
                        name="icon"
                    >
                        <AvatarPicker
                            label={iconChar}
                        >
                        </AvatarPicker>
                    </Form.Item>
                    <Form.Item
                        name="name"
                        rules={[
                            { required: true, message: '名称不能为空' },
                            { max: 50, message: '名称长度不能超过 50 个字符' },
                            { whitespace: true, message: '名称不能全是空格' }
                        ]}
                        style={{ flex: 1, marginBottom: 0 }}
                    >
                        <Input placeholder="库名称" autoComplete="off" autoFocus/>
                    </Form.Item>
                </Flex>

                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>描述（可选）</Text>
                <Form.Item name="description">
                    <TextArea rows={3} placeholder="有关文档库的详细信息" style={{ resize: 'none' }} />
                </Form.Item>
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>权限</Text>
                {type === 'create' ? (
                    <Form.Item name="visibility">
                        <Select options={selectOptions} />
                    </Form.Item>
                ) : (
                    <View px={10}>
                        {(() => {
                            const cfg = data?.visibility
                                ? SpaceAccessRenderConfig[data.visibility]
                                : null;
                            return cfg ? (
                                <View>
                                    <Text as="div" fontSize={14} fontWeight={600}>
                                        {cfg.label}
                                    </Text>
                                    <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)">
                                        {cfg.desc}
                                    </Text>
                                </View>
                            ) : (
                                <Text as="div">—</Text>
                            );
                        })()}
                    </View>
                )}
                <Flex justify="end" gap={10} mt={10}>
                    {showDeleteSpace ? (
                        <Button variant="soft" color="red" onClick={handleRemoveSpace}>
                            删除库
                        </Button>
                    ) : null}
                    {showLeaveSpace ? (
                        <Button variant="soft" color="red" onClick={handleLevelSpace}>
                            退出库
                        </Button>
                    ) : null}
                    <Button variant="soft" color="black" type="submit" loading={loading}>
                        {type === 'create' ? '创建文档库' : '保存'}
                    </Button>
                </Flex>
            </Form>
        </View>
    );
}