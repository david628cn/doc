const { Server } = require('@hocuspocus/server');
const { Redis } = require('@hocuspocus/extension-redis');

const server = new Server({
    port: 1234,
    extensions: [
        new Redis({
            host: '127.0.0.1',
            port: 6379,
            prefix: 'hocuspocus:pm',
        }),
    ],
    // 其他钩子函数
    async onAuthenticate(data) {
        // 校验逻辑
    }
});

server.listen();
console.log('协作独立服务已启动在端口 1234');