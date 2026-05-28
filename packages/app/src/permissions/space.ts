import { SpaceRole, SpaceRolePriority } from '@/constants';

export const isSpaceRole = (v: unknown): v is SpaceRole =>
	typeof v === 'string' && v in SpaceRolePriority;

/** 当前角色是否不低于 min（与后端 weight 比较：>= 即权限够） */
export const gteSpaceRole = (curr: SpaceRole | undefined, min: SpaceRole) =>
	!!curr && SpaceRolePriority[curr] >= SpaceRolePriority[min];

export const canManageSpaceMembers = (r?: SpaceRole) =>
	gteSpaceRole(r, SpaceRole.Admin);

/** 修改库名称、描述、图标等基本属性（与「管理员可设置空间属性」一致） */
export const canEditSpaceSettings = (r?: SpaceRole) =>
	gteSpaceRole(r, SpaceRole.Admin);

export const canEditSpaceContent = (r?: SpaceRole) =>
	gteSpaceRole(r, SpaceRole.Editor);

export const canTransferSpaceOwner = (r?: SpaceRole) => r === SpaceRole.Owner;

/** 仅所有者可删除库 */
export const canDeleteSpace = (r?: SpaceRole) => r === SpaceRole.Owner;

/** 非所有者可退出库（管理员、编辑者、阅读者） */
export const canLeaveSpace = (r?: SpaceRole) =>
	!!r && r !== SpaceRole.Owner && r !== SpaceRole.None;

export const canChangeSpaceMemberRole = (operator?: SpaceRole, target?: SpaceRole) => {
	if (!canManageSpaceMembers(operator) || !target) return false;
	if (target === SpaceRole.Owner) return false;
	if (!operator) return false;
	return SpaceRolePriority[operator] > SpaceRolePriority[target];
};

/**
 * 是否允许将目标成员改为 nextRole（仅所有者可授予「管理员」）
 */
export const canAssignSpaceMemberRole = (
	operator?: SpaceRole,
	targetCurrent?: SpaceRole,
	next?: SpaceRole,
) => {
	if (!next || !canChangeSpaceMemberRole(operator, targetCurrent)) return false;
	if (next === SpaceRole.Admin && operator !== SpaceRole.Owner) return false;
	return true;
};
