import { describe, expect, it } from 'vitest'
import {
  decodeHybridBytes,
  decapsulateHybrid,
  deriveMlsSeed,
  encapsulateHybrid,
  encodeHybridBytes,
  generateHybridKeyPair,
  HYBRID_CIPHER_LEN,
  HYBRID_PUBLIC_KEY_LEN,
  HYBRID_SECRET_KEY_LEN,
  isValidHybridCipherText,
  isValidHybridPublicKey,
} from '../src/core/crypto/hybridKem'

describe('hybridKem', () => {
  it('generates keypairs with expected lengths', () => {
    const initiator = generateHybridKeyPair()
    expect(initiator.publicKey.length).toBe(HYBRID_PUBLIC_KEY_LEN)
    expect(initiator.secretKey.length).toBe(HYBRID_SECRET_KEY_LEN)
    expect(isValidHybridPublicKey(initiator.publicKey)).toBe(true)
    expect(isValidHybridPublicKey(new Uint8Array(1))).toBe(false)
  })

  it('round-trips a shared secret through encapsulate/decapsulate', () => {
    const initiator = generateHybridKeyPair()
    const enc = encapsulateHybrid(initiator.publicKey)
    expect(enc.cipherText.length).toBe(HYBRID_CIPHER_LEN)
    expect(enc.sharedSecret.length).toBe(32)
    expect(isValidHybridCipherText(enc.cipherText)).toBe(true)

    const recovered = decapsulateHybrid(enc.cipherText, initiator.secretKey)
    expect(recovered).toEqual(enc.sharedSecret)
  })

  it('produces the same seed for both sides', () => {
    const initiator = generateHybridKeyPair()
    const enc = encapsulateHybrid(initiator.publicKey)
    const seedA = deriveMlsSeed(enc.sharedSecret)
    const seedB = deriveMlsSeed(decapsulateHybrid(enc.cipherText, initiator.secretKey))
    expect(seedA).toEqual(seedB)
    expect(seedA.length).toBe(32)
  })

  it('encodes and decodes hybrid bytes as base64', () => {
    const initiator = generateHybridKeyPair()
    const b64 = encodeHybridBytes(initiator.publicKey)
    const decoded = decodeHybridBytes(b64)
    expect(decoded).toEqual(initiator.publicKey)
  })
})
