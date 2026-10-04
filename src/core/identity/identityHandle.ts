import type { Event as NostrEvent, UnsignedEvent } from 'nostr-tools/core'
import type { IdentityRequest, IdentityResponse } from './identity.worker'

export interface IdentityHandle {
  sign(event: UnsignedEvent): Promise<NostrEvent>
  nip44Encrypt(plaintext: string, recipientPubkeyHex: string): Promise<string>
  nip44Decrypt(ciphertext: string, senderPubkeyHex: string): Promise<string>
  getPubkey(): Promise<string>
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
      const res = (await postMessage(worker, { type: 'nip44Encrypt', plaintext, recipientPubkeyHex } as IdentityRequest)) as {
        type: 'nip44Encrypt'
        ciphertext: string
      }
      return res.ciphertext
    },
    async nip44Decrypt(ciphertext: string, senderPubkeyHex: string) {
      const res = (await postMessage(worker, { type: 'nip44Decrypt', ciphertext, senderPubkeyHex } as IdentityRequest)) as {
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
    lock() {
      worker.postMessage({ type: 'lock' } as IdentityRequest)
      worker.terminate()
    },
  }
}
