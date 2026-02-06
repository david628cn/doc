import React, { useEffect, useRef, useState } from 'react';
import Draggable from '@/components/draggable';
import './index.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [data, setData] = useState([
        {
            id: 0,
            name: '0'
        },
        {
            id: 1,
            name: '1'
        },
        {
            id: 2,
            name: '2'
        },
        {
            id: 3,
            name: '3'
        },
        {
            id: 4,
            name: '4'
        },
        {
            id: 5,
            name: '5'
        },
        {
            id: 6,
            name: '6'
        },
        {
            id: 7,
            name: '7'
        },
        {
            id: 8,
            name: '8'
        },
        {
            id: 9,
            name: '9'
        },
        {
            id: 10,
            name: '10'
        },
        {
            id: 11,
            name: '11'
        },
        {
            id: 12,
            name: '12'
        },
        {
            id: 13,
            name: '13'
        },
        {
            id: 14,
            name: '14'
        },
        {
            id: 15,
            name: '15'
        },
        {
            id: 16,
            name: '16'
        },
        {
            id: 17,
            name: '17'
        },
        {
            id: 18,
            name: '18'
        },
        {
            id: 19,
            name: '19'
        },
        {
            id: 20,
            name: '20'
        }
    ]);

    const containerRef = useRef(null);

    useEffect(() => {
        const draggable = new Draggable({
            container: containerRef.current,
            onStart: (e: any) => {
                
            },
            onMove: () => {
                
            },
            onEnd: () => {
                
            }
        });

    }, []);

    // const handleDragStart = (e: any) => {
    //     // e.preventDefault();
    //     console.log('onDragStart', e);
    // }

    // const handleDragOver = (e: any) => {
    //     e.preventDefault();
    //     console.log('onDragOver', e);
    // }

    // const handleDrop = (e: any) => {
    //     e.preventDefault();
    //     console.log('onDrop', e);
    // }

    return (
        <div 
            style={{
                width: '100%',
                height: '3000px',
                // display: 'flex',
                padding: '60px 200px',
                justifyContent: 'center',
                backgroundColor: '#f5f4f4'
            }}
        >
            <div className="drag-list" ref={containerRef}>
                {
                    data.map((item: any, index: number) => {
                        return <div 
                            key={index} 
                            className="drag-item" 
                            // draggable 
                            // onDragStart={handleDragStart}
                            // onDragOver={handleDragOver}
                            // onDrop={handleDrop}
                        >{item.name}</div>
                    })
                }
            </div>

        </div>
    );
}

export default Page;