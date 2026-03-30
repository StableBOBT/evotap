import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group telegram + ton together (they depend on each other)
            if (id.includes('@telegram-apps') || id.includes('@tonconnect') || id.includes('ton-core') || id.includes('@ton')) {
              return 'telegram-ton';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react';
            }
            if (id.includes('@tanstack')) {
              return 'query';
            }
            if (id.includes('zustand')) {
              return 'state';
            }
            return 'vendor';
          }
        },
      },
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
  },
});
