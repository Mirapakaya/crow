/**
 * Web Worker for expensive KDF operations.
 * Runs scrypt/PBKDF2 off the main thread.
 */

import { scrypt } from '@noble/hashes/scrypt';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha512 } from '@noble/hashes/sha512';

export interface KdfRequest {
  id: string;
  method: 'scrypt' | 'pbkdf2';
  passphrase: string;
  salt: Uint8Array;
  params: {
    N?: number;
    r?: number;
    p?: number;
    iterations?: number;
    dkLen: number;
  };
}

export interface KdfResult {
  id: string;
  derivedKey: Uint8Array;
}

self.onmessage = (event: MessageEvent<KdfRequest>) => {
  const { id, method, passphrase, salt, params } = event.data;

  try {
    let derivedKey: Uint8Array;

    if (method === 'scrypt') {
      derivedKey = scrypt(passphrase, salt, {
        N: params.N ?? 2 ** 17,
        r: params.r ?? 8,
        p: params.p ?? 1,
        dkLen: params.dkLen ?? 32,
      });
    } else {
      derivedKey = pbkdf2(sha512, passphrase, salt, {
        c: params.iterations ?? 600000,
        dkLen: params.dkLen ?? 32,
      });
    }

    self.postMessage({ id, derivedKey } satisfies KdfResult);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
