export class WSClient {
    private url: string;
    private ws: WebSocket | null;
    private reconnectCount: number;
    private heartbeatInterval: number;
    private heartbeatTimer: NodeJS.Timeout | null;
    private reconnectTimer: NodeJS.Timeout | null;
    
    // 外部回调
    public onMessageReceived: ((msg: any) => void) | null;
    public onStatusChange: ((status: string) => void) | null;
    constructor(url: string) {
        this.url = url;
        this.ws = null;
        this.reconnectCount = 0;
        this.heartbeatInterval = 30000; // 30秒心跳
        this.heartbeatTimer = null;
        this.reconnectTimer = null;

        // 外部回调
        this.onMessageReceived = null;
        this.onStatusChange = null;
    }

    // 1. 建立连接
    connect() {
        console.log("正在尝试连接 WebSocket...");
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("✅ WebSocket 已连接");
            this.reconnectCount = 0; // 重置重连次数
            this.statusChange('open');
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'pong') return; // 忽略心跳响应
                if (this.onMessageReceived) this.onMessageReceived(msg);
            } catch (e) {
                console.warn("收到的消息格式非法:", event.data);
            }
        };

        this.ws.onclose = (e) => {
            this.statusChange('closed');
            this.stopHeartbeat();
            this.triggerReconnect();
        };

        this.ws.onerror = (err) => {
            console.error("WS 发生错误");
            this.ws?.close();
        };
    }

    // 2. 业界标准：业务心跳
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, this.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    }

    // 3. 业界标准：指数退避重连
    triggerReconnect() {
        if (this.reconnectTimer) return;

        // 计算延迟：1s, 2s, 4s, 8s... 最高 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000);
        console.log(`${delay / 1000} 秒后尝试重连...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectCount++;
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    // 4. 发送方法
    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    statusChange(status: string) {
        if (this.onStatusChange) this.onStatusChange(status);
    }

    // 5. 销毁实例
    destroy() {
        this.stopHeartbeat();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) this.ws.close();
    }
}


// 初始化
// const token = "你的JWT";
// const client = new WSClient(`ws://localhost:9000/api/ws?token=${token}`);

// // 绑定业务逻辑
// client.onMessageReceived = (msg) => {
//   if (msg.type === 'notification') {
//     alert("新邀请: " + msg.payload.content);
//   }
// };

// client.onStatusChange = (status) => {
//   document.getElementById('status-dot').style.background = (status === 'open' ? 'green' : 'red');
// };

// // 启动
// client.connect();