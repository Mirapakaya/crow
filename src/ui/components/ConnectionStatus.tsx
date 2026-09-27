import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useNavigate } from '../../app/router'
import { useT, type TranslateFn } from '../../i18n'
import { connectionStatus, connectionTone, type ConnectionStatus } from '../../core/engine/connectionStatus'
import { cn } from '../../lib/utils'

const SETTLE_MS = 700
const CONFIRM_MS = 1800

export function useConnection(): ConnectionStatus {
  const sync = useApp((s) => s.syncState)
  const relays = useApp((s) => s.relayStatuses)
  return useMemo(() => connectionStatus(sync, relays), [sync, relays])
}

function useConnectionEpisode(status: ConnectionStatus): boolean {
  const [phase, setPhase] = useState<'idle' | 'showing'>('idle')

  useEffect(() => {
    if (phase === 'idle' && !status.settled) {
      const delay = status.kind === 'offline' ? 0 : SETTLE_MS
      const timer = setTimeout(() => setPhase('showing'), delay)
      return () => clearTimeout(timer)
    }
    if (phase === 'showing' && status.settled) {
      const timer = setTimeout(() => setPhase('idle'), CONFIRM_MS)
      return () => clearTimeout(timer)
    }
    return
  }, [phase, status.settled, status.kind])

  return status.kind === 'offline' || phase !== 'idle'
}

function detailFor(status: ConnectionStatus, t: TranslateFn): string {
  switch (status.kind) {
    case 'offline':
      return t('connection.offlineDetail')
    case 'connecting':
      return t('connection.connectingDetail')
    case 'degraded':
      return t('connection.degradedDetail')
    case 'sending':
      return t('connection.sendingDetail', { n: status.pending })
    case 'syncing':
      return t('connection.syncingDetail')
    case 'connected':
      return t('connection.connected')
  }
}

function shortFor(status: ConnectionStatus, t: TranslateFn): string {
  switch (status.kind) {
    case 'offline':
      return t('connection.offline')
    case 'connecting':
      return t('connection.connecting')
    case 'degraded':
      return t('connection.degraded')
    case 'sending':
      return t('connection.sending', { n: status.pending })
    case 'syncing':
      return t('connection.syncing')
    case 'connected':
      return t('connection.relays', { n: status.connected, total: status.total })
  }
}

export function ConnectionBar() {
  const t = useT()
  const navigate = useNavigate()
  const status = useConnection()
  const visible = useConnectionEpisode(status)

  if (!visible) return null

  const tone = connectionTone(status.kind)
  const isWarning = tone === 'warning'

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden pt-[env(safe-area-inset-top)] border-b border-[var(--border)] animate-in slide-in-from-top-2 fade-in-0 duration-220',
        isWarning
          ? 'bg-[var(--warning-soft)] border-b-[color-mix(in_srgb,var(--warning)_28%,transparent)]'
          : 'bg-[var(--surface)]',
      )}
      data-tone={tone}
      data-busy={status.busy}
    >
      <button
        type="button"
        className={cn(
          'flex flex-1 items-center justify-center gap-2 min-h-[1.875rem] px-4 border-none bg-transparent text-xs cursor-pointer transition-colors',
          isWarning ? 'text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_10%,transparent)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]',
        )}
        onClick={() => navigate({ name: 'settings-relays' })}
        aria-label={t('connection.openRelays')}
      >
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full transition-colors',
            tone === 'success' ? 'bg-[var(--success)]' : tone === 'warning' ? 'bg-[var(--warning)]' : 'bg-[var(--text-faint)]',
            status.busy && 'animate-pulse',
          )}
          aria-hidden="true"
        />
        <span role="status" aria-live="polite">
          {detailFor(status, t)}
        </span>
      </button>
      {status.busy ? (
        <span className="absolute bottom-0 inset-x-0 h-0.5 overflow-hidden pointer-events-none" aria-hidden="true">
          <span className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--accent)] animate-[connection-sweep_1.15s_ease-in-out_infinite]" />
        </span>
      ) : null}
    </div>
  )
}

export function ConnectionBadge() {
  const t = useT()
  const navigate = useNavigate()
  const status = useConnection()
  const tone = connectionTone(status.kind)
  const isWarning = tone === 'warning'

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 max-w-[12rem] min-h-[2.125rem] px-2.5 rounded-full border text-[0.75rem] tabular-nums whitespace-nowrap cursor-pointer transition-colors',
        isWarning
          ? 'bg-[var(--warning-soft)] border-[color-mix(in_srgb,var(--warning)_28%,transparent)] text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]'
          : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
      )}
      data-tone={tone}
      data-busy={status.busy}
      onClick={() => navigate({ name: 'settings-relays' })}
      title={detailFor(status, t)}
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full transition-colors',
          tone === 'success' ? 'bg-[var(--success)]' : tone === 'warning' ? 'bg-[var(--warning)]' : 'bg-[var(--text-faint)]',
          status.busy && 'animate-pulse',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{shortFor(status, t)}</span>
    </button>
  )
}
