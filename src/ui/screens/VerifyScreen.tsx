import { Suspense, useMemo } from 'react'
import { useApp } from '../../crow/store'
import { useT } from '../../i18n'
import { goBack } from '../../crow/router'
import { Banner, CopyButton, EmptyState } from '../components/primitives'
import { BackIcon, ShieldCheckIcon } from '../components/Icons'
// Through the lazy table rather than directly: a static import here would make
// the QR module reachable from two chunks, and the bundler would hoist it into
// a shared chunk that is not named lazy — and so back into the precache.
import { QrCode } from '../lazyViews'
import { QrPlaceholder } from '../components/QrPlaceholder'
import { safetyNumber } from '../../core/crypto/safetyNumber'
import { displayName } from './ChatList'
import { useVerifyText } from './verifyText'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <BackIcon />
        </Button>
        <h1 className="flex-1 min-w-0">{text('title')}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4" style={{ maxWidth: '30rem' }}>
          <p className="text-muted-foreground">{text('body', { name })}</p>

          <Card className="flex flex-col gap-4 p-4">
            <div className="flex justify-center gap-2 text-2xl" dir="ltr" aria-hidden="true">
              {number.emoji.map((glyph, index) => (
                <span key={index}>{glyph}</span>
              ))}
            </div>
            <div
              className="grid grid-cols-3 gap-2 font-mono text-base tracking-wider text-center"
              dir="ltr"
              aria-label={number.groups.join(' ')}
            >
              {number.groups.map((group, index) => (
                <span key={index}>{group}</span>
              ))}
            </div>
            <CopyButton value={number.groups.join(' ')} className="w-full" />
          </Card>

          <Suspense fallback={<QrPlaceholder />}>
            <QrCode value={`crow-sn:${number.compact}`} label={text('title')} />
          </Suspense>

          {verified ? (
            <>
              <Banner tone="accent">
                <ShieldCheckIcon size={16} />
                <span>{text('verifiedAt')}</span>
              </Banner>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void updateContact(peer, { verification: 'unverified' })}
              >
                {text('markUnverified')}
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                void updateContact(peer, { verification: 'verified' })
                toast(t('contacts.verified'))
              }}
            >
              <ShieldCheckIcon size={16} />
              {text('markVerified')}
            </Button>
          )}

          <Card className="flex flex-col gap-2 p-4">
            <h3 className="text-base font-semibold">{text('mismatchTitle')}</h3>
            <p className="text-sm text-muted-foreground">{text('mismatchBody')}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
