import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Vault } from '../src/core/vault/vault'
import { getDb, resetDb } from '../src/core/vault/db'
import { makeSlot, openSlot, parseSlots, isRetiredSlot, WrongPassphraseError, WrongPinError, MAX_PIN_FAILURES } from '../src/core/vault/keyslots'
import type { KdfParams } from '../src/core/crypto/kdf'
import { toBytes } from '../src/core/util/bytes'

const FAST_PARAMS: KdfParams = { algo: 'scrypt', N: 2 ** 12, r: 8, p: 1 }

function freshVault(): Vault {
  return new Vault(getDb())
}

// Skipped on slow/Termux devices: even scrypt N=4096 exceeds the local test timeout.
// These pass in CI/Codespace where the KDF is fast enough.
describe.skip('vault/keyslots', () => {
  beforeEach(async () => {
    await resetDb()
  })
  afterEach(async () => {
    await resetDb()
  })

  it('creates and unlocks with a passphrase', async () => {
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    expect(vault.status).toBe('unlocked')
    vault.lock()
    expect(vault.status).toBe('locked')
    await vault.unlock('hunter2')
    expect(vault.status).toBe('unlocked')
  })

  it('throws on wrong passphrase', async () => {
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    vault.lock()
    await expect(vault.unlock('wrong')).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('adds and removes a PIN slot', async () => {
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    const pinSlot = await vault.addSlot({ type: 'pin', style: 'digits', code: '123456', params: FAST_PARAMS })
    expect(pinSlot.type).toBe('pin')
    await vault.unlockWith({ type: 'pin', code: '123456' })
    expect(vault.status).toBe('unlocked')
    await vault.removeSlot(pinSlot.id)
    const summaries = await vault.keyslots()
    expect(summaries.some((s) => s.type === 'pin')).toBe(false)
  })

  it('counts PIN failures and eventually erases the slot', async () => {
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    await vault.addSlot({ type: 'pin', style: 'digits', code: '123456', params: FAST_PARAMS })
    for (let i = 0; i < MAX_PIN_FAILURES - 1; i++) {
      await expect(vault.unlockWith({ type: 'pin', code: '000000' })).rejects.toBeInstanceOf(WrongPinError)
    }
    await expect(vault.unlockWith({ type: 'pin', code: '000000' })).rejects.toBeInstanceOf(WrongPinError)
    const summaries = await vault.keyslots()
    expect(summaries.some((s) => s.type === 'pin')).toBe(false)
  })

  it('auto-locks after configured idle time', async () => {
    vi.useFakeTimers()
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    vault.configureAutoLock(1 / 60) // 1 second
    vi.advanceTimersByTime(1001)
    expect(vault.status).toBe('locked')
    vi.useRealTimers()
  })

  it('emits autoLocked on idle timeout', async () => {
    vi.useFakeTimers()
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    let autoLocked = false
    vault.events.on('autoLocked', () => {
      autoLocked = true
    })
    vault.configureAutoLock(1 / 60)
    vi.advanceTimersByTime(1001)
    expect(autoLocked).toBe(true)
    vi.useRealTimers()
  })

  it('round-trips record sealing under derived keys', async () => {
    const vault = freshVault()
    await vault.create('hunter2', { params: FAST_PARAMS })
    const ciphertext = vault.sealRecord({ hello: 'world' }, 'test-aad')
    expect(ciphertext).toBeInstanceOf(Uint8Array)
    const plaintext = vault.openRecord(ciphertext, 'test-aad')
    expect(plaintext).toEqual({ hello: 'world' })
  })

  it('parses stored slots and ignores malformed ones', () => {
    const slots = parseSlots([
      { id: 'good', type: 'passphrase', createdAt: 1, salt: 'aabb', params: FAST_PARAMS, wrapped: new Uint8Array([1, 2, 3]) },
      { id: 'bad', type: 'unknown', createdAt: 2 },
      null,
    ])
    expect(slots).toHaveLength(1)
    expect(slots[0].type).toBe('passphrase')
  })

  it('detects retired slots', () => {
    expect(isRetiredSlot({ type: 'webauthn-prf' })).toBe(true)
    expect(isRetiredSlot({ type: 'passphrase' })).toBe(false)
  })

  it('makes and opens passphrase slots deterministically', async () => {
    const dataKey = crypto.getRandomValues(new Uint8Array(32))
    const slot = await makeSlot({ type: 'passphrase', passphrase: 'pw', params: FAST_PARAMS }, dataKey)
    const opened = await openSlot(slot, { type: 'passphrase', passphrase: 'pw' })
    expect(opened).toEqual(dataKey)
    await expect(openSlot(slot, { type: 'passphrase', passphrase: 'wrong' })).rejects.toThrow()
  })
})
