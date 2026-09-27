import type { RelayPool } from '../transport';

/** Extract an ArrayBuffer copy from a Uint8Array, compatible with Web Crypto. */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

/** NIP-94 / custom kind for chunked blob events. */
const KIND_BLOB_CHUNK = 443;

/** Maximum chunk size in bytes (64 KB). */
const CHUNK_SIZE = 65_536;

/** AES-256-GCM nonce length. */
const NONCE_LENGTH = 12;

/** Tag length for AES-256-GCM. */
const TAG_LENGTH = 16;

/** Track active uploads for progress and cancellation. */
interface UploadState {
  totalBytes: number;
  bytesTransferred: number;
  cancelled: boolean;
  eventIds: string[];
}

/**
 * Chunked, encrypted attachment transfer over Nostr relay events.
 *
 * Upload: encrypt with AES-256-GCM, split into chunks, publish each
 * as a kind-443 event. Download: fetch chunk events, reassemble,
 * and decrypt.
 */
export class BlobTransfer {
  private uploads = new Map<string, UploadState>();
  private uploadCounter = 0;

  /**
   * Encrypt and upload a binary blob via relay events.
   *
   * @param data - Raw file data.
   * @param key - 256-bit AES encryption key.
   * @param relayPool - Pool to publish chunk events to.
   * @returns The root event ID that references all chunks.
   */
  public async upload(data: Uint8Array, key: Uint8Array, relayPool: RelayPool): Promise<string> {
    const uploadId = `upload_${++this.uploadCounter}`;
    const totalBytes = data.byteLength;

    const state: UploadState = {
      totalBytes,
      bytesTransferred: 0,
      cancelled: false,
      eventIds: [],
    };
    this.uploads.set(uploadId, state);

    try {
      // Step 1: Encrypt the entire blob
      const { ciphertext, nonce } = await this.aesEncrypt(data, key);

      // Step 2: Split ciphertext into chunks
      const chunks = this.splitIntoChunks(ciphertext, CHUNK_SIZE);

      // Step 3: Publish each chunk as a relay event
      const chunkEventIds: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (state.cancelled) {
          throw new Error('Upload cancelled');
        }

        const chunkData = chunks[i];
        const chunkEvent = {
          kind: KIND_BLOB_CHUNK,
          pubkey: '', // Will be set by the caller's signing step
          content: this.uint8ToBase64(chunkData),
          tags: [
            ['x', uploadId],
            ['chunk', String(i), String(chunks.length)],
            ['nonce', this.uint8ToBase64(nonce)],
          ],
          id: '',
          created_at: Math.floor(Date.now() / 1000),
          sig: '',
        };

        await relayPool.publish(chunkEvent as any);
        chunkEventIds.push(chunkEvent.id ?? `chunk_${i}`);

        state.bytesTransferred = Math.min((i + 1) * CHUNK_SIZE, totalBytes);
      }

      state.eventIds = chunkEventIds;

      // Step 4: Publish a root manifest event referencing all chunks
      const manifestEvent = {
        kind: KIND_BLOB_CHUNK,
        pubkey: '',
        content: JSON.stringify({
          size: totalBytes,
          chunks: chunks.length,
          chunkEventIds,
          nonce: this.uint8ToBase64(nonce),
        }),
        tags: [
          ['x', uploadId],
          ['type', 'manifest'],
        ],
        id: '',
        created_at: Math.floor(Date.now() / 1000),
        sig: '',
      };

      await relayPool.publish(manifestEvent as any);
      return manifestEvent.id ?? uploadId;
    } finally {
      // Clean up upload state after completion or failure
      this.uploads.delete(uploadId);
    }
  }

  /**
   * Download and reassemble a blob from relay events.
   *
   * @param eventId - The manifest event ID.
   * @param key - 256-bit AES decryption key.
   * @param relayPool - Pool to fetch chunk events from.
   * @returns The decrypted file data.
   */
  public async download(
    eventId: string,
    key: Uint8Array,
    relayPool: RelayPool,
  ): Promise<Uint8Array> {
    // Step 1: Fetch the manifest event
    const manifest = await this.fetchManifest(eventId, relayPool);
    if (!manifest) {
      throw new Error(`Manifest event not found: ${eventId.slice(0, 12)}…`);
    }

    const { chunks: chunkCount, chunkEventIds, nonce: nonceB64, size } = manifest;
    const nonce = this.base64ToUint8(nonceB64);

    // Step 2: Fetch and reassemble chunk events
    const assembled = new Uint8Array(size);
    let offset = 0;

    for (let i = 0; i < chunkCount; i++) {
      const chunkId = chunkEventIds[i];
      const chunkData = await this.fetchChunk(chunkId, relayPool);
      if (!chunkData) {
        throw new Error(`Chunk ${i} not found for blob ${eventId.slice(0, 12)}…`);
      }
      assembled.set(chunkData, offset);
      offset += chunkData.byteLength;
    }

    // Step 3: Decrypt the reassembled ciphertext
    const plaintext = await this.aesDecrypt(assembled.slice(0, offset), key, nonce);
    return plaintext;
  }

  /**
   * Cancel an in-progress upload.
   */
  public cancel(uploadId: string): void {
    const state = this.uploads.get(uploadId);
    if (state) {
      state.cancelled = true;
    }
  }

  /**
   * Get progress info for an active upload.
   */
  public getProgress(uploadId: string): { bytesTransferred: number; totalBytes: number } {
    const state = this.uploads.get(uploadId);
    if (!state) {
      return { bytesTransferred: 0, totalBytes: 0 };
    }
    return { bytesTransferred: state.bytesTransferred, totalBytes: state.totalBytes };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private splitIntoChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, data.byteLength);
      chunks.push(data.slice(offset, end));
    }
    return chunks;
  }

  private async aesEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
    const algorithm: AesGcmParams = {
      name: 'AES-GCM',
      iv: toArrayBuffer(nonce),
      tagLength: TAG_LENGTH * 8,
    };
    const cryptoKey = await crypto.subtle.importKey('raw', toArrayBuffer(key), algorithm, false, [
      'encrypt',
    ]);
    const encrypted = await crypto.subtle.encrypt(algorithm, cryptoKey, toArrayBuffer(plaintext));
    return { ciphertext: new Uint8Array(encrypted), nonce };
  }

  private async aesDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
  ): Promise<Uint8Array> {
    const algorithm: AesGcmParams = {
      name: 'AES-GCM',
      iv: toArrayBuffer(nonce),
      tagLength: TAG_LENGTH * 8,
    };
    const cryptoKey = await crypto.subtle.importKey('raw', toArrayBuffer(key), algorithm, false, [
      'decrypt',
    ]);
    const decrypted = await crypto.subtle.decrypt(algorithm, cryptoKey, toArrayBuffer(ciphertext));
    return new Uint8Array(decrypted);
  }

  private uint8ToBase64(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /** Stub: fetch a manifest event by ID. Production impl would use relayPool.subscribe. */
  private async fetchManifest(
    _eventId: string,
    _relayPool: RelayPool,
  ): Promise<{ chunks: number; chunkEventIds: string[]; nonce: string; size: number } | null> {
    // Placeholder — in production this subscribes to the relay pool
    // and waits for the manifest event matching the ID.
    return null;
  }

  /** Stub: fetch a single chunk event and decode its content. */
  private async fetchChunk(_chunkId: string, _relayPool: RelayPool): Promise<Uint8Array | null> {
    // Placeholder — in production this subscribes and returns the chunk data
    return null;
  }
}
