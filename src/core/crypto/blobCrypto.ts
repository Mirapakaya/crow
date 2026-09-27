/**
 * Chunked attachment encryption for Crow messenger.
 *
 * Encrypts and decrypts large blobs in 64 KB chunks using
 * XChaCha20-Poly1305, yielding each chunk as an async generator
 * so callers can stream to/from storage without buffering the
 * entire file in memory.
 *
 * Each chunk gets a unique random nonce. The key must be 32 bytes.
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from './kdf';

/** Size of each plaintext chunk before encryption (64 KB). */
export const CHUNK_SIZE = 65536;

/**
 * Encrypt a blob in chunks, yielding `{ ciphertext, nonce }` per chunk.
 *
 * The caller should store each chunk's nonce alongside its ciphertext;
 * both are required for decryption.
 *
 * @param data - Full plaintext data.
 * @param key  - 32-byte symmetric key.
 * @yields Encrypted chunk with its unique nonce.
 */
export async function* encryptBlob(
  data: Uint8Array,
  key: Uint8Array,
): AsyncGenerator<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + CHUNK_SIZE, data.length);
    const chunk = data.slice(offset, end);

    const nonce = randomBytes(24);
    const aead = xchacha20poly1305(key, nonce);
    const ciphertext = aead.encrypt(chunk);

    yield { ciphertext, nonce };

    offset = end;
    // Yield to the event loop between chunks to avoid blocking.
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}

/**
 * Decrypt a blob from encrypted chunks, yielding plaintext per chunk.
 *
 * @param chunks - Async iterable of `{ ciphertext, nonce }` objects.
 * @param key    - 32-byte symmetric key.
 * @yields Decrypted plaintext chunk.
 */
export async function* decryptBlob(
  chunks: AsyncIterable<{ ciphertext: Uint8Array; nonce: Uint8Array }>,
  key: Uint8Array,
): AsyncGenerator<Uint8Array> {
  for await (const { ciphertext, nonce } of chunks) {
    const aead = xchacha20poly1305(key, nonce);
    const plaintext = aead.decrypt(ciphertext);
    yield plaintext;
  }
}

/**
 * Generate a 32-byte random key for blob encryption.
 *
 * @returns 32 random bytes from `crypto.getRandomValues`.
 */
export function generateBlobKey(): Uint8Array {
  return randomBytes(32);
}
