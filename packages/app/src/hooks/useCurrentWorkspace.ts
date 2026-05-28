import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export const useCurrentWorkspace = () => {
    const { workspaceId, role, workspaces, currentWorkspace, initialized } = useSelector(
        (s: RootState) => s.workspace,
    );
    return { workspaceId, role, workspaces, currentWorkspace, initialized };
};
