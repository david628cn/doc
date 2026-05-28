import React from 'react';
import { 
    View, 
    IconWrapper 
} from '@carvy/ui';
import { 
    SpaceRoleRenderConfig, 
    WorkspaceAccessRenderConfig, 
    InviteStatusRenderConfig,
    SpaceAccessRenderConfig,
    SpaceRole,
    WorkspaceRole,
    InviteStatus
} from '@/constants';

export const MemberRenderHelper = {
    /**
     * 渲染空间角色标签 (Admin/Editor/Viewer)
     */
    renderSpaceAccessTag(role: SpaceRole) {
        const config = SpaceRoleRenderConfig[role];
        if (!config) return null;
        return (
            <View 
                as="span" 
                py={2} 
                px={7} 
                borderRadius={6} 
                bg={config.color} 
                color="#fff" 
                fontSize={12}
            >
                {config.label}
            </View>
        );
    },

    /** 组授权展开进入名单（sys_space_access subject_type=group） */
    renderSpaceMemberGroupSourceTag() {
        return (
            <View
                as="span"
                py={2}
                px={7}
                borderRadius={6}
                bg="#e3f2fd"
                color="#1565c0"
                fontSize={12}
                title="通过用户组获得该库权限"
            >
                组授权
            </View>
        );
    },

    /** 原始建库人（sys_space.create_by），与当前业务「所有者」角色可分离（转让后） */
    renderSpaceOriginalCreatorTag() {
        return (
            <View
                as="span"
                py={2}
                px={7}
                borderRadius={6}
                bg="#8c8c8c"
                color="#fff"
                fontSize={12}
                title="首次创建该文档库的用户；转让所有权后仍为创建者记录"
            >
                创建者
            </View>
        );
    },

    /**
     * 渲染工作空间准入标签 (Owner/Admin/Member)
     */
    renderWorkspaceAccessTag(role: WorkspaceRole) {
        const config = WorkspaceAccessRenderConfig[role];
        if (!config || role === WorkspaceRole.Member) return null;
        return (
            <View 
                as="span" 
                py={2} 
                px={7} 
                borderRadius={6} 
                bg={config.color} 
                color="#fff" 
                fontSize={12}
                // fontWeight="normal"
            >
                {config.label}
            </View>
        );
    },

    /**
     * 渲染邀请状态标签
     */
    renderInviteStatusTag(status: InviteStatus) {
        const config = InviteStatusRenderConfig[status];
        if (!config) return null;
        return (
            <View as="span" py={2} px={7} borderRadius={6} bg={config.color} color="#fff" fontSize={12}>
                {config.label}
            </View>
        );
    },

    /**
     * 渲染带图标的可见性配置 (用于 Header 或设置页)
     */
    renderVisibilityInfo(visibility: any) {
        const config = SpaceAccessRenderConfig[visibility];
        if (!config) return null;
        return (
            <div className={`flex-center ${config.tagClass}`}>
                <IconWrapper style={{ color: config.color, marginRight: 4 }}>
                    {config.icon}
                </IconWrapper>
                <span>{config.label}</span>
            </div>
        );
    }
};

// const columns = [
//     {
//         title: '成员',
//         render: (record) => (
//             <View display="flex" alignItems="center">
//                 <span>{record.username}</span>
//                 {/* 自动渲染 Owner/Admin 标签 */}
//                 {MemberRenderHelper.renderWorkspaceAccessTag(record.workspaceRole)}
//             </View>
//         )
//     },
//     {
//         title: '空间权限',
//         render: (record) => MemberRenderHelper.renderSpaceRoleTag(record.role)
//     },
//     {
//         title: '状态',
//         render: (record) => MemberRenderHelper.renderInviteStatusTag(record.inviteStatus)
//     }
// ];