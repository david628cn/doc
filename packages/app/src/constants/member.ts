/**
 * 5. 成员状态与动作 (Invite/Status/Action)
 */
export enum SubjectType { User = 'user', Group = 'group' }
export enum InviteStatus { Pending = 0, Accepted = 1, Rejected = 2, Expired = 3 }

export const InviteStatusRenderConfig: Record<InviteStatus, { label: string; color: string }> = {
    [InviteStatus.Pending]: { label: '待处理', color: '#fa8c16' },
    [InviteStatus.Accepted]: { label: '已接受', color: '#52c41a' },
    [InviteStatus.Rejected]: { label: '已拒绝', color: '#ff4d4f' },
    [InviteStatus.Expired]: { label: '已过期', color: '#8c8c8c' },
};

export enum MemberStatus { Active = 1, Disabled = 2, Pending = 3 }

export enum MemberAction {
    UpdateRole = 'update_role',
    Remove = 'remove',
    TransferOwner = 'transfer_owner',
    ToggleStatus = 'toggle_status',
    ResendInvite = 'resend_invite'
}

export const MemberActionConfig: Record<MemberAction, { label: string; danger: boolean; icon: string; confirmTitle?: string }> = {
    [MemberAction.UpdateRole]: { label: '修改权限', danger: false, icon: 'EditOutlined' },
    [MemberAction.Remove]: { label: '移出空间', danger: true, icon: 'UserDeleteOutlined', confirmTitle: '确定要将该成员移除吗？' },
    [MemberAction.TransferOwner]: { label: '转让所有者', danger: true, icon: 'SwapOutlined', confirmTitle: '转让后你将降级为管理员，是否继续？' },
    [MemberAction.ToggleStatus]: { label: '账号状态', danger: false, icon: 'PoweroffOutlined' },
    [MemberAction.ResendInvite]: { label: '重新邀请', danger: false, icon: 'SendOutlined' },
};