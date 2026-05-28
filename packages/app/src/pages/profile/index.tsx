import React from 'react';
import { View, Flex, Text, Tab } from '@carvy/ui';
import { UserProfileForm, UserPasswordForm } from '@/components/user';

const Profile: React.FC = () => {
    return (
        <View w="100%" p={24} style={{ boxSizing: 'border-box' }}>
            <Flex direction="column" gap={4} mb={20}>
                <Text as="h1" fontSize={22} fontWeight={700} color="rgba(0,0,0,0.88)" m={0}>
                    人个信息设置
                </Text>
                {/* <Text fontSize={14} color="rgba(0,0,0,0.45)">
                    维护个人资料与登录密码
                </Text> */}
            </Flex>
            <Tab
                items={[
                    {
                        key: 'profile',
                        label: '基本信息',
                        children: (
                            <View py={20} px={10}>
                                <UserProfileForm />
                            </View>
                        ),
                    },
                    {
                        key: 'password',
                        label: '修改密码',
                        children: (
                            <View py={20} px={10}>
                                <UserPasswordForm />
                            </View>
                        ),
                    },
                ]}
            />
        </View>
    );
};

export default Profile;
