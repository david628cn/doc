import { useMemo } from 'react';
import { WorkspaceRole } from '@/constants';
import {
    canAssignWorkspaceMemberRole,
    canChangeWorkspaceMemberRole,
    canDeleteWorkspace,
    canEditWorkspaceSettings,
    canManageWorkspaceMembers,
} from '@/permissions';
import { useCurrentWorkspace } from './useCurrentWorkspace';

export const useWorkspacePermission = () => {
    const { role } = useCurrentWorkspace();
    return useMemo(
        () => ({
            canManageMembers: canManageWorkspaceMembers(role),
            canEditSettings: canEditWorkspaceSettings(role),
            canDelete: canDeleteWorkspace(role),
            canChangeRoleOf: (target?: WorkspaceRole) => canChangeWorkspaceMemberRole(role, target),
            canAssignRole: (target: WorkspaceRole | undefined, next: WorkspaceRole) =>
                canAssignWorkspaceMemberRole(role, target, next),
        }),
        [role],
    );
};
