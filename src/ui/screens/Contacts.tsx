import { useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../crow/router'
import { Avatar, EmptyState } from '../components/primitives'
import { Badge } from '../components/ui/badge'
import { PlusIcon, ShieldCheckIcon } from '../components/Icons'
import { Skeleton } from '../components/Skeleton'
import { displayName } from './ChatList'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function ContactsList() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const conversationsLoaded = useApp((s) => s.conversationsLoaded)
  const [query, setQuery] = useState('')
  // The contact open beside this list, on a wide window.
  const route = useRoute()
  const open = route.name === 'contact' ? route.peer : null

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...contacts.values()]
      .filter((contact) => !needle || displayName(contact, contact.pubkey).toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          Number(a.blocked) - Number(b.blocked) ||
          displayName(a, a.pubkey).localeCompare(displayName(b, b.pubkey)),
      )
  }, [contacts, query])

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="grow">{t('contacts.title')}</h1>
        <Button
          size="icon" variant="ghost"
          aria-label={t('contacts.add')} title={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <PlusIcon />
        </Button>
      </header>

      {contacts.size > 5 ? (
        <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
          <Input
            
            type="search"
            placeholder={t('common.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="screen-scroll">
        {!conversationsLoaded ? (
          <ContactsSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            title={t('contacts.empty')}
            action={
              <Button  onClick={() => navigate({ name: 'add-contact' })}>
                {t('contacts.add')}
              </Button>
            }
          />
        ) : (
          list.map((contact) => (
            <Button
              key={contact.pubkey}
              className="list-row"
              aria-current={open === contact.pubkey || undefined}
              onClick={() => navigate({ name: 'contact', peer: contact.pubkey })}
            >
              <Avatar
                name={displayName(contact, contact.pubkey)}
                seed={contact.pubkey}
                src={contact.avatar}
                size="sm"
              />
              <span className="grow truncate">{displayName(contact, contact.pubkey)}</span>
              {contact.verification === 'verified' ? (
                <ShieldCheckIcon size={15} style={{ color: 'var(--success)' }} />
              ) : null}
              {contact.blocked ? <Badge variant="danger">{t('chat.block')}</Badge> : null}
            </Button>
          ))
        )}
      </div>
    </div>
  )
}

function ContactsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading contacts…">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <span className="skeleton skeleton-avatar" />
          <span className="skeleton skeleton-text" style={{ width: '45%' }} />
        </div>
      ))}
    </div>
  )
}
