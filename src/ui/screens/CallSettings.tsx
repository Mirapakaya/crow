import { useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { useCallSettingsText, type CallSettingsTextKey } from './callSettingsText'
import { SettingsPage } from './SettingsPage'
import { hasTurnServer } from '../../core/models/call'
import { alreadyListed, parseIceServer, serverUrls } from '../../core/calls/iceServers'
import { probeIce, type IceProbeResult, type IceVerdict } from '../../core/calls/iceProbe'
import { DEFAULT_ICE_SERVERS } from '../../core/transport/defaultRelays'
import { supportsWebRtc } from '../../core/transport/webrtc/directManager'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import { Globe, Plus, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'

const VERDICT: Record<IceVerdict, CallSettingsTextKey> = {
  good: 'iceVerdictGood',
  stun: 'iceVerdictStun',
  symmetric: 'iceVerdictSymmetric',
  none: 'iceVerdictNone',
  'turn-failed': 'iceVerdictTurnFailed',
}

export function CallSettings() {
  const { t } = useI18n()
  const st = useCallSettingsText()
  const settings = useApp((s) => s.settings)
  const saveSettings = useApp((s) => s.saveSettings)

  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [credential, setCredential] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [probe, setProbe] = useState<'idle' | 'running' | IceProbeResult>('idle')

  const servers = settings.iceServers
  const turnConfigured = hasTurnServer(servers)
  const canCall = supportsWebRtc()

  const add = async () => {
    const parsed = parseIceServer({ url, username, credential })
    if ('error' in parsed) {
      setError(st(parsed.error === 'credentials' ? 'iceNeedsCredentials' : 'iceInvalid'))
      return
    }
    if (alreadyListed(servers, parsed.server)) {
      setError(st('iceExists'))
      return
    }
    await saveSettings({ iceServers: [...servers, parsed.server] })
    setUrl('')
    setUsername('')
    setCredential('')
    setError(null)
    setProbe('idle')
  }

  const remove = async (index: number) => {
    const next = servers.filter((_, i) => i !== index)
    await saveSettings({
      iceServers: next,
      ...(hasTurnServer(next) ? {} : { callRelayOnly: false }),
    })
    setProbe('idle')
  }

  const test = async () => {
    setProbe('running')
    try {
      setProbe(await probeIce([...DEFAULT_ICE_SERVERS, ...servers]))
    } catch {
      setProbe({ verdict: 'none', stun: false, turn: turnConfigured ? false : null, symmetric: false })
    }
  }

  return (
    <SettingsPage title={t('settings.calls')}>
      <p className="text-sm text-[var(--text-muted)]">{st('callsBody')}</p>
      {!canCall ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
          <AlertTriangle size={16} />
          {st('iceUnsupported')}
        </div>
      ) : null}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-[var(--text)]">{st('relayCalls')}</span>
            <span className="block mt-0.5 text-xs text-[var(--text-muted)]">
              {turnConfigured ? st('relayCallsBody') : st('relayCallsNeedsTurn')}
            </span>
          </div>
          <Switch
            checked={settings.callRelayOnly && turnConfigured}
            disabled={!turnConfigured}
            onCheckedChange={(callRelayOnly) => void saveSettings({ callRelayOnly })}
          />
        </div>
      </div>

      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
        {st('iceServers')}
      </span>
      <p className="text-xs text-[var(--text-muted)]">{st('iceServersBody')}</p>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 cursor-default">
          <Globe size={16} className="text-[var(--text-muted)]" />
          <span className="flex-1 text-xs text-[var(--text-muted)]">{st('iceBuiltIn')}</span>
        </div>
        {servers.length === 0 ? (
          <div className="flex items-center px-4 py-3 border-t border-[var(--border-subtle)] cursor-default">
            <span className="flex-1 text-[0.75rem] text-[var(--text-faint)]">{st('iceNone')}</span>
          </div>
        ) : (
          servers.map((server, index) => (
            <div key={serverUrls(server).join(' ')} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] cursor-default">
              <span className="flex flex-1 flex-col gap-1 min-w-0">
                <code className="font-mono text-xs truncate text-[var(--text)]" dir="ltr" lang="en">
                  {serverUrls(server).join(' ')}
                </code>
                {server.username ? (
                  <span className="text-[0.75rem] text-[var(--text-faint)] truncate" dir="ltr" lang="en">
                    {server.username}
                  </span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={st('iceRemove')}
                title={st('iceRemove')}
                onClick={() => void remove(index)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))
        )}
      </div>

      <form
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label>{st('iceUrl')}</Label>
          <Input
            dir="ltr"
            lang="en"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={st('iceUrlPlaceholder')}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setError(null)
            }}
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
          ) : null}
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-1 flex-col gap-1.5 min-w-[10rem]">
            <Label>{st('iceUsername')}</Label>
            <Input
              dir="ltr"
              lang="en"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 min-w-[10rem]">
            <Label>{st('icePassword')}</Label>
            <Input
              dir="ltr"
              lang="en"
              type="password"
              autoComplete="new-password"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={!url.trim()} className="gap-2">
          <Plus size={16} />
          {st('iceAdd')}
        </Button>
      </form>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <Button
          variant="outline"
          disabled={!canCall || probe === 'running'}
          onClick={() => void test()}
          aria-busy={probe === 'running'}
          className="gap-2"
        >
          <RefreshCw size={16} />
          {probe === 'running' ? st('iceTesting') : st('iceTest')}
        </Button>
        {typeof probe === 'object' ? (
          <div className="flex flex-col gap-2" aria-live="polite">
            <ProbeRow label={st('iceStun')} ok={probe.stun} />
            {probe.symmetric ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{st('iceSymmetric')}</span>
              </div>
            ) : null}
            <ProbeRow label={st('iceTurn')} ok={probe.turn} />
            <div className={cn(
              'flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-xs',
              probe.verdict === 'good' ? 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]' :
                probe.verdict === 'stun' ? 'bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-text)]' :
                  'bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] text-[var(--warning)]',
            )}>
              {st(VERDICT[probe.verdict])}
            </div>
          </div>
        ) : null}
      </div>
    </SettingsPage>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

function ProbeRow({ label, ok }: { label: string; ok: boolean | null }) {
  const badgeVariant = ok === null ? 'secondary' : ok ? 'success' : 'destructive'
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--text)]">{label}</span>
      <Badge variant={badgeVariant}>
        {ok === null ? '—' : ok ? '✓' : '✗'}
      </Badge>
    </div>
  )
}
