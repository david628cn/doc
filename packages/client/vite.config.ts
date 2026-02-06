import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        createSvgIconsPlugin({
            iconDirs: [path.resolve(__dirname, './src/assets/iconsvg')],
            symbolId: 'icon-[name]'
        })
    ],
    server: {
        port: 3300
    },
    base: '/',
    build: {
        outDir: 'web',
        assetsDir: 'static',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            },
            mangle: true,
            format: {
                comments: false
            },
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 2000
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})