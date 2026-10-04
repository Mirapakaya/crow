/**
 * Main-thread handle to the identity worker.
 *
 * This object is the only thing the main thread stores. It does not contain
 * the secret key, only a reference to the worker. The worker itself is
 * terminated on lock.
 */

import type { Event as NostrEvent, UnsignedEvent } from 'nostr-tools/core'
import type { IdentityRequest, IdentityResponse } from './identity.worker'

export interface IdentityHandle {
  sign(event: UnsignedEvent): Promise<NostrEvent>
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
