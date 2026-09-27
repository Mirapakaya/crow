import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/core/**', 'src/security/**'],
      exclude: ['src/core/models/**', 'src/core/util/logging.ts'],
    },
    fakeTimers: { toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] },
  },
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
});
