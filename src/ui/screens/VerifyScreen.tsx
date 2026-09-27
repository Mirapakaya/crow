import { Suspense, useMemo } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { goBack } from '../../app/router'
import { CopyButton, EmptyState } from '../components/primitives'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
// Through the lazy table rather than directly: a static import here would make
// the QR module reachable from two chunks, and the bundler would hoist it into
// a shared chunk that is not named lazy — and so back into the precache.
import { QrCode } from '../lazyViews'
import { QrPlaceholder } from '../components/QrPlaceholder'
import { safetyNumber } from '../../core/crypto/safetyNumber'
import { displayName } from './ChatList'
import { useVerifyText } from './verifyText'

/**
 * The safety-number ceremony.
 *
 * This is the only step that turns "encrypted to some key" into "encrypted to
 * the person I mean". Everything else in the app protects the channel; this
 * protects against having been handed the wrong key in the first place, which
 * no amount of cryptography can detect on its own.
 */
export function VerifyScreen({ peer }: { peer: string }) {
  const t = useT()
  const text = useVerifyText()
  const identity = useApp((s) => s.identity)
  const contacts = useApp((s) => s.contacts)
  const updateContact = useApp((s) => s.updateContact)
  const toast = useApp((s) => s.toast)

  const contact = contacts.get(peer)
  const number = useMemo(() => (identity ? safetyNumber(identity.pubkey, peer) : null), [identity, peer])

  if (!identity || !number) {
    return <EmptyState title={t('common.loading')} />
  }

  const name = displayName(contact, peer)
  const verified = contact?.verification === 'verified'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{text('title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[30rem] flex flex-col gap-4 p-4">
          <p className="text-sm text-[var(--text-muted)]">{text('body', { name })}</p>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
            <div className="safety-emoji" aria-hidden="true">
              {number.emoji.map((glyph, index) => (
                <span key={index}>{glyph}</span>
              ))}
            </div>
            <div className="safety-number" aria-label={number.groups.join(' ')}>
              {number.groups.map((group, index) => (
                <span key={index}>{group}</span>
              ))}
            </div>
            <CopyButton value={number.groups.join(' ')} className="btn btn-outline btn-block" />
          </div>

          <Suspense fallback={<QrPlaceholder />}>
            <QrCode value={`crow-sn:${number.compact}`} label={text('title')} />
          </Suspense>

          {verified ? (
            <>
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-text)]">
                <ShieldCheck size={16} />
                <span>{text('verifiedAt')}</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => void updateContact(peer, { verification: 'unverified' })}>
                {text('markUnverified')}
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => {
              void updateContact(peer, { verification: 'verified' })
              toast(t('contacts.verified'))
            }}>
              <ShieldCheck size={16} />
              {text('markVerified')}
            </Button>
          )}

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
            <h3 style={{ fontSize: 'var(--step-0)' }}>{text('mismatchTitle')}</h3>
            <p className="text-sm text-[var(--text-muted)]">{text('mismatchBody')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
