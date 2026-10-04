import { describe, expect, it } from 'vitest'
import { generateSecretKey } from 'nostr-tools/pure'
import {
  createInvite,
  decodeInvite,
  extractInvitePayload,
  inviteLink,
  isInviteStale,
  INVITE_MAX_AGE_SEC,
} from '../src/core/identity/invite'
import { b64urlToBytes, bytesToB64url } from '../src/core/util/bytes'

describe('invite parsing', () => {
  it('round-trips a valid invite', () => {
    const sk = generateSecretKey()
    const invite = createInvite(sk, { name: 'Alice', relays: ['wss://relay.example'] })
    const decoded = decodeInvite(invite)
    expect(decoded.pubkey).toHaveLength(64)
    expect(decoded.name).toBe('Alice')
    expect(decoded.relays).toEqual(['wss://relay.example'])
    expect(decoded.createdAt).toBeGreaterThan(0)
  })

  it('normalises and caps relay list', () => {
    const sk = generateSecretKey()
    const invite = createInvite(sk, {
      name: 'Bob',
      relays: [
        'relay.example',
        'wss://relay.example/',
        'wss://relay2.example',
        'ws://localhost',
        'ftp://bad.example',
      ],
    })
    const decoded = decodeInvite(invite)
    expect(decoded.relays).toContain('wss://relay.example')
    expect(decoded.relays).toContain('wss://relay2.example')
    expect(decoded.relays).not.toContain('ftp://bad.example')
  })

  it('extracts payload from link, fragment, or bare payload', () => {
    const payload = 'x'.repeat(100)
    expect(extractInvitePayload(`https://app.example/#/i/${payload}`)).toBe(payload)
    expect(extractInvitePayload(`#/i/${payload}`)).toBe(payload)
    expect(extractInvitePayload(payload)).toBe(payload)
    expect(extractInvitePayload('not an invite')).toBeNull()
  })

  it('builds invite links relative to current origin', () => {
    const payload = 'x'.repeat(100)
    const link = inviteLink(payload, 'https://app.example/crow/')
    expect(link).toBe('https://app.example/crow/#/i/' + payload)
  })

  it('detects stale invites', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(isInviteStale({ createdAt: now - INVITE_MAX_AGE_SEC - 1, name: '', pubkey: '', relays: [], version: 1 }, now)).toBe(true)
    expect(isInviteStale({ createdAt: now, name: '', pubkey: '', relays: [], version: 1 }, now)).toBe(false)
  })

  it('rejects a truncated invite', () => {
    expect(() => decodeInvite('not-base64url!')).toThrow()
    expect(() => decodeInvite('abc')).toThrow()
  })

  it('rejects an invite with a bad signature', () => {
    const sk = generateSecretKey()
    const invite = createInvite(sk, { name: 'Mallory', relays: [] })
    const tampered = invite.slice(0, -4) + 'AAAA'
    expect(() => decodeInvite(tampered)).toThrow()
  })

  it('rejects unsupported versions', () => {
    const sk = generateSecretKey()
    const invite = createInvite(sk, { name: 'Alice', relays: [] })
    const bytes = b64urlToBytes(invite)
    bytes[0] = 2
    const mutated = bytesToB64url(bytes)
    expect(() => decodeInvite(mutated)).toThrow(/version/)
  })

  it('sanitises name length', () => {
    const sk = generateSecretKey()
    const longName = 'a'.repeat(200)
    const invite = createInvite(sk, { name: longName, relays: [] })
    const decoded = decodeInvite(invite)
    expect(decoded.name.length).toBeLessThanOrEqual(96)
  })
})
