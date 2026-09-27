import { useState } from 'react'
import { getRepo, getVault, useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { Spinner } from '../components/primitives'
import { PatternPad } from '../components/PatternPad'
import { SettingsPage } from './SettingsPage'
import { type KeyslotSummary, type SlotSecret } from '../../core/vault/vault'
import { canOpenInstantly, isGuarded, isValidPin } from '../../core/vault/keyslots'
import { confirmBiometric, type GateAuthenticator } from '../../core/crypto/biometricGate'
import { forgetBiometric } from '../../core/crypto/biometricEnrol'
import { capitalize, gateName, unlockError } from '../biometric'
import { formatDate } from '../format'
import { useAccessText } from '../access/accessText'
import {
  biometricBlocked,
  digitsOnly,
  explainBiometric,
  PassphraseFields,
  passphraseProblem,
  PatternSetup,
  PinFields,
  pinProblem,
  useBiometricEnrolment,
  useBiometricSupport,
} from '../access/protection'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog'
import { Progress } from '../../components/ui/progress'
import { AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react'

const AUTO_LOCK_CHOICES = [0, 1, 5, 15, 30, 60]

/** Strongest first, and the recovery phrase, which every vault has, last. */
const ORDER: KeyslotSummary['type'][] = ['passphrase', 'biometric', 'pin', 'device', 'recovery']

type Adding = 'biometric' | 'security-key' | 'pin' | 'pattern' | 'passphrase' | 'instant'

/** One change to how the device opens, or showing the recovery phrase. */
type Flow = { kind: Adding | 'reveal' } | { kind: 'remove'; slot: KeyslotSummary }

/**
 * Whether a change must first be confirmed by opening Crow again. A device
 * that opens instantly has nothing to confirm with, and does not pretend to;
 * one that only the recovery phrase opens is confirmed with the phrase.
 */
const canConfirm = (keyslots: KeyslotSummary[]): boolean =>
  keyslots.length > 0 && !keyslots.some((slot) => slot.type === 'device')

/**
 * How this device opens Crow, and how long it stays open (ADR-054, ADR-058,
 * ADR-059).
 *
 * Every way in is listed with what it protects against, and the level shown is
 * the weakest one's, because that is the level the vault has. Adding or
 * removing a way in, and showing the recovery phrase, first ask the person to
 * open Crow again — each would otherwise be one tap away for anyone holding
 * the unlocked device. Opening instantly is offered only while nothing else
 * guards the device, and setting anything else up turns it off.
 */
export function SecuritySettings() {
  const { t, locale } = useI18n()
  const text = useAccessText()
  const settings = useApp((s) => s.settings)
  const saveSettings = useApp((s) => s.saveSettings)
  const toast = useApp((s) => s.toast)
  const keyslots = useApp((s) => s.keyslots)
  const refreshKeyslots = useApp((s) => s.refreshKeyslots)
  const support = useBiometricSupport()
  const gate = keyslots.find((slot) => slot.type === 'biometric')
  const method = gateName(gate?.authenticator, t)
  const platform = gateName('platform', t)
  const blocked = biometricBlocked(support, text, platform)

  const [flow, setFlow] = useState<Flow | null>(null)
  const [phrase, setPhrase] = useState<string[] | null>(null)

  const has = (type: KeyslotSummary['type']) => keyslots.some((slot) => slot.type === type)
  const everyday = keyslots.filter((slot) => slot.type !== 'recovery')
  const guarded = keyslots.some(isGuarded)
  const slots = [...keyslots].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
  const pin = keyslots.find((slot) => slot.type === 'pin')
  const pattern = pin?.style === 'pattern'
  // A lockout erases a PIN, so one is offered only with something to fall back on.
  const pinAllowed = has('recovery') || has('passphrase')

  // The weakest way in sets the level: instant, then a PIN, then biometrics.
  const level = has('device')
    ? { tone: 'warning' as const, line: text('levelInstant') }
    : pin
      ? { tone: 'info' as const, line: text(pattern ? 'levelPattern' : 'levelPin') }
      : has('biometric')
        ? { tone: 'info' as const, line: text('levelBiometric', { method }) }
        : has('passphrase')
          ? { tone: 'accent' as const, line: text('levelPassphrase') }
          : { tone: 'warning' as const, line: text('levelRecoveryOnly') }

  const name = (slot: KeyslotSummary): string =>
    slot.type === 'biometric'
      ? slot.authenticator === 'security-key'
        ? text('securityKeyName')
        : capitalize(platform)
      : slot.type === 'pin'
        ? text(slot.style === 'pattern' ? 'pattern' : 'pin')
        : slot.type === 'passphrase'
          ? text('passphrase')
          : slot.type === 'device'
            ? text('choiceInstant')
            : text('wayRecovery')

  const describe = (slot: KeyslotSummary): string =>
    slot.type === 'biometric'
      ? text('wayBiometricBody')
      : slot.type === 'pin'
        ? text('wayPinBody')
        : slot.type === 'passphrase'
          ? text('wayPassphraseBody')
          : slot.type === 'device'
            ? text('wayInstantBody')
            : text('wayRecoveryBody')

  const reveal = async () => {
    const identity = await getRepo().getIdentity()
    if (identity?.mnemonic) setPhrase(identity.mnemonic.split(' '))
    else toast(t('errors.generic'), 'danger')
  }

  const start = (next: Flow) =>
    canConfirm(keyslots) || next.kind !== 'reveal' ? setFlow(next) : void reveal()

  return (
    <SettingsPage title={t('settings.security')}>
      <div className={cn(
        'flex flex-col gap-1 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm',
        level.tone === 'warning' ? 'bg-[var(--warning-soft)] border-[color-mix(in_srgb,var(--warning)_28%,transparent)] text-[var(--warning)]' :
          level.tone === 'accent' ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-text)]' :
            'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]',
      )}>
        <strong>{text('levelTitle')}</strong>
        <span className="text-xs">{level.line}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">{text('waysTitle')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{text('waysBody')}</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {slots.map((slot) => {
          const onlyWay = slot.type !== 'recovery' && everyday.length === 1 && !has('recovery')
          return (
            <div key={slot.id} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] first:border-t-0 cursor-default">
              <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                <strong className="text-sm text-[var(--text)]">{name(slot)}</strong>
                <span className="text-xs text-[var(--text-muted)]">{describe(slot)}</span>
                {slot.failures ? (
                  <span className="text-xs text-[var(--text-muted)]">{text('wrongTries', { n: slot.failures })}</span>
                ) : null}
                {slot.createdAt > 0 ? (
                  <span className="text-xs text-[var(--text-muted)]">{text('added', { date: formatDate(slot.createdAt, locale) })}</span>
                ) : null}
                {onlyWay ? <span className="text-xs text-[var(--text-muted)]">{text('onlyWay')}</span> : null}
              </span>
              {slot.type !== 'recovery' && !onlyWay ? (
                <Button variant="ghost" size="sm" onClick={() => start({ kind: 'remove', slot })}>
                  {t('common.remove')}
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">{text('addTitle')}</h3>
        {gate ? null : support?.platform === 'yes' ? (
          <Button variant="outline" className="w-full" onClick={() => start({ kind: 'biometric' })}>
            {text('addBiometric', { method: platform })}
          </Button>
        ) : blocked ? (
          <p className="text-xs text-[var(--text-muted)]">
            <strong>{text('addBiometric', { method: platform })}</strong> — {blocked}
          </p>
        ) : null}
        {!gate && support?.securityKey ? (
          <Button variant="outline" className="w-full" onClick={() => start({ kind: 'security-key' })}>
            {text('addKey')}
          </Button>
        ) : null}
        {pinAllowed ? (
          <>
            <Button variant="outline" className="w-full" onClick={() => start({ kind: 'pin' })}>
              {pin && !pattern ? text('changePin') : text('addPin')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => start({ kind: 'pattern' })}>
              {pattern ? text('changePattern') : text('addPattern')}
            </Button>
            {pin ? <p className="text-xs text-[var(--text-muted)]">{text('onePin')}</p> : null}
          </>
        ) : null}
        <Button variant="outline" className="w-full" onClick={() => start({ kind: 'passphrase' })}>
          {has('passphrase') ? text('changePassphrase') : text('addPassphrase')}
        </Button>
        {!canOpenInstantly() || has('device') ? null : guarded ? (
          <p className="text-xs text-[var(--text-muted)]">
            <strong>{text('choiceInstant')}</strong> — {text('instantExclusive')}
          </p>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => start({ kind: 'instant' })}>
            {text('choiceInstant')}
          </Button>
        )}
        <p className="text-xs text-[var(--text-muted)]">{text('notRetroactive')}</p>
      </div>

      <h3 className="text-sm font-semibold text-[var(--text)]">{text('sessionTitle')}</h3>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{text('autoLock')}</Label>
          <select
            className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            value={String(settings.autoLockMinutes)}
            onChange={(event) => void saveSettings({ autoLockMinutes: Number(event.target.value) })}
          >
            {AUTO_LOCK_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? text('autoLockNever') : text('autoLockMinutes', { n: minutes })}
              </option>
            ))}
          </select>
        </div>
        {has('device') ? <p className="text-xs text-[var(--text-muted)]">{text('instantSession')}</p> : null}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-medium text-[var(--text)]">{text('lockOnHide')}</span>
          <Switch checked={settings.lockOnHide} onCheckedChange={(lockOnHide) => void saveSettings({ lockOnHide })} />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">{t('settings.recoveryPhrase')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{text('recoveryPhraseBody')}</p>
        {phrase ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {phrase.map((word, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono">
                  <span className="text-[0.6875rem] text-[var(--text-faint)] tabular-nums">{i + 1}</span>
                  <span className="text-[var(--text)]">{word}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setPhrase(null)}>
              <EyeOff size={16} />
              {t('common.hide')}
            </Button>
          </>
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={() => start({ kind: 'reveal' })}>
            <Eye size={16} />
            {t('common.show')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
        <Shield size={14} />
        {t('privacy.deviceBody')}
      </div>

      {flow ? (
        <MethodFlow
          flow={flow}
          keyslots={keyslots}
          onClose={() => setFlow(null)}
          onDone={async (message) => {
            setFlow(null)
            if (flow.kind === 'reveal') return reveal()
            await refreshKeyslots()
            toast(message)
          }}
        />
      ) : null}
    </SettingsPage>
  )
}

/**
 * Confirm it is the owner, then do one thing: set up biometrics or a security
 * key, set a PIN or a pattern, change the passphrase, turn on instant opening,
 * remove a way in, or show the recovery phrase. A device that opens instantly
 * has nothing to confirm with, and says so by not asking.
 */
function MethodFlow({
  flow,
  keyslots,
  onClose,
  onDone,
}: {
  flow: Flow
  keyslots: KeyslotSummary[]
  onClose: () => void
  onDone: (message: string) => void | Promise<void>
}) {
  const t = useI18n().t
  const text = useAccessText()
  const { kind } = flow
  const gate: GateAuthenticator = kind === 'security-key' ? 'security-key' : 'platform'
  const method = gateName(gate, t)
  const enrolBiometricSlot = useBiometricEnrolment()
  const [confirmed, setConfirmed] = useState(!canConfirm(keyslots))
  const [value, setValue] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const pin = keyslots.find((slot) => slot.type === 'pin')
  const changing = (type: KeyslotSummary['type']) => keyslots.some((slot) => slot.type === type)
  const endsInstant = changing('device') && kind !== 'instant' && kind !== 'remove' && kind !== 'reveal'
  const added = endsInstant ? text('instantOff') : text('addedToast')
  const lastWay = flow.kind === 'remove' && keyslots.filter((slot) => slot.type !== 'recovery').length === 1

  const run = async (step: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      await step()
    } catch (err) {
      setError(
        kind === 'biometric' || kind === 'security-key'
          ? explainBiometric(err, text, t, method)
          : err instanceof Error
            ? err.message
            : String(err),
      )
    } finally {
      setBusy(false)
    }
  }

  if (!confirmed || kind === 'reveal') {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{text('confirmTitle')}</DialogTitle>
          </DialogHeader>
          <ConfirmIdentity
            keyslots={keyslots}
            onConfirmed={() => (kind === 'reveal' ? void onDone('') : setConfirmed(true))}
          />
        </DialogContent>
      </Dialog>
    )
  }

  const titles: Record<Exclude<Flow['kind'], 'reveal'>, string> = {
    biometric: text('addBiometric', { method }),
    'security-key': text('addKey'),
    remove: t('common.remove'),
    pin: pin?.style === 'digits' ? text('changePin') : text('addPin'),
    pattern: pin?.style === 'pattern' ? text('changePattern') : text('addPattern'),
    passphrase: changing('passphrase') ? text('changePassphrase') : text('addPassphrase'),
    instant: text('choiceInstant'),
  }

  const errorLine = error ? (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {error}
    </p>
  ) : null
  const progressBar = busy ? (
    <Progress value={Math.round(progress * 100)} />
  ) : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {endsInstant ? <p className="text-xs text-[var(--text-muted)]">{text('instantWillStop')}</p> : null}

          {kind === 'biometric' || kind === 'security-key' ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">{capitalize(text('twoPrompts', { method }))}</p>
              {errorLine}
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await getVault().addSlot(await enrolBiometricSlot(gate))
                    await onDone(added)
                  })
                }
              >
                {busy ? <Spinner label={t('common.working')} /> : titles[kind]}
              </Button>
            </>
          ) : null}

          {flow.kind === 'remove' ? (
            <>
              <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span className="text-xs">{lastWay ? text('removeLast') : text('removeConfirm')}</span>
              </div>
              {errorLine}
              <Button
                variant="outline"
                className="w-full border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await getVault().removeSlot(flow.slot.id)
                    if (flow.slot.credentialId) forgetBiometric(flow.slot.credentialId)
                    await onDone(text('removed'))
                  })
                }
              >
                {busy ? <Spinner label={t('common.working')} /> : t('common.remove')}
              </Button>
            </>
          ) : null}

          {kind === 'pin' ? (
            <>
              <PinFields
                value={value}
                confirm={repeat}
                error={error}
                onChange={setValue}
                onConfirmChange={setRepeat}
                onSubmit={() => undefined}
              />
              {progressBar}
              <Button
                className="w-full"
                disabled={busy || !value}
                onClick={() => {
                  const problem = pinProblem(value, repeat, text)
                  if (problem) return setError(problem)
                  void run(async () => {
                    await getVault().addSlot({
                      type: 'pin',
                      style: 'digits',
                      code: value,
                      onProgress: setProgress,
                    })
                    await onDone(pin?.style === 'digits' ? text('pinChanged') : added)
                  })
                }}
              >
                {busy ? <Spinner label={t('common.working')} /> : t('common.save')}
              </Button>
            </>
          ) : null}

          {kind === 'pattern' ? (
            <>
              <PatternSetup
                disabled={busy}
                onComplete={(code) =>
                  void run(async () => {
                    await getVault().addSlot({ type: 'pin', style: 'pattern', code, onProgress: setProgress })
                    await onDone(pin?.style === 'pattern' ? text('patternChanged') : added)
                  })
                }
              />
              {progressBar}
              {errorLine}
            </>
          ) : null}

          {kind === 'passphrase' ? (
            <>
              <PassphraseFields
                value={value}
                confirm={repeat}
                error={error}
                onChange={setValue}
                onConfirmChange={setRepeat}
                onSubmit={() => undefined}
              />
              {progressBar}
              <Button
                className="w-full"
                disabled={busy || !value}
                onClick={() => {
                  const problem = passphraseProblem(value, repeat, text)
                  if (problem) return setError(problem)
                  void run(async () => {
                    await getVault().addSlot({ type: 'passphrase', passphrase: value, onProgress: setProgress })
                    await onDone(changing('passphrase') ? text('passphraseChanged') : added)
                  })
                }}
              >
                {busy ? <Spinner label={t('common.working')} /> : t('common.save')}
              </Button>
            </>
          ) : null}

          {kind === 'instant' ? (
            <>
              <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span className="text-xs">{text('instantConfirm')}</span>
              </div>
              {errorLine}
              <Button
                variant="outline"
                className="w-full border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await getVault().addSlot({ type: 'device' })
                    await onDone(text('addedToast'))
                  })
                }
              >
                {busy ? <Spinner label={t('common.working')} /> : text('choiceInstant')}
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type Way = 'biometric' | 'pin' | 'passphrase' | 'recovery'

/**
 * Open Crow again, without locking it: biometrics or a security key, the PIN
 * or pattern, the passphrase, or the recovery phrase, checked against the vault that is
 * already open. A wrong PIN here counts towards erasing it, as on the lock
 * screen.
 */
function ConfirmIdentity({ keyslots, onConfirmed }: { keyslots: KeyslotSummary[]; onConfirmed: () => void }) {
  const t = useI18n().t
  const text = useAccessText()
  const refreshKeyslots = useApp((s) => s.refreshKeyslots)
  const biometric = keyslots.find((slot) => slot.type === 'biometric')
  const method = gateName(biometric?.authenticator, t)
  const pin = keyslots.find((slot) => slot.type === 'pin')
  const style = pin?.style ?? 'digits'
  const offered = (['biometric', 'pin', 'passphrase', 'recovery'] as const).filter((type) =>
    keyslots.some((slot) => slot.type === type),
  )

  const [chosen, setWay] = useState<Way>(offered[0] as Way)
  const way = offered.includes(chosen) ? chosen : (offered[0] as Way)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = async (make: () => Promise<SlotSecret>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await getVault().verify(await make())
      onConfirmed()
    } catch (err) {
      setError(unlockError(err, t, { style, method }))
      setSecret('')
      if (way === 'pin') await refreshKeyslots()
    } finally {
      setBusy(false)
    }
  }

  const other: Record<Way, string> = {
    biometric: capitalize(text('confirmWith', { method })),
    pin: t('lock.useCode', { what: t(style === 'pattern' ? 'lock.pattern' : 'lock.pin') }),
    passphrase: t('lock.usePassphrase'),
    recovery: t('lock.useRecovery'),
  }

  const fieldLabel =
    way === 'recovery'
      ? t('lock.recoveryPhrase')
      : way === 'pin'
        ? t('lock.pin')
        : t('lock.passphrase')

  const errorLine = error ? (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {error}
    </p>
  ) : null

  return (
    <div className="flex flex-col gap-4">
      <DialogDescription>{text('confirmBody')}</DialogDescription>

      {way === 'biometric' && biometric?.credentialId ? (
        <>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() =>
              void check(async () => ({
                type: 'biometric',
                presence: await confirmBiometric({
                  credentialId: biometric.credentialId as string,
                  authenticator: biometric.authenticator,
                  transports: biometric.transports,
                }),
              }))
            }
          >
            {busy ? <Spinner label={t('common.working')} /> : other.biometric}
          </Button>
          {errorLine}
        </>
      ) : way === 'pin' && style === 'pattern' ? (
        <>
          <PatternPad
            label={t('lock.drawPattern')}
            disabled={busy}
            onDone={(code) => void check(async () => ({ type: 'pin', code }))}
          />
          {errorLine}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>{fieldLabel}</Label>
            {way === 'recovery' ? (
              <Textarea
                dir="ltr"
                autoFocus
                className="font-mono"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={secret}
                onChange={(event) => {
                  setSecret(event.target.value)
                  setError(null)
                }}
              />
            ) : (
              <Input
                type="password"
                dir={way === 'pin' ? 'ltr' : undefined}
                inputMode={way === 'pin' ? 'numeric' : undefined}
                autoFocus
                autoComplete={way === 'pin' ? 'off' : 'current-password'}
                value={secret}
                onChange={(event) => {
                  setSecret(way === 'pin' ? digitsOnly(event.target.value) : event.target.value)
                  setError(null)
                }}
              />
            )}
            {errorLine}
          </div>
          <Button
            className="w-full"
            disabled={busy || (way === 'pin' ? !isValidPin('digits', secret) : !secret.trim())}
            onClick={() =>
              void check(async () =>
                way === 'recovery'
                  ? { type: 'recovery', mnemonic: secret }
                  : way === 'pin'
                    ? { type: 'pin', code: secret }
                    : { type: 'passphrase', passphrase: secret },
              )
            }
          >
            {busy ? <Spinner label={t('common.working')} /> : t('common.confirm')}
          </Button>
        </>
      )}

      {offered
        .filter((candidate) => candidate !== way)
        .map((candidate) => (
          <Button
            key={candidate}
            variant="ghost"
            size="sm"
            onClick={() => {
              setWay(candidate)
              setSecret('')
              setError(null)
            }}
          >
            {other[candidate]}
          </Button>
        ))}
    </div>
  )
}
