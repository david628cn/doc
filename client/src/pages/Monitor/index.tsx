import React, { useState, useEffect, useRef } from 'react';
// import { DownOutlined } from '@ant-design/icons';
import { useIntl } from "react-intl";
import {
    Button,
    Row,
    Col,
    Form,
    Space,
    Input,
    Drawer
} from 'antd';
// import { io } from 'socket.io-client';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { listStockDoshboard, listStock } from '@/api';
import Kline from '@/components/KlineCanvas';
import { formatNumberWithUnit } from '@/utils/common';

import styles from './index.module.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [value, setValue] = useState('');

    const socketRef = useRef<any>(null);

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = new WebSocket(`ws://127.0.0.1:8000/ws?userId=${encodeURIComponent(new Date().getTime())}`);
            
        }
        
        socketRef.current.onopen = (e: any) => {
            console.log('WebSocket connection Success');
        }
        
        socketRef.current.onerror = (e: any) => {
            console.error('WebSocket error observed:', e);
        }
        
        socketRef.current.onclose = (e: any) => {
            console.log('WebSocket is closed', e);
        }
        // 监听socket事件
        // socketRef.current.on('connect', () => {
        //     console.log('Connected to server');
        // });

        // 发送消息
        // socketRef.current.emit('message', 'Hello server');

        // 接收消息
        socketRef.current.onmessage = (e: any) => {
            console.log('接收到服务端信息:', e.data);
        }
        // requestChat();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        }
    }, []);

    // const requestChat = (params: any = {}) => {
    //     // const prompt = params.prompt;
    //     const ctrl = new AbortController();
    //     // fetchEventSource('http://47.96.168.204:7001/api/doc/completion', {
    //     fetchEventSource('http://127.0.0.1:8000/api/stock/monitor', {
    //         method: 'POST', 
    //         // mode: 'cors', 
    //         // credentials: 'include',
    //         headers: {
    //             // 'Authorization': 'NGEyNTRjYmItNGIzMi00ZDasdjWE5YTUtYzQ2ZjU0OTBhMGZh',
    //             'Authorization': ('Bearer ' + localStorage.getItem('token')) || '',
    //             'Content-Type': 'application/json'
    //         },
    //         signal: ctrl.signal,
    //         body: JSON.stringify(params),
    //         // body: `{
    //         //     "header": {
    //         //         "request_id": "9B49478D-DB34-5B92-BB6C-5F666653D053-test",
    //         //         "service_id": "9c883e5f740e",
    //         //         "attributes": {
    //         //             "user_id": "1234567890"
    //         //         }
    //         //     },
    //         //     "payload": {
    //         //         "input": {
    //         //             "model": "doc_darwin_001_0411",
    //         //             "message": [
    //         //                 {
    //         //                     "role": "user",
    //         //                     "content": "写一个春天的故事"
    //         //                 }
    //         //             ],
    //         //             "max_tokens": 1024,
    //         //             "stream": true,
    //         //             "n": 1
    //         //         },
    //         //         "parameters": {
    //         //         }
    //         //     }
    //         // }`,
    //         // onopen: (ev: any) => {
    //         //     console.log("onmessage", ev.data);
    //         // },
    //         onmessage: (ev: any) => {
    //             console.log('ev', ev);
    //             // let json = ev.data || {};
    //             // json = JSON.parse(json);
    //             // console.log('json', json);
    //             // const { payload = {}, header = {} } = json;
    //             // const { output = {} } = payload;
    //             // const { choices = [] } = output;
    //             // let content = choices[0] ? choices[0].content : null;
    //             // let newMessage = messageRef.current;
    //             // const messageItem = newMessage[index];
    //             // if (header.finished) {
    //             //     messageItem.loading = false;
    //             // } else {
    //             //     if (content !== undefined && content !== null) {
    //             //         // console.log(messageItem, message, index);
    //             //         messageItem.message += content;
    //             //     }
    //             // }
    //             // newMessage = newMessage.slice();
    //             // setMessage(newMessage);
    //         }
    //         // onopen?: (response: Response) => Promise<void>;
    //         // onmessage?: (ev: EventSourceMessage) => void;
    //         // onclose?: () => void;
    //         // onerror?: (err: any) => number | null | undefined | void;
    //     });
    // }

    return (
        <div style={{

        }}>
            <Input type="text" placeholder="请输出水果名称" value={value} onChange={(e: any) => {
                setValue(e.target.value);
            }}/>
            <Button type="primary" onClick={(e: any) => {
                socketRef.current.send(value);
            }}>提交</Button>
        </div>
    );
}

export default Page;