/**
 * Identity worker — holds the Nostr secret key in a dedicated Worker so the
 * main-thread Zustand store never stores it.
 *
 * Exposed operations:
 *  - sign(eventTemplate) -> signed Nostr event
 *  - nip44Encrypt(plaintext, recipientPubkeyHex) -> ciphertext
 *  - nip44Decrypt(ciphertext, senderPubkeyHex) -> plaintext
 *  - getPubkey() -> hex pubkey
 *  - getConversationKey(pubkeyHex) -> NIP-44 conversation key bytes
 *  - lock() -> zeroize and terminate the worker
 *
 * The worker is created with the secret key once, after the vault is unlocked.
 * The main thread keeps only a handle (worker + a counter), so no same-page
 * script can read the 32-byte secret from the store.
 */

import { getPublicKey, type UnsignedEvent } from 'nostr-tools/pure'
import * as nip44 from 'nostr-tools/nip44'
import { finalizeEvent } from 'nostr-tools/pure'
import { schnorr } from '@noble/curves/secp256k1.js'

export interface IdentityWorkerInit {
  secretKeyHex: string
}

export type IdentityRequest =
  | { type: 'sign'; event: UnsignedEvent }
  | { type: 'nip44Encrypt'; plaintext: string; recipientPubkeyHex: string }
  | { type: 'nip44Decrypt'; ciphertext: string; senderPubkeyHex: string }
  | { type: 'getPubkey' }
  | { type: 'getConversationKey'; pubkeyHex: string }
  | { type: 'schnorrSign'; hashHex: string }
  | { type: 'lock' }

export type IdentityResponse =
  | { type: 'sign'; event: ReturnType<typeof finalizeEvent> }
  | { type: 'nip44Encrypt'; ciphertext: string }
  | { type: 'nip44Decrypt'; plaintext: string }
  | { type: 'getPubkey'; pubkey: string }
  | { type: 'getConversationKey'; keyHex: string }
  | { type: 'schnorrSign'; signatureHex: string }
  | { type: 'lock' }
  | { type: 'error'; message: string }

let secretKey: Uint8Array | null = null

function ensureKey(): Uint8Array {
  if (!secretKey) throw new Error('identity worker is locked')
  return secretKey
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('invalid hex')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function wipeKey(): void {
  if (secretKey) {
    secretKey.fill(0)
    secretKey = null
  }
}

function handle(req: IdentityRequest): IdentityResponse {
  switch (req.type) {
    case 'sign': {
      const event = finalizeEvent(req.event, ensureKey())
      return { type: 'sign', event }
    }
    case 'nip44Encrypt': {
      const key = nip44.getConversationKey(ensureKey(), req.recipientPubkeyHex)
      try {
        const ciphertext = nip44.encrypt(req.plaintext, key)
        return { type: 'nip44Encrypt', ciphertext }
      } finally {
        key.fill(0)
      }
    }
    case 'nip44Decrypt': {
      const key = nip44.getConversationKey(ensureKey(), req.senderPubkeyHex)
      try {
        const plaintext = nip44.decrypt(req.ciphertext, key)
        return { type: 'nip44Decrypt', plaintext }
      } finally {
        key.fill(0)
      }
    }
    case 'getPubkey':
      return { type: 'getPubkey', pubkey: getPublicKey(ensureKey()) }
    case 'getConversationKey': {
      const key = nip44.getConversationKey(ensureKey(), req.pubkeyHex)
      try {
        return { type: 'getConversationKey', keyHex: bytesToHex(key) }
      } finally {
        key.fill(0)
      }
    }
    case 'schnorrSign': {
      const hash = hexToBytes(req.hashHex)
      const signature = schnorr.sign(hash, ensureKey())
      return { type: 'schnorrSign', signatureHex: bytesToHex(signature) }
    }
    case 'lock':
      wipeKey()
      return { type: 'lock' }
    default:
      return { type: 'error', message: 'unknown request type' }
  }
}

function init(init: IdentityWorkerInit): void {
  secretKey = hexToBytes(init.secretKeyHex)
}

// Worker entry point
if (typeof self !== 'undefined') {
  self.onmessage = (event: MessageEvent<IdentityWorkerInit | IdentityRequest>) => {
    if ('secretKeyHex' in event.data) {
      init(event.data)
      self.postMessage({ type: 'ready' })
      return
    }
    try {
      self.postMessage(handle(event.data as IdentityRequest))
    } catch (err) {
      self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }
}
