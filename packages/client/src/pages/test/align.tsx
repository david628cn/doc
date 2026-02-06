import React, { useEffect, useRef, useState } from 'react';
import { getRect, getAlignPos } from '@/components/utils/align';
import './align.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [position, setPosition] = useState({
        left: 0,
        top: 0
    });

    const el0 = useRef(null);
    const el1 = useRef(null);

    const handleScroll = (e: any) => {
        const target = getRect(el0.current);
        const list = getRect(el1.current);
        const pos = getAlignPos(list, target, 'br-tr?');
        setPosition(pos);
    }

    useEffect(() => {
        const target = getRect(el0.current);
        const list = getRect(el1.current);
        const pos = getAlignPos(list, target, 'tr-br');
        setPosition(pos);
        document.addEventListener('scroll', handleScroll, false);
        return () => {
            document.removeEventListener('scroll', handleScroll);
        }

    }, []);

    return (
        <div 
            style={{
                width: '100%',
                height: '100%',
                // display: 'flex',
                padding: '30px 0',
                justifyContent: 'center',
                backgroundColor: '#f5f4f4'
            }}
            onScroll={handleScroll}
        >
            <div style={{
                width: '3000px',
                height: '3000px'
            }}>
                <div className={'cls-box0'} ref={el0}>1</div>
                <div className={'cls-box1'} ref={el1} style={{
                    position: 'absolute',
                    left: `${position.left}px`,
                    top: `${position.top}px`
                }}>2</div>
            </div>

        </div>
    );
}

export default Page;