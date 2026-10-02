import { useState } from 'react'
import { useApp } from '../../crow/store'
import { useT } from '../../i18n'
import { Field } from '../components/primitives'
import { EntryLayout } from '../components/EntryLayout'
import { ShieldCheckIcon, LockIcon, GlobeIcon } from '../components/Icons'
import { isValidMnemonic, normalizeMnemonic } from '../../core/identity/keys'
import { useAccessText } from '../access/accessText'
import { ProtectionChooser } from '../access/protection'
import { RestoreBackup } from './RestoreBackup'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'

type Step = 'welcome' | 'restore' | 'restore-file' | 'name' | 'protect'

/**
 * First run: an identity, a name, and how this device opens Crow.
 *
 * There is no passphrase step. The last question is asked in outcomes — the
 * device's biometrics, a PIN, a pattern, a passphrase, or opening instantly —
 * and the twelve words the identity comes from open the vault as well,
 * whichever is chosen (ADR-054, ADR-058). Loaded as its own chunk: a
 * returning user never sees it.
 */
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
          <div className="stack-sm">
            <span className="entry-eyebrow">{text('eyebrow')}</span>
            <h1>{text('welcomeTitle')}</h1>
            <p className="muted">{text('welcomeBody')}</p>
          </div>

          <ul className="feature-list">
            {[
              [<ShieldCheckIcon key="i" size={15} />, text('point1')],
              [<LockIcon key="i" size={15} />, text('point2')],
              [<GlobeIcon key="i" size={15} />, text('point3')],
            ].map(([icon, line], index) => (
              <li key={index}>
                <span className="feature-icon" aria-hidden="true">
                  {icon}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="stack-sm">
            <Button  onClick={() => setStep('name')}>
              {text('createIdentity')}
            </Button>
            <Button variant="outline" block onClick={() => setStep('restore')}>
              {text('restoreIdentity')}
            </Button>
          </div>

          <p className="hint center">{t('privacy.intro')}</p>
        </>
      ) : null}

      {step === 'restore' ? (
        <>
          <div className="stack-sm">
            <h1>{text('restoreTitle')}</h1>
            <p className="muted">{text('restoreBody')}</p>
          </div>
          <Field label={text('restorePhrase')} error={error ?? undefined}>
            <Textarea
              className="mono"
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
            />
          </Field>
          <div className="stack-sm">
            <Button
              
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
            <Button variant="outline" block onClick={() => setStep('restore-file')}>
              {text('restoreFromFile')}
            </Button>
            <Button variant="ghost" block onClick={() => setStep('welcome')}>
              {t('common.back')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 'name' ? (
        <>
          <div className="stack-sm">
            <h1>{text('nameTitle')}</h1>
            <p className="muted">{text('nameBody')}</p>
          </div>
          <Field>
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
          </Field>
          <div className="stack-sm">
            <Button
              
              disabled={!name.trim()}
              onClick={() => setStep('protect')}
            >
              {t('common.next')}
            </Button>
            <Button variant="ghost" block onClick={() => setStep('welcome')}>
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
              // The shell takes over from here: it shows the recovery-phrase
              // ceremony whenever the stored identity is not yet backed up.
            }}
          />
          <Button variant="ghost" block onClick={() => setStep('name')}>
            {t('common.back')}
          </Button>
        </>
      ) : null}
    </EntryLayout>
  )
}
