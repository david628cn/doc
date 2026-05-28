import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
    Form, 
    Input, 
    Flex, 
    View, 
    Button, 
    Text, 
    message, 
    TextArea,
    Confirm,
    Avatar,
} from '@carvy/ui';
import { AvatarPicker } from '@/components/avatarPicker';
import { 
    createWorkspace,
    updateWorkspace, 
    deleteWorkspace,
    leaveWorkspace 
} from '@/api';
import { useIntl } from 'react-intl';
import { useCurrentWorkspace } from '@/hooks';
import { canDeleteWorkspace, canLeaveWorkspace } from '@/permissions';
import { clearWorkspace, patchWorkspaceInfo } from '@/store/features/workspaceSlice';
import type { AppDispatch } from '@/store';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';

type CreateWorkspaceValues = {
    id?: string;
    name: string;
    description: string;
    icon: string;
    // visibility: SpaceVisibility; // 对应后端 visibility 字段
};

export type WorkspaceBasicFormProps = {
    type?: 'create' | 'editor' | 'viwer';
    data?: CreateWorkspaceValues;
    onSuccess?: (newWorkspace: any) => void;
}

export const WorkspaceBasicForm: React.FC<WorkspaceBasicFormProps> = props => {
    const {
        type = 'viwer',
        data,
        onSuccess
    } = props;
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const { workspaceId, role: workspaceRole } = useCurrentWorkspace();

    const { formatMessage } = useIntl();
    const [form] = Form.useForm<CreateWorkspaceValues>();
    const nameWatch = Form.useWatch('name', form);
    const isReadOnly = type === 'viwer';

    const iconChar = useMemo(() => {
        if (isReadOnly) return String(data?.name ?? '').trim();
        return String(nameWatch ?? '').trim();
    }, [nameWatch, isReadOnly, data?.name]);

    useEffect(() => {
        if (!isReadOnly && data) {
            form.setFieldsValue(data);
        }
    }, [isReadOnly, data, form]);

    const handleFinish = (values: CreateWorkspaceValues) => {
        if (type === 'create') {
            handleCreate(values);
        } else if (type === 'editor') {
            handleUpdate(values);
        }
    };

    const handleCreate = async (values: CreateWorkspaceValues) => {
        setLoading(true); // 开始请求
        try {
            const payload = {
                name: values.name.trim(),
                icon: values.icon,
                description: (values.description || '').trim()
            };

            const rs = await createWorkspace(payload);

            if (rs.code === 200) {
                message.success(formatMessage({ id: 'operation-success' }));

                // 2. 自动更新本地 active_workspace_id 缓存
                // if (rs.data?.id) {
                //     localStorage.setItem('active_workspace_id', rs.data.id);
                // }
                onSuccess?.(rs.data);
            } else {
                message.error(rs.message || formatMessage({ id: 'operation-error' }));
            }
        } catch (err) {
            message.error(formatMessage({ id: 'operation-error' }));
        } finally {
            setLoading(false);
        }
    }

    const handleUpdate = async (values: CreateWorkspaceValues) => {
        setLoading(true);
        try {
            // 字段名与后端 model 保持一致使用 visibility
            const rs = await updateWorkspace({
                name: values.name.trim(),
                description: (values.description || '').trim(),
                icon: values.icon,
                id: workspaceId || undefined,
            });

            if (rs.code === 200) {
                message.success('修改成功');
                const wid = workspaceId || undefined;
                if (wid) {
                    dispatch(
                        patchWorkspaceInfo({
                            workspace_id: wid,
                            name: values.name.trim(),
                            icon: values.icon,
                        }),
                    );
                }
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

    const showDeleteWorkspace =
        type === 'editor' && canDeleteWorkspace(workspaceRole);
    const showLeaveWorkspace = type === 'editor' && canLeaveWorkspace(workspaceRole);

    const handleRemoveWorkspace = async () => {
        Confirm({
            title: "删除工作区",
            content: <View>是否确定删除<Text
                    as="span"
                    py={2}
                    px={7}
                    // borderRadius={6} 
                    // bg="#377dff"
                    // color="#fff" 
                    fontWeight={600}
                    fontSize={16}
                >{data?.name}</Text>工作区？</View>,
            onOk: async () => {
                const rs = await deleteWorkspace(workspaceId || undefined);
                if (rs.code === 200) {
                    message.success('删除成功');
                    // onSuccess?.(rs.data);
                    dispatch(clearWorkspace());
                    window.location.reload();
                } else {
                    message.error(rs.message || '删除失败');    
                }
            }
        });
    }

    const handleLevelWorkspace = () => {
        Confirm({
            title: "退出工作区",
            content: <View>是否确定退出<Text
                    as="span"
                    py={2}
                    px={7}
                    // borderRadius={6} 
                    // bg="#377dff"
                    // color="#fff" 
                    fontWeight={600}
                    fontSize={16}
                >{data?.name}</Text>工作区？</View>,
            onOk: async () => {
                const rs = await leaveWorkspace(workspaceId || undefined);
                if (rs.code === 200) {
                    message.success('退出成功');
                    // onSuccess?.(rs.data);
                    dispatch(clearWorkspace());
                    window.location.reload();
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
        const iconSrc = resolveMediaSrcForImg(icon);
        return (
            <View w="100%" h="100%">
                <Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>
                    图标和名称
                </Text>
                <Flex gap={6} align="start" mb={16}>
                    <Avatar
                        size={32}
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
                <Text as="div" fontSize={14} color="rgba(0,0,0,0.65)" style={{ whiteSpace: 'pre-wrap' }}>
                    {desc || '—'}
                </Text>
            </View>
        );
    }

    return (
        <View w="100%" h="100%">
            <Form<CreateWorkspaceValues>
                form={form}
                layout="vertical"
                // className={`${CLASSNAME}-create-workspace-form`}
                initialValues={data || {
                    name: '',
                    description: '',
                    icon: ''
                }}
                onFinish={handleFinish}
            >
                <Text as="div" fontSize={14} fontWeight={600} color="rgba(0,0,0,0.88)" mb={10}>
                    图标和名称
                </Text>
                <Flex gap={12} align="start" mb={22}>
                    <Form.Item name="icon" style={{ marginBottom: 0 }}>
                        <AvatarPicker label={iconChar} size={32} radius={8} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        rules={[
                            { required: true, message: '工作区名称不能为空' },
                            { max: 50, message: '名称长度不能超过 50 个字符' },
                            { whitespace: true, message: '名称不能全是空格' },
                        ]}
                        style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
                    >
                        <Input placeholder="工作区名称" autoFocus/>
                    </Form.Item>
                </Flex>

                <Text as="div" fontSize={14} fontWeight={600} color="rgba(0,0,0,0.88)" mb={10}>
                    描述（可选）
                </Text>
                <Form.Item name="description" style={{ marginBottom: 0 }}>
                    <TextArea
                        rows={4}
                        placeholder="有关工作区的详细信息"
                        style={{
                            resize: 'none',
                            minHeight: 108,
                            paddingTop: 10,
                            paddingBottom: 10,
                        }}
                    />
                </Form.Item>
                <Flex
                    justify="flex-end"
                    gap={10}
                >
                    {showDeleteWorkspace ? (
                        <Button variant="soft" color="red" onClick={handleRemoveWorkspace}>
                            删除工作区
                        </Button>
                    ) : null}
                    {showLeaveWorkspace ? (
                        <Button variant="soft" color="red" onClick={handleLevelWorkspace}>
                            退出工作区
                        </Button>
                    ) : null}
                    <Button color="black" type="submit" loading={loading}>
                        {type === 'create' ? '创建工作区' : '保存'}
                    </Button>
                </Flex>
            </Form>
        </View>
    );
}