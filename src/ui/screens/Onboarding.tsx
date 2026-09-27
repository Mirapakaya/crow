import { useState } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { EntryLayout } from '../components/EntryLayout'
import { isValidMnemonic, normalizeMnemonic } from '../../core/identity/keys'
import { useAccessText } from '../access/accessText'
import { ProtectionChooser } from '../access/protection'
import { RestoreBackup } from './RestoreBackup'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { ShieldCheck, Lock, Globe, ArrowRight, ArrowLeft, FileUp } from 'lucide-react'

type Step = 'welcome' | 'restore' | 'restore-file' | 'name' | 'protect'

export function Onboarding() {
  const t = useT()
  const text = useAccessText()
  const createVault = useApp((s) => s.createVault)

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [restorePhrase, setRestorePhrase] = useState('')

  if (step === 'restore-file') return <RestoreBackup onCancel={() => setStep('welcome')} />

  return (
    <EntryLayout>
      {step === 'welcome' ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--accent-text)] [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
              {text('eyebrow')}
            </span>
            <h1 className="text-[clamp(1.5rem,1.28rem+0.9vw,1.9rem)] font-bold tracking-tight text-[var(--text)]">
              {text('welcomeTitle')}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">{text('welcomeBody')}</p>
          </div>

          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {[
              [<ShieldCheck key="i" size={15} strokeWidth={1.75} />, text('point1')],
              [<Lock key="i" size={15} strokeWidth={1.75} />, text('point2')],
              [<Globe key="i" size={15} strokeWidth={1.75} />, text('point3')],
            ].map(([icon, line], index) => (
              <li key={index} className="grid grid-cols-[auto_1fr] items-start gap-3 text-sm text-[var(--text-muted)]">
                <span className="grid size-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent-text)] shrink-0" aria-hidden="true">
                  {icon}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" onClick={() => setStep('name')}>
              {text('createIdentity')}
              <ArrowRight size={16} />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep('restore')}>
              {text('restoreIdentity')}
            </Button>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)]">{t('privacy.intro')}</p>
        </>
      ) : null}

      {step === 'restore' ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{text('restoreTitle')}</h1>
            <p className="text-sm text-[var(--text-muted)]">{text('restoreBody')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{text('restorePhrase')}</Label>
            <Textarea
              dir="ltr"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={text('restorePhrasePlaceholder')}
              value={restorePhrase}
              onChange={(event) => {
                setRestorePhrase(event.target.value)
                setError(null)
              }}
              className="font-mono"
            />
            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                if (!isValidMnemonic(restorePhrase)) {
                  setError(text('restoreInvalid'))
                  return
                }
                setError(null)
                setStep('name')
              }}
            >
              {t('common.next')}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => setStep('restore-file')}>
              <FileUp size={16} />
              {text('restoreFromFile')}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={() => setStep('welcome')}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 'name' ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{text('nameTitle')}</h1>
            <p className="text-sm text-[var(--text-muted)]">{text('nameBody')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Input
              autoFocus
              maxLength={64}
              placeholder={text('namePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim()) setStep('protect')
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={!name.trim()} onClick={() => setStep('protect')}>
              {t('common.next')}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={() => setStep('welcome')}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 'protect' ? (
        <>
          <ProtectionChooser
            recoveryNote
            onChoose={async (protection) => {
              await createVault({
                name,
                protection,
                mnemonic: restorePhrase ? normalizeMnemonic(restorePhrase) : undefined,
              })
            }}
          />
          <Button variant="ghost" className="w-full gap-2" onClick={() => setStep('name')}>
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>
        </>
      ) : null}
    </EntryLayout>
  )
}
