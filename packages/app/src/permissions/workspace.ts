import { WorkspaceRole, WorkspaceRolePriority } from '@/constants';

export const isWorkspaceRole = (v: unknown): v is WorkspaceRole =>
	typeof v === 'string' && v in WorkspaceRolePriority;

/** 当前角色是否不低于 min（与后端 weight 比较：>= 即权限够） */
export const gteWorkspaceRole = (curr: WorkspaceRole | undefined, min: WorkspaceRole) =>
	!!curr && WorkspaceRolePriority[curr] >= WorkspaceRolePriority[min];

export const canManageWorkspaceMembers = (r?: WorkspaceRole) =>
	gteWorkspaceRole(r, WorkspaceRole.Admin);

/** 是否可查看工作区成员列表（member / admin / owner；访客不可） */
export const canViewWorkspaceMembers = (r?: WorkspaceRole) =>
	gteWorkspaceRole(r, WorkspaceRole.Member);

export const canEditWorkspaceSettings = (r?: WorkspaceRole) =>
	gteWorkspaceRole(r, WorkspaceRole.Admin);

/** 仅所有者及以上删除工作区等高危操作 */
export const canDeleteWorkspace = (r?: WorkspaceRole) =>
	gteWorkspaceRole(r, WorkspaceRole.Owner);

/** 非所有者可退出工作区（管理员、成员、访客） */
export const canLeaveWorkspace = (r?: WorkspaceRole) =>
	!!r && r !== WorkspaceRole.Owner;

/**
 * 当前操作者是否可调某一成员的层级（不能动 owner；且不能对权限不低于自己的成员改角色）
 */
export const canChangeWorkspaceMemberRole = (
	operator?: WorkspaceRole,
	target?: WorkspaceRole,
) => {
	if (!canManageWorkspaceMembers(operator) || !target) return false;
	if (target === WorkspaceRole.Owner) return false;
	if (!operator) return false;
	return WorkspaceRolePriority[operator] > WorkspaceRolePriority[target];
};

/**
 * 是否允许将目标成员改为 nextRole（含后端规则：仅所有者可授予「管理员」）
 */
export const canAssignWorkspaceMemberRole = (
	operator?: WorkspaceRole,
	targetCurrent?: WorkspaceRole,
	next?: WorkspaceRole,
) => {
	if (!next || !canChangeWorkspaceMemberRole(operator, targetCurrent)) return false;
	if (next === WorkspaceRole.Admin && operator !== WorkspaceRole.Owner) return false;
	return true;
};
