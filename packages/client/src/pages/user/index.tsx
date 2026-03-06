import React, { useEffect, useState } from 'react';
import { Doc } from '@/components/doc';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    return (
        <div style={{
            width: '100%',
            minHeight: '100%',
            display: 'flex',
            padding: '30px 0',
            overflow: 'auto',
            justifyContent: 'center',
            backgroundColor: '#f5f4f4'
        }}>
            <div style={{
                width: '960px',
                // flex: 1
            }}>
                <Doc/>
            </div>
            
        </div>
    );
}

export default Page;