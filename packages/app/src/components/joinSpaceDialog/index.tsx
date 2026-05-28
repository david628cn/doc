import React, { useEffect, useState } from 'react';
import { Avatar, View, Text, Input, TextArea, Button, Dialog, Flex, Form, message } from '@carvy/ui';
import { requestJoinSpace } from '@/api';

type MessageForm = { message: string };
type HeaderFormVals = { space_id: string; message: string };

/** 从卡片等入口：已知 spaceId 时填写附言并提交申请 */
export type SpaceJoinRequestDialogProps = {
    open: boolean;
    onClose: () => void;
    spaceId: string;
    spaceName?: string;
    onSuccess?: () => void;
};

export const SpaceJoinRequestDialog: React.FC<SpaceJoinRequestDialogProps> = ({
    open,
    onClose,
    spaceId,
    spaceName,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm<MessageForm>();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({ message: '' });
        }
    }, [open, form]);

    const submit = async (values: MessageForm) => {
        const sid = String(spaceId || '').trim();
        if (!sid) {
            message.error('缺少库 ID');
            return;
        }
        setLoading(true);
        try {
            const rs = await requestJoinSpace(sid, (values.message || '').trim());
            if (rs.code === 200) {
                message.success(rs.message || '申请已提交');
                onSuccess?.();
                onClose();
            } else {
                message.error(rs.message || '申请失败');
            }
        } catch {
            message.error('网络错误');
        } finally {
            setLoading(false);
        }
    };

    const displayName = (spaceName && String(spaceName).trim()) || spaceId;

    return (
        <Dialog
            open={open}
            title="申请加入知识库"
            onCancel={onClose}
            onPopuoverDown={onClose}
            footer={null}
        >
            <View style={{ padding: '0 20px 20px 20px' }}>
                <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)" mb={10}>
                    将向「{displayName}」的管理员发送加入申请（需已加入当前工作区；仅私密或需邀请类知识库可申请）。管理员在通知中通过后，你将收到结果消息。
                </Text>
                <Form<MessageForm> form={form} layout="vertical" onFinish={submit} initialValues={{ message: '' }}>
                    <Form.Item name="message" label="附言（可选）">
                        <TextArea rows={3} placeholder="简单说明加入原因" />
                    </Form.Item>
                    <Flex justify="flex-end" gap={10}>
                        <Button variant="soft" type="button" onClick={onClose}>
                            取消
                        </Button>
                        <Button color="blue" type="submit" loading={loading}>
                            提交申请
                        </Button>
                    </Flex>
                </Form>
            </View>
        </Dialog>
    );
};

/** Header 入口：在当前工作区上下文中，通过知识库 UUID 申请加入 */
export const JoinSpaceDialogTrigger: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm<HeaderFormVals>();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({ space_id: '', message: '' });
        }
    }, [open, form]);

    const submit = async (values: HeaderFormVals) => {
        const sid = (values.space_id || '').trim();
        if (!sid) {
            message.error('请填写知识库 ID（UUID）');
            return;
        }
        setLoading(true);
        try {
            const rs = await requestJoinSpace(sid, (values.message || '').trim());
            if (rs.code === 200) {
                message.success(rs.message || '申请已提交');
                setOpen(false);
                form.resetFields();
            } else {
                message.error(rs.message || '申请失败');
            }
        } catch {
            message.error('网络错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Avatar
                size="large"
                radius="full"
                title="加入知识库"
                onClick={() => setOpen(true)}
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        <line x1="12" y1="7" x2="12" y2="13" />
                        <line x1="9" y1="10" x2="15" y2="10" />
                    </svg>
                }
            />
            <Dialog
                open={open}
                title="申请加入知识库"
                onCancel={() => setOpen(false)}
                onPopuoverDown={() => setOpen(false)}
                footer={null}
            >
                <View style={{ padding: '0 20px 20px 20px' }}>
                    <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)" mb={10}>
                        请确认顶部已切换到目标知识库所在的工作区。填写知识库 ID 后，管理员将在「我的接收消息」中处理，结果会通知你。
                    </Text>
                    <Form<HeaderFormVals> form={form} layout="vertical" onFinish={submit} initialValues={{ space_id: '', message: '' }}>
                        <Form.Item
                            name="space_id"
                            label="库 ID"
                            rules={[{ required: true, message: '请填写知识库 ID' }]}
                        >
                            <Input placeholder="例如 UUID" autoComplete="off" />
                        </Form.Item>
                        <Form.Item name="message" label="附言（可选）">
                            <TextArea rows={3} placeholder="简单说明加入原因" />
                        </Form.Item>
                        <Flex justify="flex-end" gap={10}>
                            <Button variant="soft" type="button" onClick={() => setOpen(false)}>
                                取消
                            </Button>
                            <Button color="black" type="submit" loading={loading}>
                                提交申请
                            </Button>
                        </Flex>
                    </Form>
                </View>
            </Dialog>
        </>
    );
};
