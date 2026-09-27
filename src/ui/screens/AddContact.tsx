import { Suspense, useCallback, useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
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
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { CopyButton } from '../components/primitives'
import { ArrowLeft, QrCode as QrIcon, Camera, Share2, Shield } from 'lucide-react'

type Mode = 'share' | 'scan' | 'paste'

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

  const inviteRelays = useApp((s) => s.inviteRelays)
  const invite = useMemo(() => (identity ? myInvite(inviteRelays) : null), [myInvite, identity, inviteRelays])
  const link = invite ? inviteLink(invite) : ''

  const accept = useCallback(
    async (raw: string) => {
      setError(null)
      const payload = extractInvitePayload(raw)

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('contacts.addTitle')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[32rem] flex flex-col gap-4 p-4">
          <p className="text-sm text-[var(--text-muted)]">{t('contacts.addBody')}</p>

          <div className="flex gap-2" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'share'}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 h-9 rounded-[var(--radius-md)] border text-sm font-medium cursor-pointer transition-colors',
                mode === 'share'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-transparent'
                  : 'bg-transparent text-[var(--text)] border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
              )}
              onClick={() => setMode('share')}
            >
              <QrIcon size={16} />
              {t('contacts.myInvite')}
            </button>
            <button
              role="tab"
              aria-selected={mode === 'scan'}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 h-9 rounded-[var(--radius-md)] border text-sm font-medium cursor-pointer transition-colors',
                mode === 'scan'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-transparent'
                  : 'bg-transparent text-[var(--text)] border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
              )}
              onClick={() => setMode('scan')}
            >
              <Camera size={16} />
              {t('contacts.scan')}
            </button>
          </div>

          {mode === 'share' && invite ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-muted)]">{t('contacts.myInviteBody')}</p>
              <Suspense fallback={<QrPlaceholder />}>
                <QrCode value={link} label={t('contacts.myInvite')} />
              </Suspense>
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
                <code className="font-mono text-xs text-[var(--text)] break-all">
                  {link}
                </code>
                <div className="flex gap-2">
                  <CopyButton value={link} className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] h-9 px-4 cursor-pointer transition-colors" />
                  {typeof navigator !== 'undefined' && 'share' in navigator ? (
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                      void navigator.share({ title: 'Crow', text: link }).catch(() => undefined)
                    }}>
                      <Share2 size={14} />
                      {t('common.add')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'scan' ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-muted)]">{t('contacts.scanBody')}</p>
              <Suspense fallback={<QrPlaceholder scanner />}>
                <QrScanner onResult={(text) => void accept(text)} onCancel={() => setMode('share')} />
              </Suspense>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
              {t('contacts.pasteInvite')}
            </span>
            <div className="flex flex-col gap-1.5">
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
              {error ? (
                <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
              ) : null}
            </div>
            <Button
              className="w-full"
              disabled={!pasted.trim()}
              onClick={() => void accept(pasted)}
            >
              {t('common.add')}
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
            <Shield size={14} />
            {t('chat.verifyPromptBody')}
          </div>
        </div>
      </div>
    </div>
  )
}
