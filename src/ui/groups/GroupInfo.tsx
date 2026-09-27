import { useMemo } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
import { Avatar, GroupAvatar } from '../components/primitives'
import { conversationTitle, displayName } from '../screens/ChatList'
import { SecureGroupPanel } from './SecureGroupPanel'
import { Button } from '../../components/ui/button'
import { ArrowLeft, ShieldCheck, Users, Trash2 } from 'lucide-react'

export function GroupInfo({ id }: { id: string }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const conversations = useApp((s) => s.conversations)
  const contacts = useApp((s) => s.contacts)
  const identity = useApp((s) => s.identity)
  const deleteConversation = useApp((s) => s.deleteConversation)
  const conversationsLoaded = useApp((s) => s.conversationsLoaded)
  const group = useMemo(
    () => conversations.find((conversation) => conversation.id === id && conversation.kind === 'group'),
    [conversations, id],
  )

  if (!group) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Button>
        </header>
        {conversationsLoaded ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
            <Users size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
            <h3 className="text-[var(--text)]">{t('groups.notFound')}</h3>
            <p className="max-w-[28rem] text-sm">{t('groups.notFoundBody')}</p>
          </div>
        ) : null}
      </div>
    )
  }

  const remove = async () => {
    if (!confirm(t('groups.deleteConfirm'))) return
    await deleteConversation(group.id)
    navigate({ name: 'chats' }, true)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('groups.info')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[34rem] flex flex-col gap-4 p-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <GroupAvatar seed={group.id} size="lg" />
            <h2 className="text-base font-semibold text-[var(--text)]" dir="auto">{conversationTitle(group, contacts, locale)}</h2>
            <span className="text-xs text-[var(--text-muted)]">{t('groups.members', { n: group.members.length + 1 })}</span>
          </div>

          {group.mls ? (
            <SecureGroupPanel group={group} />
          ) : (
            <>
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                {identity ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="sm" />
                    <span className="flex-1 truncate text-sm text-[var(--text)]">
                      <bdi>{identity.name}</bdi>
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{t('groups.you')}</span>
                  </div>
                ) : null}
                {[...group.members]
                  .sort((a, b) =>
                    displayName(contacts.get(a), a).localeCompare(displayName(contacts.get(b), b), locale),
                  )
                  .map((pubkey) => {
                    const contact = contacts.get(pubkey)
                    const name = displayName(contact, pubkey)
                    const known = contact?.accepted === true
                    const body = (
                      <>
                        <Avatar name={name} seed={pubkey} src={contact?.avatar} size="sm" />
                        <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                          <span className="truncate text-sm text-[var(--text)]">
                            <bdi>{name}</bdi>
                          </span>
                          {known ? null : <span className="text-xs text-[var(--text-muted)]">{t('groups.notInContacts')}</span>}
                        </span>
                        {contact?.verification === 'verified' ? (
                          <ShieldCheck size={15} className="text-[var(--success)]" />
                        ) : null}
                      </>
                    )
                    return contact ? (
                      <button
                        key={pubkey}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] bg-transparent text-left cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
                        onClick={() => navigate({ name: 'contact', peer: pubkey })}
                      >
                        {body}
                      </button>
                    ) : (
                      <div key={pubkey} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)]">
                        {body}
                      </div>
                    )
                  })}
              </div>

              <p className="text-xs text-[var(--text-muted)]">{t('groups.fixedMembers')}</p>

              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => void remove()}
              >
                <Trash2 size={16} />
                {t('groups.delete')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
