import { describe, it, expect } from 'vitest'
import {
  normalizeRelayUrl,
  relayLabel,
  normalizeRelayList,
} from '../src/core/transport/relayUrl'

describe('normalizeRelayUrl', () => {
  it('prepends wss:// to a bare hostname', () => {
    expect(normalizeRelayUrl('relay.example.com')).toBe('wss://relay.example.com')
  })

  it('preserves wss:// prefix', () => {
    expect(normalizeRelayUrl('wss://relay.example.com')).toBe('wss://relay.example.com')
  })

  it('lowercases the hostname', () => {
    expect(normalizeRelayUrl('wss://Relay.Example.COM')).toBe('wss://relay.example.com')
  })

  it('removes trailing slash from root path', () => {
    expect(normalizeRelayUrl('wss://relay.example.com/')).toBe('wss://relay.example.com')
  })

  it('preserves non-root paths', () => {
    expect(normalizeRelayUrl('wss://relay.example.com/v2')).toBe('wss://relay.example.com/v2')
  })

  it('strips trailing slashes from paths', () => {
    expect(normalizeRelayUrl('wss://relay.example.com/v2/')).toBe('wss://relay.example.com/v2')
  })

  it('removes hash and credentials', () => {
    expect(normalizeRelayUrl('wss://user:pass@relay.example.com#frag')).toBe('wss://relay.example.com')
  })

  it('strips default port for wss', () => {
    expect(normalizeRelayUrl('wss://relay.example.com:443')).toBe('wss://relay.example.com')
  })

  it('keeps non-default port', () => {
    expect(normalizeRelayUrl('wss://relay.example.com:8080')).toBe('wss://relay.example.com:8080')
  })

  it('rejects empty input', () => {
    expect(normalizeRelayUrl('')).toBeNull()
    expect(normalizeRelayUrl('   ')).toBeNull()
  })

  it('rejects http and other non-websocket schemes', () => {
    expect(normalizeRelayUrl('http://relay.example.com')).toBeNull()
    expect(normalizeRelayUrl('https://relay.example.com')).toBeNull()
  })

  it('rejects javascript, data, file URIs', () => {
    expect(normalizeRelayUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeRelayUrl('data:text/html,<h1>hi</h1>')).toBeNull()
    expect(normalizeRelayUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects ws:// on non-loopback (secure page)', () => {
    // When the page is served over HTTPS, ws:// is blocked
    // The function checks location.protocol — in test env it may vary,
    // but on loopback it should still work
    expect(normalizeRelayUrl('ws://relay.example.com')).toBeNull()
  })

  it('preserves query strings', () => {
    expect(normalizeRelayUrl('wss://relay.example.com?token=abc')).toBe('wss://relay.example.com?token=abc')
  })

  it('trims input whitespace', () => {
    expect(normalizeRelayUrl('  wss://relay.example.com  ')).toBe('wss://relay.example.com')
  })
})

describe('relayLabel', () => {
  it('extracts hostname from a URL', () => {
    expect(relayLabel('wss://relay.example.com')).toBe('relay.example.com')
  })

  it('extracts hostname with port', () => {
    expect(relayLabel('wss://relay.example.com:8080')).toBe('relay.example.com')
  })

  it('returns the raw string for unparseable input', () => {
    expect(relayLabel('not-a-url')).toBe('not-a-url')
  })
})

describe('normalizeRelayList', () => {
  it('deduplicates after normalisation', () => {
    const result = normalizeRelayList([
      'wss://relay.example.com',
      'wss://relay.example.com/',
      'relay.example.com',
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('wss://relay.example.com')
  })

  it('skips invalid URLs', () => {
    const result = normalizeRelayList([
      'wss://relay.example.com',
      '',
      'http://bad.example.com',
      'javascript:alert(1)',
    ])
    // 'not-a-relay' with bare hostname would become wss://not-a-relay (valid URL structure),
    // so only truly invalid entries (empty, wrong scheme, dangerous schemes) are filtered.
    expect(result).toHaveLength(1)
  })

  it('respects the limit', () => {
    const urls = Array.from({ length: 30 }, (_, i) => `wss://relay${i}.example.com`)
    const result = normalizeRelayList(urls, 5)
    expect(result).toHaveLength(5)
  })

  it('returns empty for empty input', () => {
    expect(normalizeRelayList([])).toEqual([])
  })
})
