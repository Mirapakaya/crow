import { useMemo, useState } from 'react'
import { getRepo, useApp } from '../../crow/store'
import { useT } from '../../i18n'
import { Banner, Field } from '../components/primitives'
import { randomInt } from '../../core/util/bytes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * The recovery-phrase ceremony.
 *
 * Driven by persisted identity state (`mnemonicBackedUp`) rather than local
 * component state, so it survives a reload, a crash, or a closed tab. Someone
 * who abandons it halfway is asked again next time rather than silently ending
 * up with an unrecoverable identity — which is what happens when this step is
 * treated as one screen in a wizard.
 */
export function BackupCeremony({ mnemonic }: { mnemonic: string }) {
  const t = useT()
  const deferBackup = useApp((s) => s.deferBackup)
  const setIdentity = useApp((s) => s.updateProfile)

  const words = useMemo(() => mnemonic.split(' '), [mnemonic])
  const [revealed, setRevealed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [index] = useState(() => randomInt(words.length))
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)

  const complete = async () => {
    await getRepo().updateIdentity({ mnemonicBackedUp: true })
    // Re-read through the store so the shell drops this screen.
    await setIdentity({ mnemonicBackedUp: true })
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="w-full max-w-[32rem] mx-auto px-4 py-6 flex flex-col gap-4">
        {!verifying ? (
          <>
            <div className="flex flex-col gap-2">
              <h1>{t('onboarding.backupTitle')}</h1>
              <p className="text-muted-foreground">{t('onboarding.backupBody')}</p>
            </div>

            <div
              className={cn(
                'grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2',
                !revealed && 'blur-md select-none pointer-events-none',
              )}
              aria-hidden={!revealed}
            >
              {words.map((word, position) => (
                <div key={position} className="flex items-baseline gap-2 rounded-sm bg-muted px-3 py-2 font-mono text-sm">
                  <span>{position + 1}</span>
                  {word}
                </div>
              ))}
            </div>

            {!revealed ? (
              <Button variant="outline" className="w-full" onClick={() => setRevealed(true)}>
                {t('onboarding.backupReveal')}
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setVerifying(true)}>
                {t('onboarding.backupConfirm')}
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => deferBackup()}>
              {t('onboarding.skipBackup')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">{t('onboarding.skipBackupWarning')}</p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1>{t('onboarding.verifyTitle')}</h1>
              <p className="text-muted-foreground">{t('onboarding.verifyBody', { n: index + 1 })}</p>
            </div>

            <Field error={error ?? undefined}>
              <Input
                className="font-mono text-sm"
                dir="ltr"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  if (answer.trim().toLowerCase() === words[index]) void complete()
                  else setError(t('onboarding.verifyWrong'))
                }}
              />
            </Field>

            <Button
              className="w-full"
              disabled={!answer.trim()}
              onClick={() => {
                if (answer.trim().toLowerCase() === words[index]) void complete()
                else setError(t('onboarding.verifyWrong'))
              }}
            >
              {t('common.confirm')}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setVerifying(false)}>
              {t('common.back')}
            </Button>
          </>
        )}

        <Banner tone="warning">
          <span className="text-xs">{t('lock.forgotBodyRecovery')}</span>
        </Banner>
      </div>
    </div>
  )
}
