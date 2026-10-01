import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Check whether a string looks like a valid WebSocket relay URL. */
export function isValidRelayUrl(url: string): boolean {
  return /^wss?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/.*)?$/.test(url)
}

/** Check whether a string is a valid npub (bech32, 63 chars, starts with npub1). */
export function isValidNpub(npub: string): boolean {
  return npub.startsWith('npub1') && npub.length === 63
}

/** Check whether a string is a valid NIP-05 nostr address (name@domain). */
export function isValidNostrAddress(addr: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(addr)
}

/** Trim whitespace and auto-prepend wss:// if the input lacks a scheme. */
export function sanitizeRelayUrl(url: string): string {
  let trimmed = url.trim()
  if (!trimmed) return trimmed
  if (!/^wss?:\/\//i.test(trimmed)) {
    trimmed = `wss://${trimmed}`
  }
  return trimmed
}
