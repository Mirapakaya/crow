import { describe, expect, it } from 'vitest'
import {
  LEGACY_ATTACHMENT_TAG,
  LEGACY_BLOB_AAD,
  LEGACY_BLOB_COPY_LABEL,
  LEGACY_DB_NAME,
  LEGACY_DISPLAY_PREFS_KEY,
  LEGACY_EXPORT_AAD_V1,
  LEGACY_EXPORT_AAD_V2,
  LEGACY_EXPORT_FORMAT,
  LEGACY_KEY_SLOT_AAD,
  LEGACY_REPO_AAD,
  LEGACY_SAFETY_NUMBER_INFO,
  LEGACY_VAULT_INFO,
  legacyKeySlotAad,
} from '../src/core/legacy'

describe('legacy Textor constants', () => {
  it('keeps legacy identifiers stable so old data remains readable', () => {
    expect(LEGACY_DB_NAME).toBe('textor')
    expect(LEGACY_DISPLAY_PREFS_KEY).toBe('textor:display')
    expect(LEGACY_ATTACHMENT_TAG).toBe('textor-attachment')
    expect(LEGACY_BLOB_AAD(1, 'abc', 0, 4)).toBe('textor/blob/v1|abc|0|4')
    expect(LEGACY_BLOB_COPY_LABEL).toBe('textor/blob/copy|')
    expect(LEGACY_VAULT_INFO.record).toBe('textor/vault/record/v1')
    expect(LEGACY_VAULT_INFO.index).toBe('textor/vault/index/v1')
    expect(LEGACY_VAULT_INFO.identity).toBe('textor/vault/identity/v1')
    expect(LEGACY_SAFETY_NUMBER_INFO).toBe('textor/safety-number/v1')
    expect(LEGACY_EXPORT_FORMAT).toBe('textor-vault-export')
    expect(LEGACY_EXPORT_AAD_V1).toBe('textor/export/v1')
    expect(LEGACY_EXPORT_AAD_V2).toBe('textor/export/v2')
    expect(LEGACY_KEY_SLOT_AAD).toBe('textor/meta/dataKey')
    expect(legacyKeySlotAad('passphrase', 'slot-1')).toBe('textor/keyslot/v1|passphrase|slot-1')
    expect(LEGACY_REPO_AAD('contacts', 'id1')).toBe('textor/contacts/id1')
  })
})
