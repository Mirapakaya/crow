import { Suspense, useCallback, useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useT } from '../../i18n'
import { goBack, useNavigate } from '../../crow/router'
import { Banner, CopyButton, Field } from '../components/primitives'
import { BackIcon, CameraIcon, QrIcon } from '../components/Icons'
import { QrCode, QrScanner } from '../lazyViews'
import { QrPlaceholder } from '../components/QrPlaceholder'
import {
  decodeInvite,
  extractInvitePayload,
  inviteLink,
  isInviteStale,
  type Invite,
} from '../../core/identity/invite'
import { parseProfilePointer } from '../../core/identity/keys'
import { isValidNpub, isValidNostrAddress } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'

type Mode = 'share' | 'scan' | 'paste'

/**
 * Contact exchange without a directory server.
 *
 * Three routes to the same place: show a QR in person, send a link over a
 * channel you already trust, or paste a key. The QR encodes the full invite
 * link so a generic camera app opens Crow directly.
 */
export function AddContact() {
  const t = useT()
  const navigate = useNavigate()
  const identity = useApp((s) => s.identity)
  const myInvite = useApp((s) => s.myInvite)
  const contacts = useApp((s) => s.contacts)
  const addContact = useApp((s) => s.addContact)
  const toast = useApp((s) => s.toast)

  const [mode, setMode] = useState<Mode>('share')
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)

  /*
   * Signed once per choice of relays, not once per render. It used to be
   * signed afresh on every render — every keystroke in the paste field — which
   * was wasted work and a QR code that never held still. And the relay choice
   * does change shortly after unlock: which relays are reachable is not known
   * for the first second or two.
   */
  const inviteRelays = useApp((s) => s.inviteRelays)
  const invite = useMemo(() => (identity ? myInvite(inviteRelays) : null), [myInvite, identity, inviteRelays])
  const link = invite ? inviteLink(invite) : ''

  const accept = useCallback(
    async (raw: string) => {
      setError(null)

      // Quick format validation before heavier invite/nprofile parsing.
      const trimmed = raw.trim()
      if (trimmed.startsWith('npub1')) {
        if (!isValidNpub(trimmed)) {
          setError(t('contacts.invalidInvite'))
          return
        }
      } else if (trimmed.includes('@') && !trimmed.startsWith('nostr:') && !trimmed.includes('://')) {
        if (!isValidNostrAddress(trimmed)) {
          setError(t('contacts.invalidInvite'))
          return
        }
      }

      const payload = extractInvitePayload(raw)

      // Either a signed invite (carries a name and relay hints) or a bare
      // npub/nprofile, which carries less but is still perfectly usable.
      let parsed: { pubkey: string; name: string; relays: string[] } | null = null

      if (payload) {
        let decoded: Invite
        try {
          decoded = decodeInvite(payload)
        } catch {
          setError(t('contacts.invalidInvite'))
          return
        }
        if (isInviteStale(decoded)) toast(t('contacts.staleInvite'))
        parsed = { pubkey: decoded.pubkey, name: decoded.name, relays: decoded.relays }
      } else {
        const pointer = parseProfilePointer(raw)
        if (pointer) parsed = { pubkey: pointer.pubkey, name: '', relays: pointer.relays }
      }

      if (!parsed) {
        setError(t('contacts.invalidInvite'))
        return
      }
      const { pubkey, name, relays } = parsed

      if (pubkey === identity?.pubkey) {
        setError(t('contacts.cannotAddSelf'))
        return
      }
      if (contacts.get(pubkey)?.accepted) {
        setError(t('contacts.alreadyAdded'))
        navigate({ name: 'chat', peer: pubkey })
        return
      }

      await addContact({ pubkey, name, relays, source: 'invite' })
      toast(t('contacts.added'))
      navigate({ name: 'chat', peer: pubkey })
    },
    [addContact, contacts, identity?.pubkey, navigate, t, toast],
  )

  return (
    <div className="screen">
      <header className="app-header">
        <Button size="icon" variant="ghost" aria-label={t('common.back')} title={t('common.back')} onClick={() => goBack()}>
          <BackIcon />
        </Button>
        <h1 className="grow">{t('contacts.addTitle')}</h1>
      </header>

      <div className="screen-scroll">
        <div className="container stack" style={{ maxWidth: '32rem' }}>
          <p className="muted">{t('contacts.addBody')}</p>

          <div className="row" role="tablist" style={{ gap: 'var(--space-2)' }}>
            <Button
              role="tab"
              aria-selected={mode === 'share'}
              variant={mode === 'share' ? 'default' : 'outline'} className="grow"
              onClick={() => setMode('share')}
            >
              <QrIcon size={16} />
              {t('contacts.myInvite')}
            </Button>
            <Button
              role="tab"
              aria-selected={mode === 'scan'}
              variant={mode === 'scan' ? 'default' : 'outline'} className="grow"
              onClick={() => setMode('scan')}
            >
              <CameraIcon size={16} />
              {t('contacts.scan')}
            </Button>
          </div>

          {mode === 'share' && invite ? (
            <div className="stack">
              <p className="muted small">{t('contacts.myInviteBody')}</p>
              <Suspense fallback={<QrPlaceholder />}>
                <QrCode value={link} label={t('contacts.myInvite')} />
              </Suspense>
              <div className="card stack-sm">
                <code className="mono small" style={{ wordBreak: 'break-all' }}>
                  {link}
                </code>
                <div className="row">
                  <CopyButton value={link} variant="outline" className="grow" />
                  {typeof navigator !== 'undefined' && 'share' in navigator ? (
                    <Button
                      variant="outline" className="grow"
                      onClick={() => {
                        void navigator.share({ title: 'Crow', text: link }).catch(() => undefined)
                      }}
                    >
                      {t('common.add')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'scan' ? (
            <div className="stack">
              <p className="muted small">{t('contacts.scanBody')}</p>
              <Suspense fallback={<QrPlaceholder scanner />}>
                <QrScanner onResult={(text) => void accept(text)} onCancel={() => setMode('share')} />
              </Suspense>
            </div>
          ) : null}

          <div className="stack-sm">
            <span className="section-title">{t('contacts.pasteInvite')}</span>
            <Field error={error ?? undefined}>
              <Textarea
                dir="ltr"
                style={{ minHeight: '4.5rem' }}
                placeholder={t('contacts.pastePlaceholder')}
                value={pasted}
                onChange={(event) => {
                  setPasted(event.target.value)
                  setError(null)
                }}
              />
            </Field>
            <Button
              
              disabled={!pasted.trim()}
              onClick={() => void accept(pasted)}
            >
              {t('common.add')}
            </Button>
          </div>

          <Banner tone="accent">
            <span className="small">{t('chat.verifyPromptBody')}</span>
          </Banner>
        </div>
      </div>
    </div>
  )
}
