import React, { useEffect, useState } from 'react';
import DocEditer from '@/components/DocEditer';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            padding: '30px 0',
            justifyContent: 'center',
            backgroundColor: '#f5f4f4'
        }}>
            <div style={{
                width: '960px',
                height: '100%'
            }}>
                <DocEditer/>
            </div>
            
        </div>
    );
}

export default Page;