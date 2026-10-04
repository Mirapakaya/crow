import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, join } from 'path'
import { CROW_CSP } from '../src/core/util/csp'

describe('CSP', () => {
  it('has no third-party connect-src', () => {
    expect(CROW_CSP).toContain("connect-src 'self' wss:")
  })

  it('blocks frames and objects', () => {
    expect(CROW_CSP).toContain("frame-src 'none'")
    expect(CROW_CSP).toContain("object-src 'none'")
  })

  it('requires trusted types', () => {
    expect(CROW_CSP).toContain('require-trusted-types-for')
    expect(CROW_CSP).toContain('trusted-types crow')
  })

  it('does not allow base-uri or form-action', () => {
    expect(CROW_CSP).toContain("base-uri 'none'")
    expect(CROW_CSP).toContain("form-action 'none'")
  })

  it('post-build CSP removes unsafe-inline from script-src and style-src-attr', () => {
    // The post-build script builds the CSP from scratch; inspect its source
    const script = readFileSync(resolve(process.cwd(), 'scripts/postbuild-csp.mjs'), 'utf8')
    const baseMatch = script.match(/const baseCsp = \[([\s\S]*?)\]\.join\('; '\)/)
    expect(baseMatch).toBeTruthy()
    const csp = baseMatch![0]
    const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''
    const styleSrcAttr = csp.match(/style-src-attr ([^;]+)/)?.[1] ?? ''
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(styleSrcAttr).not.toContain("'unsafe-inline'")
  })

  it('post-build CSP includes self origin for scripts and styles', () => {
    const script = readFileSync(resolve(process.cwd(), 'scripts/postbuild-csp.mjs'), 'utf8')
    const baseMatch = script.match(/const baseCsp = \[([\s\S]*?)\]\.join\('; '\)/)
    expect(baseMatch).toBeTruthy()
    const csp = baseMatch![0]
    expect(csp).toContain('script-src ${scriptSrc}')
    expect(csp).toContain('style-src ${styleSrc}')
    expect(csp).toContain('style-src-elem ${styleSrcElem}')
    expect(csp).not.toContain("'unsafe-inline'")
  })
})
