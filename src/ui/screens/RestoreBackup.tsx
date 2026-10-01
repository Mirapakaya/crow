import { useState } from 'react'
import { useT } from '../../i18n'
import { Field, Spinner } from '../components/primitives'
import { EntryLayout } from '../components/EntryLayout'
import { LAZY_CHUNKS } from '../lazyViews'
import { getRepo, getVault, useApp } from '../../crow/store'
import type { SlotEnrolment } from '../../core/vault/vault'
import type { ExportPayload } from '../../core/vault/exportImport'
import { useAccessText } from '../access/accessText'
import { ProtectionChooser } from '../access/protection'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

/**
 * Restore a vault from an encrypted backup file, before any identity exists.
 *
 * Two steps. First the file is opened, with the passphrase it was made with or
 * — for a file from a build with keyslots — the recovery phrase of the
 * identity inside it, so a new device needs nothing but the file and the
 * twelve words (ADR-054). Then this device is set up to open the way the
 * person chooses, exactly as a new identity would be, and the backup is merged
 * into the new vault.
 */
export function RestoreBackup({ onCancel }: { onCancel: () => void }) {
  const t = useT()
  const text = useAccessText()
  const toast = useApp((s) => s.toast)

  const [file, setFile] = useState<File | null>(null)
  const [withRecovery, setWithRecovery] = useState(false)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ExportPayload | null>(null)

  const open = async () => {
    if (!file || !secret.trim() || busy) return
    setError(null)
    setBusy(true)
    try {
      const { decryptExport, parseEnvelope } = await LAZY_CHUNKS.vaultTransfer()
      const envelope = parseEnvelope(await file.text())
      setPayload(await decryptExport(envelope, withRecovery ? { mnemonic: secret } : secret))
      setSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const restore = async (protection: SlotEnrolment) => {
    if (!payload) return
    const { importVault } = await LAZY_CHUNKS.vaultTransfer()
    const vault = getVault()
    // A vault left open without an identity — an earlier attempt that stopped
    // part-way — gains the new way in rather than being made twice.
    if (vault.isUnlocked) await vault.addSlot(protection)
    else await vault.create(protection)
    const summary = await importVault(getRepo(), payload, { adoptIdentity: true })
    toast(t('settings.importDone', { messages: summary.messages, contacts: summary.contacts }))
    // A reload is the simplest way to get the store to re-run its boot path
    // against the vault that now has an identity.
    location.reload()
  }

  if (payload) {
    return (
      <EntryLayout>
        <ProtectionChooser recoveryNote={Boolean(payload.identity?.mnemonic)} onChoose={restore} />
        <Button variant="ghost" block onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </EntryLayout>
    )
  }

  return (
    <EntryLayout>
      <div className="stack-sm">
        <h1>{t('settings.importBackup')}</h1>
        <p className="muted">{t('settings.exportBackupBody')}</p>
      </div>

      <Field label={t('settings.importChoose')}>
        <input
          
          type="file"
          accept=".json,application/json"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </Field>

      <Field
        label={withRecovery ? text('restorePhrase') : text('restoreFilePassphrase')}
        error={error ?? undefined}
      >
        {withRecovery ? (
          <textarea
            className="textarea mono"
            dir="ltr"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={text('restorePhrasePlaceholder')}
            value={secret}
            onChange={(event) => {
              setSecret(event.target.value)
              setError(null)
            }}
          />
        ) : (
          <Input
            
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => {
              setSecret(event.target.value)
              setError(null)
            }}
          />
        )}
      </Field>
      <Button
        variant="ghost" size="sm"
        onClick={() => {
          setWithRecovery((value) => !value)
          setSecret('')
          setError(null)
        }}
      >
        {withRecovery ? text('fileWithPassphrase') : text('fileWithRecovery')}
      </Button>

      <Button
        
        disabled={!file || !secret.trim() || busy}
        onClick={() => void open()}
      >
        {busy ? <Spinner label={t('common.working')} /> : t('common.next')}
      </Button>
      <Button variant="ghost" block onClick={onCancel} disabled={busy}>
        {t('common.cancel')}
      </Button>
    </EntryLayout>
  )
}
