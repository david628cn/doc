import React, { useEffect, useState } from 'react';
import DocEditer from '@/components/DocEditer';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    return (
        <div style={{
            width: '100%',
            height: '100%'
        }}>
            <DocEditer/>
        </div>
    );
}

export default Page;