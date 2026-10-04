import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('host header files', () => {
  it('public/_headers exists and has required headers', () => {
    const content = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')
    expect(content).toContain('X-Content-Type-Options: nosniff')
    expect(content).toContain('Referrer-Policy: no-referrer')
    expect(content).toContain('Content-Security-Policy:')
  })

  it('vercel.json exists and has headers', () => {
    const content = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')
    expect(content).toContain('Content-Security-Policy')
    expect(content).toContain('Referrer-Policy')
  })
})
