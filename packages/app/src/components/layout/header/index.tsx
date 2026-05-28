import React from 'react';
import { Flex, View, Dialog } from '@carvy/ui';
import { WorkspaceInvite } from '@/components/workspace/invite';
import { UserPopover } from '@/components/userPopover';
import { ReceivedMessagesPopover } from '@/components/receivedMessagesPopover';
import { SentMessagesPopover } from '@/components/sentMessagesPopover';
import { JoinWorkspaceDialogTrigger } from '@/components/joinWorkspaceDialog';
import { JoinSpaceDialogTrigger } from '@/components/joinSpaceDialog';

export interface HeaderProps {
    user?: any;
    visible?: boolean;
    onTrigger?: () => void;
}

export const Header: React.FC<HeaderProps> = props => {
    const [open, setOpen] = React.useState(false);

    return (
        <Flex as="header" align="center" px={20} style={{
            borderBottom: '1px solid var(--border-color)'
        }}>
            <Flex mr="auto" h="64px" pt="10px" pb="10px">
                {/* <input
                    className={`${CLASSNAME}-layout-header-search-input`}
                    defaultValue=""
                    type="text"
                    placeholder="Search for more..."
                    autoComplete="off"
                /> */}
            </Flex>
            <Flex align="center" gap={5}>
                {/* <Avatar 
                    title="成员管理" 
                    titleLength={2} 
                    radius="full" 
                    size="large"
                    onClick={() => setOpen(true)}
                ></Avatar> */}
                <ReceivedMessagesPopover />
                <SentMessagesPopover />
                {/* <JoinWorkspaceDialogTrigger />
                <JoinSpaceDialogTrigger /> */}
                <UserPopover />
            </Flex>
            <Dialog
                // title={
                //     <View>
                //         <Text as="div" fontSize={20} fontWeight={700} color="rgba(0,0,0,0.88)">创建工作区</Text>
                //         <Text as="div" fontSize={14} fontWeight={400} color="rgba(0,0,0,0.45)" mt={8}>
                //             团队协作区是你的团队整理页面、权限和成员的地方
                //         </Text>
                //     </View>
                // }
                open={open}
                // width={480}
                // transitionName="ant-fade"
                title="成员管理"
                onCancel={() => setOpen(false)}
                onPopuoverDown={() => setOpen(false)}
                footer={null}
                style={{
                    width: '640px',
                    padding: '20px'
                }}
            >
                <View w="100%" py={20} px={20}>
                    <WorkspaceInvite></WorkspaceInvite>
                </View>
            </Dialog>
        </Flex>
    );
}