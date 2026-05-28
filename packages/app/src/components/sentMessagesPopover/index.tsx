import React from 'react';
import { Popuover, Avatar } from '@carvy/ui';
import { SentMsgList } from '@/components/sentMsgList';

/** 我的已发送消息（与接收消息同一 Popover 宽度与列表形态） */
export const SentMessagesPopover: React.FC = () => {
    return (
        <Popuover
            items={<SentMsgList />}
            pos={'tl-bl?'}
            trigger={'click'}
            zIndex={10}
            style={{
                width: '500px',
            }}
        >
            <Avatar
                size={32}
                radius="full"
                title="已发送"
                fontSize={16}
                icon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                }
            />
        </Popuover>
    );
};
