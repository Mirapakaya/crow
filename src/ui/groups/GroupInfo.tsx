import { useMemo } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../crow/router'
import { Avatar, EmptyState, GroupAvatar } from '../components/primitives'
import { confirmDanger } from '../components/dialog'
import { BackIcon, ShieldCheckIcon, TrashIcon } from '../components/Icons'
import { conversationTitle, displayName } from '../screens/ChatList'
import { SecureGroupPanel } from './SecureGroupPanel'
import { Button } from '../../components/ui/button'

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
      <div className="screen">
        <header className="app-header">
          <Button size="icon" variant="ghost" aria-label={t('common.back')} title={t('common.back')} onClick={() => goBack()}>
            <BackIcon />
          </Button>
        </header>
        {!conversationsLoaded ? (
          <GroupInfoSkeleton />
        ) : (
          <EmptyState title={t('groups.notFound')} body={t('groups.notFoundBody')} />
        )}
      </div>
    )
  }

  const remove = async () => {
    if (!(await confirmDanger(t('groups.delete'), t('groups.delete'), t('groups.deleteConfirm')))) return
    await deleteConversation(group.id)
    navigate({ name: 'chats' }, true)
  }

  return (
    <div className="screen">
      <header className="app-header">
        <Button size="icon" variant="ghost" aria-label={t('common.back')} title={t('common.back')} onClick={() => goBack()}>
          <BackIcon />
        </Button>
        <h1 className="grow">{t('groups.info')}</h1>
      </header>

      <div className="screen-scroll">
        <div className="container stack" style={{ maxWidth: '34rem' }}>
          <div className="stack-sm center group-hero">
            <GroupAvatar seed={group.id} size="lg" />
            <h2 dir="auto">{conversationTitle(group, contacts, locale)}</h2>
            <span className="muted small">{t('groups.members', { n: group.members.length + 1 })}</span>
          </div>

          {group.mls ? (
            <SecureGroupPanel group={group} />
          ) : (
            <>
              <div className="card-section">
                {identity ? (
                  <div className="list-row">
                    <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="sm" />
                    <span className="grow truncate">
                      <bdi>{identity.name}</bdi>
                    </span>
                    <span className="hint">{t('groups.you')}</span>
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
                        <span className="grow stack-sm" style={{ minWidth: 0 }}>
                          <span className="truncate">
                            <bdi>{name}</bdi>
                          </span>
                          {known ? null : <span className="hint">{t('groups.notInContacts')}</span>}
                        </span>
                        {contact?.verification === 'verified' ? (
                          <ShieldCheckIcon size={15} style={{ color: 'var(--success)' }} />
                        ) : null}
                      </>
                    )
                    // Someone in the address book opens their contact page, where
                    // they can be verified; a stranger has nothing to open yet.
                    return contact ? (
                      <Button
                        key={pubkey}
                        type="button"
                        className="list-row"
                        onClick={() => navigate({ name: 'contact', peer: pubkey })}
                      >
                        {body}
                      </Button>
                    ) : (
                      <div key={pubkey} className="list-row">
                        {body}
                      </div>
                    )
                  })}
              </div>

              <p className="hint">{t('groups.fixedMembers')}</p>

              <Button type="button" variant="danger-soft" block onClick={() => void remove()}>
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

function GroupInfoSkeleton() {
  return (
    <div
      className="container stack"
      aria-busy="true"
      aria-label="Loading group info…"
      style={{ maxWidth: '34rem' }}
    >
      <div className="stack-sm center" style={{ padding: 'var(--space-6) 0' }}>
        <span className="skeleton skeleton-avatar avatar-lg" style={{ width: '5rem', height: '5rem' }} />
        <span className="skeleton skeleton-text" style={{ width: '50%' }} />
      </div>
      <span className="skeleton skeleton-text" style={{ height: '4rem' }} />
      <span className="skeleton skeleton-text" style={{ height: '4rem' }} />
    </div>
  )
}
