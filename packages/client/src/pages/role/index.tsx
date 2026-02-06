import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { getRect, getAlignPos } from '@/components/utils/align';
import './index.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [pos, setPos]: any = useState({
        left: 1000,
        top: 1000
    });
    const [display, setDisplay]: any = useState('none');

    const targetRef = useRef<any>(null);
    const listRef = useRef<any>(null);

    return (
        <div style={{
            margin: '200px',
            padding: '100px',
            left: '30px',
            top: '20px',
            width: '1000px',
            height: '600px',
            position: 'absolute',
            overflow: 'auto',
            background: '#efefef'
        }}>
            {/* <Popup
                rect={rect}
                open={open}
                placement='tl-bl?'
                // shtrigger={'click'}
                items={<div style={{ width: '200px', padding: '10px' }}>悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果</div>}
                // onChange={(params: any) => {
                //     // params?.domEvent?.preventDefault?.();
                //     console.log(params.open)
                //     setOpen(params.open);
                // }}
                onChange={(e: any) => {
                    // e.domEvent.preventDefault();
                    setOpen(e.open);
                }}
                // container={btnRef.current}
            >
            </Popup> */}
            {/* <Dropdown
                open={open}
                placement='tl-bl?'
                trigger={'hover'}
                items={<div style={{ width: '200px', padding: '10px' }}>悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果悬停我查看效果</div>}
                onChange={(params: any) => {
                    console.log('params', params)
                    setOpen(params.open);
                }}
            > */}
                {/* <button onClick={(e: any) => {
                    e.stopPropagation();
                    setRect(getRect(btnRef.current));
                    setOpen(!open);
                }} ref={btnRef}>悬停我查看效果</button> */}
                <div 
                    style={{
                        width: '100px',
                        height: '60px',
                        padding: '60px',
                        // margin: '70px 70px 70px 600px',
                        position: 'absolute',
                        top: '160px',
                        left: '500px',
                        background: 'red'
                    }}

                    //t b l r tl tr bl br 
                    onClick={(e: any) => {
                        setDisplay('block');
                        let timer = setTimeout(() => {
                            clearTimeout(timer);
                            const targetRect = getRect(targetRef.current);
                            const listRect = getRect(listRef.current);
                            const newPos = getAlignPos(listRect, targetRect, {
                                placement: 'tr-tl?',
                                gap: 20,
                                container: listRef.current.parentNode
                            });
                            setPos(newPos);
                        }, 50);
                        
                    }}
                    ref={targetRef}
                >Test</div>
            {/* </Dropdown> */}
            <div style={{
                width: '2000px',
                height: '1000px'
            }}></div>
            {/* {
                ReactDOM.createPortal( */}
                    <div ref={listRef} style={{
                        width: '260px',
                        height: '100px',
                        position: 'absolute',
                        left: `${pos.left}px`,
                        top: `${pos.top}px`,
                        display,
                        background: '#0000ff1f'
                    }}></div>
                    {/* ,document.body
                )
            } */}
            <div style={{
                width: '2000px',
                height: '1000px'
            }}></div>
        </div>
    );
}

export default Page;