const WebSocket = require('ws');
const Y = require('yjs');
const sync = require('y-protocols/dist/sync.cjs');
const encoding = require('lib0/dist/encoding.cjs');
const decoding = require('lib0/dist/decoding.cjs');

const wss = new WebSocket.Server({ port: 9000 });

// 用于管理所有房间：Map<房间名, { doc: Y.Doc, conns: Set<ws> }>
const rooms = new Map();

wss.on('connection', (ws, req) => {
    // 1. 获取房间名 (从 url 解析，例如 /project-1)
    const roomName = req.url.slice(1) || 'public';

    // 2. 如果房间不存在，则初始化
    if (!rooms.has(roomName)) {
        const doc = new Y.Doc();

        // 监听该房间 doc 的更新并广播
        doc.on('update', (update, origin) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 0);
            sync.writeUpdate(encoder, update);
            const packet = encoding.toUint8Array(encoder);

            // 只广播给当前房间内的用户
            const room = rooms.get(roomName);
            if (room) {
                room.conns.forEach(client => {
                    // 排除消息发起者（origin 传入的是产生更新的 ws）
                    if (client !== origin && client.readyState === WebSocket.OPEN) {
                        client.send(packet);
                    }
                });
            }
        });

        rooms.set(roomName, { doc, conns: new Set() });
    }

    const room = rooms.get(roomName);
    room.conns.add(ws); // 将当前连接加入房间

    // 3. 初始握手：发送当前房间的 Step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    sync.writeSyncStep1(encoder, room.doc);
    ws.send(encoding.toUint8Array(encoder));

    // 4. 处理消息
    ws.on('message', (message) => {
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const type = decoding.readVarUint(decoder);

        if (type === 0) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 0);
            // 关键：传入 ws 作为 origin，防止广播回自己
            sync.readSyncMessage(decoder, encoder, room.doc, ws);

            if (encoding.length(encoder) > 1) {
                ws.send(encoding.toUint8Array(encoder));
            }
        }
    });

    // 5. 断开连接清理
    ws.on('close', () => {
        room.conns.delete(ws);
        if (room.conns.size === 0) {
            // 如果房间没人了，可以销毁 doc 释放内存
            // 注意：如果需要持久化，这里是保存到数据库的最佳时机
            rooms.delete(roomName);
        }
    });
});