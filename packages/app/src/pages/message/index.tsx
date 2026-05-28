import { useEffect, useRef, useState } from 'react';
import { wsContextPath } from '@/api';
// import './index.less';

type MessageProps = {

}

const WS_URL = `${wsContextPath}/api/ws`;
const TOKEN = localStorage.getItem('token') || '';

const Message: React.FC<MessageProps> = props => {
    const [targetUser, setTargetUser] = useState('');
    const [msg, setMsg] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [connected, setConnected] = useState(false);

    // 使用 useRef 存儲 socket 實例，避免觸發組件重新渲染
    const socket = useRef<WebSocket | null>(null);

    // 1. 建立連接
    const connect = () => {

        // 原生 WebSocket 傳參方式
        const ws = new WebSocket(`${WS_URL}?token=${TOKEN}`);

        ws.onopen = () => {
            setConnected(true);
            addLog("系統", "✅ 已建立連接");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                addLog(data.type, data.payload);
            } catch (err) {
                addLog("RAW", event.data);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            addLog("系統", "❌ 連接已斷開");
        };

        socket.current = ws;
    };

    // 2. 發送消息
    const send = () => {
        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            type: "chat",
            room_id: targetUser, // 這裡可以是 UserID 或 WorkspaceID
            payload: { text: msg }
        };

        socket.current.send(JSON.stringify(payload));
        addLog("SENT", payload);
        setMsg('');
    };

    const addLog = (type: string, data: any) => {
        const entry = `[${new Date().toLocaleTimeString()}] ${type}: ${JSON.stringify(data)}`;
        setLogs(prev => [entry, ...prev]);
    };

    // 組件卸載時自動關閉
    useEffect(() => {
        return () => socket.current?.close();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <div style={{ marginBottom: '10px' }}>
                <input placeholder="JWT Token" value={TOKEN} disabled />
                <button onClick={connect} disabled={connected}>連接</button>
                <button onClick={() => socket.current?.close()} disabled={!connected}>斷開</button>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input placeholder="目標 ID" value={targetUser} onChange={e => setTargetUser(e.target.value)} />
                <input placeholder="內容" value={msg} onChange={e => setMsg(e.target.value)} />
                <button onClick={send}>發送消息</button>
            </div>

            <div style={{ background: '#000', color: '#0f0', padding: '10px', height: '400px', overflowY: 'auto' }}>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}

export default Message;