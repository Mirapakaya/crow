import { useMemo, useState } from 'react'
import { getRepo, useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { SettingsPage } from './SettingsPage'
import { normalizeRelayUrl, relayLabel } from '../../core/transport/relayUrl'
import { DEFAULT_DM_RELAYS, SUGGESTED_RELAYS } from '../../core/transport/defaultRelays'
import type { RelayEntry } from '../../core/models/types'
import { verdictFor } from '../../core/transport/relayHealth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'

export function RelaySettings() {
  const { t, locale } = useI18n()
  const entries = useApp((s) => s.relayEntries)
  const statuses = useApp((s) => s.relayStatuses)
  const refreshRelays = useApp((s) => s.refreshRelays)
  const toast = useApp((s) => s.toast)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const statusByUrl = useMemo(() => new Map(statuses.map((status) => [status.url, status])), [statuses])
  const activeCount = entries.filter((entry) => entry.enabled && entry.write).length

  const addRelay = async (raw: string) => {
    const url = normalizeRelayUrl(raw)
    if (!url) {
      setError(t('settings.relayInvalid'))
      return
    }
    if (entries.some((entry) => entry.url === url)) {
      setError(t('settings.relayExists'))
      return
    }
    await getRepo().upsertRelay(url, { read: true, write: true, enabled: true })
    await refreshRelays()
    setInput('')
    setError(null)
  }

  const update = async (entry: RelayEntry, patch: Partial<RelayEntry>) => {
    await getRepo().upsertRelay(entry.url, patch)
    await refreshRelays()
  }

  const remove = async (entry: RelayEntry) => {
    await getRepo().removeRelay(entry.url)
    await refreshRelays()
  }

  const restoreDefaults = async () => {
    for (const url of DEFAULT_DM_RELAYS) {
      await getRepo().upsertRelay(url, { read: true, write: true, enabled: true })
    }
    await refreshRelays()
    toast(t('common.done'))
  }

  const unusedSuggestions = SUGGESTED_RELAYS.filter((url) => !entries.some((entry) => entry.url === url))

  return (
    <SettingsPage title={t('settings.relays')}>
      <p className="text-sm text-[var(--text-muted)]">{t('settings.relaysBody')}</p>

      {activeCount === 0 ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--danger)]">
          <AlertTriangle size={16} />
          {t('settings.noRelaysWarning')}
        </div>
      ) : null}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {entries.map((entry) => {
          const status = statusByUrl.get(entry.url)
          const verdict = verdictFor(status)
          const badgeVariant =
            verdict === 'healthy' ? 'success' as const
              : verdict === 'degraded' ? 'warning' as const
                : verdict === 'offline' ? 'destructive' as const
                  : 'secondary' as const
          const badgeLabel =
            verdict === 'healthy'
              ? t('settings.relayHealthy')
              : verdict === 'degraded'
                ? t('settings.relayDegraded')
                : verdict === 'offline'
                  ? t('settings.relayOffline')
                  : t('settings.relayNever')

          return (
            <div key={entry.id} className="flex flex-col gap-2 p-3 px-4 border-t border-[var(--border-subtle)] first:border-t-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 truncate font-medium text-sm text-[var(--text)]">
                  {relayLabel(entry.url)}
                </span>
                <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('settings.relayRemove')}
                  onClick={() => void remove(entry)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-[0.75rem] text-[var(--text-faint)]">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    className="h-[0.9375rem] w-[0.9375rem] appearance-none shrink-0 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer transition-colors checked:bg-[var(--accent)] checked:border-[var(--accent)] grid place-items-center after:content-[''] after:w-[0.25rem] after:h-[0.5rem] after:border-t-0 after:border-r-[1.5px] after:border-b-[1.5px] after:border-l-0 after:border-solid after:border-[var(--accent-fg)] after:rotate-45 after:translate-[-1px,1px] after:opacity-0 checked:after:opacity-100"
                    type="checkbox"
                    checked={entry.read}
                    onChange={(event) => void update(entry, { read: event.target.checked })}
                  />
                  {t('settings.relayRead')}
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    className="h-[0.9375rem] w-[0.9375rem] appearance-none shrink-0 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer transition-colors checked:bg-[var(--accent)] checked:border-[var(--accent)] grid place-items-center after:content-[''] after:w-[0.25rem] after:h-[0.5rem] after:border-t-0 after:border-r-[1.5px] after:border-b-[1.5px] after:border-l-0 after:border-solid after:border-[var(--accent-fg)] after:rotate-45 after:translate-[-1px,1px] after:opacity-0 checked:after:opacity-100"
                    type="checkbox"
                    checked={entry.write}
                    onChange={(event) => void update(entry, { write: event.target.checked })}
                  />
                  {t('settings.relayWrite')}
                </label>
                {status && status.health.latencyMs > 0 ? (
                  <span>{t('settings.relayLatency', { n: status.health.latencyMs })}</span>
                ) : null}
                {status && status.health.publishOk + status.health.publishFail > 0 ? (
                  <span>
                    {t('settings.relayStats', {
                      ok: status.health.publishOk,
                      fail: status.health.publishFail,
                    })}
                  </span>
                ) : null}
              </div>

              {status && status.health.readFail > 0 ? (
                <span className="text-xs text-[var(--warning)]">
                  {t('settings.relayCannotRead')}
                </span>
              ) : null}

              {status?.health.lastError ? (
                <span className="truncate text-[0.75rem] text-[var(--text-faint)]" title={status.health.lastError}>
                  {status.health.lastError}
                </span>
              ) : null}

              <code className="font-mono text-[0.75rem] text-[var(--text-faint)] break-all" lang="en" dir="ltr">
                {entry.url}
              </code>
            </div>
          )
        })}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.relayAdd')}</Label>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              lang="en"
              placeholder={t('settings.relayPlaceholder')}
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addRelay(input)
              }}
              className="flex-1"
            />
            <Button disabled={!input.trim()} onClick={() => void addRelay(input)}>
              <Plus size={16} />
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
          ) : null}
        </div>
      </div>

      {unusedSuggestions.length > 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
            {t('settings.relaySuggested')}
          </span>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((url) => (
              <Button key={url} variant="outline" size="sm" onClick={() => void addRelay(url)}>
                <Plus size={13} />
                {relayLabel(url)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <Button variant="outline" className="w-full gap-2" onClick={() => void restoreDefaults()}>
        <RefreshCw size={16} />
        {t('settings.relayResetDefaults')}
      </Button>

      <p className="text-xs text-[var(--text-muted)]" lang={locale}>
        {t('privacy.relaysSee')}
      </p>
    </SettingsPage>
  )
}
