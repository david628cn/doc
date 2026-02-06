import React, { useEffect, useRef, useState } from 'react';
import { run } from './common';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [content, setContent] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        ref.current = run();
    }, []);

    return (
        <div>
            <div>
            <input type="text" placeholder="输入任务..." value={content} onChange={(e: any) => {
                setContent(e.target.value);
            }}/>
            <button onClick={(e: any) => {
                ref.current?.add(content);
            }}>添加</button>
            </div>
            <div id="id-test" contentEditable="true"></div>
        </div>
    );
}

export default Page;