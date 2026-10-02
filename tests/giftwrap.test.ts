import { describe, expect, it } from 'vitest'
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { createRumor, giftWrap, unwrapGift, padToBucket, unpadBucket } from '../src/core/crypto/giftwrap'

describe('giftwrap padding', () => {
  it('round-trips a padded gift wrap', () => {
    const sender = generateSecretKey()
    const recipient = generateSecretKey()
    const recipientPk = getPublicKey(recipient)
    const rumor = createRumor({ kind: 14, content: 'hello' }, sender)
    const wrap = giftWrap(rumor, sender, recipientPk)
    expect(wrap.content.length).toBeGreaterThanOrEqual(256)
    const unwrapped = unwrapGift(wrap, recipient)
    expect(unwrapped.content).toBe('hello')
  })

  it('buckets short content to the 256-byte bucket', () => {
    const padded = padToBucket('a')
    expect(padded.length).toBe(256)
    expect(unpadBucket(padded)).toBe('a')
  })

  it('does not pad content larger than the largest bucket', () => {
    const big = 'x'.repeat(600000)
    expect(padToBucket(big)).toBe(big)
  })
})
