import { describe, expect, it } from 'vitest'
import { normalizeRelayUrl, normalizeRelayList } from '../src/core/transport/relayUrl'

describe('normalizeRelayUrl', () => {
  it('normalises a valid wss URL', () => {
    expect(normalizeRelayUrl('wss://relay.example.com/')).toBe('wss://relay.example.com')
  })

  it('rejects plain http(s) URLs', () => {
    expect(normalizeRelayUrl('https://relay.example.com')).toBeNull()
  })

  it('rejects private IPv4 ranges', () => {
    expect(normalizeRelayUrl('wss://192.168.1.1')).toBeNull()
    expect(normalizeRelayUrl('wss://10.0.0.1')).toBeNull()
    expect(normalizeRelayUrl('wss://127.0.0.1')).toBeNull()
  })

  it('rejects loopback IPv6', () => {
    expect(normalizeRelayUrl('wss://[::1]')).toBeNull()
  })

  it('rejects non-ws schemes', () => {
    expect(normalizeRelayUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('normalizeRelayList', () => {
  it('caps the list at the provided limit', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `wss://relay${i}.example.com`)
    expect(normalizeRelayList(urls, 6)).toHaveLength(6)
  })
})
