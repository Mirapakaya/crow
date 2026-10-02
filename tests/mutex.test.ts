import { describe, it, expect } from 'vitest'
import { Mutex, coalesce } from '../src/core/util/mutex'

describe('Mutex', () => {
  it('runs a function and returns its result', async () => {
    const mutex = new Mutex()
    const result = await mutex.run(async () => 42)
    expect(result).toBe(42)
  })

  it('serialises calls in order', async () => {
    const mutex = new Mutex()
    const order: number[] = []
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    // Start two tasks; the second should wait for the first
    const p1 = mutex.run(async () => {
      await delay(10)
      order.push(1)
    })
    const p2 = mutex.run(async () => {
      order.push(2)
    })

    await Promise.all([p1, p2])
    expect(order).toEqual([1, 2])
  })

  it('continues after a rejection', async () => {
    const mutex = new Mutex()
    const p1 = mutex.run(async () => {
      throw new Error('fail')
    })
    // The mutex chain should not be poisoned
    const p2 = mutex.run(async () => 'ok')
    await expect(p1).rejects.toThrow('fail')
    await expect(p2).resolves.toBe('ok')
  })
})

describe('coalesce', () => {
  it('runs the function once for a single call', async () => {
    let count = 0
    const fn = coalesce(async () => {
      count++
    })
    await fn()
    expect(count).toBe(1)
  })

  it('deduplicates concurrent calls', async () => {
    let count = 0
    let resolveFirst: () => void
    const firstPromise = new Promise<void>((r) => {
      resolveFirst = r
    })

    const fn = coalesce(async () => {
      count++
      if (count === 1) await firstPromise
    })

    // Start two concurrent calls
    const p1 = fn()
    const p2 = fn()

    // Only one should be running; the second is queued
    expect(count).toBe(1)

    resolveFirst!()
    await Promise.all([p1, p2])

    // After first completes, queued re-run happens
    expect(count).toBe(2)
  })
})
