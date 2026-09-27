import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
import { Avatar, GroupAvatar } from '../components/primitives'
import { SendIcon } from '../components/Icons'
import { AttachButton, EmojiButton, VoiceButton } from '../components/Composer'
import { MessageBubble } from '../components/MessageBubble'
import { CallBubble, isCallEntry } from '../components/CallBubble'
import { supportsWebRtc } from '../../core/transport/webrtc/directManager'
import { formatDayLabel, isSameDay } from '../format'
import { conversationTitle, displayName } from './ChatList'
import { isGroupAddress, type ChatAddress, type Conversation, type Message } from '../../core/models/types'
import { Button } from '../../components/ui/button'
import {
  ArrowLeft,
  Phone,
  Video,
  ShieldCheck,
  Shield,
  Lock,
  Zap,
  X,
  MessageSquare,
} from 'lucide-react'

function findConversation(
  conversations: readonly Conversation[],
  address: ChatAddress,
): Conversation | undefined {
  return isGroupAddress(address)
    ? conversations.find((c) => c.id === address)
    : conversations.find((c) => c.kind === 'direct' && c.peerPubkey === address)
}

function readStoredDraft(address: ChatAddress): string {
  return findConversation(useApp.getState().conversations, address)?.draft ?? ''
}

const GROUP_WINDOW_MS = 4 * 60 * 1000

export function ChatView({ address }: { address: ChatAddress }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const isGroup = isGroupAddress(address)
  const peer = isGroup ? '' : address

  const messages = useApp((s) => s.messages)
  const contacts = useApp((s) => s.contacts)
  const typingPeers = useApp((s) => s.typingPeers)
  const directStates = useApp((s) => s.directStates)
  const openConversation = useApp((s) => s.openConversation)
  const closeConversation = useApp((s) => s.closeConversation)
  const sendMessage = useApp((s) => s.sendMessage)
  const retryMessage = useApp((s) => s.retryMessage)
  const deleteMessageLocally = useApp((s) => s.deleteMessageLocally)
  const deleteMessageForEveryone = useApp((s) => s.deleteMessageForEveryone)
  const reactions = useApp((s) => s.reactions)
  const react = useApp((s) => s.react)
  const updates = useApp((s) => s.updates)
  const vote = useApp((s) => s.vote)
  const checkItem = useApp((s) => s.checkItem)
  const addChecklistItem = useApp((s) => s.addChecklistItem)
  const conversations = useApp((s) => s.conversations)
  const acceptGroup = useApp((s) => s.acceptGroup)
  const deleteConversation = useApp((s) => s.deleteConversation)
  const selfPubkey = useApp((s) => s.identity?.pubkey ?? '')
  const hasEarlierMessages = useApp((s) => s.hasEarlierMessages)
  const loadEarlierMessages = useApp((s) => s.loadEarlierMessages)
  const setTyping = useApp((s) => s.setTyping)
  const updateContact = useApp((s) => s.updateContact)
  const saveDraft = useApp((s) => s.saveDraft)
  const settings = useApp((s) => s.settings)
  const startCall = useApp((s) => s.startCall)

  const [draft, setDraft] = useState(() => readStoredDraft(address))
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const draftRef = useRef(draft)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)

  const conversationsLoaded = useApp((s) => s.conversationsLoaded)
  const conversation = findConversation(conversations, address)
  const secure = conversation?.mls
  const contact = isGroup ? undefined : contacts.get(peer)
  const name = isGroup
    ? conversation
      ? conversationTitle(conversation, contacts, locale)
      : ''
    : displayName(contact, peer)
  const direct = !isGroup && directStates.get(peer) === 'connected'
  const callable = !isGroup && contact?.accepted === true && !contact.blocked && supportsWebRtc()
  const typing = !isGroup && typingPeers.has(peer)
  const nameOf = useCallback(
    (pubkey: string) => (pubkey === selfPubkey ? t('groups.you') : displayName(contacts.get(pubkey), pubkey)),
    [contacts, selfPubkey, t],
  )

  useEffect(() => {
    void openConversation(address)
    return () => {
      void saveDraft(address, draftRef.current)
      closeConversation()
    }
  }, [address, openConversation, closeConversation, saveDraft])

  useLayoutEffect(() => {
    const node = listRef.current
    if (node && stickToBottom.current) node.scrollTop = node.scrollHeight
  }, [messages, typing])

  const missing = isGroup && conversationsLoaded && !conversation
  useEffect(() => {
    const node = listRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) node.scrollTop = node.scrollHeight
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [missing])

  const onScroll = useCallback(() => {
    const node = listRef.current
    if (!node) return
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80
  }, [])

  const byId = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    draftRef.current = ''
    setReplyTo(null)
    stickToBottom.current = true
    setTyping(false)
    await sendMessage(text, replyTo?.id)
    inputRef.current?.focus()
  }, [draft, replyTo, sendMessage, setTyping])

  const rows = useMemo(() => {
    const output: React.ReactNode[] = []
    let previous: Message | null = null

    for (const message of messages) {
      if (!previous || !isSameDay(previous.ts, message.ts)) {
        output.push(
          <div key={`day-${message.ts}`} className="mx-auto my-3 mb-1 rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-muted)]">
            {formatDayLabel(message.ts, locale, { today: t('chat.today'), yesterday: t('chat.yesterday') })}
          </div>,
        )
      }

      const groupStart =
        !previous ||
        !!previous.call ||
        previous.direction !== message.direction ||
        previous.authorPubkey !== message.authorPubkey ||
        message.ts - previous.ts > GROUP_WINDOW_MS ||
        !isSameDay(previous.ts, message.ts)
      const author = nameOf(message.authorPubkey)

      if (isCallEntry(message)) {
        output.push(
          <CallBubble
            key={message.id}
            message={message}
            groupStart={groupStart}
            onCallBack={callable ? (media) => void startCall(peer, media) : undefined}
            onDelete={(m) => void deleteMessageLocally(m.id)}
            onDeleteForEveryone={(m) => {
              if (confirm(t('calls.deleteEveryoneConfirm'))) void deleteMessageForEveryone(m.id)
            }}
          />,
        )
        previous = message
        continue
      }

      output.push(
        <MessageBubble
          key={message.id}
          message={message}
          groupStart={groupStart}
          senderLabel={message.direction === 'out' ? t('chat.fromYou') : t('chat.fromThem', { name: author })}
          authorLabel={isGroup && message.direction === 'in' ? author : undefined}
          quoted={message.replyTo ? (byId.get(message.replyTo) ?? null) : null}
          reactions={reactions.get(message.id)}
          updates={updates.get(message.id)}
          nameOf={nameOf}
          onVote={(m, choices) => void vote(m.id, choices)}
          onCheck={(m, itemId, done) => void checkItem(m.id, itemId, done)}
          onAddItem={(m, label) => void addChecklistItem(m.id, label)}
          selfPubkey={selfPubkey}
          onReact={(m, emoji) => void react(m.id, emoji)}
          onReply={setReplyTo}
          onRetry={(m) => void retryMessage(m.id)}
          onDelete={(m) => void deleteMessageLocally(m.id)}
          onDeleteForEveryone={(m) => {
            if (confirm(t('chat.deleteEveryoneConfirm'))) void deleteMessageForEveryone(m.id)
          }}
        />,
      )
      previous = message
    }
    return output
  }, [
    messages,
    byId,
    locale,
    t,
    isGroup,
    nameOf,
    reactions,
    updates,
    vote,
    checkItem,
    addChecklistItem,
    react,
    selfPubkey,
    retryMessage,
    deleteMessageLocally,
    deleteMessageForEveryone,
    callable,
    startCall,
    peer,
  ])

  if (missing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <Button
            variant="ghost"
            size="icon"
            className="btn-back"
            aria-label={t('common.back')}
            onClick={() => goBack()}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Button>
        </header>
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
          <MessageSquare size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
          <h3 className="text-[var(--text)]">{t('groups.notFound')}</h3>
          <p className="max-w-[28rem] text-sm">{t('groups.notFoundBody')}</p>
          <Button className="mt-2" onClick={() => navigate({ name: 'chats' }, true)}>
            {t('nav.chats')}
          </Button>
        </div>
      </div>
    )
  }

  const chatGutter = `max(var(--space-3), (100% - 46rem) / 2)`

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ '--chat-gutter': chatGutter } as React.CSSProperties}>
      <header className="flex items-center gap-3 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button
          variant="ghost"
          size="icon"
          className="btn-back shrink-0"
          aria-label={t('common.back')}
          onClick={() => goBack()}
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        {isGroup ? (
          <GroupAvatar seed={address} size="sm" />
        ) : (
          <Avatar name={name} seed={peer} src={contact?.avatar} size="sm" />
        )}
        <button
          className="flex min-w-0 flex-1 flex-col gap-px cursor-pointer text-left bg-transparent border-none p-0 text-[var(--text)]"
          aria-label={isGroup ? t('groups.info') : t('chat.openContact', { name })}
          onClick={() => navigate(isGroup ? { name: 'group-info', id: address } : { name: 'contact', peer })}
        >
          <span className="flex items-center gap-1 text-sm font-semibold">
            <span className="truncate" dir="auto">{name}</span>
            {contact?.verification === 'verified' ? (
              <ShieldCheck size={14} className="shrink-0 text-[var(--success)]" />
            ) : null}
          </span>
          <span className="flex items-center gap-1 truncate text-xs text-[var(--text-muted)] whitespace-nowrap">
            {isGroup ? (
              <>
                {secure ? (
                  <>
                    <Lock size={11} /> {t('groups.secure')} ·{' '}
                  </>
                ) : null}
                {t('groups.members', { n: (conversation?.members.length ?? 0) + 1 })}
              </>
            ) : typing ? (
              t('chat.typing')
            ) : direct ? (
              <>
                <Zap size={11} /> {t('status.direct')}
              </>
            ) : (
              t('status.relayed')
            )}
          </span>
        </button>
        {callable ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('calls.voiceCall')}
              title={t('calls.voiceCall')}
              onClick={() => void startCall(peer, 'audio')}
            >
              <Phone size={18} strokeWidth={1.75} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('calls.videoCall')}
              title={t('calls.videoCall')}
              onClick={() => void startCall(peer, 'video')}
            >
              <Video size={18} strokeWidth={1.75} />
            </Button>
          </>
        ) : null}
      </header>

      {isGroup && conversation && !conversation.accepted ? (
        <div className="px-[var(--chat-gutter)] pt-2">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
            <span className="flex-1">{t('groups.requestBanner')}</span>
            <Button variant="ghost" size="sm" onClick={() => void acceptGroup(address)}>
              {t('groups.accept')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--danger)]"
              onClick={() => {
                if (!confirm(t('groups.deleteConfirm'))) return
                void deleteConversation(address).then(() => navigate({ name: 'chats' }, true))
              }}
            >
              {t('groups.delete')}
            </Button>
          </div>
        </div>
      ) : null}

      {contact && !contact.accepted ? (
        <div className="px-[var(--chat-gutter)] pt-2">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)]">
            <span className="flex-1">{t('chat.requestBanner')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void updateContact(peer, { accepted: true, source: 'manual' })}
            >
              {t('chat.accept')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--danger)]"
              onClick={() => void updateContact(peer, { blocked: true })}
            >
              {t('chat.block')}
            </Button>
          </div>
        </div>
      ) : null}

      {contact?.blocked ? (
        <div className="px-[var(--chat-gutter)] pt-2">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--danger)]">
            <span className="flex-1">{t('chat.blocked')}</span>
            <Button variant="ghost" size="sm" onClick={() => void updateContact(peer, { blocked: false })}>
              {t('chat.unblock')}
            </Button>
          </div>
        </div>
      ) : null}

      {contact && contact.verification !== 'verified' && messages.length > 0 ? (
        <div className="px-[var(--chat-gutter)] pt-2">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
            <Shield size={16} />
            <span className="flex-1">{t('chat.verifyPromptBody')}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'verify', peer })}>
              {t('contacts.verify')}
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-[var(--chat-gutter)] scrollbar-thin"
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
      >
        <div className="flex flex-col gap-0.5 mt-auto py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-[var(--text-muted)]">
              <MessageSquare size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
              <h3 className="text-[var(--text)]">{t('chats.noMessages')}</h3>
              <p className="max-w-[28rem] text-sm">{t('chat.encryptedNote')}</p>
            </div>
          ) : hasEarlierMessages ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-center mb-3"
              disabled={loadingEarlier}
              onClick={async () => {
                const node = listRef.current
                const before = node?.scrollHeight ?? 0
                setLoadingEarlier(true)
                stickToBottom.current = false
                await loadEarlierMessages()
                setLoadingEarlier(false)
                requestAnimationFrame(() => {
                  if (node) node.scrollTop += node.scrollHeight - before
                })
              }}
            >
              {loadingEarlier ? t('common.loading') : t('chat.loadEarlier')}
            </Button>
          ) : (
            <p className="self-center mb-3 text-[0.75rem] text-[var(--text-faint)]">{t('chat.startOfConversation')}</p>
          )}
          {rows}
          {typing ? (
            <div className="flex items-center gap-1 mt-2 rounded-[var(--radius-lg)] bg-[var(--bubble-in)] px-3 py-2 shadow-[var(--shadow-sm)] self-start" aria-label={t('chat.typing')}>
              <span className="size-1.5 rounded-full bg-[var(--text-faint)] animate-[typing-bounce_1.2s_infinite_ease-in-out]" />
              <span className="size-1.5 rounded-full bg-[var(--text-faint)] animate-[typing-bounce_1.2s_infinite_ease-in-out_0.15s]" />
              <span className="size-1.5 rounded-full bg-[var(--text-faint)] animate-[typing-bounce_1.2s_infinite_ease-in-out_0.3s]" />
            </div>
          ) : null}
        </div>
      </div>

      {replyTo ? (
        <div className="flex items-center gap-2 py-2 px-[var(--chat-gutter)] bg-[var(--surface-2)] border-t border-[var(--border)] text-sm">
          <span className="flex min-w-0 flex-1 border-s-3 border-[var(--accent)] ps-2 truncate" dir="auto">
            <span className="block text-[var(--text-faint)] text-xs">{t('chat.replyingTo')}</span>
            {replyTo.body}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('common.close')}
            onClick={() => setReplyTo(null)}
          >
            <X size={16} />
          </Button>
        </div>
      ) : null}

      {secure?.left ? (
        <div className="flex items-center gap-3 py-2 px-[var(--chat-gutter)] bg-[var(--surface)] border-t border-[var(--border)]">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--warning)] flex-1">
            <span className="flex-1">{t('groups.secureLeft')}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2 py-2 px-[var(--chat-gutter)] pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[var(--surface)] border-t border-[var(--border)] shrink-0">
          {secure ? null : <AttachButton disabled={contact?.blocked} />}
          <textarea
            ref={inputRef}
            className="flex-1 min-h-[2.5rem] max-h-[9rem] py-[0.55rem] px-[0.85rem] border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-[var(--bg)] resize-none leading-[1.45] overflow-y-auto font-inherit text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            dir="auto"
            rows={1}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            value={draft}
            disabled={contact?.blocked}
            onChange={(event) => {
              setDraft(event.target.value)
              draftRef.current = event.target.value
              setTyping(event.target.value.length > 0)
              const node = event.target
              node.style.height = 'auto'
              node.style.height = `${Math.min(node.scrollHeight, 144)}px`
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              const shouldSend = settings.enterToSend ? !event.shiftKey : event.ctrlKey || event.metaKey
              if (!shouldSend) return
              event.preventDefault()
              void send()
            }}
          />
          <EmojiButton
            disabled={contact?.blocked}
            onInsertEmoji={(emoji) => {
              setDraft((current) => current + emoji)
              draftRef.current += emoji
            }}
          />
          {draft.trim() || secure ? (
            <button
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white border-none cursor-pointer transition-[background,transform] hover:bg-[var(--accent-hover)] active:scale-94 disabled:opacity-45 disabled:cursor-not-allowed [dir=rtl]_[:root]&_svg:scale-x-[-1]"
              aria-label={t('chat.send')}
              disabled={contact?.blocked || !draft.trim()}
              onClick={() => void send()}
            >
              <SendIcon size={18} />
            </button>
          ) : (
            <VoiceButton disabled={contact?.blocked} />
          )}
        </div>
      )}
    </div>
  )
}
