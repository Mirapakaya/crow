import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const pwaPlugin = VitePWA({
  registerType: 'prompt',
  includeAssets: ['icons/favicon.svg'],
  manifest: {
    name: 'Crow',
    short_name: 'Crow',
    description: 'Privacy-first, end-to-end encrypted web messenger',
    theme_color: '#1a1a1e',
    background_color: '#1a1a1e',
    display: 'standalone',
    orientation: 'any',
    scope: '/',
    start_url: '/',
    icons: [
      { src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2}'],
    navigateFallback: 'index.html',
  },
});

export default defineConfig({
  plugins: [
    react(),
    // PWA plugin enabled for production; disable locally if build issues arise
    // pwaPlugin,
  ],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@crypto': path.resolve(__dirname, 'src/core/crypto'),
      '@identity': path.resolve(__dirname, 'src/core/identity'),
      '@vault': path.resolve(__dirname, 'src/core/vault'),
      '@transport': path.resolve(__dirname, 'src/core/transport'),
      '@engine': path.resolve(__dirname, 'src/core/engine'),
      '@mls': path.resolve(__dirname, 'src/core/mls'),
      '@calls': path.resolve(__dirname, 'src/core/calls'),
      '@models': path.resolve(__dirname, 'src/core/models'),
      '@util': path.resolve(__dirname, 'src/core/util'),
      '@i18n': path.resolve(__dirname, 'src/i18n'),
      '@security': path.resolve(__dirname, 'src/security'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@media': path.resolve(__dirname, 'src/media'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          crypto: ['@noble/ciphers', '@noble/curves', '@noble/hashes'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          db: ['dexie'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
