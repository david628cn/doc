import React, { useState } from 'react';
import { Avatar, View, Text, Input, TextArea, Button, Dialog, Flex, Form, message } from '@carvy/ui';
import { requestJoinWorkspace } from '@/api';

type FormVals = { workspace_id: string; message: string };

/** Header 入口：通过工作区 UUID 申请加入（非成员） */
export const JoinWorkspaceDialogTrigger: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm<FormVals>();

    const submit = async (values: FormVals) => {
        const id = (values.workspace_id || '').trim();
        if (!id) {
            message.error('请填写工作区 ID（UUID）');
            return;
        }
        setLoading(true);
        try {
            const rs = await requestJoinWorkspace(id, (values.message || '').trim());
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
                title="加入工作区"
                onClick={() => setOpen(true)}
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                }
            />
            <Dialog
                open={open}
                title="申请加入工作区"
                onCancel={() => setOpen(false)}
                onPopuoverDown={() => setOpen(false)}
                footer={null}
            >
                <View style={{
                    padding: '0 20px 20px 20px'
                }}>
                    <Text as="div" fontSize={12} color="rgba(0,0,0,0.45)" mb={10}>
                        向目标工作区的管理员发送加入申请。请填写工作区 ID（UUID），管理员将在通知中处理。
                    </Text>
                    <Form<FormVals> form={form} layout="vertical" onFinish={submit} initialValues={{ workspace_id: '', message: '' }}>
                        <Form.Item
                            name="workspace_id"
                            label="工作区 ID"
                            rules={[{ required: true, message: '请填写工作区 ID' }]}
                        >
                            <Input placeholder="例如 a0000001-0000-4000-8000-000000000001" autoComplete="off" />
                        </Form.Item>
                        <Form.Item name="message" label="附言（可选）">
                            <TextArea rows={3} placeholder="简单介绍你的加入原因" />
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
