import { describe, expect, it } from 'vitest'
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
})
