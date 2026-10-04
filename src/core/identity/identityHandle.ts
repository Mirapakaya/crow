import type { Event as NostrEvent, UnsignedEvent } from 'nostr-tools/core'
import type { IdentityRequest, IdentityResponse } from './identity.worker'

export interface IdentityHandle {
  sign(event: UnsignedEvent): Promise<NostrEvent>
  nip44Encrypt(plaintext: string, recipientPubkeyHex: string): Promise<string>
  nip44Decrypt(ciphertext: string, senderPubkeyHex: string): Promise<string>
  getPubkey(): Promise<string>
  /** Derive a NIP-44 conversation key for a peer. The key leaves the worker, but it is not the master secret. */
  getConversationKey(pubkeyHex: string): Promise<Uint8Array>
  lock(): void
}

function postMessage(worker: Worker, req: IdentityRequest): Promise<IdentityResponse> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<IdentityResponse>) => {
      worker.removeEventListener('message', onMessage)
      const data = event.data
      if (data.type === 'error') reject(new Error(data.message))
      else resolve(data)
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage(req)
  })
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('invalid hex')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function createIdentityHandle(init: { secretKeyHex: string }): IdentityHandle {
  const worker = new Worker(new URL('./identity.worker.ts', import.meta.url))
  worker.postMessage(init)
  return {
    async sign(event: UnsignedEvent) {
      const res = (await postMessage(worker, { type: 'sign', event } as IdentityRequest)) as {
        type: 'sign'
        event: NostrEvent
      }
      return res.event
    },
    async nip44Encrypt(plaintext: string, recipientPubkeyHex: string) {
      const res = (await postMessage(worker, {
        type: 'nip44Encrypt',
        plaintext,
        recipientPubkeyHex,
      } as IdentityRequest)) as {
        type: 'nip44Encrypt'
        ciphertext: string
      }
      return res.ciphertext
    },
    async nip44Decrypt(ciphertext: string, senderPubkeyHex: string) {
      const res = (await postMessage(worker, {
        type: 'nip44Decrypt',
        ciphertext,
        senderPubkeyHex,
      } as IdentityRequest)) as {
        type: 'nip44Decrypt'
        plaintext: string
      }
      return res.plaintext
    },
    async getPubkey() {
      const res = (await postMessage(worker, { type: 'getPubkey' } as IdentityRequest)) as {
        type: 'getPubkey'
        pubkey: string
      }
      return res.pubkey
    },
    async getConversationKey(pubkeyHex: string) {
      const res = (await postMessage(worker, {
        type: 'getConversationKey',
        pubkeyHex,
      } as IdentityRequest)) as {
        type: 'getConversationKey'
        keyHex: string
      }
      return hexToBytes(res.keyHex)
    },
    lock() {
      worker.postMessage({ type: 'lock' } as IdentityRequest)
      worker.terminate()
    },
  }
}
