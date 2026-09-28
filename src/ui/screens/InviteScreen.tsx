import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useT } from '../../i18n'
import { useNavigate } from '../../crow/router'
import { Avatar, Banner } from '../components/primitives'
import { decodeInvite, isInviteStale, type Invite } from '../../core/identity/invite'
import { shortNpub, toNpub } from '../../core/identity/keys'
import { relayLabel } from '../../core/transport/relayUrl'
import { Button } from '@/components/ui/button'

/**
 * Landing screen for `#/i/<payload>` links.
 *
 * The payload lives in the URL fragment, which the browser never sends to the
 * web server — so following an invite link reveals nothing to whoever hosts
 * the app, only to whoever you got the link from.
 */
export function InviteScreen({ payload }: { payload: string }) {
  const t = useT()
  const navigate = useNavigate()
  const identity = useApp((s) => s.identity)
  const contacts = useApp((s) => s.contacts)
  const addContact = useApp((s) => s.addContact)
  const toast = useApp((s) => s.toast)
  const [busy, setBusy] = useState(false)

  const decoded = useMemo<{ invite: Invite } | { error: string }>(() => {
    try {
      return { invite: decodeInvite(payload) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }, [payload])

  // Strip the invite out of the address bar once handled, so it does not sit in
  // history or get re-shared by accident.
  useEffect(() => {
    if ('error' in decoded) return
    if (decoded.invite.pubkey === identity?.pubkey) navigate({ name: 'chats' }, true)
  }, [decoded, identity?.pubkey, navigate])

  if ('error' in decoded) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4">
          <Banner tone="danger">{t('contacts.invalidInvite')}</Banner>
          <Button variant="outline" className="w-full" onClick={() => navigate({ name: 'chats' }, true)}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    )
  }

  const { invite } = decoded
  const existing = contacts.get(invite.pubkey)
  const name = invite.name || shortNpub(toNpub(invite.pubkey))

  const accept = async () => {
    setBusy(true)
    try {
      await addContact({
        pubkey: invite.pubkey,
        name: invite.name,
        relays: invite.relays,
        source: 'invite',
      })
      toast(t('contacts.added'))
      navigate({ name: 'chat', peer: invite.pubkey }, true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div
        className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4 text-center"
        style={{ maxWidth: '28rem', paddingBlock: '2rem' }}
      >
        <div className="grid place-items-center">
          <Avatar name={name} seed={invite.pubkey} size="lg" />
        </div>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <code className="font-mono text-sm text-muted-foreground/70 break-all">{toNpub(invite.pubkey)}</code>

        {invite.relays.length > 0 ? (
          <p className="text-sm text-muted-foreground/70">{invite.relays.map(relayLabel).join(' · ')}</p>
        ) : null}

        {isInviteStale(invite) ? <Banner tone="warning">{t('contacts.staleInvite')}</Banner> : null}

        {existing?.accepted ? (
          <>
            <Banner tone="accent">{t('contacts.alreadyAdded')}</Banner>
            <Button className="w-full" onClick={() => navigate({ name: 'chat', peer: invite.pubkey }, true)}>
              {t('nav.chats')}
            </Button>
          </>
        ) : (
          <Button className="w-full" disabled={busy} onClick={() => void accept()}>
            {t('contacts.add')}
          </Button>
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate({ name: 'chats' }, true)}>
          {t('common.cancel')}
        </Button>

        <Banner tone="accent">
          <span className="text-xs">{t('chat.verifyPromptBody')}</span>
        </Banner>
      </div>
    </div>
  )
}
