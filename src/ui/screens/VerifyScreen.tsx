import { Suspense, useMemo } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { goBack } from '../../app/router'
import { CopyButton } from '../components/primitives'
import { QrCode } from '../lazyViews'
import { QrPlaceholder } from '../components/QrPlaceholder'
import { safetyNumber } from '../../core/crypto/safetyNumber'
import { displayName } from './ChatList'
import { Button } from '../../components/ui/button'
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react'

export function VerifyScreen({ peer }: { peer: string }) {
  const t = useT()
  const identity = useApp((s) => s.identity)
  const contacts = useApp((s) => s.contacts)
  const updateContact = useApp((s) => s.updateContact)
  const toast = useApp((s) => s.toast)

  const contact = contacts.get(peer)
  const number = useMemo(() => (identity ? safetyNumber(identity.pubkey, peer) : null), [identity, peer])

  if (!identity || !number) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-12 text-[var(--text-muted)]">
        <p className="text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  const name = displayName(contact, peer)
  const verified = contact?.verification === 'verified'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('verify.title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[30rem] flex flex-col gap-4 p-4">
          <p className="text-sm text-[var(--text-muted)]">{t('verify.body', { name })}</p>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
            <div className="flex justify-center gap-2 text-xl" dir="ltr" aria-hidden="true">
              {number.emoji.map((glyph, index) => (
                <span key={index}>{glyph}</span>
              ))}
            </div>
            <div
              className="grid grid-cols-3 gap-2 font-mono text-base tracking-[0.05em] text-center"
              dir="ltr"
              aria-label={number.groups.join(' ')}
            >
              {number.groups.map((group, index) => (
                <span key={index}>{group}</span>
              ))}
            </div>
            <CopyButton
              value={number.groups.join(' ')}
              className="flex w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-transparent h-9 px-4 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
            />
          </div>

          <Suspense fallback={<QrPlaceholder />}>
            <QrCode value={`crow-sn:${number.compact}`} label={t('verify.title')} />
          </Suspense>

          {verified ? (
            <>
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
                <ShieldCheck size={16} />
                {t('verify.verifiedAt')}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void updateContact(peer, { verification: 'unverified' })}
              >
                {t('verify.markUnverified')}
              </Button>
            </>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={() => {
                void updateContact(peer, { verification: 'verified' })
                toast(t('contacts.verified'))
              }}
            >
              <ShieldCheck size={16} />
              {t('verify.markVerified')}
            </Button>
          )}

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <ShieldAlert size={16} />
              {t('verify.mismatchTitle')}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">{t('verify.mismatchBody')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
