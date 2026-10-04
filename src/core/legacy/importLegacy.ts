/**
 * Legacy Textor/old-vault import.
 *
 * Existing users who created data with the previous Textor-branded build need
 * a migration path. This module detects the old localStorage keys and vault
 * format and converts the recoverable identity/contacts into Crow's current
 * schema.
 *
 * If no legacy data is found, it resolves to null.
 */

export interface LegacyData {
  identity?: { secretKeyHex: string; pubkey: string; npub: string }
  contacts?: Array<{ pubkey: string; name?: string; relays?: string[] }>
}

const LEGACY_LOCALSTORAGE_KEYS = ['textor:identity', 'textor:vault', 'crow:legacy:identity']

export function hasLegacyData(): boolean {
  if (typeof localStorage === 'undefined') return false
  return LEGACY_LOCALSTORAGE_KEYS.some((key) => localStorage.getItem(key) !== null)
}

export function readLegacyLocalStorage(): LegacyData | null {
  const identityItem = localStorage.getItem('textor:identity') ?? localStorage.getItem('crow:legacy:identity')
  if (!identityItem) return null
  try {
    const identity = JSON.parse(identityItem) as LegacyData['identity']
    const contacts: LegacyData['contacts'] = []
    const contactsItem = localStorage.getItem('textor:contacts')
    if (contactsItem) {
      const parsed = JSON.parse(contactsItem)
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          if (c && typeof c.pubkey === 'string') {
            contacts.push({ pubkey: c.pubkey, name: c.name, relays: c.relays })
          }
        }
      }
    }
    return { identity, contacts }
  } catch {
    return null
  }
}
