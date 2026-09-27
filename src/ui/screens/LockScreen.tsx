import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { type KeyslotType, type SlotSecret } from '../../core/vault/vault'
import { isGuarded, isValidPin } from '../../core/vault/keyslots'
import { confirmBiometric, GateCancelledError } from '../../core/crypto/biometricGate'
import { EntryLayout } from '../components/EntryLayout'
import { PatternPad } from '../components/PatternPad'
import { gateName, unlockError } from '../biometric'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Progress } from '../../components/ui/progress'
import { Lock, Fingerprint, Hash, KeyRound, RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react'

const WAYS: KeyslotType[] = ['device', 'biometric', 'pin', 'passphrase', 'recovery']
const NOT_A_DIGIT = /[^\d۰-۹٠-٩]/g

export function LockScreen() {
  const t = useT()
  const unlock = useApp((s) => s.unlock)
  const wipeDevice = useApp((s) => s.wipeDevice)
  const autoLocked = useApp((s) => s.autoLocked)
  const keyslots = useApp((s) => s.keyslots)
  const autoPrompt = useApp((s) => s.autoPrompt)
  const consumeAutoPrompt = useApp((s) => s.consumeAutoPrompt)
  const passkeyRetired = useApp((s) => s.passkeyRetired)

  const guarded = keyslots.some(isGuarded)
  const available = WAYS.filter(
    (type) => keyslots.some((slot) => slot.type === type) && (type !== 'device' || !guarded),
  )
  const biometric = keyslots.find((slot) => slot.type === 'biometric')
  const pin = keyslots.find((slot) => slot.type === 'pin')
  const style = pin?.style ?? 'digits'
  const method = gateName(biometric?.authenticator, t)

  const [chosen, setChosen] = useState<KeyslotType | null>(null)
  const way: KeyslotType = chosen && available.includes(chosen) ? chosen : (available[0] ?? 'passphrase')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)

  const attempt = async (make: () => Promise<SlotSecret>, quiet = false) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      await unlock(await make())
      setSecret('')
    } catch (err) {
      if (!(quiet && err instanceof GateCancelledError)) setError(unlockError(err, t, { style, method }))
      setSecret('')
    } finally {
      setBusy(false)
    }
  }

  const withBiometric = (quiet = false) => {
    if (!biometric?.credentialId) return
    const { credentialId, authenticator, transports } = biometric
    void attempt(
      async () => ({
        type: 'biometric',
        presence: await confirmBiometric({ credentialId, authenticator, transports }),
      }),
      quiet,
    )
  }

  const withPin = (code: string) => void attempt(async () => ({ type: 'pin', code, onProgress: setProgress }))

  const wayNow = useRef(way)
  useEffect(() => {
    wayNow.current = way
  })
  const prompted = useRef(false)
  useEffect(() => {
    if (!autoPrompt || way !== 'biometric') return
    const stop = () => {
      document.removeEventListener('visibilitychange', ask)
      globalThis.removeEventListener('focus', ask)
    }
    function ask() {
      if (prompted.current || wayNow.current !== 'biometric') return stop()
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
      prompted.current = true
      stop()
      consumeAutoPrompt()
      queueMicrotask(() => withBiometric(true))
    }
    document.addEventListener('visibilitychange', ask)
    globalThis.addEventListener('focus', ask)
    ask()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = () => {
    if (!secret.trim()) return
    const value = secret
    if (way === 'pin') return withPin(value)
    void attempt(async () =>
      way === 'recovery'
        ? { type: 'recovery', mnemonic: value }
        : { type: 'passphrase', passphrase: value, onProgress: setProgress },
    )
  }

  const choose = (next: KeyslotType) => {
    setChosen(next)
    setSecret('')
    setError(null)
  }

  const labels: Record<KeyslotType, string> = {
    device: t('lock.open'),
    biometric: t('lock.withBiometric', { method }),
    pin: t('lock.useCode', { what: t(style === 'pattern' ? 'lock.pattern' : 'lock.pin') }),
    passphrase: t('lock.usePassphrase'),
    recovery: t('lock.useRecovery'),
  }

  const icons: Record<KeyslotType, typeof Lock> = {
    device: Lock,
    biometric: Fingerprint,
    pin: Hash,
    passphrase: KeyRound,
    recovery: RotateCcw,
  }

  const typed = way === 'passphrase' || way === 'recovery' || (way === 'pin' && style === 'digits')
  const ready = way === 'pin' ? isValidPin('digits', secret) : secret.trim().length > 0

  const WayIcon = icons[way]

  return (
    <EntryLayout>
      <div className="flex flex-col items-center gap-1 text-center">
        <span
          className="grid size-11 place-items-center rounded-[var(--radius-lg)] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
          aria-hidden="true"
        >
          <WayIcon size={20} strokeWidth={1.75} />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{t('lock.title')}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {way === 'device' ? t('lock.openBody') : t('lock.body')}
        </p>
      </div>

      {autoLocked ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
          {t('lock.autoLocked')}
        </div>
      ) : null}
      {passkeyRetired ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
          {t('lock.passkeyRetired')}
        </div>
      ) : null}

      {way === 'device' || way === 'biometric' ? (
        <div className="flex flex-col gap-3">
          <Button
            className="w-full h-10"
            disabled={busy}
            onClick={
              way === 'device' ? () => void attempt(async () => ({ type: 'device' })) : () => withBiometric()
            }
          >
            {busy ? <Spinner label={t('lock.unlocking')} /> : labels[way]}
          </Button>
          {error ? (
            <p className="text-center text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {way === 'pin' && style === 'pattern' ? (
        <div className="flex flex-col gap-2">
          <PatternPad label={t('lock.drawPattern')} disabled={busy} onDone={withPin} />
          {busy ? (
            <Progress value={progress * 100} />
          ) : null}
          {error ? (
            <p className="text-center text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-center text-xs text-[var(--text-muted)]">{t('lock.drawPattern')}</p>
          )}
        </div>
      ) : null}

      {typed ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {way === 'recovery' ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t('lock.recoveryPhrase')}</Label>
              <Textarea
                dir="ltr"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                value={secret}
                disabled={busy}
                onChange={(event) => {
                  setSecret(event.target.value)
                  setError(null)
                }}
                className="font-mono"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Input
                type="password"
                dir={way === 'pin' ? 'ltr' : undefined}
                inputMode={way === 'pin' ? 'numeric' : undefined}
                maxLength={way === 'pin' ? 16 : undefined}
                autoFocus
                autoComplete={way === 'pin' ? 'off' : 'current-password'}
                aria-label={way === 'pin' ? t('lock.pin') : t('lock.passphrase')}
                aria-invalid={error ? true : undefined}
                value={secret}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value
                  setSecret(way === 'pin' ? value.replace(NOT_A_DIGIT, '') : value)
                  setError(null)
                }}
                className={cn(way === 'pin' && 'text-center tracking-[0.3em]')}
              />
            </div>
          )}
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {busy && way !== 'recovery' ? (
            <Progress value={progress * 100} />
          ) : null}
          <Button className="w-full h-10" type="submit" disabled={!ready || busy}>
            {busy ? <Spinner label={t('lock.unlocking')} /> : t('lock.unlock')}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-col items-center gap-1">
        {available
          .filter((other) => other !== way)
          .map((other) => {
            const OtherIcon = icons[other]
            return (
              <Button
                key={other}
                variant="ghost"
                size="sm"
                className="gap-2 text-[var(--text-muted)]"
                onClick={() => choose(other)}
              >
                <OtherIcon size={14} />
                {labels[other]}
              </Button>
            )
          })}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-[var(--text-muted)]"
          aria-expanded={showForgot}
          onClick={() => setShowForgot((v) => !v)}
        >
          <ChevronDown
            size={14}
            className={cn('transition-transform', showForgot && 'rotate-180')}
          />
          {t('lock.forgot')}
        </Button>
      </div>

      {showForgot ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
            <AlertTriangle size={16} className="shrink-0" />
            {available.includes('recovery') ? t('lock.forgotBodyRecovery') : t('lock.forgotBody')}
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              if (confirm(t('lock.startOverConfirm'))) void wipeDevice()
            }}
          >
            {t('lock.startOver')}
          </Button>
        </div>
      ) : null}
    </EntryLayout>
  )
}

function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label ? <span className="text-xs text-[var(--text-muted)]">{label}</span> : null}
    </span>
  )
}
