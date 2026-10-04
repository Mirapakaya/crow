import { describe, expect, it } from 'vitest'
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { bytesToHex } from '../src/core/util/bytes'
import { createIdentityHandle } from '../src/core/identity/identityHandle'

describe('identity worker', () => {
  it('signs an event without exposing the secret key in main-thread state', async () => {
    const sk = generateSecretKey()
    const pubkey = getPublicKey(sk)
    const handle = createIdentityHandle({ secretKeyHex: bytesToHex(sk) })
    const event = await handle.sign({
      kind: 1,
      content: 'hello',
      tags: [],
      created_at: 1,
      pubkey,
    })
    expect(event.pubkey).toBe(pubkey)
    expect(event.sig).toBeDefined()
    handle.lock()
  })

  it('returns the correct pubkey', async () => {
    const sk = generateSecretKey()
    const handle = createIdentityHandle({ secretKeyHex: bytesToHex(sk) })
    expect(await handle.getPubkey()).toBe(getPublicKey(sk))
    handle.lock()
  })
})
