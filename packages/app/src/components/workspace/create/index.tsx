import React from 'react';
import { 
    View, 
    Text
} from '@carvy/ui';
import { WorkspaceBasicForm } from '../basicForm';

export type CreateWorkspaceValues = {
    name: string;
    description: string;
    icon: string;
    // visibility: SpaceVisibility; // 对应后端 visibility 字段
};

export type CreateWorkspaceFormProps = {
    submitText?: string;
    onSuccess?: (newWorkspace: any) => void;
};

export const CreateWorkspaceForm: React.FC<CreateWorkspaceFormProps> = (props) => {
    const {
        onSuccess
    } = props;
    
    return (
        <View style={{ padding: '8px 20px 20px', boxSizing: 'border-box' }}>
            <Text
                as="div"
                fontSize={14}
                fontWeight={400}
                color="rgba(0,0,0,0.45)"
                mb={20}
                style={{ lineHeight: 1.5 }}
            >
                团队协作区是你的团队整理页面、权限和成员的地方
            </Text>
            <WorkspaceBasicForm type="create" onSuccess={onSuccess} />
        </View>
    );
};

