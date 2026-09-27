/**
 * Crow Engine — barrel export.
 * Provides message delivery, inbox sync, blob transfer, and connection status.
 */

// Messenger engine
export { MessengerEngine } from './messenger';
export type { Vault } from './messenger';

// Inbox synchronization
export { InboxSync } from './inboxSync';

// Blob transfer
export { BlobTransfer } from './blobTransfer';

// Connection status derivation
export { deriveConnectionStatus } from './connectionStatus';
export type { ConnectionStatus } from './connectionStatus';
