import { useEffect, useRef, useState } from 'react'
import { useT, type TranslateFn } from '../../i18n'
import { Spinner } from '../components/primitives'
import { PatternPad } from '../components/PatternPad'
import { capitalize, gateName, unlockError } from '../biometric'
import { useAccessText, type AccessTextFn } from './accessText'
import {
  confirmBiometric,
  GateCancelledError,
  GateRefusedError,
  type GateAuthenticator,
  type GateCredential,
} from '../../core/crypto/biometricGate'
import {
  biometricSupport,
  enrolBiometric,
  forgetBiometric,
  type BiometricSupport,
} from '../../core/crypto/biometricEnrol'
import { canOpenInstantly, isValidPin, normalizePin } from '../../core/vault/keyslots'
import type { SlotEnrolment } from '../../core/vault/vault'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Progress } from '../../components/ui/progress'
import { cn } from '../../lib/utils'

export const MIN_PASSPHRASE = 10

/**
 * Rough passphrase strength.
 *
 * Deliberately not a full entropy estimator (zxcvbn is ~400 KB): the goal is to
 * steer people away from a single short word, which this does, and to be honest
 * that the meter is advice rather than a guarantee.
 */
export function passphraseStrength(value: string): 0 | 1 | 2 | 3 {
  const length = value.length
  const classes =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^\w\s]/.test(value)) +
    Number(/\s/.test(value))
  if (length < MIN_PASSPHRASE) return 0
  if (length >= 20 || (length >= 16 && classes >= 3)) return 3
  if (length >= 14 || classes >= 3) return 2
  return 1
}

/** Why a new passphrase cannot be used, or null if it can. */
export function passphraseProblem(passphrase: string, confirm: string, text: AccessTextFn): string | null {
  if (passphrase.length < MIN_PASSPHRASE) return text('passphraseTooShort')
  if (passphrase !== confirm) return text('passphraseMismatch')
  return null
}

/** A new passphrase, typed twice, with an honest strength meter. */
export function PassphraseFields({
  value,
  confirm,
  error,
  onChange,
  onConfirmChange,
  onSubmit,
}: {
  value: string
  confirm: string
  error: string | null
  onChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: () => void
}) {
  const text = useAccessText()
  const score = passphraseStrength(value)
  const label = [text('strengthWeak'), text('strengthFair'), text('strengthGood'), text('strengthStrong')][
    score
  ] as string
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>{text('passphrase')}</Label>
        <Input
          type="password"
          autoFocus
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-xs text-[var(--text-muted)]">{text('passphraseHint')}</span>
      </div>
      {value ? <StrengthMeter score={score} label={label} caption={text('passphraseStrength')} /> : null}
      <div className="flex flex-col gap-1.5">
        <Label>{text('passphraseConfirm')}</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => onConfirmChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit()
          }}
        />
        {error ? (
          <span className="text-sm text-[var(--danger)]" role="alert">{error}</span>
        ) : null}
      </div>
    </>
  )
}

/**
 * Four discrete bars rather than one filling bar.
 *
 * A continuous bar invites the reading "78% secure", which is not a claim this
 * heuristic can support. Discrete steps say what the estimate actually is: one
 * of four buckets.
 */
function StrengthMeter({ score, label, caption }: { score: 0 | 1 | 2 | 3; label: string; caption: string }) {
  const tone = score >= 2 ? 'good' : score === 1 ? 'fair' : 'weak'
  const barColor: Record<string, string> = {
    weak: 'bg-[var(--danger)]',
    fair: 'bg-[var(--warning)]',
    good: 'bg-[var(--success)]',
  }
  const textColor: Record<string, string> = {
    weak: 'text-[var(--danger)]',
    fair: 'text-[var(--warning)]',
    good: 'text-[var(--success)]',
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              'h-0.5 rounded-full transition-colors',
              index <= score ? barColor[tone] : 'bg-[var(--surface-3)]',
            )}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--text-muted)]">
        {caption}: <strong className={textColor[tone]}>{label}</strong>
      </span>
    </div>
  )
}

/** Whether biometrics can guard Crow here. Resolves once, after mount. */
export function useBiometricSupport(): BiometricSupport | null {
  const [support, setSupport] = useState<BiometricSupport | null>(null)
  useEffect(() => {
    let live = true
    void biometricSupport().then((result) => {
      if (live) setSupport(result)
    })
    return () => {
      live = false
    }
  }, [])
  return support
}

/**
 * Set a gate up: make a credential on the chosen authenticator, and confirm it
 * once, as unlocking will. If the confirming prompt is dismissed — or refused
 * for want of a tap — trying again asks the credential already made rather
 * than making another, which would leave a stray one in the person's list.
 */
export function useBiometricEnrolment(): (
  authenticator: GateAuthenticator,
) => Promise<Extract<SlotEnrolment, { type: 'biometric' }>> {
  const pending = useRef<GateCredential | null>(null)
  return async (authenticator) => {
    const waiting = pending.current
    if (waiting && waiting.authenticator !== authenticator) forgetBiometric(waiting.credentialId)
    const made = waiting?.authenticator === authenticator ? waiting : null
    pending.current = null
    try {
      const presence = made ? await confirmBiometric(made) : await enrolBiometric(authenticator)
      return { type: 'biometric', presence }
    } catch (err) {
      if (err instanceof GateCancelledError) pending.current = err.made ?? made
      else if (made) forgetBiometric(made.credentialId)
      throw err
    }
  }
}

/** Why this device's own authenticator cannot guard Crow here, before anyone is asked — or null if it can. */
export function biometricBlocked(
  support: BiometricSupport | null,
  text: AccessTextFn,
  method: string,
): string | null {
  if (support?.platform === 'unsupported') return support.family === 'linux' ? text('bioLinux') : null
  if (support?.platform !== 'not-set-up') return null
  const reason =
    support.family === 'apple'
      ? text('bioNotSetUpApple', { method })
      : support.family === 'windows'
        ? text('bioNotSetUpWindows')
        : support.family === 'android'
          ? text('bioNotSetUpAndroid')
          : text('bioNotSetUp', { method })
  return `${reason} ${text('bioPrivate')}`
}

/** What went wrong setting a gate up, in terms of what to do next. */
export function explainBiometric(err: unknown, text: AccessTextFn, t: TranslateFn, method: string): string {
  if (err instanceof GateCancelledError && err.made) return capitalize(text('bioFinish', { method }))
  if (err instanceof GateRefusedError) {
    return capitalize(text(err.reason === 'unverified' ? 'bioUnverifiedSetup' : 'bioFailed', { method }))
  }
  return unlockError(err, t, { method })
}

/** Only digits, in whichever script they were typed; everything else is dropped. */
export const digitsOnly = (value: string): string => value.replace(/[^\d\u06F0-\u06F9\u0660-\u0669]/g, '')

/** Why a new PIN cannot be used, or null if it can. */
export function pinProblem(pin: string, confirm: string, text: AccessTextFn): string | null {
  if (!isValidPin('digits', pin)) return text('pinTooShort')
  if (normalizePin(pin) !== normalizePin(confirm)) return text('pinMismatch')
  return null
}

/** A new PIN, typed twice. */
export function PinFields({
  value,
  confirm,
  error,
  onChange,
  onConfirmChange,
  onSubmit,
}: {
  value: string
  confirm: string
  error: string | null
  onChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: () => void
}) {
  const text = useAccessText()
  const inputProps = {
    type: 'password' as const,
    dir: 'ltr' as const,
    inputMode: 'numeric' as const,
    maxLength: 16,
    autoComplete: 'off' as const,
    className: 'font-mono tracking-[0.2em]',
  }
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>{text('pin')}</Label>
        <Input
          {...inputProps}
          autoFocus
          value={value}
          onChange={(event) => onChange(digitsOnly(event.target.value))}
        />
        <span className="text-xs text-[var(--text-muted)]">{text('pinHint')}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{text('pinConfirm')}</Label>
        <Input
          {...inputProps}
          value={confirm}
          onChange={(event) => onConfirmChange(digitsOnly(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit()
          }}
        />
        {error ? (
          <span className="text-sm text-[var(--danger)]" role="alert">{error}</span>
        ) : null}
      </div>
    </>
  )
}

/**
 * A new pattern, drawn twice. The second drawing must match the first, and a
 * mismatch starts again from the beginning, as phones do.
 */
export function PatternSetup({
  onComplete,
  disabled,
}: {
  onComplete: (code: string) => void
  disabled?: boolean
}) {
  const text = useAccessText()
  const [first, setFirst] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prompt = first ? text('patternAgain') : text('patternDraw')
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-center text-[var(--text-muted)]">{prompt}</p>
      <PatternPad
        label={prompt}
        disabled={disabled}
        onDone={(code) => {
          if (!first) {
            if (!isValidPin('pattern', code)) return setError(text('patternTooShort'))
            setError(null)
            return setFirst(code)
          }
          if (code !== first) {
            setFirst(null)
            return setError(text('patternMismatch'))
          }
          setError(null)
          onComplete(code)
        }}
      />
      {error ? (
        <p className="text-sm text-center text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {first ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFirst(null)
            setError(null)
          }}
        >
          {text('patternRestart')}
        </Button>
      ) : null}
    </div>
  )
}

type Choice = 'biometric' | 'security-key' | 'pin' | 'pattern' | 'passphrase' | 'instant'

/**
 * "How should this device open Crow?", asked in outcomes rather than
 * mechanisms (ADR-054, ADR-058, ADR-059): the device's biometrics, a PIN, a
 * pattern, a passphrase, or opening instantly — and, where the device has no
 * authenticator of its own to use, a security key. Each says plainly what it
 * stops and what it does not. Biometrics are chosen by default where they are
 * set up; a PIN otherwise. A PIN or pattern is offered only where the recovery
 * phrase will open the device too, since too many wrong tries erase it.
 */
export function ProtectionChooser({
  onChoose,
  recoveryNote,
}: {
  onChoose: (enrolment: SlotEnrolment) => Promise<void>
  recoveryNote: boolean
}) {
  const t = useT()
  const text = useAccessText()
  const support = useBiometricSupport()
  const enrolBiometricSlot = useBiometricEnrolment()

  const [picked, setPicked] = useState<Choice | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)

  const choice: Choice | null =
    picked ??
    (support === null ? null : support.platform === 'yes' ? 'biometric' : recoveryNote ? 'pin' : 'passphrase')
  const gate: GateAuthenticator = choice === 'security-key' ? 'security-key' : 'platform'
  const method = gateName(gate, t)

  const pick = (next: Choice) => {
    setPicked(next)
    setError(null)
  }

  const go = async (pattern?: string) => {
    if (busy || !choice) return
    setError(null)
    const problem =
      choice === 'passphrase'
        ? passphraseProblem(passphrase, confirm, text)
        : choice === 'pin'
          ? pinProblem(pin, pinConfirm, text)
          : null
    if (problem) return setError(problem)
    setBusy(true)
    setProgress(0)
    try {
      const enrolment: SlotEnrolment =
        choice === 'biometric' || choice === 'security-key'
          ? await enrolBiometricSlot(gate)
          : choice === 'instant'
            ? { type: 'device' }
            : choice === 'passphrase'
              ? { type: 'passphrase', passphrase, onProgress: setProgress }
              : {
                  type: 'pin',
                  style: choice === 'pin' ? 'digits' : 'pattern',
                  code: choice === 'pin' ? pin : (pattern as string),
                  onProgress: setProgress,
                }
      await onChoose(enrolment)
    } catch (err) {
      setError(
        choice === 'biometric' || choice === 'security-key'
          ? explainBiometric(err, text, t, method)
          : err instanceof Error
            ? err.message
            : String(err),
      )
    } finally {
      setBusy(false)
    }
  }

  const platform = gateName('platform', t)
  const blocked = biometricBlocked(support, text, platform)
  const options: { value: Choice; title: string; body: string; disabled?: boolean }[] = []
  if (support?.platform === 'yes' || blocked) {
    options.push({
      value: 'biometric',
      title: capitalize(platform),
      body: blocked ?? text('choiceBiometricBody', { method: platform }),
      disabled: Boolean(blocked),
    })
  }
  if (support?.securityKey && support.platform !== 'yes') {
    options.push({ value: 'security-key', title: text('choiceKey'), body: text('choiceKeyBody') })
  }
  if (recoveryNote) {
    options.push(
      { value: 'pin', title: text('choicePin'), body: text('choicePinBody') },
      { value: 'pattern', title: text('choicePattern'), body: text('choicePatternBody') },
    )
  }
  options.push({ value: 'passphrase', title: text('choicePassphrase'), body: text('choicePassphraseBody') })
  if (canOpenInstantly()) {
    options.push({ value: 'instant', title: text('choiceInstant'), body: text('choiceInstantBody') })
  }

  const errorLine = error ? (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {error}
    </p>
  ) : null

  const heading = (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold text-[var(--text)]">{text('protectTitle')}</h1>
      <p className="text-sm text-[var(--text-muted)]">{text('protectBody')}</p>
    </div>
  )

  if (!choice) {
    return (
      <>
        {heading}
        <Spinner label={t('common.loading')} />
      </>
    )
  }

  return (
    <>
      {heading}

      <div className="grid gap-2" role="radiogroup" aria-label={text('protectTitle')}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            className={cn(
              'flex w-full flex-col gap-1 rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-colors',
              choice === option.value
                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
              option.disabled && choice !== option.value && 'cursor-not-allowed',
            )}
            aria-checked={choice === option.value}
            disabled={busy || option.disabled}
            onClick={() => pick(option.value)}
          >
            <span className={cn(
              'text-sm font-medium',
              option.disabled && choice !== option.value ? 'text-[var(--text-muted)]' : 'text-[var(--text)]',
            )}>
              {option.title}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{option.body}</span>
          </button>
        ))}
      </div>

      {choice === 'passphrase' ? (
        <PassphraseFields
          value={passphrase}
          confirm={confirm}
          error={error}
          onChange={setPassphrase}
          onConfirmChange={setConfirm}
          onSubmit={() => void go()}
        />
      ) : choice === 'pin' ? (
        <PinFields
          value={pin}
          confirm={pinConfirm}
          error={error}
          onChange={setPin}
          onConfirmChange={setPinConfirm}
          onSubmit={() => void go()}
        />
      ) : choice === 'pattern' ? (
        <>
          <PatternSetup disabled={busy} onComplete={(code) => void go(code)} />
          {errorLine}
        </>
      ) : (
        errorLine
      )}

      {busy && choice !== 'biometric' && choice !== 'instant' ? (
        <Progress value={Math.round(progress * 100)} />
      ) : null}

      {choice === 'biometric' || choice === 'security-key' ? (
        <p className="text-xs text-[var(--text-muted)]">{capitalize(text('twoPrompts', { method }))}</p>
      ) : null}

      {recoveryNote ? <p className="text-xs text-[var(--text-muted)]">{text('recoveryNote')}</p> : null}

      {choice === 'pattern' ? null : (
        <Button className="w-full" disabled={busy} onClick={() => void go()}>
          {busy ? <Spinner label={t('common.working')} /> : t('common.next')}
        </Button>
      )}
    </>
  )
}
