import { useMemo } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../crow/router'
import { Avatar, EmptyState, GroupAvatar } from '../components/primitives'
import { confirmDanger } from '../components/dialog'
import { BackIcon, ShieldCheckIcon, TrashIcon } from '../components/Icons'
import { conversationTitle, displayName } from '../screens/ChatList'
import { SecureGroupPanel } from './SecureGroupPanel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Who is in a group, and what can be done to it here.
 *
 * For a small group, one thing: leave it behind. There is no "add member" —
 * under NIP-17 a group is exactly the set of people in it, so a different set
 * is a different conversation — and the screen says so rather than offering
 * a control that cannot exist. A forward-secret group is the opposite case,
 * an MLS group whose membership is its to change: see `SecureGroupPanel`.
 */
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
    // Nothing to say until the list has been read; then, that it is not here.
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
          <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
            <BackIcon />
          </Button>
        </header>
        {conversationsLoaded ? (
          <EmptyState title={t('groups.notFound')} body={t('groups.notFoundBody')} />
        ) : null}
      </div>
    )
  }

  const remove = async () => {
    if (!(await confirmDanger(t('groups.delete'), t('groups.delete'), t('groups.deleteConfirm')))) return
    await deleteConversation(group.id)
    navigate({ name: 'chats' }, true)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <BackIcon />
        </Button>
        <h1 className="flex-1 min-w-0">{t('groups.info')}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-[34rem] mx-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <GroupAvatar seed={group.id} size="lg" />
            <h2 dir="auto">{conversationTitle(group, contacts, locale)}</h2>
            <span className="text-muted-foreground text-xs">{t('groups.members', { n: group.members.length + 1 })}</span>
          </div>

          {group.mls ? (
            <SecureGroupPanel group={group} />
          ) : (
            <>
              <Card className="p-0 overflow-hidden divide-y divide-border">
                {identity ? (
                  <div className="flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50">
                    <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="sm" />
                    <span className="flex-1 min-w-0 truncate">
                      <bdi>{identity.name}</bdi>
                    </span>
                    <span className="text-sm text-muted-foreground">{t('groups.you')}</span>
                  </div>
                ) : null}
                {[...group.members]
                  // Stored in key order, which is meaningless to read; listed by name.
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
                        <span className="flex-1 min-w-0 flex flex-col gap-2">
                          <span className="truncate">
                            <bdi>{name}</bdi>
                          </span>
                          {known ? null : <span className="text-sm text-muted-foreground">{t('groups.notInContacts')}</span>}
                        </span>
                        {contact?.verification === 'verified' ? (
                          <span className="text-success">
                            <ShieldCheckIcon size={15} />
                          </span>
                        ) : null}
                      </>
                    )
                    // Someone in the address book opens their contact page, where
                    // they can be verified; a stranger has nothing to open yet.
                    return contact ? (
                      <button
                        key={pubkey}
                        type="button"
                        className="flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50"
                        onClick={() => navigate({ name: 'contact', peer: pubkey })}
                      >
                        {body}
                      </button>
                    ) : (
                      <div key={pubkey} className="flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50">
                        {body}
                      </div>
                    )
                  })}
              </Card>

              <p className="text-sm text-muted-foreground">{t('groups.fixedMembers')}</p>

              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => void remove()}
              >
                <TrashIcon size={16} />
                {t('groups.delete')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
