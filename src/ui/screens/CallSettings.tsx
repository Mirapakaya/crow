import { useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useCallSettingsText, type CallSettingsTextFn, type CallSettingsTextKey } from './callSettingsText'
import { Banner, Field, Toggle } from '../components/primitives'
import { GlobeIcon, PlusIcon, RefreshIcon, TrashIcon } from '../components/Icons'
import { SettingsPage } from './SettingsPage'
import { hasTurnServer } from '../../core/models/call'
import { alreadyListed, parseIceServer, serverUrls } from '../../core/calls/iceServers'
import { probeIce, type IceProbeResult, type IceVerdict } from '../../core/calls/iceProbe'
import { DEFAULT_ICE_SERVERS } from '../../core/transport/defaultRelays'
import { supportsWebRtc } from '../../core/transport/webrtc/directManager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const VERDICT: Record<IceVerdict, CallSettingsTextKey> = {
  good: 'iceVerdictGood',
  stun: 'iceVerdictStun',
  symmetric: 'iceVerdictSymmetric',
  none: 'iceVerdictNone',
  'turn-failed': 'iceVerdictTurnFailed',
}

/**
 * Calls: the servers a call may use, and whether it must be relayed.
 *
 * Crow runs no TURN server (ADR-008), so the one a user adds here is the
 * only thing that gets a call through symmetric NAT or a strict firewall —
 * and the only thing that can keep their IP address from the person they
 * call. Both are said plainly, and the test shows which of them this network
 * actually needs.
 */
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
    // "Always relay" with nothing to relay through would fail every call; it
    // goes off with the last TURN server rather than lingering as a trap.
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
      <p className="text-muted-foreground">{st('callsBody')}</p>
      {!canCall ? <Banner tone="warning">{st('iceUnsupported')}</Banner> : null}

      <Card className="p-0 overflow-hidden divide-y divide-border">
        <Toggle
          label={st('relayCalls')}
          description={turnConfigured ? st('relayCallsBody') : st('relayCallsNeedsTurn')}
          checked={settings.callRelayOnly && turnConfigured}
          disabled={!turnConfigured}
          onChange={(callRelayOnly) => void saveSettings({ callRelayOnly })}
        />
      </Card>

      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {st('iceServers')}
      </span>
      <p className="text-sm text-muted-foreground">{st('iceServersBody')}</p>

      <Card className="p-0 overflow-hidden divide-y divide-border">
        <div className="flex items-center gap-3 w-full px-4 py-3 text-start">
          <GlobeIcon size={16} className="text-muted-foreground" />
          <span className="flex-1 min-w-0 text-xs text-muted-foreground">{st('iceBuiltIn')}</span>
        </div>
        {servers.length === 0 ? (
          <div className="flex items-center gap-3 w-full px-4 py-3 text-start">
            <span className="flex-1 min-w-0 text-xs text-muted-foreground/70">{st('iceNone')}</span>
          </div>
        ) : (
          servers.map((server, index) => (
            <div key={serverUrls(server).join(' ')} className="flex items-center gap-3 w-full px-4 py-3 text-start">
              <span className="flex-1 min-w-0 flex flex-col gap-2">
                <code className="font-mono text-xs truncate" dir="ltr" lang="en">
                  {serverUrls(server).join(' ')}
                </code>
                {server.username ? (
                  <span className="text-xs text-muted-foreground/70 truncate" dir="ltr" lang="en">
                    {server.username}
                  </span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={st('iceRemove')}
                title={st('iceRemove')}
                onClick={() => {
                  void remove(index)
                }}
              >
                <TrashIcon size={16} />
              </Button>
            </div>
          ))
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void add()
          }}
        >
          <div className="flex flex-col gap-2">
            <Field label={st('iceUrl')} error={error ?? undefined}>
              <Input
                dir="ltr"
                lang="en"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={st('iceUrlPlaceholder')}
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setError(null)
                }}
              />
            </Field>
            <div className="flex items-center gap-3 flex-wrap items-start">
              <div className="flex-1 min-w-[10rem]">
                <Field label={st('iceUsername')}>
                  <Input
                    dir="ltr"
                    lang="en"
                    autoCapitalize="off"
                    autoComplete="off"
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </Field>
              </div>
              <div className="flex-1 min-w-[10rem]">
                <Field label={st('icePassword')}>
                  <Input
                    dir="ltr"
                    lang="en"
                    type="password"
                    autoComplete="new-password"
                    value={credential}
                    onChange={(event) => setCredential(event.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Button type="submit" disabled={!url.trim()}>
              <PlusIcon size={16} />
              {st('iceAdd')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <Button
          variant="outline"
          disabled={!canCall || probe === 'running'}
          onClick={() => void test()}
          aria-busy={probe === 'running'}
        >
          <RefreshIcon size={16} />
          {probe === 'running' ? st('iceTesting') : st('iceTest')}
        </Button>
        {typeof probe === 'object' ? (
          <div className="flex flex-col gap-2" aria-live="polite">
            <ProbeRow label={st('iceStun')} ok={probe.stun} st={st} />
            {probe.symmetric ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{st('iceSymmetric')}</span>
              </div>
            ) : null}
            <ProbeRow label={st('iceTurn')} ok={probe.turn} st={st} />
            <Banner
              tone={probe.verdict === 'good' ? 'info' : probe.verdict === 'stun' ? 'accent' : 'warning'}
            >
              <span className="text-xs">{st(VERDICT[probe.verdict])}</span>
            </Banner>
          </div>
        ) : null}
      </Card>
    </SettingsPage>
  )
}

function ProbeRow({ label, ok, st }: { label: string; ok: boolean | null; st: CallSettingsTextFn }) {
  const badgeVariant = ok === null ? 'default' : ok ? 'success' : 'destructive'
  const text = st(ok === null ? 'iceNotSet' : ok ? 'iceWorking' : 'iceNotReachable')
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span>{label}</span>
      <Badge variant={badgeVariant}>{text}</Badge>
    </div>
  )
}
