import { useState } from 'react'
import { useT } from '../../i18n'
import { Spinner } from '../components/primitives'
import { EntryLayout } from '../components/EntryLayout'
import { LAZY_CHUNKS } from '../lazyViews'
import { getRepo, getVault, useApp } from '../../app/store'
import type { SlotEnrolment } from '../../core/vault/vault'
import type { ExportPayload } from '../../core/vault/exportImport'
import { useAccessText } from '../access/accessText'
import { ProtectionChooser } from '../access/protection'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'

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
    if (vault.isUnlocked) await vault.addSlot(protection)
    else await vault.create(protection)
    const summary = await importVault(getRepo(), payload, { adoptIdentity: true })
    toast(t('settings.importDone', { messages: summary.messages, contacts: summary.contacts }))
    location.reload()
  }

  if (payload) {
    return (
      <EntryLayout>
        <ProtectionChooser recoveryNote={Boolean(payload.identity?.mnemonic)} onChoose={restore} />
        <Button variant="ghost" className="w-full" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </EntryLayout>
    )
  }

  return (
    <EntryLayout>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{t('settings.importBackup')}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t('settings.exportBackupBody')}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t('settings.importChoose')}</Label>
        <Input
          type="file"
          accept=".json,application/json"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{withRecovery ? text('restorePhrase') : text('restoreFilePassphrase')}</Label>
        {withRecovery ? (
          <Textarea
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
            className="font-mono"
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
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setWithRecovery((value) => !value)
          setSecret('')
          setError(null)
        }}
      >
        {withRecovery ? text('fileWithPassphrase') : text('fileWithRecovery')}
      </Button>

      <Button
        className="w-full"
        disabled={!file || !secret.trim() || busy}
        onClick={() => void open()}
      >
        {busy ? <Spinner label={t('common.working')} /> : t('common.next')}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onCancel} disabled={busy}>
        {t('common.cancel')}
      </Button>
    </EntryLayout>
  )
}
