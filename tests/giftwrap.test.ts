import { describe, expect, it } from 'vitest'
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { createRumor, giftWrap, unwrapGift } from '../src/core/crypto/giftwrap'

describe('giftwrap padding', () => {
  it('round-trips a padded gift wrap', () => {
    const sender = generateSecretKey()
    const recipient = generateSecretKey()
    const recipientPk = getPublicKey(recipient)
    const rumor = createRumor({ kind: 14, content: 'hello' }, sender)
    const wrap = giftWrap(rumor, sender, recipientPk)
    expect(wrap.content.length).toBeGreaterThanOrEqual(1024)
    const unwrapped = unwrapGift(wrap, recipient)
    expect(unwrapped.content).toBe('hello')
  })

  it('wire content has no NUL padding', () => {
    const sender = generateSecretKey()
    const recipient = generateSecretKey()
    const wrap = giftWrap(createRumor({ kind: 14, content: 'hello' }, sender), sender, getPublicKey(recipient))
    expect(wrap.content).not.toContain('\u0000')
  })

  it('wire content length falls in one of the fixed buckets', () => {
    const sender = generateSecretKey()
    const recipient = generateSecretKey()
    const wrap = giftWrap(createRumor({ kind: 14, content: 'hello' }, sender), sender, getPublicKey(recipient))
    const buckets = [1024, 4096, 16384, 65536]
    expect(buckets.some((b) => wrap.content.length <= b)).toBe(true)
  })

  it('two contacts get different p-tags', () => {
    const sender = generateSecretKey()
    const a = generateSecretKey()
    const b = generateSecretKey()
    const rumor = createRumor({ kind: 14, content: 'hello' }, sender)
    const wrapA = giftWrap(rumor, sender, getPublicKey(a))
    const wrapB = giftWrap(rumor, sender, getPublicKey(b))
    const pTagA = wrapA.tags.find((t) => t[0] === 'p')?.[1]
    const pTagB = wrapB.tags.find((t) => t[0] === 'p')?.[1]
    expect(pTagA).not.toBe(pTagB)
  })
})
