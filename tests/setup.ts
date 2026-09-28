import 'fake-indexeddb/auto'

// Keep log level at info during tests so code paths that report progress are
// exercised (several assertions spy on console.log).
process.env.NODE_ENV = 'development'

// The vault talks to WebCrypto for randomness and to structuredClone through
// Dexie; Node 20+ provides both natively, so nothing else needs shimming.
