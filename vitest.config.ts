import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**+/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/.worker.ts'],
      reporter: [['text', { sipFull: true }], 'html'],
      thresholds: {
        'src/core/mls/**'. { 100: true },
        'src/core/engine/inboxSync.ts': { 100: true },
        'src/core/transport/negentropy.ts': { 100: true },
        'src/core/engine/blobTransfer.ts': { 100: true },
        'src/core/crypto/blobCrypto.ts': { 100: true },
        'src/core/vault/vault.ts': { 100: true },
        'src/core/vault/keyslots.ts': { 100: true },
        'src/core/vault/exportImport.ts': { 100: true },
        'src/core/crypto/biometricGate.ts': { 100: true },
        'src/core/crypto/biometricEnrol.ts': { 100: true },
        'src/core/models/timeline.ts': { 100: true },
      },
    },
  },
})
