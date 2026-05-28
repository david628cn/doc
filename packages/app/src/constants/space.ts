/**
 * 2. 空间内部操作角色 (Space Level)
 */
export enum SpaceRole {
    Owner = 'owner',
    Admin = 'admin',
    Editor = 'editor',
    Viewer = 'viewer',
    None = 'none',
}

/**
 * 角色权重：数值越大权限越高（与后端 model.SpaceRoleWeight / GetSpaceRoleWeight 一致）
 * owner=4 admin=3 editor=2 viewer=1 none=0
 */
export const SpaceRolePriority: Record<SpaceRole, number> = {
    [SpaceRole.Owner]: 4,
    [SpaceRole.Admin]: 3,
    [SpaceRole.Editor]: 2,
    [SpaceRole.Viewer]: 1,
    [SpaceRole.None]: 0,
};

export const SpaceRoleRenderConfig: Record<SpaceRole, {
    label: string;
    color: string;
    desc: string;
}> = {
    [SpaceRole.Owner]: {
        label: '所有者',
        color: '#dfb20c',
        desc: '当前库业务所有权（可转让）；「创建者」为首次建库人，二者可能不同',
    },
    [SpaceRole.Admin]: { label: '管理员', color: '#377dff', desc: '可管理成员、设置空间属性' },
    [SpaceRole.Editor]: { label: '编辑者', color: '#52c41a', desc: '可编辑内容，不可管理成员' },
    [SpaceRole.Viewer]: { label: '阅读者', color: '#fa8c16', desc: '仅可查看和下载' },
    [SpaceRole.None]: { label: '无权限', color: 'default', desc: '无法访问任何内容' },
};

export const SpaceRoleOptions = Object.values(SpaceRole)
    .filter(role => role !== SpaceRole.None) // 排除 None 选项
    .sort((a, b) => SpaceRolePriority[b] - SpaceRolePriority[a])
    .map(role => ({
        label: SpaceRoleRenderConfig[role].label,
        value: role
    }));

/** 成员列表分组排序 */
export const SortedSpaceRoles = Object.values(SpaceRole)
    .filter((role) => role !== SpaceRole.None)
    .sort((a, b) => SpaceRolePriority[b] - SpaceRolePriority[a]);


/**
 * 4. 空间可见性 (Visibility)
 */
export enum SpaceVisibility {
    Workspace = 'workspace',
    Invite = 'invite',
    Private = 'private',
    Default = 'default',
}

export const SpaceAccessRenderConfig: Record<SpaceVisibility, {
    label: string; desc: string; icon: string; color: string; tagClass: string;
}> = {
    [SpaceVisibility.Workspace]: { label: '公开', desc: '全组织成员可见并可加入', icon: 'GlobeOutlined', color: 'blue', tagClass: 'tag-public' },
    [SpaceVisibility.Invite]: { label: '仅限邀请', desc: '仅受邀成员可以查看', icon: 'UsergroupAddOutlined', color: 'purple', tagClass: 'tag-invite' },
    [SpaceVisibility.Private]: { label: '私有', desc: '仅成员可见', icon: 'LockOutlined', color: 'gray', tagClass: 'tag-private' },
    [SpaceVisibility.Default]: { label: '默认', desc: '标准模式', icon: 'InfoCircleOutlined', color: 'default', tagClass: 'tag-default' }
};