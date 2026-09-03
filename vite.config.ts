import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@web': path.resolve(__dirname, 'apps/web/src'),
        '@api': path.resolve(__dirname, 'apps/api/src'),
        '@contracts': path.resolve(__dirname, 'packages/contracts'),
        '@shared-types': path.resolve(__dirname, 'packages/types'),
        '@errors': path.resolve(__dirname, 'packages/errors'),
        '@utils': path.resolve(__dirname, 'packages/utils'),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
