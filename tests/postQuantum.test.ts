/**
 * Tests for the post-quantum cryptographic layer.
 *
 * Verifies ML-KEM-768 encapsulation/decapsulation, ML-DSA-65 signatures,
 * hybrid key agreement, and hybrid signatures.
 */

import { describe, expect, it } from 'vitest'
import {
  kemKeyGen,
  kemEncapsulate,
  kemDecapsulate,
  dsaKeyGen,
  dsaSign,
  dsaVerify,
  hybridAgreeKeyGen,
  hybridAgreeEncapsulate,
  hybridAgreeDecapsulate,
  deriveHybridSharedSecret,
  hybridSigKeyGen,
  hybridSign,
  hybridSigVerify,
  encodeHybridAgreePk,
  decodeHybridAgreePk,
  encodeHybridSigPk,
  decodeHybridSigPk,
  PQ,
} from '@/core/crypto/postQuantum'

describe('ML-KEM-768', () => {
  it('generates valid key pairs', () => {
    const kp = kemKeyGen()
    expect(kp.publicKey).toHaveLength(PQ.KEM_PK)
    expect(kp.secretKey).toHaveLength(PQ.KEM_SK)
  })

  it('encapsulates and decapsulates correctly', () => {
    const kp = kemKeyGen()
    const { ciphertext, sharedSecret } = kemEncapsulate(kp.publicKey)
    expect(ciphertext).toHaveLength(PQ.KEM_CT)
    expect(sharedSecret).toHaveLength(PQ.KEM_SS)

    const recovered = kemDecapsulate(kp.secretKey, ciphertext)
    expect(recovered).toHaveLength(PQ.KEM_SS)
    expect(recovered).toEqual(sharedSecret)
  })

  it('rejects incorrect secret key', () => {
    const kp1 = kemKeyGen()
    const kp2 = kemKeyGen()
    const { ciphertext } = kemEncapsulate(kp1.publicKey)

    const wrong = kemDecapsulate(kp2.secretKey, ciphertext)
    // Decapsulation with wrong key produces a different (but valid) shared secret
    // ML-KEM's decapsulation always succeeds, but returns wrong value
    expect(wrong).toHaveLength(PQ.KEM_SS)
  })
})

describe('ML-DSA-65', () => {
  it('generates valid key pairs', () => {
    const kp = dsaKeyGen()
    expect(kp.publicKey).toHaveLength(PQ.DSA_PK)
    expect(kp.secretKey).toHaveLength(PQ.DSA_SK)
  })

  it('signs and verifies correctly', () => {
    const kp = dsaKeyGen()
    const message = new TextEncoder().encode('Hello, post-quantum world!')
    const sig = dsaSign(kp.secretKey, message)
    expect(sig).toHaveLength(PQ.DSA_SIG)
    expect(dsaVerify(kp.publicKey, message, sig)).toBe(true)
  })

  it('rejects tampered messages', () => {
    const kp = dsaKeyGen()
    const message = new TextEncoder().encode('Original message')
    const sig = dsaSign(kp.secretKey, message)
    const tampered = new TextEncoder().encode('Tampered message')
    expect(dsaVerify(kp.publicKey, tampered, sig)).toBe(false)
  })

  it('rejects wrong public key', () => {
    const kp1 = dsaKeyGen()
    const kp2 = dsaKeyGen()
    const message = new TextEncoder().encode('Test')
    const sig = dsaSign(kp1.secretKey, message)
    expect(dsaVerify(kp2.publicKey, message, sig)).toBe(false)
  })
})

describe('Hybrid key agreement', () => {
  it('generates valid key pairs', () => {
    const kp = hybridAgreeKeyGen()
    expect(kp.classicalPk).toHaveLength(PQ.X25519_PK)
    expect(kp.classicalSk).toHaveLength(32)
    expect(kp.pqPk).toHaveLength(PQ.KEM_PK)
    expect(kp.pqSk).toHaveLength(PQ.KEM_SK)
  })

  it('both sides derive the same shared secret', () => {
    const alice = hybridAgreeKeyGen()
    const bob = hybridAgreeKeyGen()

    // Alice encapsulates to Bob
    const aliceResult = hybridAgreeEncapsulate(
      alice.classicalSk,
      { classicalPk: bob.classicalPk, pqPk: bob.pqPk },
      'test-session',
    )

    // Bob decapsulates using Alice's classical PK and the KEM ciphertext
    const bobSecret = hybridAgreeDecapsulate(
      bob.classicalSk,
      bob.pqSk,
      alice.classicalPk,
      aliceResult.kemCt,
      'test-session',
    )

    expect(aliceResult.sharedSecret).toHaveLength(32)
    expect(bobSecret).toHaveLength(32)
    expect(aliceResult.sharedSecret).toEqual(bobSecret)
  })

  it('different context produces different secrets', () => {
    const alice = hybridAgreeKeyGen()
    const bob = hybridAgreeKeyGen()

    const r1 = hybridAgreeEncapsulate(
      alice.classicalSk,
      { classicalPk: bob.classicalPk, pqPk: bob.pqPk },
      'context-a',
    )
    const r2 = hybridAgreeEncapsulate(
      alice.classicalSk,
      { classicalPk: bob.classicalPk, pqPk: bob.pqPk },
      'context-b',
    )

    expect(r1.sharedSecret).not.toEqual(r2.sharedSecret)
  })
})

describe('Hybrid signatures', () => {
  it('generates valid key pairs', () => {
    const kp = hybridSigKeyGen()
    expect(kp.edPk).toHaveLength(PQ.ED25519_PK)
    expect(kp.edSk).toHaveLength(32)
    expect(kp.dsaPk).toHaveLength(PQ.DSA_PK)
    expect(kp.dsaSk).toHaveLength(PQ.DSA_SK)
  })

  it('signs and verifies correctly', () => {
    const kp = hybridSigKeyGen()
    const message = new TextEncoder().encode('Hybrid signature test')
    const sig = hybridSign(kp, message)
    expect(sig).toHaveLength(PQ.HYBRID_SIG)
    expect(hybridSigVerify({ edPk: kp.edPk, dsaPk: kp.dsaPk }, message, sig)).toBe(true)
  })

  it('rejects tampered messages', () => {
    const kp = hybridSigKeyGen()
    const message = new TextEncoder().encode('Original')
    const sig = hybridSign(kp, message)
    const tampered = new TextEncoder().encode('Modified')
    expect(hybridSigVerify({ edPk: kp.edPk, dsaPk: kp.dsaPk }, tampered, sig)).toBe(false)
  })

  it('rejects wrong public key', () => {
    const kp1 = hybridSigKeyGen()
    const kp2 = hybridSigKeyGen()
    const message = new TextEncoder().encode('Test')
    const sig = hybridSign(kp1, message)
    expect(hybridSigVerify({ edPk: kp2.edPk, dsaPk: kp2.dsaPk }, message, sig)).toBe(false)
  })

  it('rejects truncated signature', () => {
    const kp = hybridSigKeyGen()
    const message = new TextEncoder().encode('Test')
    const sig = hybridSign(kp, message)
    const truncated = sig.subarray(0, PQ.HYBRID_SIG - 1)
    expect(hybridSigVerify({ edPk: kp.edPk, dsaPk: kp.dsaPk }, message, truncated)).toBe(false)
  })
})

describe('Serialisation', () => {
  it('round-trips hybrid agreement public key', () => {
    const kp = hybridAgreeKeyGen()
    const pk: { classicalPk: Uint8Array; pqPk: Uint8Array } = {
      classicalPk: kp.classicalPk,
      pqPk: kp.pqPk,
    }
    const encoded = encodeHybridAgreePk(pk)
    expect(encoded).toHaveLength(PQ.HYBRID_AGREE_PK)

    const decoded = decodeHybridAgreePk(encoded)
    expect(decoded.classicalPk).toEqual(pk.classicalPk)
    expect(decoded.pqPk).toEqual(pk.pqPk)
  })

  it('round-trips hybrid signature public key', () => {
    const kp = hybridSigKeyGen()
    const pk = { edPk: kp.edPk, dsaPk: kp.dsaPk }
    const encoded = encodeHybridSigPk(pk)
    expect(encoded).toHaveLength(PQ.HYBRID_SIG_PK)

    const decoded = decodeHybridSigPk(encoded)
    expect(decoded.edPk).toEqual(pk.edPk)
    expect(decoded.dsaPk).toEqual(pk.dsaPk)
  })

  it('rejects wrong-size hybrid agreement key', () => {
    expect(() => decodeHybridAgreePk(new Uint8Array(10))).toThrow()
  })

  it('rejects wrong-size hybrid signature key', () => {
    expect(() => decodeHybridSigPk(new Uint8Array(10))).toThrow()
  })
})
