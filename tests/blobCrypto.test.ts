import { describe, expect, it } from 'vitest'
import {
  assembleBlob,
  blobId,
  blobRef,
  chunkCipherLength,
  chunkCount,
  chunkCount as chunkCountFn,
  openChunk,
  sealBlob,
} from '../src/core/crypto/blobCrypto'

describe('blobCrypto', () => {
  it('round-trips a small plaintext in one chunk', () => {
    const plaintext = new TextEncoder().encode('hello world')
    const { envelope, chunk } = sealBlob(plaintext)
    expect(envelope.size).toBe(plaintext.length)
    expect(envelope.chunks).toBe(1)
    const opened = openChunk(envelope, 0, chunk(0))
    expect(opened).toEqual(plaintext)
  })

  it('round-trips multi-chunk plaintext', () => {
    const plaintext = crypto.getRandomValues(new Uint8Array(40_000))
    const { envelope, chunk } = sealBlob(plaintext)
    expect(envelope.chunks).toBeGreaterThan(1)
    const chunks: Uint8Array[] = []
    for (let i = 0; i < envelope.chunks; i++) chunks.push(openChunk(envelope, i, chunk(i)))
    const assembled = assembleBlob(envelope, chunks)
    expect(assembled).toEqual(plaintext)
  })

  it('rejects a chunk at the wrong index', () => {
    const plaintext = new TextEncoder().encode('important document')
    const { envelope, chunk } = sealBlob(plaintext)
    const other = sealBlob(new TextEncoder().encode('other'))
    expect(() => openChunk(envelope, 0, other.chunk(0))).toThrow()
    expect(() => openChunk(envelope, 1, chunk(0))).toThrow()
  })

  it('detects truncated or oversized reassembly', () => {
    const plaintext = crypto.getRandomValues(new Uint8Array(1_000))
    const { envelope, chunk } = sealBlob(plaintext)
    const chunks = [chunk(0)]
    expect(() => assembleBlob(envelope, chunks)).toThrow(/size mismatch/)
  })

  it('detects tampered ciphertext via authentication tag', () => {
    const plaintext = new TextEncoder().encode('tamper me')
    const { envelope, chunk } = sealBlob(plaintext)
    const ct = chunk(0)
    ct[ct.length - 1] ^= 0xff
    expect(() => openChunk(envelope, 0, ct)).toThrow()
  })

  it('computes chunk counts and cipher lengths', () => {
    expect(chunkCountFn(0)).toBe(1)
    expect(chunkCountFn(1)).toBe(1)
    expect(chunkCountFn(16 * 1024)).toBe(1)
    expect(chunkCountFn(16 * 1024 + 1)).toBe(2)
    expect(chunkCipherLength(100, 0)).toBe(100 + 16)
    expect(chunkCipherLength(16 * 1024 + 100, 1)).toBe(100 + 16)
  })

  it('produces unique blob references per key', () => {
    const plaintext = new TextEncoder().encode('same payload')
    const a = sealBlob(plaintext)
    const b = sealBlob(plaintext)
    expect(a.envelope.id).toBe(b.envelope.id)
    expect(blobRef(a.envelope)).not.toEqual(blobRef(b.envelope))
  })

  it('rejects out-of-range chunk indices', () => {
    const plaintext = new TextEncoder().encode('x')
    const { envelope, chunk } = sealBlob(plaintext)
    expect(() => chunk(-1)).toThrow()
    expect(() => chunk(1)).toThrow()
  })

  it('computes deterministic blob id from plaintext', () => {
    const plaintext = new TextEncoder().encode('deterministic')
    const a = blobId(plaintext)
    const b = blobId(plaintext)
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })
})
