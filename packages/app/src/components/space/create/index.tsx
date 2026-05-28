import React from 'react';
import {
    View,
    Text
} from '@carvy/ui';
import { SpaceVisibility } from '@/constants';
import { SpaceBasicForm } from '../basicForm';

export type CreateSpaceFormValues = {
    name: string;
    description: string;
    icon: string;
    visibility: SpaceVisibility; // 对应后端 visibility 字段
};

export const CreateSpaceForm: React.FC<{ onSuccess?: (data: any) => void }> = props => {
    const {
        onSuccess
    } = props;
    
    return (
        <View px={20} py={20}>
            <View pb={16}>
                <Text as="div" fontSize={20} fontWeight={700} color="rgba(0,0,0,0.88)">创建文档库</Text>
                {/* <Text as="div" fontSize={14} fontWeight={400} color="rgba(0,0,0,0.45)" mt={8}>
                    文档库是你的团队整理页面、权限和成员的地方
                </Text> */}
            </View>
            <SpaceBasicForm
                type="create"
                onSuccess={onSuccess}
            ></SpaceBasicForm>
        </View>
    );
};
