import 'fake-indexeddb/auto'
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'
import * as nip44 from 'nostr-tools/nip44'

class MockWorker {
  private secretKey: Uint8Array | null = null
  private listeners = new Set<(event: { data: unknown }) => void>()
  private readonly url: string

  constructor(url: string | URL) {
    this.url = typeof url === 'string' ? url : url.toString()
  }

  postMessage(data: unknown): void {
    if (data && typeof data === 'object' && 'secretKeyHex' in data) {
      const hex = (data as { secretKeyHex: string }).secretKeyHex
      this.secretKey = hexToBytes(hex)
      this.dispatch({ type: 'ready' })
      return
    }
    // Dispatch synchronously for identity requests; KDF dispatches later.
    const response = this.handleRequest(data as Record<string, unknown>)
    if (response) this.dispatch(response)
  }

  addEventListener(_type: string, listener: (event: { data: unknown }) => void): void {
    this.listeners.add(listener)
  }
  removeEventListener(_type: string, listener: (event: { data: unknown }) => void): void {
    this.listeners.delete(listener)
  }
  terminate(): void {
    this.listeners.clear()
    if (this.secretKey) {
      this.secretKey.fill(0)
      this.secretKey = null
    }
  }

  private dispatch(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data } as { data: unknown })
    }
  }

  private handleRequest(req: Record<string, unknown>): Record<string, unknown> | undefined {
    if (req.type === 'lock') {
      this.terminate()
      return { type: 'lock' }
    }
    // KDF worker request: derive off-thread in tests.
    if ('passphrase' in req && 'salt' in req && 'params' in req && 'id' in req) {
      const { id, passphrase, salt, params } = req as { id: number; passphrase: string; salt: Uint8Array; params: unknown }
      import('../src/core/crypto/kdf').then(({ deriveKek }) =>
        deriveKek(passphrase, salt, params as import('../src/core/crypto/kdf').KdfParams).then(
          (key) => this.dispatch({ id, type: 'done', key }),
          (err: Error) => this.dispatch({ id, type: 'error', message: err.message }),
        ),
      )
      return undefined
    }
    if (!this.secretKey) throw new Error('identity worker is locked')
    switch (req.type) {
      case 'sign':
        return { type: 'sign', event: finalizeEvent(req.event as Parameters<typeof finalizeEvent>[0], this.secretKey) } as { type: string }
      case 'nip44Encrypt': {
        const key = nip44.getConversationKey(this.secretKey, req.recipientPubkeyHex as string)
        try {
          return { type: 'nip44Encrypt', ciphertext: nip44.encrypt(req.plaintext as string, key) }
        } finally {
          key.fill(0)
        }
      }
      case 'nip44Decrypt': {
        const key = nip44.getConversationKey(this.secretKey, req.senderPubkeyHex as string)
        try {
          return { type: 'nip44Decrypt', plaintext: nip44.decrypt(req.ciphertext as string, key) }
        } finally {
          key.fill(0)
        }
      }
      case 'getPubkey':
        return { type: 'getPubkey', pubkey: getPublicKey(this.secretKey) }
      case 'getConversationKey': {
        const key = nip44.getConversationKey(this.secretKey, req.pubkeyHex as string)
        try {
          return { type: 'getConversationKey', keyHex: bytesToHex(key) }
        } finally {
          key.fill(0)
        }
      }
      case 'lock':
        this.terminate()
        return { type: 'lock' }
      default:
        return { type: 'error', message: 'unknown request type' }
    }
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

if (typeof globalThis.Worker === 'undefined') {
  globalThis.Worker = MockWorker as unknown as typeof Worker
}
