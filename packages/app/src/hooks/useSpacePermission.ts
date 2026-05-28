import { useMemo } from 'react';
import { SpaceRole } from '@/constants';
import {
    canChangeSpaceMemberRole,
    canEditSpaceContent,
    canManageSpaceMembers,
    canTransferSpaceOwner,
} from '@/permissions';
import { useSpaceSession } from './useSpaceSession';

export const useSpacePermission = (spaceId?: string, fallbackRole?: unknown) => {
    const { role } = useSpaceSession(spaceId, fallbackRole);
    return useMemo(
        () => ({
            canManageMembers: canManageSpaceMembers(role),
            canEditContent: canEditSpaceContent(role),
            canTransferOwner: canTransferSpaceOwner(role),
            canChangeRoleOf: (target?: SpaceRole) => canChangeSpaceMemberRole(role, target),
        }),
        [role],
    );
};
