import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../app/router'
import { Avatar, GroupAvatar } from '../components/primitives'
import { ShieldCheckIcon } from '../components/Icons'
import { formatListTimestamp } from '../format'
import { shortNpub, toNpub } from '../../core/identity/keys'
import type { Contact, Conversation } from '../../core/models/types'
import type { LocaleCode } from '../../core/models/types'
import { ConnectionBadge } from '../components/ConnectionStatus'
import { callSummary, isCallEntry } from '../components/CallBubble'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { MessageSquare, Users, Plus, Search } from 'lucide-react'

export function displayName(contact: Contact | undefined, pubkey: string): string {
  return contact?.name || contact?.remoteName || shortNpub(toNpub(pubkey))
}

export function listNames(names: readonly string[], locale: LocaleCode): string {
  try {
    return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(names)
  } catch {
    return names.join(', ')
  }
}

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
  const route = useRoute()
  const open = route.name === 'chat' ? route.peer : route.name === 'group' ? route.id : null

  const { accepted, requests } = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = (conversation: Conversation) => {
      if (!needle) return true
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
    const author =
      group && preview?.direction === 'in'
        ? `${displayName(contacts.get(preview.authorPubkey), preview.authorPubkey)}: `
        : null
    const active = open === (group ? conversation.id : conversation.peerPubkey)

    return (
      <button
        key={conversation.id}
        aria-current={active || undefined}
        onClick={() =>
          navigate(
            group ? { name: 'group', id: conversation.id } : { name: 'chat', peer: conversation.peerPubkey },
          )
        }
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2.5 border-none bg-transparent text-left cursor-pointer transition-colors',
          active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]',
        )}
      >
        {group ? (
          <GroupAvatar seed={conversation.id} />
        ) : (
          <Avatar name={name} seed={conversation.peerPubkey} src={contact?.avatar} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-[var(--text)]" dir="auto">
              {name}
              {contact?.verification === 'verified' ? (
                <ShieldCheckIcon
                  size={14}
                  style={{ display: 'inline', marginInlineStart: 4, color: 'var(--success)' }}
                />
              ) : null}
            </span>
            <span className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--text-faint)]">
              {formatListTimestamp(conversation.lastActivity, locale)}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-[var(--text-muted)]" dir="auto">
              {typing ? (
                <em>{t('chat.typing')}</em>
              ) : contact?.blocked ? (
                t('chat.blocked')
              ) : conversation.draft ? (
                <>
                  <span className="text-[var(--warning)]">{t('chats.draft')}: </span>
                  {conversation.draft}
                </>
              ) : preview && isCallEntry(preview) ? (
                <span className={preview.call.outcome === 'missed' ? 'text-[var(--danger)]' : undefined}>
                  {callSummary(preview, t)}
                </span>
              ) : preview ? (
                <>
                  {preview.direction === 'out' ? <span className="text-[var(--text-faint)] text-[0.75rem]">{t('chats.you')}</span> : null}
                  {author ? <span className="text-[var(--text-faint)] text-[0.75rem]">{author}</span> : null}
                  {preview.body}
                </>
              ) : null}
            </span>
            {conversation.unread > 0 ? (
              <span className="flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1 h-5 text-[0.6875rem] font-semibold tabular-nums text-[var(--accent-fg)]">
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
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('chats.title')}</h1>
        <ConnectionBadge />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('groups.newGroup')}
          title={t('groups.newGroup')}
          onClick={() => navigate({ name: 'new-group' })}
        >
          <Users size={18} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('contacts.add')}
          title={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <Plus size={18} strokeWidth={1.75} />
        </Button>
      </header>

      <Notices />

      {conversations.length > 4 ? (
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <Input
              type="search"
              placeholder={t('chats.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
            <MessageSquare size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
            <h3 className="text-[var(--text)]">{t('chats.empty')}</h3>
            <p className="max-w-[28rem] text-sm">{t('chats.emptyBody')}</p>
            <Button className="mt-2" onClick={() => navigate({ name: 'add-contact' })}>
              {t('chats.addContact')}
            </Button>
          </div>
        ) : (
          <>
            {requests.length > 0 ? (
              <>
                <div className="flex flex-col gap-1 px-4 pt-3 pb-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
                    {t('chats.requests')}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{t('chats.requestsBody')}</span>
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
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
          <span className="flex-1">{t('onboarding.backupTitle')}</span>
          <Button variant="ghost" size="sm" onClick={() => resumeBackup()}>
            {t('common.show')}
          </Button>
        </div>
      ) : null}
      {opened || retired ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
          <span className="flex-1">{retired ? t('lock.retired') : t('lock.recovered')}</span>
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
        </div>
      ) : null}
    </div>
  )
}
