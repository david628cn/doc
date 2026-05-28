import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Select } from 'antd';
import { Flex, View, Button, Text, message } from '@carvy/ui';
import { AvatarPicker } from '@/components/avatarPicker';
// import { useIntl } from 'react-intl';
import { updateWorkspace } from '@/api';

export type WorkspaceSecurityProps = {
    onSuccess?: (data: any) => void;
}

export const WorkspaceSecurity: React.FC<WorkspaceSecurityProps> = ({ 
    onSuccess 
}) => {
    const [loading, setLoading] = useState(false);
    
    return (
        <View>
            <Flex justify="end">
                <Button variant="soft" color="red" loading={loading}>删除库</Button>
            </Flex>
        </View>
    );
};
