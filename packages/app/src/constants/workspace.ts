/**
 * 1. 工作空间角色 (Workspace Level)
 */


export enum WorkspaceRole {
    Owner = 'owner',
    Admin = 'admin',
    Member = 'member',
    Guest = 'guest',
}

/**
 * 角色权重：数值越大权限越高（与后端 model.WorkspaceRoleWeight / GetWorkspaceRoleWeight 一致）
 * owner=4 admin=3 member=2 guest=1
 */
export const WorkspaceRolePriority: Record<WorkspaceRole, number> = {
    [WorkspaceRole.Owner]: 4,
    [WorkspaceRole.Admin]: 3,
    [WorkspaceRole.Member]: 2,
    [WorkspaceRole.Guest]: 1,
};

export const WorkspaceAccessRenderConfig: Record<WorkspaceRole, {
    label: string;
    color: string;
    desc: string;
}> = {
    [WorkspaceRole.Owner]: { label: '所有者', color: '#dfb20c', desc: '拥有最高管理权限，可注销工作空间' },
    [WorkspaceRole.Admin]: { label: '管理员', color: '#377dff', desc: '可管理成员、设置权限及空间配置' },
    [WorkspaceRole.Member]: { label: '普通成员', color: '#52c41a', desc: '可查看及编辑权限范围内的空间内容' },
    [WorkspaceRole.Guest]: { label: '访客', color: '#fa8c16', desc: '受限访问，仅能查看特定分享的内容' },
};


/**
 * 3. 辅助生成器 (Options & Sorters)
 */
export const WorkspaceRoleOptions = Object.values(WorkspaceRole)
    .sort((a, b) => WorkspaceRolePriority[b] - WorkspaceRolePriority[a])
    .map(role => ({
        label: WorkspaceAccessRenderConfig[role].label,
        value: role
    }));

/** 成员列表分组排序（权限从高到低） */
export const SortedWorkspaceRoles = Object.values(WorkspaceRole).sort(
    (a, b) => WorkspaceRolePriority[b] - WorkspaceRolePriority[a],
);