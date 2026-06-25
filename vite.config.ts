import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(rootDir, '..');
const aionWebUiRoot = resolve(rootDir, 'src/aionui');
const aionWebRendererRoot = resolve(aionWebUiRoot, 'renderer');
const aionWebCommonRoot = resolve(aionWebUiRoot, 'common');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const backendBaseUrl = (env.VITE_AIONUI_BACKEND_BASE_URL ?? '').trim().replace(/\/+$/, '');

  return {
    plugins: [react(), UnoCSS()],
    resolve: {
      alias: {
        '@': aionWebUiRoot,
        '@common': aionWebCommonRoot,
        '@renderer': aionWebRendererRoot,
        '@web': resolve(rootDir, 'src'),
      },
      dedupe: ['react', 'react-dom', 'react-router-dom', 'swr'],
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
      proxy: backendBaseUrl
        ? {
            '/api': { target: backendBaseUrl, changeOrigin: true, ws: true },
            '/login': { target: backendBaseUrl, changeOrigin: true },
            '/logout': { target: backendBaseUrl, changeOrigin: true },
            '/ws': { target: backendBaseUrl, changeOrigin: true, ws: true },
            '/health': { target: backendBaseUrl, changeOrigin: true },
            '/healthz': { target: backendBaseUrl, changeOrigin: true },
            '/docs': { target: backendBaseUrl, changeOrigin: true },
            '/api-docs': { target: backendBaseUrl, changeOrigin: true },
          }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'es2022',
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
