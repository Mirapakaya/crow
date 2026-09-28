import { useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../crow/router'
import { Avatar, Banner, EmptyState, GroupAvatar } from '../components/primitives'
import { ContactsIcon, PlusIcon, ShieldCheckIcon } from '../components/Icons'
import { formatListTimestamp } from '../format'
import { shortNpub, toNpub } from '../../core/identity/keys'
import type { Contact, Conversation } from '../../core/models/types'
import type { LocaleCode } from '../../core/models/types'
import { ConnectionBadge } from '../components/ConnectionStatus'
import { callSummary, isCallEntry } from '../components/CallBubble'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function displayName(contact: Contact | undefined, pubkey: string): string {
  return contact?.name || contact?.remoteName || shortNpub(toNpub(pubkey))
}

/**
 * Names as a sentence would list them, in the reader's language — "Bob,
 * Carol and Dave" / «باب، کارول و دیو» — rather than joined with a Latin
 * comma that reads wrongly in Persian.
 */
export function listNames(names: readonly string[], locale: LocaleCode): string {
  try {
    return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(names)
  } catch {
    return names.join(', ')
  }
}

/** What a conversation is called: its person, or its group's name, or who is in it. */
export function conversationTitle(
  conversation: Conversation,
  contacts: ReadonlyMap<string, Contact>,
  locale: LocaleCode,
): string {
  if (conversation.kind !== 'group') {
    return displayName(contacts.get(conversation.peerPubkey), conversation.peerPubkey)
  }
  if (conversation.subject) return conversation.subject
  const names = conversation.members.map((pubkey) => displayName(contacts.get(pubkey), pubkey))
  return listNames(names, locale)
}

/**
 * A request is a conversation the user has not taken: a direct one with a
 * contact they have not accepted, or a group started by someone outside their
 * address book.
 */
export const isRequest = (conversation: Conversation, contacts: ReadonlyMap<string, Contact>): boolean =>
  conversation.kind === 'group'
    ? !conversation.accepted
    : contacts.get(conversation.peerPubkey)?.accepted === false

export function ChatList() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const conversations = useApp((s) => s.conversations)
  const contacts = useApp((s) => s.contacts)
  const typingPeers = useApp((s) => s.typingPeers)
  const previews = useApp((s) => s.previews)
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
    const visible = conversations.filter(matches)
    return {
      accepted: visible.filter((c) => !isRequest(c, contacts)),
      requests: visible.filter((c) => isRequest(c, contacts)),
    }
  }, [conversations, contacts, query, locale])

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
      <button
        key={conversation.id}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent/50"
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
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold" dir="auto">
              {name}
              {contact?.verification === 'verified' ? (
                <ShieldCheckIcon
                  size={14}
                  className="ms-1 inline text-green-500"
                />
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground/70">{formatListTimestamp(conversation.lastActivity, locale)}</span>
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="min-w-0 flex-1 truncate" dir="auto">
              {typing ? (
                <em>{t('chat.typing')}</em>
              ) : contact?.blocked ? (
                t('chat.blocked')
              ) : conversation.draft ? (
                <>
                  <span className="text-amber-500">{t('chats.draft')}: </span>
                  {conversation.draft}
                </>
              ) : preview && isCallEntry(preview) ? (
                <span className={preview.call.outcome === 'missed' ? 'text-destructive' : undefined}>
                  {callSummary(preview, t)}
                </span>
              ) : preview ? (
                <>
                  {preview.direction === 'out' ? <span className="text-muted-foreground/70">{t('chats.you')}</span> : null}
                  {author ? <span className="text-muted-foreground/70">{author}</span> : null}
                  {preview.body}
                </>
              ) : null}
            </span>
            {conversation.unread > 0 ? (
              <span
                className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
                aria-label={String(conversation.unread)}
              >
                {conversation.unread > 99 ? '99+' : conversation.unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex min-h-[3.25rem] items-center gap-2 border-b border-border bg-card px-3 py-2">
        <h1 className="min-w-0 flex-1 text-base font-semibold">{t('chats.title')}</h1>
        <ConnectionBadge />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('groups.newGroup')}
          title={t('groups.newGroup')}
          onClick={() => navigate({ name: 'new-group' })}
        >
          <ContactsIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('contacts.add')}
          title={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <PlusIcon />
        </Button>
      </header>

      <Notices />

      {conversations.length > 4 ? (
        <div className="px-3 py-2">
          <Input
            type="search"
            placeholder={t('chats.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {conversations.length === 0 ? (
          <EmptyState
            title={t('chats.empty')}
            body={t('chats.emptyBody')}
            action={
              <Button onClick={() => navigate({ name: 'add-contact' })}>
                {t('chats.addContact')}
              </Button>
            }
          />
        ) : (
          <>
            {requests.length > 0 ? (
              <>
                <div className="flex flex-col gap-2 px-4 pt-3 pb-1">
                  <span className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('chats.requests')}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('chats.requestsBody')}</span>
                </div>
                {requests.map(renderRow)}
              </>
            ) : null}
            {accepted.map(renderRow)}
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
    <div className="flex flex-col gap-2 px-3 pt-2">
      {backup ? (
        <Banner tone="warning">
          <span className="min-w-0 flex-1">{t('onboarding.backupTitle')}</span>
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
          <span className={cn('min-w-0 flex-1', retired ? 'text-xs' : 'text-xs')}>
            {retired ? t('lock.retired') : t('lock.recovered')}
          </span>
          <Button
            variant="ghost"
            size="sm"
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
