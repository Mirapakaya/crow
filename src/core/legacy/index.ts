/**
 * Legacy Textor constants kept only for one-time migration.
 *
 * These identifiers are deliberately frozen: changing them would orphan data
 * created by earlier releases. New data uses the `crow:*` analogues defined in
 * each module. Once the user has migrated (or declined), this file is only
 * referenced by the migration path and can be removed in a future major version.
 */

export const LEGACY_DB_NAME = 'textor'
export const LEGACY_DISPLAY_PREFS_KEY = 'textor:display'

export const LEGACY_ATTACHMENT_TAG = 'textor-attachment'

export const LEGACY_BLOB_AAD = (version: number, id: string, index: number, total: number): string =>
  `textor/blob/v${version}|${id}|${index}|${total}`

export const LEGACY_BLOB_COPY_LABEL = 'textor/blob/copy|'

export const LEGACY_VAULT_INFO = {
  record: 'textor/vault/record/v1',
  index: 'textor/vault/index/v1',
  identity: 'textor/vault/identity/v1',
} as const

export const LEGACY_SAFETY_NUMBER_INFO = 'textor/safety-number/v1'

export const LEGACY_EXPORT_FORMAT = 'textor-vault-export'
export const LEGACY_EXPORT_AAD_V1 = 'textor/export/v1'
export const LEGACY_EXPORT_AAD_V2 = 'textor/export/v2'

export const LEGACY_KEY_SLOT_AAD = 'textor/meta/dataKey'
export const LEGACY_KEY_SLOT_RECOVERY_INFO = {
  vault: new TextEncoder().encode('textor/keyslot/recovery/v1'),
  backup: new TextEncoder().encode('textor/backup/recovery/v1'),
}
export const legacyKeySlotAad = (type: string, id: string): string =>
  `textor/keyslot/v1|${type}|${id}`

export const LEGACY_REPO_AAD = (table: string, id: string): string => `textor/${table}/${id}`

/** True if the browser has a legacy Textor IndexedDB. */
export async function hasLegacyTextorDB(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(false)
    const req = indexedDB.open(LEGACY_DB_NAME)
    req.onsuccess = () => {
      const db = req.result
      db.close()
      resolve(true)
    }
    req.onerror = () => resolve(false)
    req.onupgradeneeded = () => {
      // A fresh DB would be created; that means it did not exist.
      const db = req.result
      db.close()
      resolve(false)
    }
  })
}

/** Delete the legacy Textor IndexedDB after migration. */
export async function deleteLegacyTextorDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(LEGACY_DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(new Error('Failed to delete legacy Textor database'))
  })
}
