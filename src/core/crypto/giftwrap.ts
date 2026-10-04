import { finalizeEvent, generateSecretKey, getEventHash } from 'nostr-tools/pure'
import { schnorr } from '@noble/curves/secp256k1.js'
import type { Event as NostrEvent, UnsignedEvent } from 'nostr-tools/core'
import * as nip44 from 'nostr-tools/nip44'
import { MAX_CLOCK_AHEAD_MS, nowSec } from '../util/time'
import { hexToBytes, isHex32, randomInt, wipe } from '../util/bytes'

/**
 * NIP-59 gift wrapping, re-implemented on top of nostr-tools' NIP-44 primitives.
 *
 * Why not call `nip59.wrapEvent` directly:
 *   1. We attach a NIP-40 `expiration` tag to every wrap, which requires
 *      building and signing the wrap ourselves (tags are covered by the
 *      signature, so they cannot be added afterwards).
 *   2. `nip59.unwrapEvent` does not check that a rumor's `id` actually hashes
 *      its own content, nor that the rumor is unsigned, nor that timestamps are
 *      sane. A malicious peer could otherwise hand us a rumor whose id points
 *      at something it does not contain, and our dedup keys off that id.
 *
 * Layering (outermost first):
 *   kind 1059 gift wrap  — from a single-use ephemeral key to the recipient,
 *                          p-tagged, timestamp fuzzed, expiration tagged
 *   kind 13   seal       — from the sender's real key to the recipient, signed,
 *                          timestamp fuzzed
 *   rumor                — unsigned event carrying the real payload and the
 *                          real timestamp
 *
 * The rumor being unsigned is deliberate: a leaked plaintext proves nothing,
 * because anyone could have written it. That is the deniability property.
 */

export const KIND_SEAL = 13
export const KIND_GIFT_WRAP = 1059

/** NIP-59 says fuzz backwards only: relays reject events dated in the future. */
const FUZZ_WINDOW_SEC = 2 * 24 * 60 * 60

/**
 * Relays commonly cap a websocket frame around 256-512 KB. Refuse to even
 * attempt decryption above that so a hostile relay cannot make us burn CPU.
 */
const MAX_CONTENT_CHARS = 512 * 1024

/** How far out of step a peer's clock may be before we treat a rumor as bogus. */
const MAX_CLOCK_SKEW_SEC = MAX_CLOCK_AHEAD_MS / 1000

export interface Rumor extends UnsignedEvent {
  readonly id: string
}

export interface WrapOptions {
  /** Ask relays to drop the wrap after this many seconds (NIP-40). */
  expirationSec?: number
  /** Override the fuzzed wrap/seal timestamp. Tests only. */
  fuzzedAt?: number
}

const fuzzedNow = (): number => nowSec() - randomInt(FUZZ_WINDOW_SEC)

/**
 * Wire-length buckets for NIP-44 ciphertexts.
 *
 * The plaintext is wrapped as `{r: rumor, p: pad}` and padded so that the
 * resulting base64 ciphertext length falls into one of these buckets. This
 * hides the true message length from relays and observers.
 *
 * The padding string is random alphanumeric ASCII so that a relay cannot
 * strip meaningful trailing bytes.
 */
const PADDING_BUCKETS = [1024, 4096, 16384, 65536]

interface RumorWrapper {
  r: unknown
  p: string
}

function isRumorWrapper(value: unknown): value is RumorWrapper {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'p' in value &&
    typeof (value as Record<string, unknown>).p === 'string'
  )
}

function randomPad(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Build a padded wrapper object whose JSON string hits the next bucket. */
function buildWrapper(plaintext: string): { wrapper: RumorWrapper; bucket: number } {
  const target = PADDING_BUCKETS.find((b) => b >= plaintext.length) ?? PADDING_BUCKETS[PADDING_BUCKETS.length - 1]
  // Account for the JSON overhead: {"r":...,"p":""}
  const overhead = JSON.stringify({ r: 0, p: '' }).length - 1
  const needed = target - plaintext.length - overhead
  const pad = needed > 0 ? randomPad(needed) : ''
  return { wrapper: { r: JSON.parse(plaintext), p: pad }, bucket: target }
}

/** Extract the inner plaintext from a wrapper, accepting the old format. */
function unwrapWrapper(value: unknown): string {
  if (isRumorWrapper(value)) {
    return JSON.stringify(value.r)
  }
  return JSON.stringify(value)
}

/** Pad the NIP-44 plaintext so the gift-wrap or seal content length is one
 * of a small set of buckets rather than the raw message length. */
export function padPlaintext(plaintext: string): string {
  const { wrapper } = buildWrapper(plaintext)
  return JSON.stringify(wrapper)
}

export function unpadBucket(padded: string): string {
  let end = padded.length
  while (end > 0 && padded[end - 1] === '\0') end -= 1
  return padded.slice(0, end)
}

/** Build an unsigned rumor carrying the real timestamp. */
export function createRumor(template: Partial<UnsignedEvent>, senderPubkey: string): Rumor {
  const rumor = {
    created_at: nowSec(),
    kind: 14,
    content: '',
    tags: [] as string[][],
    ...template,
    pubkey: senderPubkey,
  } as UnsignedEvent
  return { ...rumor, id: getEventHash(rumor) } as Rumor
}

function encryptTo(payload: unknown, sk: Uint8Array, recipientPk: string): string {
  const conversationKey = nip44.getConversationKey(sk, recipientPk)
  try {
    return nip44.encrypt(padPlaintext(JSON.stringify(payload)), conversationKey)
  } finally {
    wipe(conversationKey)
  }
}

function decryptFrom(content: string, sk: Uint8Array, senderPk: string): unknown {
  const conversationKey = nip44.getConversationKey(sk, senderPk)
  try {
    const plaintext = nip44.decrypt(content, conversationKey)
    try {
      // New format: {r: rumor, p: pad}
      return JSON.parse(unwrapWrapper(JSON.parse(plaintext)))
    } catch {
      // Legacy format: padded rumor JSON with trailing null bytes
      return JSON.parse(unpadBucket(plaintext))
    }
  } finally {
    wipe(conversationKey)
  }
}

export function createSeal(rumor: Rumor, senderSk: Uint8Array, recipientPk: string, at?: number): NostrEvent {
  return finalizeEvent(
    {
      kind: KIND_SEAL,
      content: encryptTo(rumor, senderSk, recipientPk),
      created_at: at ?? fuzzedNow(),
      tags: [],
    },
    senderSk,
  )
}

export function createWrap(seal: NostrEvent, recipientPk: string, opts: WrapOptions = {}): NostrEvent {
  const ephemeralSk = generateSecretKey()
  try {
    const tags: string[][] = [['p', recipientPk]]
    if (opts.expirationSec && opts.expirationSec > 0) {
      // Expiration is advisory. Relays that honour NIP-40 drop the wrap; the
      // ones that do not are exactly why we never rely on remote deletion.
      tags.push(['expiration', String(nowSec() + opts.expirationSec)])
    }
    return finalizeEvent(
      {
        kind: KIND_GIFT_WRAP,
        content: encryptTo(seal, ephemeralSk, recipientPk),
        created_at: opts.fuzzedAt ?? fuzzedNow(),
        tags,
      },
      ephemeralSk,
    )
  } finally {
    wipe(ephemeralSk)
  }
}

/** Seal + wrap a rumor for one recipient. */
export function giftWrap(
  rumor: Rumor,
  senderSk: Uint8Array,
  recipientPk: string,
  opts: WrapOptions = {},
): NostrEvent {
  if (!isHex32(recipientPk)) throw new Error('recipient pubkey must be 32-byte hex')
  return createWrap(createSeal(rumor, senderSk, recipientPk, opts.fuzzedAt), recipientPk, opts)
}

/** Async signing/encryption interface used by the async gift-wrap helpers. */
export interface GiftWrapSigner {
  sign(event: UnsignedEvent): Promise<NostrEvent>
  nip44Encrypt(plaintext: string, recipientPubkeyHex: string): Promise<string>
  nip44Decrypt(ciphertext: string, senderPubkeyHex: string): Promise<string>
  getPubkey(): Promise<string>
}

/** Async variant of `giftWrap` that never touches the secret key directly. */
export async function giftWrapAsync(
  rumor: Rumor,
  signer: GiftWrapSigner,
  recipientPk: string,
  opts: WrapOptions = {},
): Promise<NostrEvent> {
  if (!isHex32(recipientPk)) throw new Error('recipient pubkey must be 32-byte hex')

  const sealContent = await signer.nip44Encrypt(padPlaintext(JSON.stringify(rumor)), recipientPk)
  const senderPubkey = await signer.getPubkey()
  const seal = await signer.sign({
    kind: KIND_SEAL,
    content: sealContent,
    created_at: opts.fuzzedAt ?? fuzzedNow(),
    tags: [],
    pubkey: senderPubkey,
  })

  const ephemeralSk = generateSecretKey()
  try {
    const tags: string[][] = [['p', recipientPk]]
    if (opts.expirationSec && opts.expirationSec > 0) {
      tags.push(['expiration', String(nowSec() + opts.expirationSec)])
    }
    return finalizeEvent(
      {
        kind: KIND_GIFT_WRAP,
        content: encryptTo(seal, ephemeralSk, recipientPk),
        created_at: opts.fuzzedAt ?? fuzzedNow(),
        tags,
      },
      ephemeralSk,
    )
  } finally {
    wipe(ephemeralSk)
  }
}

/**
 * Verify an event signature from first principles.
 *
 * nostr-tools' `verifyEvent` memoises its answer on the event object under a
 * symbol key. That is a sensible optimisation for events the library itself
 * produced or checked, but symbol properties survive object spread and
 * structured clone, so an object carrying a stale `true` would skip
 * verification entirely. Anything reaching this module may have come from a
 * relay, a peer, or a decrypted blob, so it recomputes every time.
 */
export function verifyEventSignature(event: {
  id?: unknown
  sig?: unknown
  pubkey?: unknown
  kind?: unknown
  content?: unknown
  created_at?: unknown
  tags?: unknown
}): boolean {
  if (!isHex32(event.pubkey) || typeof event.sig !== 'string' || !/^[0-9a-f]{128}$/.test(event.sig)) {
    return false
  }
  if (typeof event.kind !== 'number' || typeof event.content !== 'string') return false
  if (typeof event.created_at !== 'number' || !Array.isArray(event.tags)) return false
  try {
    const hash = getEventHash({
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags as string[][],
      content: event.content,
    })
    if (typeof event.id === 'string' && event.id !== hash) return false
    return schnorr.verify(hexToBytes(event.sig), hexToBytes(hash), hexToBytes(event.pubkey))
  } catch {
    return false
  }
}

export class GiftWrapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GiftWrapError'
  }
}

function assertPlainEvent(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GiftWrapError(`${label} is not an object`)
  }
}

/**
 * Unwrap and fully validate a gift wrap.
 *
 * Every check here exists because skipping it lets a peer or relay lie to us:
 *  - seal signature      -> proves who wrote the message
 *  - rumor.pubkey == seal.pubkey -> stops A from sealing a rumor attributed to B
 *  - rumor has no `sig`  -> preserves deniability; a signed rumor is a red flag
 *  - rumor.id is correct -> our dedup and reply threading key off this id
 *  - timestamp sanity    -> keeps a hostile peer from parking messages far in
 *                           the future at the top of the conversation
 */
export function unwrapGift(wrap: NostrEvent, recipientSk: Uint8Array): Rumor {
  if (wrap.kind !== KIND_GIFT_WRAP) throw new GiftWrapError(`expected kind ${KIND_GIFT_WRAP}`)
  if (typeof wrap.content !== 'string' || wrap.content.length > MAX_CONTENT_CHARS) {
    throw new GiftWrapError('gift wrap content too large')
  }
  if (!verifyEventSignature(wrap)) throw new GiftWrapError('gift wrap signature is invalid')

  const seal = decryptFrom(wrap.content, recipientSk, wrap.pubkey)
  assertPlainEvent(seal, 'seal')
  if (seal.kind !== KIND_SEAL) throw new GiftWrapError(`expected seal kind ${KIND_SEAL}`)
  if (typeof seal.content !== 'string' || seal.content.length > MAX_CONTENT_CHARS) {
    throw new GiftWrapError('seal content too large')
  }
  if (!verifyEventSignature(seal)) throw new GiftWrapError('seal signature is invalid')

  const rumor = decryptFrom(seal.content, recipientSk, seal.pubkey as string)
  return validateRumor(rumor, seal.pubkey as string)
}

/** Async variant of `unwrapGift` that delegates decryption to a handle. */
export async function unwrapGiftAsync(wrap: NostrEvent, signer: GiftWrapSigner): Promise<Rumor> {
  if (wrap.kind !== KIND_GIFT_WRAP) throw new GiftWrapError(`expected kind ${KIND_GIFT_WRAP}`)
  if (typeof wrap.content !== 'string' || wrap.content.length > MAX_CONTENT_CHARS) {
    throw new GiftWrapError('gift wrap content too large')
  }
  if (!verifyEventSignature(wrap)) throw new GiftWrapError('gift wrap signature is invalid')

  const outerPlain = await signer.nip44Decrypt(wrap.content, wrap.pubkey)
  const outerWrapper = JSON.parse(outerPlain)
  const seal = JSON.parse(unwrapWrapper(outerWrapper)) as Record<string, unknown>
  assertPlainEvent(seal, 'seal')
  if (seal.kind !== KIND_SEAL) throw new GiftWrapError(`expected seal kind ${KIND_SEAL}`)
  if (typeof seal.content !== 'string' || seal.content.length > MAX_CONTENT_CHARS) {
    throw new GiftWrapError('seal content too large')
  }
  if (!verifyEventSignature(seal)) throw new GiftWrapError('seal signature is invalid')

  const innerPlain = await signer.nip44Decrypt(seal.content, seal.pubkey as string)
  const innerWrapper = JSON.parse(innerPlain)
  const rumor = JSON.parse(unwrapWrapper(innerWrapper))
  return validateRumor(rumor, seal.pubkey as string)
}

/**
 * Validate an untrusted rumor and return it in canonical form.
 *
 * Shared by both transports: a rumor that arrived inside a gift wrap and one
 * that arrived over a direct data channel get exactly the same scrutiny, so
 * there is no weaker path an attacker could steer us onto.
 *
 * Each check earns its place:
 *  - author match      -> stops A from handing us a rumor attributed to B
 *  - unsigned          -> preserves deniability; a signed rumor is a red flag
 *  - id is a real hash -> dedup, receipts, and reply threading all key off it,
 *                         so a forged id would let a peer overwrite or
 *                         suppress a different message
 *  - timestamp sanity  -> keeps a peer from parking a message far in the future
 *                         and pinning it to the top of the conversation
 */
export function validateRumor(value: unknown, expectedAuthor: string): Rumor {
  assertPlainEvent(value, 'rumor')
  const rumor = value

  if (rumor.pubkey !== expectedAuthor) {
    throw new GiftWrapError('rumor author does not match the authenticated sender')
  }
  if ('sig' in rumor) {
    throw new GiftWrapError('rumor must be unsigned')
  }
  if (typeof rumor.kind !== 'number' || typeof rumor.content !== 'string' || !Array.isArray(rumor.tags)) {
    throw new GiftWrapError('rumor is malformed')
  }
  for (const tag of rumor.tags) {
    if (!Array.isArray(tag) || tag.some((entry) => typeof entry !== 'string')) {
      throw new GiftWrapError('rumor tags are malformed')
    }
  }
  if (typeof rumor.created_at !== 'number' || !Number.isFinite(rumor.created_at)) {
    throw new GiftWrapError('rumor timestamp is malformed')
  }
  if (rumor.created_at > nowSec() + MAX_CLOCK_SKEW_SEC) {
    throw new GiftWrapError('rumor timestamp is implausibly far in the future')
  }

  const { id, ...unsigned } = rumor as { id?: unknown } & UnsignedEvent
  const computed = getEventHash(unsigned)
  if (typeof id !== 'string' || id !== computed) {
    throw new GiftWrapError('rumor id does not match its contents')
  }

  return { ...unsigned, id: computed } as Rumor
}
