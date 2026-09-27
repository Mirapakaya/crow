import { useMemo, useState } from 'react'
import { getRepo, useApp } from '../../app/store'
import { useT } from '../../i18n'
import { randomInt } from '../../core/util/bytes'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ArrowLeft, Eye, AlertTriangle } from 'lucide-react'

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
    await setIdentity({ mnemonicBackedUp: true })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[32rem] flex flex-col gap-4 p-4 py-6">
        {!verifying ? (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{t('onboarding.backupTitle')}</h1>
              <p className="text-sm text-[var(--text-muted)]">{t('onboarding.backupBody')}</p>
            </div>

            <div className={`grid grid-cols-3 gap-2 ${!revealed ? 'blur-[7px] select-none pointer-events-none' : ''}`} aria-hidden={!revealed}>
              {words.map((word, position) => (
                <div key={position} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono">
                  <span className="text-[0.6875rem] text-[var(--text-faint)] tabular-nums">{position + 1}</span>
                  <span className="text-[var(--text)]">{word}</span>
                </div>
              ))}
            </div>

            {!revealed ? (
              <Button variant="outline" className="w-full gap-2" onClick={() => setRevealed(true)}>
                <Eye size={16} />
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
            <p className="text-center text-xs text-[var(--text-muted)]">{t('onboarding.skipBackupWarning')}</p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{t('onboarding.verifyTitle')}</h1>
              <p className="text-sm text-[var(--text-muted)]">{t('onboarding.verifyBody', { n: index + 1 })}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('onboarding.verifyBody', { n: index + 1 })}</Label>
              <Input
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
                className="font-mono"
              />
              {error ? (
                <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
              ) : null}
            </div>

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
            <Button variant="ghost" className="w-full gap-2" onClick={() => setVerifying(false)}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </Button>
          </>
        )}

        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-xs text-[var(--warning)]">
          <AlertTriangle size={14} />
          {t('lock.forgotBodyRecovery')}
        </div>
      </div>
    </div>
  )
}
