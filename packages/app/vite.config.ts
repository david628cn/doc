import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true, // 自动在 package.json 对应的位置生成入口
            include: ['src'],       // 只包含 src 下的源码
        })
    ],
    build: {
        target: 'es2022'
    },
    server: {
        port: 3300
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // 关键：将包名直接映射到源码文件，跳过 package.json 里的 main 字段
            '@carvy/ui': path.resolve(__dirname, '../ui/src/index.ts'),
            '@carvy/doc': path.resolve(__dirname, '../doc/src/index.ts')
        },
        // 关键：防止因为多 node_modules 导致的多个 React 实例错误
        dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
        // 关键：防止 Vite 将本地 workspace 包预构建到缓存中导致修改不生效
        exclude: ['@carvy/ui', '@carvy/doc']
    }
})