import { describe, expect, it } from 'vitest'
import { withBase } from '../src/lib/withBase'

describe('withBase', () => {
  it('returns absolute path unchanged when no base is set', () => {
    expect(withBase('/theme.js')).toBe('/theme.js')
  })

  it('returns external URL unchanged', () => {
    expect(withBase('https://example.com/theme.js')).toBe('https://example.com/theme.js')
  })

  it('prefixs path with base path', () => {
    process.env.NEXT_PUBLIC_CROW_BASE_PATH = '/crow'
    expect(withBase('/theme.js')).toBe('/crow/theme.js')
    delete process.env.NEXT_PUBLIC_CROW_BASE_PATH
  })
})
