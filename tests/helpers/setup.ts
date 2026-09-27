import '@testing-library/jest-dom';

// Mock IndexedDB for tests
import 'fake-indexeddb/auto';

// Web Crypto is available in modern Node/Vitest environments
// If running in an environment without it, add the polyfill:
// if (!globalThis.crypto?.getRandomValues) { ... }
