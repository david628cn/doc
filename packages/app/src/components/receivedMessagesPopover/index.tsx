import React from 'react';
import { useSelector } from 'react-redux';
import { Popuover, Avatar } from '@carvy/ui';
import type { RootState } from '@/store';
import { ReceivedMsgList } from '../receivedMsgList';

type ReceivedMessagesPopoverProps = {
    menus?: Array<any>;
    collapsed?: boolean;
    isMobile?: boolean;
    pathname?: string;
    params?: any;
}

export const ReceivedMessagesPopover: React.FC<ReceivedMessagesPopoverProps> = props => {
    const unreadCount = useSelector((s: RootState) => s.notification.unreadCount);
  
    return (
        <Popuover
            items={<ReceivedMsgList />}
            // gap={6}
            pos={'tl-bl?'}
            trigger={'click'}
            zIndex={10}
            style={{
                width: '500px'
            }}
        >
            <Avatar 
                size={32}
                // icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"></path><path d="M9 17v1a3 3 0 0 0 6 0v-1"></path></svg>}
                radius="full"
                fontSize={16}
                number={unreadCount}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"></path><path d="M9 17v1a3 3 0 0 0 6 0v-1"></path></svg>}
            >     
            </Avatar>
            
        </Popuover>
    );
}