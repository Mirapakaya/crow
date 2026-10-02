import { useState, useCallback } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useNavigate } from '../../crow/router'
import { conversationTitle, displayName } from './ChatList'
import { Avatar, GroupAvatar, Spinner } from '../components/primitives'
import { SearchIcon, ArrowLeftIcon } from '../components/Icons'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { formatListTimestamp } from '../format'
import type { Conversation, Message } from '../../core/models/types'

export interface MessageSearchResult {
  message: Message
  conversation: Conversation
}

export function MessageSearchScreen() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MessageSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const searchMessages = useApp((s) => s.searchMessages)

  const handleSearch = useCallback(async () => {
    const needle = query.trim()
    if (!needle) return
    setSearching(true)
    setSearched(true)
    try {
      const found = await searchMessages(needle, 50)
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [query, searchMessages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('common.back')}
          onClick={() => navigate({ name: 'chats' })}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="grow">{t('chats.searchPlaceholder')}</h1>
      </header>

      <div className="row" style={{ padding: 'var(--space-2) var(--space-3)', gap: 'var(--space-2)' }}>
        <Input
          className="grow"
          type="search"
          placeholder={t('chats.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
        >
          {searching ? <Spinner /> : <SearchIcon size={16} />}
        </Button>
      </div>

      <div className="screen-scroll">
        {searching ? (
          <div className="empty">
            <Spinner label={t('common.working')} />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="empty">
            <h3>{t('chats.noMessages')}</h3>
          </div>
        ) : (
          results.map(({ message, conversation }) => {
            const group = conversation.kind === 'group'
            const name = conversationTitle(conversation, contacts, locale)
            const contact = !group ? contacts.get(conversation.peerPubkey) : undefined
            return (
              <button
                key={message.id}
                className="convo-row"
                onClick={() =>
                  navigate(
                    group
                      ? { name: 'group', id: conversation.id }
                      : { name: 'chat', peer: conversation.peerPubkey },
                  )
                }
              >
                {group ? (
                  <GroupAvatar seed={conversation.id} size="sm" />
                ) : (
                  <Avatar name={name} seed={conversation.peerPubkey} src={contact?.avatar} size="sm" />
                )}
                <span className="convo-main">
                  <span className="convo-top">
                    <span className="convo-name" dir="auto">{name}</span>
                    <span className="convo-time">{formatListTimestamp(message.ts, locale)}</span>
                  </span>
                  <span className="convo-preview">
                    <span className="convo-preview-text" dir="auto">
                      {message.direction === 'out' ? <span className="faint">{t('chats.you')}</span> : null}
                      {highlightMatch(message.body, query.trim())}
                    </span>
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const needle = query.toLowerCase()
  const idx = lower.indexOf(needle)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return (
    <>
      {before}
      <mark style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderRadius: '2px', padding: '0 1px' }}>
        {match}
      </mark>
      {after}
    </>
  )
}
