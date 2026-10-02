import { describe, it, expect } from 'vitest'
import {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  MAX_CLOCK_AHEAD_MS,
  nowSec,
  coarsenMs,
  backoffDelay,
} from '../src/core/util/time'

describe('time constants', () => {
  it('SECOND is 1000ms', () => {
    expect(SECOND).toBe(1000)
  })

  it('MINUTE is 60 seconds', () => {
    expect(MINUTE).toBe(60 * 1000)
  })

  it('HOUR is 60 minutes', () => {
    expect(HOUR).toBe(60 * MINUTE)
  })

  it('DAY is 24 hours', () => {
    expect(DAY).toBe(24 * HOUR)
  })

  it('MAX_CLOCK_AHEAD_MS is one day', () => {
    expect(MAX_CLOCK_AHEAD_MS).toBe(DAY)
  })
})

describe('nowSec', () => {
  it('returns a unix timestamp in seconds', () => {
    const before = Math.floor(Date.now() / 1000)
    const result = nowSec()
    const after = Math.floor(Date.now() / 1000)
    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(nowSec())).toBe(true)
  })
})

describe('coarsenMs', () => {
  it('rounds down to the nearest hour', () => {
    // 2024-01-15T12:34:56.789Z → 2024-01-15T12:00:00.000Z
    const ms = Date.UTC(2024, 0, 15, 12, 34, 56, 789)
    expect(coarsenMs(ms)).toBe(Date.UTC(2024, 0, 15, 12, 0, 0, 0))
  })

  it('leaves an exact hour unchanged', () => {
    const ms = Date.UTC(2024, 0, 15, 12, 0, 0, 0)
    expect(coarsenMs(ms)).toBe(ms)
  })

  it('hour 0 stays at hour 0', () => {
    const ms = Date.UTC(2024, 0, 15, 0, 0, 0, 0)
    expect(coarsenMs(ms)).toBe(ms)
  })
})

describe('backoffDelay', () => {
  it('returns 0 for attempt 0 with base 0', () => {
    // base 0 * 2^0 = 0, floor(random * 0) = NaN → but Math.floor(NaN) = NaN
    // Actually base 0 gives exp = min(cap, 0) = 0, so delay = floor(random * 0) = 0
    expect(backoffDelay(0, 0, 0)).toBe(0)
  })

  it('returns a value within [0, cap]', () => {
    for (let i = 0; i < 50; i++) {
      const delay = backoffDelay(i, 1000, 60000)
      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThanOrEqual(60000)
    }
  })

  it('caps at the maximum', () => {
    // Very high attempt number; the exponential is capped
    const delay = backoffDelay(100, 1000, 5000)
    expect(delay).toBeLessThanOrEqual(5000)
  })

  it('grows with attempts on average', () => {
    // Sample many times and check that higher attempt → higher average delay
    const avg = (n: number) => {
      let sum = 0
      for (let i = 0; i < 200; i++) sum += backoffDelay(n, 1000, 60000)
      return sum / 200
    }
    expect(avg(5)).toBeGreaterThan(avg(0))
  })
})
