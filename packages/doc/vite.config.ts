import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true, // 自动在 package.json 对应的位置生成入口
            include: ['src'],       // 只包含 src 下的源码
        })
    ],
    server: {
        port: 5175
    },
    build: {
        sourcemap: true,
        target: 'es2022',
        lib: {
            entry: 'src/index.ts',
            name: 'doc',
            fileName: 'doc',
            formats: ['es']
        },
        rollupOptions: {
            external: [
                'react', 
                'react-dom',
                // 排除高亮库，防止它把语言包带进来
                // 排除编辑器和高亮库，防止它们产生几十个 WASM 和 JS 分包
                // 'shiki',
                // /^shiki\//,
                // /^@shikijs\//,
                // 'codemirror',
                // /^@codemirror\//,
                // /^prosemirror-/,
                // 'yjs',
                // /^y-/,
                // 'highlight.js'
            ],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                }
            }
        }
    },
    resolve: {
        alias: {
            // 让 doc 开发时直接读 ui 的源码
            '@carvy/ui': path.resolve(__dirname, '../ui/src/index.ts')
        },
        dedupe: ['react', 'react-dom'] // 同样需要去重
    },
    optimizeDeps: {
        exclude: ['@carvy/ui'] // 防止预构建 ui
    }
})