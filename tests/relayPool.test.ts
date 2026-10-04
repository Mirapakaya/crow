import { describe, expect, it } from 'vitest'
import { RelayPool } from '../src/core/transport/relayPool'

describe('RelayPool', () => {
  it('ranks configured relays in URL order', () => {
    const pool = new RelayPool()
    pool.setRelays(['wss://read1.example', 'wss://read2.example'], ['wss://write1.example', 'wss://write2.example'])
    expect(pool.readRelays).toEqual(['wss://read1.example', 'wss://read2.example'])
    expect(pool.writeRelays).toEqual(['wss://write1.example', 'wss://write2.example'])
    expect(pool.rankedReadRelays()).toEqual(['wss://read1.example', 'wss://read2.example'])
    expect(pool.rankedWriteRelays()).toEqual(['wss://write1.example', 'wss://write2.example'])
    pool.destroy()
  })

  it('caps ranked relay lists', () => {
    const pool = new RelayPool()
    pool.setRelays(['wss://a.example', 'wss://b.example', 'wss://c.example'], ['wss://d.example', 'wss://e.example'])
    expect(pool.rankedReadRelays(2)).toHaveLength(2)
    expect(pool.rankedWriteRelays(1)).toEqual(['wss://d.example'])
    pool.destroy()
  })

  it('exposes initial empty status', () => {
    const pool = new RelayPool()
    expect(pool.statuses()).toEqual([])
    pool.destroy()
  })
})
