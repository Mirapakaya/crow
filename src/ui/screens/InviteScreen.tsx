import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useT } from '../../i18n'
import { useNavigate } from '../../app/router'
import { Avatar } from '../components/primitives'
import { decodeInvite, isInviteStale, type Invite } from '../../core/identity/invite'
import { shortNpub, toNpub } from '../../core/identity/keys'
import { relayLabel } from '../../core/transport/relayUrl'
import { Button } from '../../components/ui/button'
import { AlertTriangle, Shield, MessageSquare } from 'lucide-react'

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

  useEffect(() => {
    if ('error' in decoded) return
    if (decoded.invite.pubkey === identity?.pubkey) navigate({ name: 'chats' }, true)
  }, [decoded, identity?.pubkey, navigate])

  if ('error' in decoded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[28rem] flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--danger)]">
            {t('contacts.invalidInvite')}
          </div>
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[28rem] flex flex-col items-center gap-4 p-4 py-6 text-center">
        <Avatar name={name} seed={invite.pubkey} size="lg" />
        <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{name}</h1>
        <code className="font-mono text-xs text-[var(--text-faint)] break-all">
          {toNpub(invite.pubkey)}
        </code>

        {invite.relays.length > 0 ? (
          <p className="text-[0.75rem] text-[var(--text-faint)]">{invite.relays.map(relayLabel).join(' · ')}</p>
        ) : null}

        {isInviteStale(invite) ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
            <AlertTriangle size={16} />
            {t('contacts.staleInvite')}
          </div>
        ) : null}

        {existing?.accepted ? (
          <>
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
              {t('contacts.alreadyAdded')}
            </div>
            <Button
              className="w-full"
              onClick={() => navigate({ name: 'chat', peer: invite.pubkey }, true)}
            >
              <MessageSquare size={16} />
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

        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
          <Shield size={14} />
          {t('chat.verifyPromptBody')}
        </div>
      </div>
    </div>
  )
}
