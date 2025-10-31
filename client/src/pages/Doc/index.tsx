import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import DocViewer from '@/components/DocViewer';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const state: any = useSelector(state => state);
    return (
        <div style={{
            width: '100%',
            height: '100%'
        }}>
            <DocViewer
                params={{
                    user: state.login.user,
                    docId: '0'
                }}
            />
        </div>
    );
}

export default Page;