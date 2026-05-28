import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
    server: {
        port: 5174
    },
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'ui',
            fileName: 'ui',
            formats: ['es']
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                }
            }
        }
    }
})