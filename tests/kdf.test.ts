import { describe, expect, it } from 'vitest'
import {
  assertKdfParams,
  DEFAULT_ARGON2ID_PARAMS,
  DEFAULT_SCRYPT_PARAMS,
  deriveKek,
} from '../src/core/crypto/kdf'

describe('KDF', () => {
  it('derives a 32-byte key with scrypt', async () => {
    const key = await deriveKek('correct horse battery staple', crypto.getRandomValues(new Uint8Array(16)),
      DEFAULT_SCRYPT_PARAMS,
    )
    expect(key).toBeInstanceOf(Uint8Array)
    expect(key.length).toBe(32)
  })

  it('derives a 32-byte key with argon2id', async () => {
    const key = await deriveKek(
      'correct horse battery staple',
      crypto.getRandomValues(new Uint8Array(16)),
      DEFAULT_ARGON2ID_PARAMS,
    )
    expect(key).toBeInstanceOf(Uint8Array)
    expect(key.length).toBe(32)
  })

  it('produces deterministic output for argon2id', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const a = await deriveKek('same passphrase', salt, DEFAULT_ARGON2ID_PARAMS)
    const b = await deriveKek('same passphrase', salt, DEFAULT_ARGON2ID_PARAMS)
    expect(a).toEqual(b)
  })

  it('produces different output for different passphrases', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const a = await deriveKek('one', salt, DEFAULT_ARGON2ID_PARAMS)
    const b = await deriveKek('two', salt, DEFAULT_ARGON2ID_PARAMS)
    expect(a).not.toEqual(b)
  })

  it('rejects bad KDF parameters', () => {
    expect(() => assertKdfParams({ algo: 'scrypt', N: 2 ** 10, r: 8, p: 1 })).toThrow()
    expect(() => assertKdfParams({ algo: 'argon2id', m: 4 * 1024, t: 3, p: 1 })).toThrow()
    expect(() => assertKdfParams({ algo: 'argon2id', m: 64 * 1024, t: 0, p: 1 })).toThrow()
    expect(() => assertKdfParams({ algo: 'scrypt', N: 2 ** 16, r: 8, p: 1 })).not.toThrow()
    expect(() => assertKdfParams({ algo: 'argon2id', m: 64 * 1024, t: 3, p: 1 })).not.toThrow()
  })
})
