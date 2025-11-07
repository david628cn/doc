import React, { useEffect, useState } from 'react';
import TextEditer from '@/components/DocEditer';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    return (
        <div style={{
            width: '100%',
            height: '100%'
        }}>
            <TextEditer/>
        </div>
    );
}

export default Page;