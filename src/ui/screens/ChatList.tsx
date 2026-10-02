import { Suspense, useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../crow/router'
import { Avatar, Banner, EmptyState, GroupAvatar } from '../components/primitives'
import { ContactsIcon, MoreIcon, PinIcon, PlusIcon, ShieldCheckIcon, TrashIcon } from '../components/Icons'
import { Search as SearchIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { formatListTimestamp } from '../format'
import type { Contact, Conversation } from '../../core/models/types'
import type { LocaleCode } from '../../core/models/types'
import { ConnectionBadge } from '../components/ConnectionStatus'
import { callSummary, isCallEntry } from '../components/CallBubble'
import { LiveBanner } from '../lazyViews'
import { Skeleton } from '../components/Skeleton'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { displayName, listNames, conversationTitle, isRequest } from './chatlist-utils'

export { displayName, listNames, conversationTitle, isRequest }

export function ChatList() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const conversations = useApp((s) => s.conversations)
  const conversationsLoaded = useApp((s) => s.conversationsLoaded)
  const contacts = useApp((s) => s.contacts)
  const typingPeers = useApp((s) => s.typingPeers)
  const previews = useApp((s) => s.previews)
  const sharing = useApp((s) => s.liveShares.length > 0)
  const togglePin = useApp((s) => s.togglePin)
  const deleteConversation = useApp((s) => s.deleteConversation)
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups' | 'contacts'>('all')
  const [query, setQuery] = useState('')
  // The conversation open beside this list, on a wide window.
  const route = useRoute()
  const open = route.name === 'chat' ? route.peer : route.name === 'group' ? route.id : null

  const { accepted, requests } = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = (conversation: Conversation) => {
      if (!needle) return true
      // A group matches on its name and on anyone in it.
      return (
        conversationTitle(conversation, contacts, locale).toLowerCase().includes(needle) ||
        conversation.members.some(
          (pubkey) =>
            pubkey.includes(needle) ||
            displayName(contacts.get(pubkey), pubkey).toLowerCase().includes(needle),
        )
      )
    }
    const matched = conversations.filter(matches)
    // Apply the active filter
    let filtered = matched
    if (filter === 'unread') filtered = filtered.filter((c) => c.unread > 0)
    if (filter === 'groups') filtered = filtered.filter((c) => c.kind === 'group')
    if (filter === 'contacts') filtered = filtered.filter((c) => c.kind === 'direct')
    return {
      accepted: filtered.filter((c) => !isRequest(c, contacts)),
      requests: matched.filter((c) => isRequest(c, contacts)),
    }
  }, [conversations, contacts, query, locale, filter])

  const pinned = accepted.filter((c) => c.pinned)
  const unpinned = accepted.filter((c) => !c.pinned)

  const renderRow = (conversation: Conversation) => {
    const group = conversation.kind === 'group'
    const contact = group ? undefined : contacts.get(conversation.peerPubkey)
    const name = conversationTitle(conversation, contacts, locale)
    const typing = !group && typingPeers.has(conversation.peerPubkey)
    const preview = previews.get(conversation.id)
    // In a group the preview says who wrote it, as the list in every group
    // messenger does; "You:" already covers our own.
    const author =
      group && preview?.direction === 'in'
        ? `${displayName(contacts.get(preview.authorPubkey), preview.authorPubkey)}: `
        : null
    return (
      <div key={conversation.id} className="convo-row-wrap" role="listitem">
        <Button
          className="convo-row"
          aria-current={open === (group ? conversation.id : conversation.peerPubkey) || undefined}
          onClick={() =>
            navigate(
              group ? { name: 'group', id: conversation.id } : { name: 'chat', peer: conversation.peerPubkey },
            )
          }
        >
        {group ? (
          <GroupAvatar seed={conversation.id} />
        ) : (
          <Avatar name={name} seed={conversation.peerPubkey} src={contact?.avatar} />
        )}
        <span className="convo-main">
          <span className="convo-top">
            <span className="convo-name" dir="auto">
              {name}
              {conversation.pinned ? (
                <PinIcon
                  size={13}
                  style={{ display: 'inline', marginInlineStart: 4, color: 'var(--text-faint)' }}
                />
              ) : null}
              {contact?.verification === 'verified' ? (
                <ShieldCheckIcon
                  size={14}
                  style={{ display: 'inline', marginInlineStart: 4, color: 'var(--success)' }}
                />
              ) : null}
            </span>
            <span className="convo-time">{formatListTimestamp(conversation.lastActivity, locale)}</span>
          </span>
          <span className="convo-preview">
            <span className="convo-preview-text" dir="auto">
              {typing ? (
                <em>{t('chat.typing')}</em>
              ) : contact?.blocked ? (
                t('chat.blocked')
              ) : conversation.draft ? (
                <>
                  <span style={{ color: 'var(--warning)' }}>{t('chats.draft')}: </span>
                  {conversation.draft}
                </>
              ) : preview && isCallEntry(preview) ? (
                <span className={preview.call.outcome === 'missed' ? 'convo-preview-missed' : undefined}>
                  {callSummary(preview, t)}
                </span>
              ) : preview ? (
                <>
                  {preview.direction === 'out' ? <span className="faint">{t('chats.you')}</span> : null}
                  {author ? <span className="faint">{author}</span> : null}
                  {/* A location's content is a geo: URI for other clients; here it has a name. */}
                  {preview.location
                    ? preview.location.live !== undefined
                      ? t('chats.liveLocation')
                      : `📍 ${preview.location.place ?? t('interactive.location')}`
                    : preview.body}
                </>
              ) : null}
            </span>
            {conversation.unread > 0 ? (
              <span className="unread-dot" aria-label={String(conversation.unread)}>
                {conversation.unread > 99 ? '99+' : conversation.unread}
              </span>
            ) : null}
          </span>
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="convo-row-more" aria-label={t('chat.messageActions')} aria-haspopup="true" title={t('chat.messageActions')}>
            <MoreIcon size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => togglePin(conversation.id)}>
            <PinIcon size={16} />
            {conversation.pinned ? t('chats.unpin') : t('chats.pin')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => deleteConversation(conversation.id)}>
            <TrashIcon size={16} />
            {t('chat.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    )
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="grow">{t('chats.title')}</h1>
        <ConnectionBadge />
        <Button
          size="icon" variant="ghost"
          aria-label={t('chats.filterLabel')}
          title={t('chats.searchPlaceholder')}
          onClick={() => navigate({ name: 'search' })}
        >
          <SearchIcon />
        </Button>
        <Button
          size="icon" variant="ghost"
          aria-label={t('groups.newGroup')}
          title={t('groups.newGroup')}
          onClick={() => navigate({ name: 'new-group' })}
        >
          <ContactsIcon />
        </Button>
        <Button
          size="icon" variant="ghost"
          aria-label={t('contacts.add')}
          title={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <PlusIcon />
        </Button>
      </header>

      <Notices />

      {sharing ? (
        <Suspense fallback={null}>
          <LiveBanner />
        </Suspense>
      ) : null}

      {conversations.length > 2 ? (
        <div className="segmented" style={{ margin: 'var(--space-2) var(--space-3)' }} role="tablist" aria-label={t('chats.filterLabel')} aria-controls="chat-list-panel">
          <Button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>{t('chats.filterAll')}</Button>
          <Button role="tab" aria-selected={filter === 'unread'} onClick={() => setFilter('unread')}>{t('chats.filterUnread')}</Button>
          <Button role="tab" aria-selected={filter === 'groups'} onClick={() => setFilter('groups')}>{t('chats.filterGroups')}</Button>
          <Button role="tab" aria-selected={filter === 'contacts'} onClick={() => setFilter('contacts')}>{t('chats.filterContacts')}</Button>
        </div>
      ) : null}

      {conversations.length > 4 ? (
        <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
          <Input
            type="search"
            placeholder={t('chats.searchPlaceholder')}
            aria-label={t('chats.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="screen-scroll" role="list" aria-label={t('chats.title')} id="chat-list-panel">
        {!conversationsLoaded ? (
          <ChatListSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState
            title={t('chats.empty')}
            body={t('chats.emptyBody')}
            action={
              <Button  onClick={() => navigate({ name: 'add-contact' })}>
                {t('chats.addContact')}
              </Button>
            }
          />
        ) : (
          <>
            {pinned.length > 0 ? (
              <>
                <div className="stack-sm" style={{ padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
                  <span className="section-title">{t('chats.pinned')}</span>
                </div>
                {pinned.map(renderRow)}
              </>
            ) : null}
            {requests.length > 0 ? (
              <>
                <div className="stack-sm" style={{ padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
                  <span className="section-title">{t('chats.requests')}</span>
                  <span className="hint">{t('chats.requestsBody')}</span>
                </div>
                {requests.map(renderRow)}
              </>
            ) : null}
            {unpinned.map(renderRow)}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * What the person still has to do — write down the recovery phrase, or choose
 * a new way in after the phrase opened this device — said at the top of the
 * list they keep coming back to, not above every screen and every
 * conversation, where it pushed the header down and away from the safe area.
 */
function Notices() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const identity = useApp((s) => s.identity)
  const deferred = useApp((s) => s.backupDeferred)
  const resumeBackup = useApp((s) => s.resumeBackup)
  const opened = useApp((s) => s.openedWithRecovery)
  const retired = useApp((s) => s.passkeyRetired)
  const dismiss = useApp((s) => s.dismissRecoveryNotice)
  const backup = !!identity?.mnemonic && !identity.mnemonicBackedUp && deferred
  if (!backup && !opened && !retired) return null
  return (
    <div className="stack-sm" style={{ padding: 'var(--space-2) var(--space-3) 0' }}>
      {backup ? (
        <Banner tone="warning">
          <span className="grow">{t('onboarding.backupTitle')}</span>
          <Button variant="ghost" size="sm" onClick={() => resumeBackup()}>
            {t('common.show')}
          </Button>
        </Banner>
      ) : null}
      {/* Opened with the recovery phrase, which usually means the everyday
          way in was lost — or a passkey way in this build retired (ADR-058).
          Offer a new one rather than leave the person typing twelve words. */}
      {opened || retired ? (
        <Banner tone="accent">
          <span className="grow small">{retired ? t('lock.retired') : t('lock.recovered')}</span>
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              dismiss()
              navigate({ name: 'settings-security' })
            }}
          >
            {t('lock.recoveredAction')}
          </Button>
        </Banner>
      ) : null}
    </div>
  )
}

function ChatListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading conversations…">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <span className="skeleton skeleton-avatar" />
          <div className="grow stack-sm" style={{ minWidth: 0 }}>
            <span className="skeleton skeleton-text" style={{ width: '65%' }} />
            <span className="skeleton skeleton-text skeleton-text-short" />
          </div>
        </div>
      ))}
    </div>
  )
}
