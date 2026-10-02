import { describe, it, expect } from 'vitest'
import { Emitter } from '../src/core/util/emitter'

describe('Emitter', () => {
  it('delivers events to listeners', () => {
    const bus = new Emitter<{ click: number }>()
    const received: number[] = []
    bus.on('click', (n) => received.push(n))
    bus.emit('click', 42)
    expect(received).toEqual([42])
  })

  it('supports multiple listeners', () => {
    const bus = new Emitter<{ ping: void }>()
    let count = 0
    bus.on('ping', () => count++)
    bus.on('ping', () => count++)
    bus.emit('ping', undefined)
    expect(count).toBe(2)
  })

  it('unsubscribe removes the listener', () => {
    const bus = new Emitter<{ click: void }>()
    let count = 0
    const unsub = bus.on('click', () => count++)
    bus.emit('click', undefined)
    expect(count).toBe(1)
    unsub()
    bus.emit('click', undefined)
    expect(count).toBe(1)
  })

  it('does not deliver to listeners of other events', () => {
    const bus = new Emitter<{ a: void; b: void }>()
    let aCount = 0
    let bCount = 0
    bus.on('a', () => aCount++)
    bus.on('b', () => bCount++)
    bus.emit('a', undefined)
    expect(aCount).toBe(1)
    expect(bCount).toBe(0)
  })

  it('clear removes all listeners', () => {
    const bus = new Emitter<{ click: void }>()
    let count = 0
    bus.on('click', () => count++)
    bus.clear()
    bus.emit('click', undefined)
    expect(count).toBe(0)
  })

  it('a listener throwing does not stop other listeners', () => {
    const bus = new Emitter<{ test: void }>()
    let secondCalled = false
    bus.on('test', () => {
      throw new Error('boom')
    })
    bus.on('test', () => {
      secondCalled = true
    })
    bus.emit('test', undefined)
    expect(secondCalled).toBe(true)
  })

  it('emitting an event with no listeners is a no-op', () => {
    const bus = new Emitter<{ lonely: void }>()
    expect(() => bus.emit('lonely', undefined)).not.toThrow()
  })
})
