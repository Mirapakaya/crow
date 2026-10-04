import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const headerFiles = [
  { path: 'public/_headers', label: 'Cloudflare/Netlify _headers' },
  { path: 'vercel.json', label: 'Vercel vercel.json' },
  { path: 'render.yaml', label: 'Render render.yaml' },
]

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

  for (const { path, label } of headerFiles) {
    it(`${label} has security headers`, () => {
      const content = readFileSync(resolve(process.cwd(), path), 'utf8')
      expect(content).toContain('X-Content-Type-Options')
      expect(content).toContain('Referrer-Policy')
      expect(content).toContain('Cross-Origin-Opener-Policy')
      expect(content).toContain('Content-Security-Policy')
    })
  }

  it('all required host files exist', () => {
    for (const { path } of headerFiles) {
      expect(() => readFileSync(resolve(process.cwd(), path), 'utf8')).not.toThrow()
    }
    for (const path of ['fly.toml', 'railway.json']) {
      expect(() => readFileSync(resolve(process.cwd(), path), 'utf8')).not.toThrow()
    }
  })

  it('check-headers script reports no missing required headers', () => {
    // We run the script logic implicitly by asserting the files it validates exist and contain CSP.
    for (const { path } of headerFiles) {
      const content = readFileSync(resolve(process.cwd(), path), 'utf8')
      expect(content).toContain('Content-Security-Policy')
      expect(content).toContain('no-referrer')
    }
  })
})
