import { describe, it, expect } from 'vitest';
import {
  encryptBlob,
  decryptBlob,
  generateBlobKey,
  CHUNK_SIZE,
} from '@crypto/blobCrypto';

/** Collect all chunks from an async generator into a single Uint8Array. */
async function collect(gen: AsyncGenerator<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of gen) {
    parts.push(chunk);
  }
  const totalLen = parts.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Collect encrypted chunks into an array. */
async function collectEncrypted(
  gen: AsyncGenerator<{ ciphertext: Uint8Array; nonce: Uint8Array }>,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }[]> {
  const chunks: { ciphertext: Uint8Array; nonce: Uint8Array }[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

/** Create a Uint8Array without hitting jsdom's 65536-byte limit. */
function makeBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  const chunkSize = 65536;
  for (let offset = 0; offset < n; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, n);
    const slice = crypto.getRandomValues(new Uint8Array(end - offset));
    buf.set(slice, offset);
  }
  return buf;
}

/** Byte-by-byte comparison. */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Wrap a plain array as an async iterable. */
function toAsyncIterable<T>(arr: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < arr.length) return { value: arr[i++], done: false };
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}

describe('blobCrypto', () => {
  it('encryptBlob → decryptBlob roundtrip', async () => {
    const key = generateBlobKey();
    const data = crypto.getRandomValues(new Uint8Array(100));

    const encryptedChunks = await collectEncrypted(encryptBlob(data, key));
    const decrypted = await collect(decryptBlob(toAsyncIterable(encryptedChunks), key));

    expect(arraysEqual(decrypted, data)).toBe(true);
  });

  it('chunk size constant is 64 KB', () => {
    expect(CHUNK_SIZE).toBe(65536);
  });

  it('single chunk for data ≤ CHUNK_SIZE', async () => {
    const key = generateBlobKey();
    // Use a smaller size to avoid jsdom's crypto.getRandomValues limit
    const data = crypto.getRandomValues(new Uint8Array(1000));

    const chunks = await collectEncrypted(encryptBlob(data, key));
    expect(chunks).toHaveLength(1);
    // Each chunk's ciphertext is slightly larger than plaintext due to Poly1305 tag (16 bytes)
    expect(chunks[0].ciphertext.length).toBe(1000 + 16);
  });

  it('wrong key fails decryption', async () => {
    const correctKey = generateBlobKey();
    const wrongKey = generateBlobKey();
    const data = crypto.getRandomValues(new Uint8Array(256));

    const encryptedChunks = await collectEncrypted(encryptBlob(data, correctKey));

    await expect(
      (async () => {
        for await (const _ of decryptBlob(toAsyncIterable(encryptedChunks), wrongKey)) {
          // just iterate
        }
      })(),
    ).rejects.toThrow();
  });

  it('large data (>1 chunk) works', async () => {
    const key = generateBlobKey();
    // 1.5 chunks worth of data — build with makeBytes to avoid jsdom limit
    const data = makeBytes(CHUNK_SIZE + CHUNK_SIZE / 2);

    const encryptedChunks = await collectEncrypted(encryptBlob(data, key));
    expect(encryptedChunks.length).toBe(2);

    // First chunk nonce
    expect(encryptedChunks[0].nonce).toHaveLength(24);
    // Second chunk nonce
    expect(encryptedChunks[1].nonce).toHaveLength(24);

    const decrypted = await collect(decryptBlob(toAsyncIterable(encryptedChunks), key));
    expect(arraysEqual(decrypted, data)).toBe(true);
  });

  it('multiple chunks each have unique nonces', async () => {
    const key = generateBlobKey();
    const data = makeBytes(CHUNK_SIZE * 3);

    const chunks = await collectEncrypted(encryptBlob(data, key));
    expect(chunks).toHaveLength(3);

    const nonces = chunks.map((c) => Array.from(c.nonce).join(','));
    const uniqueNonces = new Set(nonces);
    expect(uniqueNonces.size).toBe(3);
  });

  it('generateBlobKey produces 32-byte random keys', () => {
    const key1 = generateBlobKey();
    const key2 = generateBlobKey();

    expect(key1).toHaveLength(32);
    expect(key2).toHaveLength(32);
    expect(arraysEqual(key1, key2)).toBe(false);
  });

  it('handles empty blob', async () => {
    const key = generateBlobKey();
    const data = new Uint8Array(0);

    const encryptedChunks = await collectEncrypted(encryptBlob(data, key));
    // No chunks yielded for empty data
    expect(encryptedChunks).toHaveLength(0);
  });
});
