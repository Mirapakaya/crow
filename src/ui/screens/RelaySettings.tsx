import { useMemo, useState } from 'react'
import { getRepo, useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { Banner, Field } from '../components/primitives'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { PlusIcon, RefreshIcon, TrashIcon } from '../components/Icons'
import { SettingsPage } from './SettingsPage'
import { normalizeRelayUrl, relayLabel } from '../../core/transport/relayUrl'
import { isValidRelayUrl, sanitizeRelayUrl } from '../../lib/utils'
import { DEFAULT_DM_RELAYS, SUGGESTED_RELAYS } from '../../core/transport/defaultRelays'
import type { RelayEntry } from '../../core/models/types'
import { verdictFor } from '../../core/transport/relayHealth'
import { useAboutText } from './aboutText'
import { Checkbox } from '../../components/ui/checkbox'

export function RelaySettings() {
  const { t, locale } = useI18n()
  const about = useAboutText()
  const entries = useApp((s) => s.relayEntries)
  const statuses = useApp((s) => s.relayStatuses)
  const refreshRelays = useApp((s) => s.refreshRelays)
  const toast = useApp((s) => s.toast)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const statusByUrl = useMemo(() => new Map(statuses.map((status) => [status.url, status])), [statuses])

  const activeCount = entries.filter((entry) => entry.enabled && entry.write).length

  const addRelay = async (raw: string) => {
    const sanitized = sanitizeRelayUrl(raw)
    if (!isValidRelayUrl(sanitized)) {
      setError(t('settings.relayInvalid'))
      return
    }
    const url = normalizeRelayUrl(sanitized)
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
      <p className="muted">{t('settings.relaysBody')}</p>

      {activeCount === 0 ? <Banner tone="danger">{t('settings.noRelaysWarning')}</Banner> : null}

      <div className="card-section">
        {entries.map((entry) => {
          const status = statusByUrl.get(entry.url)
          const verdict = verdictFor(status)
          const badgeVariant =
            verdict === 'healthy'
              ? 'success'
              : verdict === 'degraded'
                ? 'warning'
                : verdict === 'offline'
                  ? 'danger'
                  : 'default'
          const badgeLabel =
            verdict === 'healthy'
              ? t('settings.relayHealthy')
              : verdict === 'degraded'
                ? t('settings.relayDegraded')
                : verdict === 'offline'
                  ? t('settings.relayOffline')
                  : t('settings.relayNever')

          return (
            <div key={entry.id} className="stack-sm" style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <div className="row-between">
                <span className="grow truncate" style={{ fontWeight: 550 }}>
                  {relayLabel(entry.url)}
                </span>
                <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('settings.relayRemove')} title={t('settings.relayRemove')}
                  onClick={() => void remove(entry)}
                >
                  <TrashIcon size={16} />
                </Button>
              </div>

              <div className="row faint" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <label className="row" style={{ gap: '0.35rem' }}>
                  <Checkbox
                    size="sm"
                    checked={entry.read}
                    onCheckedChange={(checked) => void update(entry, { read: !!checked })}
                  />
                  {t('settings.relayRead')}
                </label>
                <label className="row" style={{ gap: '0.35rem' }}>
                  <Checkbox
                    size="sm"
                    checked={entry.write}
                    onCheckedChange={(checked) => void update(entry, { write: !!checked })}
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

              {/*
                A relay that refuses our subscription is the failure mode most
                likely to go unnoticed: it connects, accepts publishes, and
                simply never delivers. Say so in words, not just an error code.
              */}
              {status && status.health.readFail > 0 ? (
                <span className="small" style={{ color: 'var(--warning)' }}>
                  {t('settings.relayCannotRead')}
                </span>
              ) : null}

              {status?.health.lastError ? (
                <span className="faint truncate" title={status.health.lastError}>
                  {status.health.lastError}
                </span>
              ) : null}

              <code className="mono faint" style={{ wordBreak: 'break-all' }} lang="en" dir="ltr">
                {entry.url}
              </code>
            </div>
          )
        })}
      </div>

      <div className="card stack-sm">
        <Field label={t('settings.relayAdd')} error={error ?? undefined}>
          <div className="row">
            <Input
              className="grow"
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
            />
            <Button disabled={!input.trim()} onClick={() => void addRelay(input)}>
              <PlusIcon size={16} />
            </Button>
          </div>
        </Field>
      </div>

      {unusedSuggestions.length > 0 ? (
        <div className="card stack-sm">
          <span className="section-title">{t('settings.relaySuggested')}</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {unusedSuggestions.map((url) => (
              <Button key={url} variant="outline" size="sm" onClick={() => void addRelay(url)}>
                <PlusIcon size={13} />
                {relayLabel(url)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <Button variant="outline" block onClick={() => void restoreDefaults()}>
        <RefreshIcon size={16} />
        {t('settings.relayResetDefaults')}
      </Button>

      <p className="hint" lang={locale}>
        {about('relaysSee')}
      </p>
    </SettingsPage>
  )
}
