import { useEffect, useState } from 'react'
import { getRepo, useApp } from '../../app/store'
import { estimateStorage, type StorageEstimate } from '../../app/storagePersistence'
import { useT } from '../../i18n'
import { Spinner } from '../components/primitives'
import { SettingsPage } from './SettingsPage'
import { LAZY_CHUNKS } from '../lazyViews'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Download, Upload, Trash2, AlertTriangle, Shield } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return '<1 MB'
  if (mb < 1024) return `${Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

export function DataSettings() {
  const t = useT()
  const toast = useApp((s) => s.toast)
  const wipeDevice = useApp((s) => s.wipeDevice)
  const refreshContacts = useApp((s) => s.refreshContacts)
  const refreshConversations = useApp((s) => s.refreshConversations)

  const [stats, setStats] = useState<{ messages: number; contacts: number } | null>(null)
  const [storage, setStorage] = useState<StorageEstimate | null>(null)
  const persisted = useApp((s) => s.storagePersisted)
  const hasRecovery = useApp((s) => Boolean(s.identity?.mnemonic))
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [includeMessages, setIncludeMessages] = useState(true)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPassphrase, setImportPassphrase] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    void getRepo().stats().then(setStats)
    void estimateStorage().then(setStorage)
  }, [])

  const runExport = async () => {
    setError(null)
    setBusy('export')
    try {
      const { exportFilename, exportVault } = await LAZY_CHUNKS.vaultTransfer()
      const envelope = await exportVault(getRepo(), exportPassphrase, { includeMessages })
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exportFilename()
      anchor.click()
      URL.revokeObjectURL(url)
      setExportPassphrase('')
      toast(t('settings.exportReady'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const runImport = async () => {
    if (!importFile) return
    setError(null)
    setBusy('import')
    try {
      const { decryptExport, importVault, parseEnvelope } = await LAZY_CHUNKS.vaultTransfer()
      const envelope = parseEnvelope(await importFile.text())
      const payload = await decryptExport(envelope, importPassphrase)
      const summary = await importVault(getRepo(), payload)
      await Promise.all([refreshContacts(), refreshConversations()])
      setStats(await getRepo().stats())
      setImportFile(null)
      setImportPassphrase('')
      toast(t('settings.importDone', { messages: summary.messages, contacts: summary.contacts }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <SettingsPage title={t('settings.data')}>
      {stats ? (
        <p className="text-sm text-[var(--text-muted)]">
          {t('settings.storageUsed', { messages: stats.messages, contacts: stats.contacts })}
          {storage ? (
            <>
              {' · '}
              {t('settings.storageUsage', {
                used: formatBytes(storage.usageBytes),
                quota: formatBytes(storage.quotaBytes),
              })}
            </>
          ) : null}
        </p>
      ) : null}

      {persisted === 'persisted' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
          <Shield size={16} />
          {t('settings.storagePersisted')}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <strong>{t('settings.storageNotPersisted')}</strong>
            <span>{t('settings.storageNotPersistedBody')}</span>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">{t('settings.exportBackup')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t('settings.exportBackupBody')}</p>
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.exportPassphrase')}</Label>
          <span className="text-xs text-[var(--text-muted)]">{t('settings.exportPassphraseHint')}</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={exportPassphrase}
            onChange={(event) => setExportPassphrase(event.target.value)}
          />
        </div>
        {hasRecovery ? <p className="text-xs text-[var(--text-muted)]">{t('settings.exportRecoveryNote')}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--text)]">{t('settings.exportIncludeMessages')}</span>
          <Switch checked={includeMessages} onCheckedChange={setIncludeMessages} />
        </div>
        <Button
          className="w-full gap-2"
          disabled={exportPassphrase.length < 10 || busy !== null}
          onClick={() => void runExport()}
        >
          {busy === 'export' ? <Spinner label={t('common.working')} /> : <><Download size={16} />{t('settings.exportCreate')}</>}
        </Button>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">{t('settings.importBackup')}</h3>
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.importChoose')}</Label>
          <Input
            type="file"
            accept=".json,application/json"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.exportPassphrase')}</Label>
          <Input
            type="password"
            autoComplete="off"
            value={importPassphrase}
            onChange={(event) => setImportPassphrase(event.target.value)}
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={!importFile || !importPassphrase || busy !== null}
          onClick={() => void runImport()}
        >
          {busy === 'import' ? <Spinner label={t('common.working')} /> : <><Upload size={16} />{t('settings.importBackup')}</>}
        </Button>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--danger)]">{t('settings.deleteEverything')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t('settings.deleteEverythingBody')}</p>
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-xs text-[var(--danger)]">
          {t('lock.startOverConfirm')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.deleteEverythingConfirm')}</Label>
          <Input
            dir="ltr"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
          />
        </div>
        <Button
          variant="destructive"
          className="w-full gap-2"
          disabled={deleteConfirm !== 'DELETE'}
          onClick={() => void wipeDevice()}
        >
          <Trash2 size={16} />
          {t('settings.deleteEverything')}
        </Button>
      </div>
    </SettingsPage>
  )
}
