/**
 * Web Worker for off-main-thread crypto operations.
 * Handles XChaCha20-Poly1305 encryption/decryption of large data.
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha';

export interface CryptoRequest {
  id: string;
  operation: 'encrypt' | 'decrypt';
  data: Uint8Array;
  key: Uint8Array;
  nonce: Uint8Array;
}

export interface CryptoResult {
  id: string;
  data: Uint8Array;
}

self.onmessage = (event: MessageEvent<CryptoRequest>) => {
  const { id, operation, data, key, nonce } = event.data;

  try {
    const cipher = xchacha20poly1305(key, nonce);
    let result: Uint8Array;

    if (operation === 'encrypt') {
      result = cipher.encrypt(data);
    } else {
      result = cipher.decrypt(data);
    }

    self.postMessage({ id, data: result } satisfies CryptoResult);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
