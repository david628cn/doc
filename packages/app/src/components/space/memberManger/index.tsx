import React, { useState } from 'react';
import {
    View,
    Flex,
    Button,
    Dialog
} from '@carvy/ui';
import { SpaceInvite } from '../invite';
import { SpaceMember } from '../member';
import { useSpaceSession } from '@/hooks';
import { canManageSpaceMembers } from '@/permissions';

export type SpaceMemberMangerProps = {
    style?: React.CSSProperties;
    autoFocus?: boolean;
    params?: any;
}

export const SpaceMemberManger: React.FC<SpaceMemberMangerProps> = props => {
    const {
        params,
        autoFocus
    } = props;
    const { role, detail } = useSpaceSession(params?.id, params?.role);
    const detailFlags = detail as { can_manage_space_members?: boolean } | undefined;
    const showAddMember =
        typeof detailFlags?.can_manage_space_members === 'boolean'
            ? detailFlags.can_manage_space_members
            : canManageSpaceMembers(role);
    const [open, setOpen] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [removeLoading, setRemoveLoading] = useState(false);
    
    const cancelRemove = () => {
        setRemoveOpen(false); 
        // targetUserRef.current = null; 
    }

    const handleRemoveMember = () => {
        // if (targetUserRef.current) {
        //     // reqRemoveMember(targetUserRef.current.id);
        //     if (onRemoveMember?.(targetUserRef.current)) {
        //         setRemoveLoading(false);
        //     }
        // }
    }

    return (
        <View w="100%" h="100%" position="relative">
            <SpaceMember
                header={
                    showAddMember ? (
                        <Button type="primary" onClick={() => setOpen(true)}>
                            添加成员
                        </Button>
                    ) : undefined
                }
                params={params}
                autoFocus={autoFocus}
            ></SpaceMember>
            <View
                w="100%"
                h="100%"
                position="absolute"
                top={0}
                right={0}
                zIndex={10}
                bg="#fff"
                style={{
                    width: open ? '100%' : '0%',
                    // 平滑过渡动画
                    transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                    // open 时在原位，关闭时向右偏移 100%
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                    // 关闭时禁用点击，防止挡住底层的 AvatarList
                    pointerEvents: open ? 'auto' : 'none',
                    visibility: open ? 'visible' : 'hidden' // 彻底隐藏，防止无谓渲染
                }}
            >
                {/* {open && ( */}
                    <SpaceInvite
                        params={params}
                        style={{
                            height: 'calc(100% - 52px)'
                        }}
                        onCancel={() => {
                            setOpen(false);
                            // reqWorkspaceMembers();
                        }}
                        autoFocus={autoFocus}
                    ></SpaceInvite>
                {/* )} */}
            </View>
            <Dialog
                open={removeOpen}
                onCancel={cancelRemove}
                onPopuoverDown={cancelRemove}
                title="移除成员"
                center
            >
                <View mx={20} mb={20}>是否确定移除该用户</View>
                <Flex justify="end" gap={10} pb={20} px={20}>
                    <Button onClick={cancelRemove}>取消</Button>
                    <Button color="black" loading={removeLoading} onClick={handleRemoveMember}>确定</Button>
                </Flex>
            </Dialog>
        </View>

    )
}